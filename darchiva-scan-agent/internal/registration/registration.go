// Package registration handles agent self-registration with the dArchiva server
// and periodic heartbeats that carry pushed configuration updates.
//
// Identity model:
//
//	api_token   — authenticates the machine; set once in config per workstation
//	agent_id    — UUID assigned by dArchiva on first registration; persisted in config
//	operator_id — passed per-scan by the scan station UI; identifies the human operator
//
// On startup the agent POSTs to /api/v1/agents/register. The server returns an
// agent_id (or confirms an existing one) plus an optional pushed_config block that
// overrides local settings. Every 60 seconds the agent GETs
// /api/v1/agents/{agent_id}/heartbeat which may return a fresh pushed_config.
package registration

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"runtime"
	"time"

	"github.com/darchiva/scan-agent/internal/config"
)

const heartbeatInterval = 60 * time.Second

// PushedConfig is the subset of Config the server is allowed to override remotely.
type PushedConfig struct {
	ServerURL        string            `json:"server_url,omitempty"`
	DefaultProjectID string            `json:"default_project_id,omitempty"`
	Hotkeys          *config.HotkeyConfig `json:"hotkeys,omitempty"`
}

type registerRequest struct {
	AgentID  string `json:"agent_id,omitempty"`
	Name     string `json:"name"`
	Hostname string `json:"hostname"`
	Platform string `json:"platform"`
	Version  string `json:"version"`
	Port     int    `json:"port"`
}

type registerResponse struct {
	AgentID      string       `json:"agent_id"`
	PushedConfig *PushedConfig `json:"pushed_config,omitempty"`
}

type heartbeatResponse struct {
	PushedConfig *PushedConfig `json:"pushed_config,omitempty"`
}

// Manager handles registration and heartbeat lifecycle.
type Manager struct {
	cfgMgr  *config.Manager
	client  *http.Client
	version string
	stop    chan struct{}
}

// New creates a Manager. version is the binary version string (e.g. "1.0.0").
func New(cfgMgr *config.Manager, version string) *Manager {
	return &Manager{
		cfgMgr:  cfgMgr,
		client:  &http.Client{Timeout: 15 * time.Second},
		version: version,
		stop:    make(chan struct{}),
	}
}

// Start registers immediately then begins the heartbeat loop.
// It is non-blocking; call Stop() to shut down.
func (m *Manager) Start(ctx context.Context) {
	go func() {
		m.register(ctx)
		ticker := time.NewTicker(heartbeatInterval)
		defer ticker.Stop()
		for {
			select {
			case <-m.stop:
				return
			case <-ctx.Done():
				return
			case <-ticker.C:
				m.heartbeat(ctx)
			}
		}
	}()
}

// Stop shuts down the heartbeat loop.
func (m *Manager) Stop() { close(m.stop) }

func (m *Manager) register(ctx context.Context) {
	cfg := m.cfgMgr.Get()
	if cfg.ServerURL == "" || cfg.APIToken == "" {
		slog.Debug("registration skipped: server_url or api_token not configured")
		return
	}

	hostname, _ := os.Hostname()
	body := registerRequest{
		AgentID:  cfg.AgentID,
		Name:     cfg.AgentName,
		Hostname: hostname,
		Platform: runtime.GOOS,
		Version:  m.version,
		Port:     cfg.Port,
	}

	data, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		cfg.ServerURL+"/api/v1/agents/register", bytes.NewReader(data))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Token "+cfg.APIToken)

	resp, err := m.client.Do(req)
	if err != nil {
		slog.Warn("agent registration failed", "err", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		slog.Warn("agent registration rejected", "status", resp.StatusCode)
		return
	}

	var result registerResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return
	}

	// Persist the server-assigned agent_id
	if result.AgentID != "" && result.AgentID != cfg.AgentID {
		updated := m.cfgMgr.Get()
		updated.AgentID = result.AgentID
		_ = m.cfgMgr.Update(updated)
		slog.Info("agent registered", "agent_id", result.AgentID)
	}

	if result.PushedConfig != nil {
		m.applyPushedConfig(result.PushedConfig)
	}
}

func (m *Manager) heartbeat(ctx context.Context) {
	cfg := m.cfgMgr.Get()
	if cfg.ServerURL == "" || cfg.AgentID == "" {
		return
	}

	url := fmt.Sprintf("%s/api/v1/agents/%s/heartbeat", cfg.ServerURL, cfg.AgentID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return
	}
	req.Header.Set("Authorization", "Token "+cfg.APIToken)

	resp, err := m.client.Do(req)
	if err != nil {
		slog.Debug("heartbeat failed", "err", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNoContent {
		return // no config update
	}
	if resp.StatusCode != http.StatusOK {
		return
	}

	var result heartbeatResponse
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	if err := json.Unmarshal(body, &result); err != nil {
		return
	}
	if result.PushedConfig != nil {
		m.applyPushedConfig(result.PushedConfig)
	}
}

// applyPushedConfig merges server-pushed overrides into the local config.
// Only fields the server is allowed to push are applied.
func (m *Manager) applyPushedConfig(pushed *PushedConfig) {
	cfg := m.cfgMgr.Get()
	changed := false

	if pushed.ServerURL != "" && pushed.ServerURL != cfg.ServerURL {
		cfg.ServerURL = pushed.ServerURL
		changed = true
	}
	if pushed.DefaultProjectID != "" && pushed.DefaultProjectID != cfg.DefaultProjectID {
		cfg.DefaultProjectID = pushed.DefaultProjectID
		changed = true
	}
	if pushed.Hotkeys != nil {
		cfg.Hotkeys = *pushed.Hotkeys
		changed = true
	}

	if changed {
		_ = m.cfgMgr.Update(cfg)
		slog.Info("config updated from server push")
	}
}
