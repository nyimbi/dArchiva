// System tray icon for the scan agent.
// Uses github.com/getlantern/systray which works on Windows, macOS, and Linux (via libappindicator).
package main

import (
	"context"

	"fyne.io/systray"
)

// runTray starts the system tray. cancel is called when the user selects Quit.
func runTray(cancel context.CancelFunc) {
	systray.Run(func() { onReady(cancel) }, onExit)
}

func onReady(cancel context.CancelFunc) {
	systray.SetTitle("dArchiva Scan Agent")
	systray.SetTooltip("dArchiva Scan Agent — ready")

	mStatus := systray.AddMenuItem("Status: ready", "Agent status")
	mStatus.Disable()

	systray.AddSeparator()

	mDrain := systray.AddMenuItem("Upload queued scans", "Force upload of pending scans")
	mOpen := systray.AddMenuItem("Open dashboard", "Open dArchiva in browser")

	systray.AddSeparator()

	mQuit := systray.AddMenuItem("Quit", "Stop the scan agent")

	go func() {
		for {
			select {
			case <-mDrain.ClickedCh:
				// POST /queue/drain is the clean path; trigger via loopback
				go drainViaAPI()
			case <-mOpen.ClickedCh:
				go openBrowser("http://localhost:7780/health")
			case <-mQuit.ClickedCh:
				systray.Quit()
				cancel()
				return
			}
		}
	}()
}

func onExit() {}
