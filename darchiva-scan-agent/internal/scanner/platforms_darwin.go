//go:build darwin

package scanner

// platformDrivers returns the scanner drivers available on macOS.
// SANE via sane-backends (brew install sane-backends) is the primary driver.
// ImageCaptureCore (ICA) integration can be added via CGO when needed.
func platformDrivers() []Driver {
	var drivers []Driver
	if d, err := newSANEDriver(); err == nil {
		drivers = append(drivers, d)
	}
	return drivers
}
