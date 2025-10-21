package main

import (
	"bytes"
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
	"sync"
	"time"
)

type csvRecord struct {
	Name string
	Data []byte
}

var store sync.Map // id -> csvRecord

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func main() {
	log.SetFlags(log.LstdFlags | log.Lmicroseconds)

	mux := http.NewServeMux()

	// Статика для фронтенда
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

	// API
	mux.HandleFunc("/process", process)   // POST: принимает файл и параметры, возвращает JSON
	mux.HandleFunc("/download", download) // GET: скачивание CSV по id

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// CORS
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

	// Получаем параметры из формы
	iterations := getIntParam(r, "iterations", 1)
	baselineLimit := getIntParam(r, "baseline_limit", 100)

	qaoaLayers := getIntParam(r, "layers", 2)
	maxQubits := getIntParam(r, "max_qubits", 25)

	// MIREA параметры
	useMirea := r.FormValue("use_mirea") == "true"
	mireaEmail := r.FormValue("mirea_email")

	mireaShots := getIntParam(r, "mirea_shots", 1024)

	log.Printf("Processing file: %s (size: %d bytes)", header.Filename, header.Size)
	log.Printf("Parameters: iterations=%d, baseline=%d, layers=%d, qubits=%d",
		iterations, baselineLimit, qaoaLayers, maxQubits)
	if useMirea {
		log.Printf("MIREA Quantum: enabled (email=%s, shots=%d)", mireaEmail, mireaShots)
	}

	// Сохраняем файл
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
		dst.Close()
		http.Error(w, "save file error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	dst.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()

	// Classical runner
	runnerClass := filepath.Join("py", "runner_classical.py")
	argsClass := []string{
		runnerClass,
		"--input", dstPath,
		"--iterations", itoa(iterations),
		"--baseline-limit", itoa(baselineLimit),
	}

	// Quantum runner с правильными аргументами
	runnerQuant := filepath.Join("py", "runner.py")
	argsQuant := []string{
		runnerQuant,
		"--csv-file", dstPath,
		"--output", "/tmp/quantum_results.json",
		"--max-routes", itoa(min(10, baselineLimit)),
		"--p-layers", itoa(qaoaLayers),
	}

	// Добавляем MIREA параметры если включено
	if useMirea {
		argsQuant = append(argsQuant, "--use-mirea")
	}

	type resp struct {
		OK        bool             `json:"ok"`
		Mode      string           `json:"mode"`
		File      string           `json:"file"`
		Results   []map[string]any `json:"results"`
		Summary   map[string]any   `json:"summary"`
		CSVBase64 string           `json:"csv_base64"`
		CSVName   string           `json:"csv_filename"`
	}

	log.Println("Running classical optimization...")
	outClass, errClass := runPython(ctx, argsClass)
	if errClass != nil {
		log.Printf("Classical runner error: %v", errClass)
		http.Error(w, "Classical optimization failed: "+string(outClass), http.StatusBadRequest)
		return
	}

	log.Println("Running quantum optimization...")
	outQuant, errQuant := runPython(ctx, argsQuant)
	if errQuant != nil {
		log.Printf("Quantum runner error: %v", errQuant)
		http.Error(w, "Quantum optimization failed: "+string(outQuant), http.StatusBadRequest)
		return
	}

	var rClass, rQuant resp
	if err := json.Unmarshal(outClass, &rClass); err != nil {
		log.Printf("Failed to parse classical results: %v", err)
		http.Error(w, "Failed to parse classical results", http.StatusInternalServerError)
		return
	}
	if err := json.Unmarshal(outQuant, &rQuant); err != nil {
		log.Printf("Failed to parse quantum results: %v", err)
		log.Printf("Quantum output (first 500 chars): %s", string(outQuant[:min(len(outQuant), 500)]))
		http.Error(w, "Failed to parse quantum results", http.StatusInternalServerError)
		return
	}

	// Сохраняем CSV в хранилище
	var idClass, idQuant string
	if rClass.CSVBase64 != "" {
		b, _ := base64.StdEncoding.DecodeString(rClass.CSVBase64)
		idClass = genID()
		store.Store(idClass, csvRecord{
			Name: safeName(rClass.CSVName, "classical_routes.csv"),
			Data: b,
		})
		log.Printf("Saved classical CSV: %s (id=%s)", rClass.CSVName, idClass)
	}
	if rQuant.CSVBase64 != "" {
		b, _ := base64.StdEncoding.DecodeString(rQuant.CSVBase64)
		idQuant = genID()
		store.Store(idQuant, csvRecord{
			Name: safeName(rQuant.CSVName, "quantum_routes.csv"),
			Data: b,
		})
		log.Printf("Saved quantum CSV: %s (id=%s)", rQuant.CSVName, idQuant)
	}

	// Формируем perGraph сравнение
	perGraph := make([]map[string]any, 0, min(len(rClass.Results), len(rQuant.Results)))
	for i := 0; i < min(len(rClass.Results), len(rQuant.Results)); i++ {
		c := rClass.Results[i]
		q := rQuant.Results[i]

		cm, ok1 := c["metrics"].(map[string]any)
		qm, ok2 := q["metrics"].(map[string]any)
		if !ok1 || !ok2 {
			log.Printf("Warning: skipping graph %d - invalid metrics format", i)
			continue
		}

		ce, ok1 := cm["enhanced"].(map[string]any)
		qe, ok2 := qm["enhanced"].(map[string]any)
		if !ok1 || !ok2 {
			log.Printf("Warning: skipping graph %d - invalid enhanced format", i)
			continue
		}

		ceMs := intFromAny(ce["opt_time_ms"])
		qeMs := intFromAny(qe["opt_time_ms"])

		graphData := map[string]any{
			"graph_index": c["graph_index"],
			"classical":   cm,
			"quantum":     qm,
			"compare": map[string]any{
				"delta_ms":        qeMs - ceMs,
				"quantum_speedup": speedup(ceMs, qeMs),
			},
		}

		// Добавляем MIREA результаты если есть
		if mireaExec, ok := q["mirea_execution"].(map[string]any); ok {
			graphData["mirea_execution"] = mireaExec
		}

		perGraph = append(perGraph, graphData)
	}

	elapsed := time.Since(start).Milliseconds()
	log.Printf("Processing completed in %dms", elapsed)

	// Финальный ответ
	out := map[string]any{
		"ok":       true,
		"perGraph": perGraph,
		"downloads": map[string]string{
			"classical_csv": idClass,
			"quantum_csv":   idQuant,
		},
		"elapsed_ms": elapsed,
		"parameters": map[string]any{
			"iterations":     iterations,
			"baseline_limit": baselineLimit,
			"qaoa_layers":    qaoaLayers,
			"max_qubits":     maxQubits,
			"mirea_enabled":  useMirea,
		},
		"summary": map[string]any{
			"total_graphs":      len(perGraph),
			"classical_summary": rClass.Summary,
			"quantum_summary":   rQuant.Summary,
		},
	}

	writeJSON(w, http.StatusOK, out)
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
	log.Printf("Downloaded CSV: %s (id=%s)", rec.Name, id)
}

func runPython(ctx context.Context, args []string) ([]byte, error) {
	cmd := exec.CommandContext(ctx, "python3", args...)
	cmd.Env = os.Environ()

	// Разделяем stdout и stderr
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()

	// Логируем stderr для отладки (не мешает JSON)
	if stderr.Len() > 0 {
		log.Printf("Python stderr:\n%s", stderr.String())
	}

	return stdout.Bytes(), err
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// Вспомогательные функции
func getIntParam(r *http.Request, key string, def int) int {
	if val := r.FormValue(key); val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			return i
		}
	}
	return def
}

func getStringParam(r *http.Request, key string, def string) string {
	if val := r.FormValue(key); val != "" {
		return val
	}
	return def
}

func itoa(v int) string {
	return strconv.Itoa(v)
}

func intFromAny(a any) int {
	switch t := a.(type) {
	case float64:
		return int(t)
	case float32:
		return int(t)
	case int:
		return t
	case int64:
		return int(t)
	case json.Number:
		i, _ := t.Int64()
		return int(i)
	default:
		return 0
	}
}

func speedup(baseMs, testMs int) float64 {
	if testMs <= 0 {
		return 0
	}
	return float64(baseMs) / float64(testMs)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func genID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

func safeName(s, def string) string {
	if s == "" {
		return def
	}
	return s
}
