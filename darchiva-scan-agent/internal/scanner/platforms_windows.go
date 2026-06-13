//go:build windows

package scanner

// platformDrivers returns the scanner drivers available on Windows.
// Priority: ISIS (production ADF) → TWAIN (workgroup) → WIA (consumer fallback).
func platformDrivers() []Driver {
	var drivers []Driver
	if d, err := newISISDriver(); err == nil {
		drivers = append(drivers, d)
	}
	if d, err := newTWAINDriver(); err == nil {
		drivers = append(drivers, d)
	}
	return drivers
}
