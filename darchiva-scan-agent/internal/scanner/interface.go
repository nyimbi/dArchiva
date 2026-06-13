// Package scanner abstracts TWAIN/SANE/ISIS/WIA scanner hardware behind one interface.
package scanner

import (
	"context"
	"time"
)

// ColorMode controls the scan colour depth.
type ColorMode string

const (
	ColorModeBW        ColorMode = "bw"
	ColorModeGrayscale ColorMode = "grayscale"
	ColorModeColor     ColorMode = "color"
)

// PaperSize is an ISO/ANSI paper size identifier.
type PaperSize string

const (
	PaperA4     PaperSize = "a4"
	PaperA3     PaperSize = "a3"
	PaperLetter PaperSize = "letter"
	PaperLegal  PaperSize = "legal"
	PaperAuto   PaperSize = "auto"
)

// DriverType identifies which scanner protocol a device uses.
type DriverType string

const (
	DriverTWAIN DriverType = "twain"
	DriverSANE  DriverType = "sane"
	DriverISIS  DriverType = "isis"
	DriverWIA   DriverType = "wia"
	DriverMock  DriverType = "mock"
)

// Device describes one attached scanner.
type Device struct {
	ID         string     `json:"id"`
	Name       string     `json:"name"`
	Model      string     `json:"model"`
	Vendor     string     `json:"vendor"`
	Driver     DriverType `json:"driver"`
	HasADF     bool       `json:"has_adf"`
	HasDuplex  bool       `json:"has_duplex"`
	MaxDPI     int        `json:"max_dpi"`
	Online     bool       `json:"online"`
}

// Capabilities describes what a specific device supports.
type Capabilities struct {
	DeviceID       string      `json:"device_id"`
	SupportedDPIs  []int       `json:"supported_dpis"`
	ColorModes     []ColorMode `json:"color_modes"`
	PaperSizes     []PaperSize `json:"paper_sizes"`
	HasADF         bool        `json:"has_adf"`
	HasDuplex      bool        `json:"has_duplex"`
	HasFlatbed     bool        `json:"has_flatbed"`
	MaxPageWidth   float64     `json:"max_page_width_mm"`
	MaxPageHeight  float64     `json:"max_page_height_mm"`
}

// ScanParams specifies one scan job's settings.
type ScanParams struct {
	DeviceID            string    `json:"device_id"`
	DPI                 int       `json:"dpi"`
	ColorMode           ColorMode `json:"color_mode"`
	PaperSize           PaperSize `json:"paper_size"`
	Duplex              bool      `json:"duplex"`
	UseADF              bool      `json:"use_adf"`
	AutoBlankDetection  bool      `json:"auto_blank_detection"`
	BlankThreshold      float64   `json:"blank_threshold"` // 0.0–1.0
	BarcodeDetection    bool      `json:"barcode_detection"`
	ProjectID           string    `json:"project_id,omitempty"`
	BatchID             string    `json:"batch_id,omitempty"`
}

// PageStatus indicates the outcome of scanning one page.
type PageStatus string

const (
	PageOK       PageStatus = "ok"
	PageBlank    PageStatus = "blank"
	PageError    PageStatus = "error"
)

// Page represents one scanned page.
type Page struct {
	Number    int        `json:"number"`
	Status    PageStatus `json:"status"`
	Path      string     `json:"path"`       // local temp file path
	SizeBytes int64      `json:"size_bytes"`
	DPI       int        `json:"dpi"`
	Width     int        `json:"width_px"`
	Height    int        `json:"height_px"`
	Barcode   string     `json:"barcode,omitempty"`
	ScannedAt time.Time  `json:"scanned_at"`
}

// JobStatus tracks a scan job lifecycle.
type JobStatus string

const (
	JobQueued     JobStatus = "queued"
	JobScanning   JobStatus = "scanning"
	JobComplete   JobStatus = "complete"
	JobFailed     JobStatus = "failed"
	JobUploading  JobStatus = "uploading"
	JobUploaded   JobStatus = "uploaded"
)

// Job is one scan session (may produce many pages via ADF).
type Job struct {
	ID        string     `json:"id"`
	Status    JobStatus  `json:"status"`
	Params    ScanParams `json:"params"`
	Pages     []Page     `json:"pages"`
	Error     string     `json:"error,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

// Driver is the interface every scanner backend must satisfy.
type Driver interface {
	// Type returns which protocol this driver uses.
	Type() DriverType

	// ListDevices enumerates currently attached scanners.
	ListDevices(ctx context.Context) ([]Device, error)

	// GetCapabilities returns detailed capabilities for one device.
	GetCapabilities(ctx context.Context, deviceID string) (Capabilities, error)

	// Scan starts a scan job and streams pages via the returned channel.
	// The caller must close the returned cancel func when done.
	Scan(ctx context.Context, params ScanParams) (<-chan Page, error)

	// Close releases any open DSM/device handles.
	Close() error
}
