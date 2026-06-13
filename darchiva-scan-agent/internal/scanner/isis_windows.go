//go:build windows

package scanner

// ISIS driver for Windows.
//
// ISIS (Image and Scanner Interface Specification) is used by production-grade
// scanners (OPEX, Kodak Alaris, Panasonic KV-S series, Fujitsu fi-series).
// ISIS requires the PixTools SDK (from Kofax/Captiva) or the scanner vendor's
// ISIS kernel DLL (typically pixrun32.dll / pixrun64.dll).
//
// This file wraps the PixTools command-line scanner demo tool (ptscandemo.exe)
// that ships with the PixTools SDK, or the vendor's isisan.exe equivalent.
// Replace with direct SDK DLL calls for higher throughput production deployments.

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

const (
	// Default search paths for ISIS kernel DLLs and CLI tools
	isisToolDefault = `C:\Program Files\Kofax\PixTools\ptscandemo.exe`
)

type isisDriver struct {
	toolPath string
}

func newISISDriver() (Driver, error) {
	// Check for vendor ISIS tools in order of preference
	candidates := []string{
		isisToolDefault,
		`C:\Program Files (x86)\Kofax\PixTools\ptscandemo.exe`,
		`C:\Program Files\ISIS\isisan.exe`,
		`C:\ISIS\isisan.exe`,
	}
	// Also check PATH
	if p, err := exec.LookPath("ptscandemo"); err == nil {
		candidates = append([]string{p}, candidates...)
	}
	if p, err := exec.LookPath("isisan"); err == nil {
		candidates = append([]string{p}, candidates...)
	}

	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			return &isisDriver{toolPath: c}, nil
		}
	}
	return nil, fmt.Errorf("ISIS toolkit not found (install Kofax PixTools SDK or vendor ISIS kernel)")
}

func (d *isisDriver) Type() DriverType { return DriverISIS }

func (d *isisDriver) ListDevices(ctx context.Context) ([]Device, error) {
	out, err := exec.CommandContext(ctx, d.toolPath, "--list").Output()
	if err != nil {
		return nil, fmt.Errorf("ISIS --list failed: %w", err)
	}
	return d.parseDeviceList(out), nil
}

func (d *isisDriver) parseDeviceList(data []byte) []Device {
	var devices []Device
	sc := bufio.NewScanner(bytes.NewReader(data))
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		// Expected line format: DEVICE_NAME\tMANUFACTURER\tMODEL
		parts := strings.SplitN(line, "\t", 3)
		if len(parts) < 1 {
			continue
		}
		name := parts[0]
		vendor, model := "", name
		if len(parts) >= 3 {
			vendor = parts[1]
			model = parts[2]
		}
		devices = append(devices, Device{
			ID:     "isis:" + name,
			Name:   model,
			Vendor: vendor,
			Model:  model,
			Driver: DriverISIS,
			HasADF: true,
			Online: true,
		})
	}
	return devices
}

func (d *isisDriver) GetCapabilities(_ context.Context, deviceID string) (Capabilities, error) {
	return Capabilities{
		DeviceID:      deviceID,
		SupportedDPIs: []int{100, 150, 200, 240, 300, 400, 600},
		ColorModes:    []ColorMode{ColorModeBW, ColorModeGrayscale, ColorModeColor},
		PaperSizes:    []PaperSize{PaperA4, PaperA3, PaperLetter, PaperLegal, PaperAuto},
		HasADF:        true,
		HasDuplex:     true,
		HasFlatbed:    false, // production scanners typically ADF-only
		MaxPageWidth:  215.9,
		MaxPageHeight: 355.6,
	}, nil
}

func (d *isisDriver) Scan(ctx context.Context, params ScanParams) (<-chan Page, error) {
	rawName := strings.TrimPrefix(params.DeviceID, "isis:")
	dir, err := os.MkdirTemp("", "darchiva-isis-")
	if err != nil {
		return nil, err
	}

	dpi := dpiOrDefault(params.DPI)
	mode := "gray"
	switch params.ColorMode {
	case ColorModeBW:
		mode = "bw"
	case ColorModeColor:
		mode = "color"
	}

	args := []string{
		"--device", rawName,
		"--dpi", fmt.Sprintf("%d", dpi),
		"--mode", mode,
		"--output", filepath.Join(dir, "page_%04d.tif"),
		"--format", "tiff",
		"--batch",
	}
	if params.Duplex {
		args = append(args, "--duplex")
	}
	if params.UseADF {
		args = append(args, "--adf")
	}

	ch := make(chan Page, 64)
	go func() {
		defer close(ch)

		cmd := exec.CommandContext(ctx, d.toolPath, args...)
		var stderr bytes.Buffer
		cmd.Stderr = &stderr

		if err := cmd.Run(); err != nil {
			if !strings.Contains(stderr.String(), "No more pages") {
				ch <- Page{
					Status:    PageError,
					ScannedAt: time.Now(),
				}
				return
			}
		}

		entries, _ := filepath.Glob(filepath.Join(dir, "page_*.tif"))
		for i, path := range entries {
			info, _ := os.Stat(path)
			size := int64(0)
			if info != nil {
				size = info.Size()
			}
			ch <- Page{
				Number:    i + 1,
				Status:    PageOK,
				Path:      path,
				SizeBytes: size,
				DPI:       dpi,
				ScannedAt: time.Now(),
			}
		}
	}()
	return ch, nil
}

func (d *isisDriver) Close() error { return nil }

var _ = uuid.New // keep import
