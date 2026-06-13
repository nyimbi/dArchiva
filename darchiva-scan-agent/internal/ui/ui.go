// Package ui exposes the embedded web interface for the scan agent.
package ui

import "embed"

//go:embed static
var Static embed.FS
