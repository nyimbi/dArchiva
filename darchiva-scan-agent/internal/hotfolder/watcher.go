// Package hotfolder monitors directories and auto-ingests dropped files.
package hotfolder

import (
	"context"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
)

// IngestFunc is called with each new file path that should be ingested.
// operatorID identifies the human operator responsible for this hot folder;
// it is included in the upload payload so dArchiva can attribute the document.
type IngestFunc func(ctx context.Context, path string, projectID string, batchID string, operatorID string)

// Watch describes one registered hot folder.
type Watch struct {
	ID         string
	Path       string
	ProjectID  string
	BatchID    string
	OperatorID string // who owns scans dropped here; sent to dArchiva on upload
	Enabled    bool
}

// Watcher manages multiple hot-folder watches.
type Watcher struct {
	mu      sync.RWMutex
	watches map[string]*Watch // keyed by Watch.ID
	fsw     *fsnotify.Watcher
	ingest  IngestFunc
	done    chan struct{}
}

// New creates a Watcher and starts the background event loop.
func New(ingestFn IngestFunc) (*Watcher, error) {
	fsw, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, err
	}
	w := &Watcher{
		watches: make(map[string]*Watch),
		fsw:     fsw,
		ingest:  ingestFn,
		done:    make(chan struct{}),
	}
	go w.loop()
	return w, nil
}

// Add registers a new directory to watch.
func (w *Watcher) Add(watch Watch) error {
	w.mu.Lock()
	defer w.mu.Unlock()
	if _, exists := w.watches[watch.ID]; exists {
		return nil
	}
	if err := os.MkdirAll(watch.Path, 0755); err != nil {
		return err
	}
	if err := w.fsw.Add(watch.Path); err != nil {
		return err
	}
	// Also watch subdirectories
	_ = filepath.Walk(watch.Path, func(p string, info os.FileInfo, err error) error {
		if err == nil && info.IsDir() {
			_ = w.fsw.Add(p)
		}
		return nil
	})
	w.watches[watch.ID] = &watch
	slog.Info("hot folder registered", "path", watch.Path, "project_id", watch.ProjectID)
	return nil
}

// Remove stops watching a directory.
func (w *Watcher) Remove(id string) {
	w.mu.Lock()
	defer w.mu.Unlock()
	watch, ok := w.watches[id]
	if !ok {
		return
	}
	_ = w.fsw.Remove(watch.Path)
	delete(w.watches, id)
	slog.Info("hot folder removed", "path", watch.Path)
}

// List returns a copy of all registered watches.
func (w *Watcher) List() []Watch {
	w.mu.RLock()
	defer w.mu.RUnlock()
	out := make([]Watch, 0, len(w.watches))
	for _, ww := range w.watches {
		out = append(out, *ww)
	}
	return out
}

// Close shuts down the watcher.
func (w *Watcher) Close() {
	close(w.done)
	_ = w.fsw.Close()
}

// loop is the background goroutine that receives fsnotify events.
func (w *Watcher) loop() {
	// Debounce: file systems may emit multiple events per file write.
	pending := make(map[string]time.Time)
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-w.done:
			return

		case event, ok := <-w.fsw.Events:
			if !ok {
				return
			}
			if event.Has(fsnotify.Create) || event.Has(fsnotify.Write) {
				info, err := os.Stat(event.Name)
				if err != nil {
					continue
				}
				if info.IsDir() {
					// Auto-add newly created subdirectories
					_ = w.fsw.Add(event.Name)
					continue
				}
				if isIngestable(event.Name) {
					pending[event.Name] = time.Now()
				}
			}

		case err, ok := <-w.fsw.Errors:
			if !ok {
				return
			}
			slog.Warn("hot folder watch error", "err", err)

		case now := <-ticker.C:
			// Fire ingest for files that haven't changed in 1s
			for path, lastSeen := range pending {
				if now.Sub(lastSeen) < time.Second {
					continue
				}
				delete(pending, path)
				watch := w.watchForPath(path)
				if watch == nil || !watch.Enabled {
					continue
				}
				// Move to processed sub-dir to avoid re-ingesting
				processed := filepath.Join(filepath.Dir(path), ".processed")
				_ = os.MkdirAll(processed, 0755)

				go func(p string, ww *Watch) {
					w.ingest(context.Background(), p, ww.ProjectID, ww.BatchID, ww.OperatorID)
					dest := filepath.Join(processed, filepath.Base(p))
					if err := os.Rename(p, dest); err != nil {
						slog.Warn("could not move processed file", "path", p, "err", err)
					}
				}(path, watch)
			}
		}
	}
}

func (w *Watcher) watchForPath(path string) *Watch {
	w.mu.RLock()
	defer w.mu.RUnlock()
	dir := filepath.Dir(path)
	for _, ww := range w.watches {
		if strings.HasPrefix(dir, ww.Path) {
			return ww
		}
	}
	return nil
}

// isIngestable returns true for file extensions dArchiva can process.
func isIngestable(name string) bool {
	ext := strings.ToLower(filepath.Ext(name))
	switch ext {
	case ".pdf", ".tif", ".tiff", ".jpg", ".jpeg", ".png", ".bmp":
		return true
	}
	return false
}
