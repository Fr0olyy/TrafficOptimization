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

	const (
		iterations     = 1
		baselineLimit  = 100
		demoBatch      = 0
		qasmVersion    = "3.0"
		qaoaLayers     = 1
		maxQubits      = 25
		requestTimeout = 30 * time.Minute
	)

	log.Printf("Parameters: iterations=%d, baseline=%d, layers=%d, qubits=%d",
		iterations, baselineLimit, qaoaLayers, maxQubits)

	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	// Classical runner
	runnerClass := filepath.Join("py", "runner_classical.py")
	argsClass := []string{runnerClass, "--input", dstPath, "--iterations", itoa(iterations), "--baseline-limit", itoa(baselineLimit)}

	// NEW Quantum runner with --csv-file
	runnerQuant := filepath.Join("py", "runner.py")
	argsQuant := []string{
		runnerQuant,
		"--csv-file", dstPath,
		"--max-routes", itoa(999999),
		"--p-layers", itoa(qaoaLayers),
		"--workers", itoa(4),
	}

	type resp struct {
		OK        bool           `json:"ok"`
		Mode      string         `json:"mode"`
		File      string         `json:"file"`
		Results   []any          `json:"results"`
		CSVBase64 string         `json:"csv_base64"`
		CSVName   string         `json:"csv_filename"`
		Summary   map[string]any `json:"summary"`
	}

	log.Println("Running classical optimization...")
	outClass, errClass := runPython(ctx, argsClass)
	if errClass != nil {
		log.Printf("Classical error: %v", errClass)
		http.Error(w, string(outClass), http.StatusBadRequest)
		return
	}

	log.Println("Running quantum optimization...")
	outQuant, errQuant := runPython(ctx, argsQuant)
	if errQuant != nil {
		log.Printf("Quantum error: %v", errQuant)
		log.Printf("Quantum output: %s", truncate(string(outQuant), 500))
		http.Error(w, string(outQuant), http.StatusBadRequest)
		return
	}

	var rClass, rQuant resp
	if err := json.Unmarshal(outClass, &rClass); err != nil {
		log.Printf("Failed to parse classical: %v", err)
		http.Error(w, "Failed to parse classical results", http.StatusInternalServerError)
		return
	}

	if err := json.Unmarshal(outQuant, &rQuant); err != nil {
		log.Printf("Failed to parse quantum: %v", err)
		http.Error(w, "Failed to parse quantum results", http.StatusInternalServerError)
		return
	}

	// Save CSVs
	var idClass, idQuant string
	if rClass.CSVBase64 != "" {
		b, _ := base64.StdEncoding.DecodeString(rClass.CSVBase64)
		idClass = genID()
		store.Store(idClass, csvRecord{Name: safeName(rClass.CSVName, "classical_routes.csv"), Data: b})
	}
	if rQuant.CSVBase64 != "" {
		b, _ := base64.StdEncoding.DecodeString(rQuant.CSVBase64)
		idQuant = genID()
		store.Store(idQuant, csvRecord{Name: safeName(rQuant.CSVName, "quantum_routes.csv"), Data: b})
	}

	// Build perGraph with NEW routes data
	perGraph := make([]map[string]any, 0, min(len(rClass.Results), len(rQuant.Results)))
	for i := 0; i < min(len(rClass.Results), len(rQuant.Results)); i++ {
		c := rClass.Results[i].(map[string]any)
		q := rQuant.Results[i].(map[string]any)

		cm := c["metrics"].(map[string]any)

		// NEW: Extract routes and stats from quantum results
		routes, hasRoutes := q["routes"].([]any)
		stats, hasStats := q["stats"].(map[string]any)

		// Build quantum metrics (backward compatible format)
		var qm map[string]any
		if hasStats {
			qm = map[string]any{
				"enhanced": map[string]any{
					"opt_time_ms":       floatToInt(stats["pure_quantum_time"].(float64) * 1000),
					"successful_routes": stats["successful"],
					"total_routes":      stats["total_routes"],
					"average_cost":      0,
				},
			}
		} else {
			// Fallback to old format
			qm = q["metrics"].(map[string]any)
		}

		ce := cm["enhanced"].(map[string]any)
		qe := qm["enhanced"].(map[string]any)
		ceMs := intFromAny(ce["opt_time_ms"])
		qeMs := intFromAny(qe["opt_time_ms"])

		graphEntry := map[string]any{
			"graph_index": q["graph_index"],
			"classical":   cm,
			"quantum":     qm,
			"compare": map[string]any{
				"delta_ms":        qeMs - ceMs,
				"quantum_speedup": speedup(ceMs, qeMs),
			},
		}

		// NEW: Add routes if available
		if hasRoutes {
			graphEntry["routes"] = routes
		}
		if hasStats {
			graphEntry["stats"] = stats
		}

		perGraph = append(perGraph, graphEntry)
	}

	out := map[string]any{
		"ok":       true,
		"perGraph": perGraph,
		"downloads": map[string]string{
			"classical_csv": idClass,
			"quantum_csv":   idQuant,
		},
		"elapsed_ms": time.Since(start).Milliseconds(),
		"parameters": map[string]any{
			"iterations":     iterations,
			"baseline_limit": baselineLimit,
			"qaoa_layers":    qaoaLayers,
			"max_qubits":     maxQubits,
			"mirea_enabled":  false,
		},
		"summary": map[string]any{
			"total_graphs":      len(perGraph),
			"quantum_summary":   rQuant.Summary,
			"classical_summary": nil,
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
}

func runPython(ctx context.Context, args []string) ([]byte, error) {
	cmd := exec.CommandContext(ctx, "python3", args...)
	cmd.Env = os.Environ()

	// IMPORTANT: Read ONLY stdout, ignore stderr
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

func itoa(v int) string { return strconv.Itoa(v) }

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

func floatToInt(f float64) int {
	return int(f)
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

func truncate(s string, max int) string {
	if len(s) > max {
		return s[:max]
	}
	return s
}
