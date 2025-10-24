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

	addr := ":" + getenv("PORT", "9000")
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

	const requestTimeout = 30 * time.Minute
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	// Запуск runner.py
	runnerPath := filepath.Join("py", "runner.py")
	args := []string{
		runnerPath,
		"--csv-file", dstPath,
		"--iterations", "15",
		"--reroute-fraction", "0.1",
		"--max-routes", "999999",
		"--p-layers", "1",
		"--workers", "4",
		"--use-mirea",
		"--mirea-email", getenv("MIREA_EMAIL", ""),
		"--mirea-password", getenv("MIREA_PASSWORD", ""),
		"--mirea-shots", getenv("MIREA_SHOTS", "1024"),
		"--mirea-samples", "2",
		"--max-total-mirea-calls", "10",
	}

	log.Println("Running hybrid optimization...")
	output, err := runPython(ctx, args)
	if err != nil {
		log.Printf("Quantum error: %v", err)
		log.Printf("Output: %s", truncate(string(output), 1000))
		http.Error(w, fmt.Sprintf("Python error: %v\n%s", err, string(output)), http.StatusInternalServerError)
		return
	}

	// Парсим JSON как map
	var result map[string]interface{}
	if err := json.Unmarshal(output, &result); err != nil {
		log.Printf("Failed to parse python results: %v", err)
		log.Printf("Output: %s", truncate(string(output), 1000))
		http.Error(w, "Failed to parse python results", http.StatusInternalServerError)
		return
	}

	downloads := map[string]string{}

	// Новый формат: массив файлов [{name, base64}]
	if filesAny, ok := result["csv_files"].([]any); ok {
		for _, f := range filesAny {
			m, _ := f.(map[string]any)
			name, _ := m["name"].(string)
			b64, _ := m["base64"].(string)
			if name != "" && b64 != "" {
				b, _ := base64.StdEncoding.DecodeString(b64)
				id := genID()
				store.Store(id, csvRecord{
					Name: safeName(name, "file.csv"),
					Data: b,
				})
				// Ключи для фронта
				switch name {
				case "classic.csv":
					downloads["classic_csv"] = id
					downloads["submission_csv"] = id // обратная совместимость
				case "quantum.csv":
					downloads["quantum_csv"] = id
				default:
					downloads[name] = id
				}
			}
		}
	} else {
		// Старый формат: одно поле csv_base64/csv_filename
		csvBase64, _ := result["csv_base64"].(string)
		csvFilename, _ := result["csv_filename"].(string)
		if csvBase64 != "" {
			b, _ := base64.StdEncoding.DecodeString(csvBase64)
			id := genID()
			store.Store(id, csvRecord{
				Name: safeName(csvFilename, "submission.csv"),
				Data: b,
			})
			downloads["submission_csv"] = id
		}
	}

	finalResponse := map[string]interface{}{
		"ok":         result["ok"],
		"results":    result["results"],
		"summary":    result["summary"],
		"elapsed_ms": time.Since(start).Milliseconds(),
		"downloads":  downloads,
		"parameters": map[string]interface{}{
			"solver_iterations": 15,
			"reroute_fraction":  0.1,
			"mirea_enabled":     true,
		},
	}
	writeJSON(w, http.StatusOK, finalResponse)
}

func download(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
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

func runPython(ctx context.Context, args []string) ([]byte, error) {
	cmd := exec.CommandContext(ctx, "python3", args...)
	cmd.Env = os.Environ()
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}
	if err := cmd.Start(); err != nil {
		return nil, err
	}
	output, err := io.ReadAll(stdout)
	if err != nil {
		return nil, err
	}
	if err := cmd.Wait(); err != nil {
		return output, err
	}
	return output, nil
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func genID() string { return fmt.Sprintf("%d", time.Now().UnixNano()) }

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
