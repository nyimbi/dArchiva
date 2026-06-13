package scanner

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
)

// Registry manages multiple scanner drivers and active jobs.
type Registry struct {
	mu      sync.RWMutex
	drivers []Driver
	jobs    map[string]*Job
	jobMu   sync.RWMutex
	workDir string
}

// NewRegistry creates a Registry with the platform drivers loaded.
// workDir is where temp page images are stored.
func NewRegistry(workDir string) *Registry {
	r := &Registry{
		jobs:    make(map[string]*Job),
		workDir: workDir,
	}
	for _, d := range platformDrivers() {
		r.drivers = append(r.drivers, d)
	}
	return r
}

// ListDevices returns all devices across all loaded drivers.
func (r *Registry) ListDevices(ctx context.Context) ([]Device, error) {
	r.mu.RLock()
	drivers := r.drivers
	r.mu.RUnlock()

	var (
		all    []Device
		mu     sync.Mutex
		wg     sync.WaitGroup
		errors []error
	)
	for _, d := range drivers {
		d := d
		wg.Add(1)
		go func() {
			defer wg.Done()
			devs, err := d.ListDevices(ctx)
			mu.Lock()
			defer mu.Unlock()
			if err != nil {
				errors = append(errors, err)
				return
			}
			all = append(all, devs...)
		}()
	}
	wg.Wait()
	return all, nil
}

// GetCapabilities finds the device across drivers and returns its caps.
func (r *Registry) GetCapabilities(ctx context.Context, deviceID string) (Capabilities, error) {
	r.mu.RLock()
	drivers := r.drivers
	r.mu.RUnlock()

	for _, d := range drivers {
		devs, err := d.ListDevices(ctx)
		if err != nil {
			continue
		}
		for _, dev := range devs {
			if dev.ID == deviceID {
				return d.GetCapabilities(ctx, deviceID)
			}
		}
	}
	return Capabilities{}, fmt.Errorf("device %q not found", deviceID)
}

// StartScan creates a job and starts scanning in the background.
func (r *Registry) StartScan(ctx context.Context, params ScanParams) (*Job, error) {
	job := &Job{
		ID:        uuid.New().String(),
		Status:    JobQueued,
		Params:    params,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	r.jobMu.Lock()
	r.jobs[job.ID] = job
	r.jobMu.Unlock()

	driver, err := r.driverForDevice(ctx, params.DeviceID)
	if err != nil {
		r.setJobError(job.ID, err.Error())
		return job, nil // return job with failed status; caller polls
	}

	go r.runScan(ctx, driver, job)
	return job, nil
}

func (r *Registry) runScan(ctx context.Context, driver Driver, job *Job) {
	r.updateJobStatus(job.ID, JobScanning)

	pageCh, err := driver.Scan(ctx, job.Params)
	if err != nil {
		r.setJobError(job.ID, err.Error())
		return
	}

	var pages []Page
	for p := range pageCh {
		pages = append(pages, p)
		r.jobMu.Lock()
		r.jobs[job.ID].Pages = append(r.jobs[job.ID].Pages, p)
		r.jobs[job.ID].UpdatedAt = time.Now()
		r.jobMu.Unlock()
	}

	if len(pages) == 0 && job.Status == JobScanning {
		r.setJobError(job.ID, "no pages scanned")
		return
	}
	r.updateJobStatus(job.ID, JobComplete)
}

// GetJob returns a copy of the job state.
func (r *Registry) GetJob(id string) (*Job, bool) {
	r.jobMu.RLock()
	defer r.jobMu.RUnlock()
	j, ok := r.jobs[id]
	if !ok {
		return nil, false
	}
	cp := *j
	return &cp, true
}

// ListJobs returns all jobs.
func (r *Registry) ListJobs() []*Job {
	r.jobMu.RLock()
	defer r.jobMu.RUnlock()
	out := make([]*Job, 0, len(r.jobs))
	for _, j := range r.jobs {
		cp := *j
		out = append(out, &cp)
	}
	return out
}

// DeleteJob removes a job and its temp files.
func (r *Registry) DeleteJob(id string) {
	r.jobMu.Lock()
	defer r.jobMu.Unlock()
	delete(r.jobs, id)
}

func (r *Registry) driverForDevice(ctx context.Context, deviceID string) (Driver, error) {
	r.mu.RLock()
	drivers := r.drivers
	r.mu.RUnlock()

	for _, d := range drivers {
		devs, err := d.ListDevices(ctx)
		if err != nil {
			continue
		}
		for _, dev := range devs {
			if dev.ID == deviceID {
				return d, nil
			}
		}
	}
	return nil, fmt.Errorf("no driver found for device %q", deviceID)
}

func (r *Registry) updateJobStatus(id string, status JobStatus) {
	r.jobMu.Lock()
	defer r.jobMu.Unlock()
	if j, ok := r.jobs[id]; ok {
		j.Status = status
		j.UpdatedAt = time.Now()
	}
}

func (r *Registry) setJobError(id string, msg string) {
	r.jobMu.Lock()
	defer r.jobMu.Unlock()
	if j, ok := r.jobs[id]; ok {
		j.Status = JobFailed
		j.Error = msg
		j.UpdatedAt = time.Now()
	}
}

// Close shuts down all loaded drivers.
func (r *Registry) Close() {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, d := range r.drivers {
		_ = d.Close()
	}
}
