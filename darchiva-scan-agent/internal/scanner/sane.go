//go:build linux || darwin

package scanner

// SANE driver implementation for Linux and macOS.
// On Linux: invokes scanimage (SANE backends package).
// On macOS: invokes scanimage from sane-backends via Homebrew
//   (brew install sane-backends).
//
// Production upgrade path: replace subprocess calls with
//   CGO bindings to libsane for lower latency and richer event handling.

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

type saneDriver struct {
	scanimage string // path to scanimage binary
}

func newSANEDriver() (Driver, error) {
	path, err := exec.LookPath("scanimage")
	if err != nil {
		return nil, fmt.Errorf("scanimage not found in PATH: %w", err)
	}
	return &saneDriver{scanimage: path}, nil
}

func (s *saneDriver) Type() DriverType { return DriverSANE }

func (s *saneDriver) ListDevices(ctx context.Context) ([]Device, error) {
	out, err := exec.CommandContext(ctx, s.scanimage, "--list-devices", "--formatted-device-list=%d|%v|%m|%t\n").Output()
	if err != nil {
		// Try without formatted-device-list (older scanimage versions)
		out, err = exec.CommandContext(ctx, s.scanimage, "-L").Output()
		if err != nil {
			return nil, fmt.Errorf("scanimage -L failed: %w", err)
		}
		return s.parseSimpleList(out), nil
	}
	return s.parseFormattedList(out), nil
}

func (s *saneDriver) parseFormattedList(data []byte) []Device {
	var devices []Device
	sc := bufio.NewScanner(bytes.NewReader(data))
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, "|", 4)
		if len(parts) < 4 {
			continue
		}
		name := parts[0]
		devices = append(devices, Device{
			ID:     "sane:" + name,
			Name:   parts[2] + " (" + parts[1] + ")",
			Vendor: parts[1],
			Model:  parts[2],
			Driver: DriverSANE,
			Online: true,
		})
	}
	return devices
}

func (s *saneDriver) parseSimpleList(data []byte) []Device {
	// Line format: device `epson2:libusb:003:002' is a Epson GT-S50 flatbed scanner
	var devices []Device
	sc := bufio.NewScanner(bytes.NewReader(data))
	for sc.Scan() {
		line := sc.Text()
		if !strings.HasPrefix(line, "device") {
			continue
		}
		// Extract device name between backticks
		start := strings.Index(line, "`")
		end := strings.Index(line, "'")
		if start < 0 || end < 0 || end <= start {
			continue
		}
		name := line[start+1 : end]
		description := ""
		if idx := strings.Index(line, " is a "); idx >= 0 {
			description = line[idx+6:]
		}
		devices = append(devices, Device{
			ID:     "sane:" + name,
			Name:   description,
			Model:  description,
			Driver: DriverSANE,
			Online: true,
		})
	}
	return devices
}

func (s *saneDriver) GetCapabilities(ctx context.Context, deviceID string) (Capabilities, error) {
	rawName := strings.TrimPrefix(deviceID, "sane:")
	out, err := exec.CommandContext(ctx, s.scanimage, "-d", rawName, "--help").Output()
	caps := Capabilities{
		DeviceID:      deviceID,
		SupportedDPIs: []int{75, 150, 200, 300, 400, 600},
		ColorModes:    []ColorMode{ColorModeBW, ColorModeGrayscale, ColorModeColor},
		PaperSizes:    []PaperSize{PaperA4, PaperLetter, PaperAuto},
		HasFlatbed:    true,
	}
	if err == nil {
		help := string(out)
		if strings.Contains(help, "ADF") || strings.Contains(help, "adf") {
			caps.HasADF = true
		}
		if strings.Contains(help, "duplex") || strings.Contains(help, "Duplex") {
			caps.HasDuplex = true
		}
		// Parse --resolution option for supported DPIs
		if idx := strings.Index(help, "--resolution"); idx >= 0 {
			section := help[idx:]
			if end := strings.Index(section, "\n\n"); end > 0 {
				section = section[:end]
			}
			// Look for list like [75|150|300|600]
			if lb := strings.Index(section, "["); lb >= 0 {
				if rb := strings.Index(section[lb:], "]"); rb >= 0 {
					list := section[lb+1 : lb+rb]
					var dpis []int
					for _, part := range strings.Split(list, "|") {
						if dpi, err := strconv.Atoi(strings.TrimSpace(part)); err == nil {
							dpis = append(dpis, dpi)
						}
					}
					if len(dpis) > 0 {
						caps.SupportedDPIs = dpis
					}
				}
			}
		}
	}
	return caps, nil
}

