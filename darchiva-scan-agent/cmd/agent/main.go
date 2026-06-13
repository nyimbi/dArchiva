// darchiva-scan-agent: cross-platform document scanning agent.
//
// Bridges TWAIN (Windows), SANE (Linux/macOS), and ISIS (Windows) scanner
// drivers to the dArchiva document management platform. Provides:
//   - REST API on :7780 for scanner control and hot folder management
//   - Hot folder watchdog that auto-ingests dropped files
//   - Global hotkey / foot pedal runtime for hands-free scanning
//   - SQLite-backed offline queue with automatic retry on reconnect
//   - System tray icon with status and quick-actions menu
package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"

	"github.com/darchiva/scan-agent/internal/api"
	"github.com/darchiva/scan-agent/internal/config"
	"github.com/darchiva/scan-agent/internal/hotfolder"
	"github.com/darchiva/scan-agent/internal/hotkey"
	"github.com/darchiva/scan-agent/internal/queue"
	"github.com/darchiva/scan-agent/internal/registration"
	"github.com/darchiva/scan-agent/internal/scanner"
	"github.com/darchiva/scan-agent/internal/uploader"
)

// Version is set at build time via -ldflags "-X main.Version=x.y.z".
var Version = "dev"

func main() {
	var (
		logLevel = flag.String("log-level", "info", "log level: debug|info|warn|error")
		noTray   = flag.Bool("no-tray", false, "disable system tray icon")
	)
	flag.Parse()

	setupLogging(*logLevel)

	// --- Config ---
	cfgMgr, err := config.New()
	if err != nil {
		slog.Error("config load failed", "err", err)
		os.Exit(1)
	}
	cfg := cfgMgr.Get()

	// --- Scanner registry ---
	workDir := filepath.Join(os.TempDir(), "darchiva-scans")
	if err := os.MkdirAll(workDir, 0700); err != nil {
		slog.Error("work dir init failed", "err", err)
		os.Exit(1)
	}
	registry := scanner.NewRegistry(workDir)
	defer registry.Close()

	// --- Queue ---
	cfgDir := filepath.Dir(cfgMgr.Path())
	queuePath := filepath.Join(cfgDir, "queue.db")
	q, err := queue.Open(queuePath)
	if err != nil {
		slog.Error("queue open failed", "err", err)
		os.Exit(1)
	}
	defer q.Close()

	// --- Uploader ---
	up := uploader.New(uploader.Config{
		BaseURL: cfg.ServerURL,
		Token:   cfg.APIToken,
	}, q)

	// --- Hot folder watcher ---
	ingestFn := func(ctx context.Context, path, projectID, batchID, operatorID string) {
		meta := map[string]any{"source": "hot_folder"}
		if operatorID != "" {
			meta["operator_id"] = operatorID
		}
		qID, err := q.Enqueue(ctx, queue.Job{
			ScanJobID: filepath.Base(path),
			FilePath:  path,
			ProjectID: projectID,
			BatchID:   batchID,
			Meta:      meta,
		})
		if err != nil {
			slog.Error("hot folder enqueue failed", "file", path, "err", err)
			return
		}
		slog.Info("hot folder file queued", "queue_id", qID, "file", path, "operator", operatorID)
		up.Drain(ctx)
	}

	hfWatcher, err := hotfolder.New(ingestFn)
	if err != nil {
		slog.Error("hot folder watcher init failed", "err", err)
		os.Exit(1)
	}
	defer hfWatcher.Close()

	for _, hf := range cfg.HotFolders {
		if err := hfWatcher.Add(hotfolder.Watch{
			ID:         hf.ID,
			Path:       hf.Path,
			ProjectID:  hf.ProjectID,
			BatchID:    hf.BatchID,
			OperatorID: hf.OperatorID,
			Enabled:    hf.Enabled,
		}); err != nil {
			slog.Warn("hot folder restore failed", "path", hf.Path, "err", err)
		}
	}

	// --- Hotkey / foot pedal ---
	bindings := map[hotkey.Action]string{
		hotkey.ActionScanNextPage:  cfg.Hotkeys.ScanNextPage,
		hotkey.ActionAcceptPage:    cfg.Hotkeys.AcceptPage,
		hotkey.ActionRejectPage:    cfg.Hotkeys.RejectPage,
		hotkey.ActionEndBatch:      cfg.Hotkeys.EndBatch,
		hotkey.ActionCaptureCamera: cfg.Hotkeys.CaptureCamera,
	}
	hkMgr, err := hotkey.New(bindings)
	if err != nil {
		slog.Warn("hotkey init failed, continuing without hotkeys", "err", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if hkMgr != nil {
		defer hkMgr.Close()
		go hkMgr.Run(ctx, func(ev hotkey.Event) {
			slog.Info("hotkey fired", "action", ev.Action)
		})
	}

	// --- HTTP API ---
	services := &api.Services{
		Registry:   registry,
		HotFolders: hfWatcher,
		HotKeys:    hkMgr,
		Queue:      q,
		Uploader:   up,
		Config:     cfgMgr,
	}
	srv := api.New(services)

	addr := fmt.Sprintf(":%d", cfg.Port)
	httpServer := &http.Server{
		Addr:    addr,
		Handler: srv,
	}

	// --- Uploader background loop ---
	up.Start(ctx)

	// --- Registration / heartbeat ---
	regMgr := registration.New(cfgMgr, Version)
	regMgr.Start(ctx)
	defer regMgr.Stop()

	// --- System tray ---
	if !*noTray {
		go runTray(cancel)
	}

	slog.Info("dArchiva scan agent starting", "addr", addr, "config", cfgMgr.Path())
	go func() {
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("HTTP server failed", "err", err)
			cancel()
		}
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	select {
	case sig := <-sigCh:
		slog.Info("signal received, shutting down", "signal", sig)
	case <-ctx.Done():
	}
	cancel()
	_ = httpServer.Shutdown(context.Background())
	up.Stop()
	slog.Info("shutdown complete")
}

func setupLogging(level string) {
	var l slog.Level
	switch level {
	case "debug":
		l = slog.LevelDebug
	case "warn":
		l = slog.LevelWarn
	case "error":
		l = slog.LevelError
	default:
		l = slog.LevelInfo
	}
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: l})))
}
