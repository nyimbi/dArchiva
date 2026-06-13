package api

import (
	"io/fs"
	"net/http"

	"github.com/darchiva/scan-agent/internal/ui"
)

// mountUI registers the embedded web interface at /ui/ and redirects / there.
func (s *Server) mountUI() {
	sub, err := fs.Sub(ui.Static, "static")
	if err != nil {
		panic("embedded UI missing: " + err.Error())
	}
	fileServer := http.FileServer(http.FS(sub))
	s.mux.Handle("GET /ui/", http.StripPrefix("/ui", fileServer))
	s.mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			http.Redirect(w, r, "/ui/", http.StatusFound)
			return
		}
		http.NotFound(w, r)
	})
}