func (s *saneDriver) Scan(ctx context.Context, params ScanParams) (<-chan Page, error) {
	rawName := strings.TrimPrefix(params.DeviceID, "sane:")

	args := []string{
		"-d", rawName,
		"--format=png",
		fmt.Sprintf("--resolution=%d", dpiOrDefault(params.DPI)),
		"--progress",
	}

	switch params.ColorMode {
	case ColorModeBW:
		args = append(args, "--mode=Lineart")
	case ColorModeGrayscale:
		args = append(args, "--mode=Gray")
	default:
		args = append(args, "--mode=Color")
	}

	if params.UseADF {
		args = append(args, "--source=ADF")
		if params.Duplex {
			args = append(args, "--source=ADF Duplex")
		}
	}

	// Multi-page ADF: scanimage --batch mode
	if params.UseADF {
		return s.scanBatch(ctx, rawName, args, params)
	}
	return s.scanSingle(ctx, args, params)
}

func (s *saneDriver) scanSingle(ctx context.Context, args []string, params ScanParams) (<-chan Page, error) {
	tmpFile := filepath.Join(os.TempDir(), "darchiva-scan-"+uuid.New().String()+".png")
	args = append(args, "-o", tmpFile)

	cmd := exec.CommandContext(ctx, s.scanimage, args...)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("scan failed: %w — %s", err, stderr.String())
	}

	ch := make(chan Page, 1)
	info, _ := os.Stat(tmpFile)
	size := int64(0)
	if info != nil {
		size = info.Size()
	}
	ch <- Page{
		Number:    1,
		Status:    PageOK,
		Path:      tmpFile,
		SizeBytes: size,
		DPI:       dpiOrDefault(params.DPI),
		ScannedAt: time.Now(),
	}
	close(ch)
	return ch, nil
}

func (s *saneDriver) scanBatch(ctx context.Context, device string, baseArgs []string, params ScanParams) (<-chan Page, error) {
	dir, err := os.MkdirTemp("", "darchiva-batch-")
	if err != nil {
		return nil, err
	}
	pattern := filepath.Join(dir, "page%04d.png")

	batchArgs := []string{"-d", device, "--batch=" + pattern, "--batch-count=-1", "--format=png"}
	batchArgs = append(batchArgs, baseArgs[2:]...) // append mode/res etc.

	cmd := exec.CommandContext(ctx, s.scanimage, batchArgs...)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	ch := make(chan Page, 64)
	go func() {
		defer close(ch)
		if err := cmd.Run(); err != nil {
			// ADF "out of documents" is a normal exit with non-zero on some backends
			if !strings.Contains(stderr.String(), "No more documents") &&
				!strings.Contains(stderr.String(), "Document feeder empty") {
				ch <- Page{Status: PageError, ScannedAt: time.Now()}
				return
			}
		}
		entries, _ := filepath.Glob(filepath.Join(dir, "page*.png"))
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
				DPI:       dpiOrDefault(params.DPI),
				ScannedAt: time.Now(),
			}
		}
	}()
	return ch, nil
}

func (s *saneDriver) Close() error { return nil }

// saneOptions serialises into JSON for /devices/{id}/caps response.
func (s *saneDriver) capsJSON(deviceID string) json.RawMessage {
	caps, _ := s.GetCapabilities(context.Background(), deviceID)
	b, _ := json.Marshal(caps)
	return b
}

func dpiOrDefault(dpi int) int {
	if dpi <= 0 {
		return 300
	}
	return dpi
}
