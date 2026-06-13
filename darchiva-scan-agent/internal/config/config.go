// Package config manages the scan agent configuration (JSON file in OS config dir).
package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
)

// HotkeyConfig maps action names to key combos (e.g. "F9", "Ctrl+F1").
type HotkeyConfig struct {
	ScanNextPage   string `json:"scan_next_page"`
	AcceptPage     string `json:"accept_page"`
	RejectPage     string `json:"reject_page"`
	EndBatch       string `json:"end_batch"`
	CaptureCamera  string `json:"capture_camera"`
}

// HotFolder watches a directory and auto-ingests dropped files.
type HotFolder struct {
	ID         string `json:"id"`
	Path       string `json:"path"`
	ProjectID  string `json:"project_id"`
	BatchID    string `json:"batch_id,omitempty"`
	OperatorID string `json:"operator_id,omitempty"` // attribute uploads to this operator
	Enabled    bool   `json:"enabled"`
}

// UploadConfig controls retry and auto-upload behaviour.
type UploadConfig struct {
	AutoUpload      bool `json:"auto_upload"`
	RetryIntervalS  int  `json:"retry_interval_s"`
	MaxRetries      int  `json:"max_retries"`
}

// Config is the top-level agent configuration.
type Config struct {
	ServerURL        string       `json:"server_url"`
	APIToken         string       `json:"api_token"`
	DefaultProjectID string       `json:"default_project_id,omitempty"`
	Port             int          `json:"port"`
	Hotkeys          HotkeyConfig `json:"hotkeys"`
	HotFolders       []HotFolder  `json:"hot_folders"`
	Upload           UploadConfig `json:"upload"`
}

var defaults = Config{
	ServerURL: "http://localhost:8000",
	Port:      7780,
	Hotkeys: HotkeyConfig{
		ScanNextPage:  "F9",
		AcceptPage:    "F10",
		RejectPage:    "F11",
		EndBatch:      "F12",
		CaptureCamera: "Space",
	},
	Upload: UploadConfig{
		AutoUpload:     true,
		RetryIntervalS: 30,
		MaxRetries:     5,
	},
}

type Manager struct {
	mu       sync.RWMutex
	path     string
	current  Config
}

// New loads (or creates) the config file at the OS config directory.
func New() (*Manager, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		dir = "."
	}
	dir = filepath.Join(dir, "darchiva-scan-agent")
	if err := os.MkdirAll(dir, 0700); err != nil {
		return nil, err
	}
	path := filepath.Join(dir, "config.json")

	m := &Manager{path: path, current: defaults}
	if _, err := os.Stat(path); os.IsNotExist(err) {
		// Write defaults on first run
		if err := m.Save(); err != nil {
			return nil, err
		}
	} else {
		if err := m.load(); err != nil {
			return nil, err
		}
	}
	return m, nil
}

func (m *Manager) Get() Config {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.current
}

func (m *Manager) Update(c Config) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.current = c
	return m.save()
}

func (m *Manager) Path() string { return m.path }

func (m *Manager) Save() error {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.save()
}

func (m *Manager) save() error {
	data, err := json.MarshalIndent(m.current, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(m.path, data, 0600)
}

func (m *Manager) load() error {
	data, err := os.ReadFile(m.path)
	if err != nil {
		return err
	}
	c := defaults
	if err := json.Unmarshal(data, &c); err != nil {
		return err
	}
	m.current = c
	return nil
}

func (m *Manager) AddHotFolder(hf HotFolder) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, existing := range m.current.HotFolders {
		if existing.Path == hf.Path {
			return nil // already registered
		}
	}
	m.current.HotFolders = append(m.current.HotFolders, hf)
	return m.save()
}

func (m *Manager) RemoveHotFolder(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	updated := m.current.HotFolders[:0]
	for _, hf := range m.current.HotFolders {
		if hf.ID != id {
			updated = append(updated, hf)
		}
	}
	m.current.HotFolders = updated
	return m.save()
}
