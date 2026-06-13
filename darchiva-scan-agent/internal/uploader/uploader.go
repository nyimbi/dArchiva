// Package uploader syncs completed scan jobs to the dArchiva API.
//
// It polls the offline queue, uploads file contents via multipart POST, and
// marks jobs done. Network failures leave jobs in the queue for retry.
package uploader

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/darchiva/scan-agent/internal/queue"
)

const (
	maxAttempts   = 5
	pollInterval  = 10 * time.Second
	uploadTimeout = 120 * time.Second
)

// Config holds connection details for the dArchiva API.
type Config struct {
	BaseURL string
	Token   string
}

// Uploader drains the offline queue by uploading files to dArchiva.
type Uploader struct {
	cfg    Config
	q      *queue.Queue
	client *http.Client
	stop   chan struct{}
}

// New creates an Uploader but does not start it.
func New(cfg Config, q *queue.Queue) *Uploader {
	return &Uploader{
		cfg:    cfg,
		q:      q,
		client: &http.Client{Timeout: uploadTimeout},
		stop:   make(chan struct{}),
	}
}

// Start begins background polling. Call Stop to shut down.
func (u *Uploader) Start(ctx context.Context) {
	go u.loop(ctx)
}

// Stop signals the upload loop to exit.
func (u *Uploader) Stop() { close(u.stop) }

func (u *Uploader) loop(ctx context.Context) {
	ticker := time.NewTicker(pollInterval)
	defer ticker.Stop()
	for {
		select {
		case <-u.stop:
			return
		case <-ctx.Done():
			return
		case <-ticker.C:
			u.drain(ctx)
		}
	}
}

// Drain is exported so callers can force an immediate upload attempt.
func (u *Uploader) Drain(ctx context.Context) { u.drain(ctx) }

func (u *Uploader) drain(ctx context.Context) {
	jobs, err := u.q.NextPending(ctx, 10, maxAttempts)
	if err != nil {
		slog.Error("queue poll failed", "err", err)
		return
	}
	for _, job := range jobs {
		if err := u.q.MarkUploading(ctx, job.ID); err != nil {
			continue
		}
		if err := u.upload(ctx, job); err != nil {
			slog.Warn("upload failed", "job_id", job.ID, "file", job.FilePath, "err", err)
			_ = u.q.MarkFailed(ctx, job.ID, err.Error())
		} else {
			slog.Info("upload complete", "job_id", job.ID, "file", job.FilePath)
			_ = u.q.MarkDone(ctx, job.ID)
		}
	}
}

// uploadResponse is the minimal shape dArchiva returns on document upload.
type uploadResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

func (u *Uploader) upload(ctx context.Context, job queue.Job) error {
	f, err := os.Open(job.FilePath)
	if err != nil {
		return fmt.Errorf("open file: %w", err)
	}
	defer f.Close()

	var body bytes.Buffer
	mw := multipart.NewWriter(&body)

	// File field
	fw, err := mw.CreateFormFile("file", filepath.Base(job.FilePath))
	if err != nil {
		return err
	}
	if _, err := io.Copy(fw, f); err != nil {
		return err
	}

	// Metadata fields
	_ = mw.WriteField("project_id", job.ProjectID)
	if job.BatchID != "" {
		_ = mw.WriteField("batch_id", job.BatchID)
	}
	// operator_id identifies the human who scanned this document.
	// The api_token authenticates the machine; operator_id attributes the work.
	if opID, _ := job.Meta["operator_id"].(string); opID != "" {
		_ = mw.WriteField("operator_id", opID)
	}
	if extra, err := json.Marshal(job.Meta); err == nil {
		_ = mw.WriteField("meta", string(extra))
	}
	mw.Close()

	url := fmt.Sprintf("%s/api/v1/documents/upload", u.cfg.BaseURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, &body)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.Header.Set("Authorization", "Token "+u.cfg.Token)

	resp, err := u.client.Do(req)
	if err != nil {
		return fmt.Errorf("http: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return fmt.Errorf("server returned %d: %s", resp.StatusCode, body)
	}

	var result uploadResponse
	_ = json.NewDecoder(resp.Body).Decode(&result)
	slog.Debug("document created", "doc_id", result.ID, "name", result.Name)
	return nil
}
