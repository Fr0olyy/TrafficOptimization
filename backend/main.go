package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

type csvRecord struct {
	Name string
	Data []byte
}

var store sync.Map

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func main() {
	log.SetFlags(log.LstdFlags | log.Lmicroseconds)

	mux := http.NewServeMux()

	webDir := getenv("WEB_DIR", "web")
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			path := filepath.Join(webDir, filepath.Clean(r.URL.Path))
			if _, err := os.Stat(path); err == nil {
				http.ServeFile(w, r, path)
				return
			}
		}
		http.ServeFile(w, r, filepath.Join(webDir, "index.html"))
	})

	mux.HandleFunc("/process", process)
	mux.HandleFunc("/download", download)

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		mux.ServeHTTP(w, r)
	})

	addr := ":" + getenv("PORT", "9001")
	log.Printf("Listening on %s (web dir: %s)", addr, webDir)
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatal(err)
	}
}

func process(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := r.ParseMultipartForm(64 << 20); err != nil {
		http.Error(w, "bad form: "+err.Error(), http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "file required: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer file.Close()

	ext := filepath.Ext(header.Filename)
	if ext != ".csv" && ext != ".txt" {
		http.Error(w, "only .csv or .txt files are allowed", http.StatusBadRequest)
		return
	}

	log.Printf("Processing file: %s (size: %d bytes)", header.Filename, header.Size)

	tmpDir, err := os.MkdirTemp("", "upload-*")
	if err != nil {
		http.Error(w, "temp dir error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer os.RemoveAll(tmpDir)

	dstPath := filepath.Join(tmpDir, header.Filename)
	dst, err := os.Create(dstPath)
	if err != nil {
		http.Error(w, "create file error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if _, err := io.Copy(dst, file); err != nil {
		http.Error(w, "save file error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	_ = dst.Close()

	// Параметры для итеративного решателя и MIREA
	const (
		iterations      = 15
		rerouteFraction = 0.1
		mireaSamples    = 3 // Количество маршрутов для сбора метрик MIREA
		requestTimeout  = 30 * time.Minute
	)

	log.Printf("Parameters: iterations=%d, reroute_fraction=%.2f, mirea_samples=%d",
		iterations, rerouteFraction, mireaSamples)

	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	// Формируем аргументы для гибридного runner.py
	runnerPath := filepath.Join("py", "runner.py")
	args := []string{
		runnerPath,
		"--csv-file", dstPath,
		"--iterations", itoa(iterations),
		"--reroute-fraction", fmt.Sprintf("%.2f", rerouteFraction),
		// <<< --- ВОТ ИСПРАВЛЕНИЕ: ВОЗВРАЩАЕМ ФЛАГИ ДЛЯ MIREA --- >>>
		"--use-mirea",
		"--mirea-email", "Mr.hectop73@gmail.com",
		"--mirea-password", "32f04ecf2dbd712e5ec5cb9c02d0df41",
		"--mirea-samples", itoa(mireaSamples),
	}

	type pyResponse struct {
		OK        bool           `json:"ok"`
		Results   []any          `json:"results"`
		CSVBase64 string         `json:"csv_base64"`
		CSVName   string         `json:"csv_filename"`
		Summary   map[string]any `json:"summary"`
	}

	log.Println("Running hybrid optimization (classical solver + MIREA metrics)...")
	outBytes, err := runPython(ctx, args)
	if err != nil {
		log.Printf("Python script error: %v", err)
		http.Error(w, "Python script failed", http.StatusInternalServerError)
		return
	}

	var pyResp pyResponse
	if err := json.Unmarshal(outBytes, &pyResp); err != nil {
		log.Printf("Failed to parse python response: %v", err)
		http.Error(w, "Failed to parse python results", http.StatusInternalServerError)
		return
	}

	var submissionID string
	if pyResp.CSVBase64 != "" {
		b, err := base64.StdEncoding.DecodeString(pyResp.CSVBase64)
		if err == nil {
			submissionID = genID()
			store.Store(submissionID, csvRecord{Name: safeName(pyResp.CSVName, "submission.csv"), Data: b})
		}
	}

	// Формируем финальный ответ для фронтенда
	finalResponse := map[string]any{
		"ok":       true,
		"perGraph": pyResp.Results, // Переименовано для совместимости с фронтендом
		"downloads": map[string]string{
			"submission_csv": submissionID,
		},
		"elapsed_ms": time.Since(start).Milliseconds(),
		"parameters": map[string]any{
			"solver_iterations": iterations,
			"reroute_fraction":  rerouteFraction,
		},
		"summary": pyResp.Summary,
	}

	writeJSON(w, http.StatusOK, finalResponse)
}

func download(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "id parameter is required", http.StatusBadRequest)
		return
	}
	v, ok := store.Load(id)
	if !ok {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	rec := v.(csvRecord)
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="`+rec.Name+`"`)
	w.WriteHeader(http.StatusOK)
	w.Write(rec.Data)
}

// ПРАВИЛЬНАЯ ВЕРСИЯ
func runPython(ctx context.Context, args []string) ([]byte, error) {
	cmd := exec.CommandContext(ctx, "python3", args...)
	cmd.Env = os.Environ()

	// Важно: разделяем stdout (для JSON) и stderr (для логов), чтобы не было конфликтов
	var outBuf, errBuf strings.Builder
	cmd.Stdout = &outBuf
	cmd.Stderr = &errBuf

	err := cmd.Run()

	// Логируем все, что Python написал в stderr, для отладки
	if errBuf.Len() > 0 {
		log.Printf("Python stderr:\n%s", errBuf.String())
	}

	if err != nil {
		// Если скрипт завершился с ошибкой, возвращаем ее
		return nil, fmt.Errorf("python script failed: %w", err)
	}

	// Возвращаем только чистый вывод из stdout
	return []byte(outBuf.String()), nil
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func itoa(v int) string { return strconv.Itoa(v) }

func genID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

func safeName(s, def string) string {
	if s == "" {
		return def
	}
	return s
}

func truncate(s string, max int) string {
	if len(s) > max {
		return s[:max]
	}
	return s
}
