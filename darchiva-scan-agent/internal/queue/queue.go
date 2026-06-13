// Package queue provides a SQLite-backed offline job queue with retry.
//
// Jobs are persisted locally so scans survive agent restarts and network
// outages. The uploader drains the queue when the dArchiva API is reachable.
package queue

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	_ "modernc.org/sqlite"
)

// Status values for a queued job.
const (
	StatusPending    = "pending"
	StatusUploading  = "uploading"
	StatusDone       = "done"
	StatusFailed     = "failed"
)

// Job is one unit of work: a scanned file waiting to be uploaded.
type Job struct {
	ID        int64
	ScanJobID string
	FilePath  string
	ProjectID string
	BatchID   string
	Meta      map[string]any
	Status    string
	Attempts  int
	LastError string
	CreatedAt time.Time
	UpdatedAt time.Time
}

// Queue wraps a SQLite database for offline job persistence.
type Queue struct {
	db *sql.DB
}

// Open opens (or creates) the SQLite queue at the given path.
func Open(path string) (*Queue, error) {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("open queue db: %w", err)
	}
	db.SetMaxOpenConns(1) // SQLite: single writer
	q := &Queue{db: db}
	if err := q.migrate(); err != nil {
		return nil, err
	}
	return q, nil
}

func (q *Queue) migrate() error {
	_, err := q.db.Exec(`CREATE TABLE IF NOT EXISTS jobs (
		id          INTEGER PRIMARY KEY AUTOINCREMENT,
		scan_job_id TEXT NOT NULL,
		file_path   TEXT NOT NULL,
		project_id  TEXT NOT NULL,
		batch_id    TEXT NOT NULL DEFAULT '',
		meta        TEXT NOT NULL DEFAULT '{}',
		status      TEXT NOT NULL DEFAULT 'pending',
		attempts    INTEGER NOT NULL DEFAULT 0,
		last_error  TEXT NOT NULL DEFAULT '',
		created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);
	CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
	`)
	return err
}

// Enqueue adds a new job.
func (q *Queue) Enqueue(ctx context.Context, job Job) (int64, error) {
	meta, err := json.Marshal(job.Meta)
	if err != nil {
		meta = []byte("{}")
	}
	res, err := q.db.ExecContext(ctx,
		`INSERT INTO jobs (scan_job_id, file_path, project_id, batch_id, meta)
		 VALUES (?, ?, ?, ?, ?)`,
		job.ScanJobID, job.FilePath, job.ProjectID, job.BatchID, string(meta),
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// NextPending returns up to n pending jobs eligible for retry (attempts < maxAttempts).
func (q *Queue) NextPending(ctx context.Context, n int, maxAttempts int) ([]Job, error) {
	rows, err := q.db.QueryContext(ctx,
		`SELECT id, scan_job_id, file_path, project_id, batch_id, meta,
		        status, attempts, last_error, created_at, updated_at
		 FROM jobs
		 WHERE status IN ('pending','failed') AND attempts < ?
		 ORDER BY created_at ASC
		 LIMIT ?`,
		maxAttempts, n,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanJobs(rows)
}

// MarkUploading marks a job as in-flight.
func (q *Queue) MarkUploading(ctx context.Context, id int64) error {
	_, err := q.db.ExecContext(ctx,
		`UPDATE jobs SET status='uploading', updated_at=CURRENT_TIMESTAMP WHERE id=?`, id)
	return err
}

// MarkDone removes a completed job (or archives it).
func (q *Queue) MarkDone(ctx context.Context, id int64) error {
	_, err := q.db.ExecContext(ctx,
		`UPDATE jobs SET status='done', updated_at=CURRENT_TIMESTAMP WHERE id=?`, id)
	return err
}

// MarkFailed increments attempts and records the error.
func (q *Queue) MarkFailed(ctx context.Context, id int64, errMsg string) error {
	_, err := q.db.ExecContext(ctx,
		`UPDATE jobs SET status='failed', attempts=attempts+1, last_error=?, updated_at=CURRENT_TIMESTAMP
		 WHERE id=?`, errMsg, id)
	return err
}

// Stats returns counts by status.
func (q *Queue) Stats(ctx context.Context) (map[string]int, error) {
	rows, err := q.db.QueryContext(ctx,
		`SELECT status, COUNT(*) FROM jobs GROUP BY status`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]int{}
	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err == nil {
			out[status] = count
		}
	}
	return out, rows.Err()
}

// Purge removes done jobs older than the given duration.
func (q *Queue) Purge(ctx context.Context, olderThan time.Duration) error {
	cutoff := time.Now().Add(-olderThan)
	_, err := q.db.ExecContext(ctx,
		`DELETE FROM jobs WHERE status='done' AND updated_at < ?`, cutoff)
	return err
}

// Close closes the underlying database.
func (q *Queue) Close() error { return q.db.Close() }

func scanJobs(rows *sql.Rows) ([]Job, error) {
	var jobs []Job
	for rows.Next() {
		var j Job
		var metaStr string
		var created, updated string
		err := rows.Scan(
			&j.ID, &j.ScanJobID, &j.FilePath, &j.ProjectID, &j.BatchID, &metaStr,
			&j.Status, &j.Attempts, &j.LastError, &created, &updated,
		)
		if err != nil {
			return nil, err
		}
		_ = json.Unmarshal([]byte(metaStr), &j.Meta)
		j.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", created)
		j.UpdatedAt, _ = time.Parse("2006-01-02 15:04:05", updated)
		jobs = append(jobs, j)
	}
	return jobs, rows.Err()
}
