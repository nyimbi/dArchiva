package api

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/darchiva/scan-agent/internal/config"
	"github.com/darchiva/scan-agent/internal/hotfolder"
	"github.com/darchiva/scan-agent/internal/hotkey"
	"github.com/darchiva/scan-agent/internal/queue"
	"github.com/darchiva/scan-agent/internal/scanner"
	"github.com/darchiva/scan-agent/internal/uploader"
	"github.com/google/uuid"
)

// Services wires together all subsystems the handlers need.
type Services struct {
	Registry   *scanner.Registry
	HotFolders *hotfolder.Watcher
	HotKeys    *hotkey.Manager // may be nil if hotkey init failed
	Queue      *queue.Queue
	Uploader   *uploader.Uploader
	Config     *config.Manager
}

// Server holds the mux and services.
type Server struct {
	mux      *http.ServeMux
	services *Services
}

// New builds the HTTP server with all routes registered.
func New(services *Services) *Server {
	s := &Server{mux: http.NewServeMux(), services: services}
	s.routes()
	return s
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}

func (s *Server) routes() {
	s.mountUI()
	s.mux.HandleFunc("GET /health", s.handleHealth)
	s.mux.HandleFunc("GET /devices", s.handleListDevices)
	s.mux.HandleFunc("POST /scan", s.handleStartScan)
	s.mux.HandleFunc("GET /jobs", s.handleListJobs)
	s.mux.HandleFunc("GET /jobs/{id}", s.handleGetJob)
	s.mux.HandleFunc("DELETE /jobs/{id}", s.handleDeleteJob)
	s.mux.HandleFunc("GET /hot-folders", s.handleListHotFolders)
	s.mux.HandleFunc("POST /hot-folders", s.handleAddHotFolder)
	s.mux.HandleFunc("DELETE /hot-folders/{id}", s.handleRemoveHotFolder)
	s.mux.HandleFunc("GET /hotkeys", s.handleGetHotkeys)
	s.mux.HandleFunc("PUT /hotkeys", s.handleUpdateHotkeys)
	s.mux.HandleFunc("GET /queue/stats", s.handleQueueStats)
	s.mux.HandleFunc("POST /queue/drain", s.handleQueueDrain)
	s.mux.HandleFunc("GET /config", s.handleGetConfig)
	s.mux.HandleFunc("PUT /config", s.handleUpdateConfig)
}

// ---------- health ----------

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	jsonOK(w, map[string]any{"status": "ok", "time": time.Now().UTC()})
}

// ---------- devices ----------

func (s *Server) handleListDevices(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()
	devices, err := s.services.Registry.ListDevices(ctx)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonOK(w, devices)
}

// ---------- scan ----------

type startScanRequest struct {
	Params     scanner.ScanParams `json:"params"`
	ProjectID  string             `json:"project_id"`
	BatchID    string             `json:"batch_id"`
	OperatorID string             `json:"operator_id"` // dArchiva user ID of the person at the scanner
}

func (s *Server) handleStartScan(w http.ResponseWriter, r *http.Request) {
	var req startScanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	if req.Params.DeviceID == "" {
		jsonError(w, "params.device_id required", http.StatusBadRequest)
		return
	}
	// Embed project/batch into scan params for downstream use
	req.Params.ProjectID = req.ProjectID
	req.Params.BatchID = req.BatchID

	job, err := s.services.Registry.StartScan(r.Context(), req.Params)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Background: watch job.Pages (slice appended by runScan) and enqueue for upload
	go s.watchAndEnqueue(job.ID, req.ProjectID, req.BatchID, req.OperatorID)

	w.WriteHeader(http.StatusAccepted)
	jsonOK(w, map[string]any{"job_id": job.ID, "status": job.Status})
}

// watchAndEnqueue polls the job until complete, enqueues each page as it
// appears, and drains the uploader immediately after each enqueue so uploads
// pipeline with ADF scanning instead of waiting for the full job to finish.
func (s *Server) watchAndEnqueue(jobID, projectID, batchID, operatorID string) {
	ctx := context.Background()
	seen := make(map[int]bool)
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()
	deadline := time.After(15 * time.Minute)

	for {
		select {
		case <-deadline:
			return
		case <-ticker.C:
			job, ok := s.services.Registry.GetJob(jobID)
			if !ok {
				return
			}
			newPages := 0
			for _, page := range job.Pages {
				if seen[page.Number] || page.Status != scanner.PageOK {
					continue
				}
				seen[page.Number] = true
				meta := map[string]any{
					"page_number": page.Number,
					"dpi":         page.DPI,
					"width":       page.Width,
					"height":      page.Height,
				}
				if operatorID != "" {
					meta["operator_id"] = operatorID
				}
				qID, err := s.services.Queue.Enqueue(ctx, queue.Job{
					ScanJobID: jobID,
					FilePath:  page.Path,
					ProjectID: projectID,
					BatchID:   batchID,
					Meta:      meta,
				})
				if err != nil {
					slog.Error("enqueue page failed", "err", err)
					continue
				}
				slog.Info("page queued", "queue_id", qID, "page", page.Number, "operator", operatorID)
				newPages++
			}
			// Drain immediately whenever new pages were enqueued so uploads
			// run in parallel with scanning rather than after the job finishes.
			if newPages > 0 {
				go s.services.Uploader.Drain(ctx)
			}
			if job.Status == scanner.JobComplete || job.Status == scanner.JobFailed {
				return
			}
		}
	}
}

// ---------- jobs ----------

