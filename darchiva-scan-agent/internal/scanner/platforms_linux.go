//go:build linux

package scanner

// platformDrivers returns the scanner drivers available on Linux.
// SANE (via scanimage) is the primary driver.
func platformDrivers() []Driver {
	var drivers []Driver
	if d, err := newSANEDriver(); err == nil {
		drivers = append(drivers, d)
	}
	return drivers
}
