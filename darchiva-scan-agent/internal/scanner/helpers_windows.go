//go:build windows

package scanner

func dpiOrDefault(dpi int) int {
	if dpi <= 0 {
		return 300
	}
	return dpi
}