func (s *Server) handleListJobs(w http.ResponseWriter, r *http.Request) {
	jsonOK(w, s.services.Registry.ListJobs())
}

func (s *Server) handleGetJob(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	job, ok := s.services.Registry.GetJob(id)
	if !ok {
		jsonError(w, "job not found", http.StatusNotFound)
		return
	}
	jsonOK(w, job)
}

func (s *Server) handleDeleteJob(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	_, ok := s.services.Registry.GetJob(id)
	if !ok {
		jsonError(w, "job not found", http.StatusNotFound)
		return
	}
	s.services.Registry.DeleteJob(id)
	w.WriteHeader(http.StatusNoContent)
}

// ---------- hot folders ----------

type addHotFolderRequest struct {
	Path       string `json:"path"`
	ProjectID  string `json:"project_id"`
	BatchID    string `json:"batch_id"`
	OperatorID string `json:"operator_id"` // attribute uploads from this folder to this user
	Enabled    bool   `json:"enabled"`
}

func (s *Server) handleListHotFolders(w http.ResponseWriter, r *http.Request) {
	jsonOK(w, s.services.HotFolders.List())
}

func (s *Server) handleAddHotFolder(w http.ResponseWriter, r *http.Request) {
	var req addHotFolderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	if req.Path == "" || req.ProjectID == "" {
		jsonError(w, "path and project_id required", http.StatusBadRequest)
		return
	}
	watch := hotfolder.Watch{
		ID:         uuid.New().String(),
		Path:       req.Path,
		ProjectID:  req.ProjectID,
		BatchID:    req.BatchID,
		OperatorID: req.OperatorID,
		Enabled:    req.Enabled,
	}
	if err := s.services.HotFolders.Add(watch); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	_ = s.services.Config.AddHotFolder(config.HotFolder{
		ID:         watch.ID,
		Path:       watch.Path,
		ProjectID:  watch.ProjectID,
		BatchID:    watch.BatchID,
		OperatorID: watch.OperatorID,
		Enabled:    watch.Enabled,
	})
	w.WriteHeader(http.StatusCreated)
	jsonOK(w, watch)
}

func (s *Server) handleRemoveHotFolder(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	s.services.HotFolders.Remove(id)
	_ = s.services.Config.RemoveHotFolder(id)
	w.WriteHeader(http.StatusNoContent)
}

// ---------- hotkeys ----------

func (s *Server) handleGetHotkeys(w http.ResponseWriter, r *http.Request) {
	jsonOK(w, s.services.Config.Get().Hotkeys)
}

func (s *Server) handleUpdateHotkeys(w http.ResponseWriter, r *http.Request) {
	var bindings map[string]string
	if err := json.NewDecoder(r.Body).Decode(&bindings); err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	if s.services.HotKeys != nil {
		actionMap := make(map[hotkey.Action]string, len(bindings))
		for k, v := range bindings {
			actionMap[hotkey.Action(k)] = v
		}
		s.services.HotKeys.UpdateBindings(actionMap)
	}
	cfg := s.services.Config.Get()
	if v, ok := bindings[string(hotkey.ActionScanNextPage)]; ok {
		cfg.Hotkeys.ScanNextPage = v
	}
	if v, ok := bindings[string(hotkey.ActionAcceptPage)]; ok {
		cfg.Hotkeys.AcceptPage = v
	}
	if v, ok := bindings[string(hotkey.ActionRejectPage)]; ok {
		cfg.Hotkeys.RejectPage = v
	}
	if v, ok := bindings[string(hotkey.ActionEndBatch)]; ok {
		cfg.Hotkeys.EndBatch = v
	}
	if v, ok := bindings[string(hotkey.ActionCaptureCamera)]; ok {
		cfg.Hotkeys.CaptureCamera = v
	}
	_ = s.services.Config.Update(cfg)
	jsonOK(w, map[string]string{"status": "updated"})
}

// ---------- queue ----------

func (s *Server) handleQueueStats(w http.ResponseWriter, r *http.Request) {
	stats, err := s.services.Queue.Stats(r.Context())
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonOK(w, stats)
}

func (s *Server) handleQueueDrain(w http.ResponseWriter, r *http.Request) {
	go s.services.Uploader.Drain(context.Background())
	jsonOK(w, map[string]string{"status": "drain started"})
}

// ---------- config ----------

func (s *Server) handleGetConfig(w http.ResponseWriter, r *http.Request) {
	cfg := s.services.Config.Get()
	// Redact token in response
	cfg.APIToken = "***"
	jsonOK(w, cfg)
}

func (s *Server) handleUpdateConfig(w http.ResponseWriter, r *http.Request) {
	var partial struct {
		ServerURL        string `json:"server_url"`
		APIToken         string `json:"api_token"`
		AgentName        string `json:"agent_name"`
		DefaultProjectID string `json:"default_project_id"`
		Port             int    `json:"port"`
	}
	if err := json.NewDecoder(r.Body).Decode(&partial); err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	cfg := s.services.Config.Get()
	if partial.ServerURL != "" {
		cfg.ServerURL = partial.ServerURL
	}
	if partial.APIToken != "" {
		cfg.APIToken = partial.APIToken
	}
	if partial.AgentName != "" {
		cfg.AgentName = partial.AgentName
	}
	if partial.DefaultProjectID != "" {
		cfg.DefaultProjectID = partial.DefaultProjectID
	}
	if partial.Port > 0 {
		cfg.Port = partial.Port
	}
	if err := s.services.Config.Update(cfg); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonOK(w, map[string]string{"status": "updated"})
}

// ---------- helpers ----------

func jsonOK(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}

func jsonError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
