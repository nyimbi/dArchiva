//go:build linux

package hotkey

// Linux global hotkey listener using /dev/input evdev events.
//
// Reads raw keyboard events from /dev/input/event* devices.
// This approach works for both regular keyboards and USB foot pedals
// without requiring X11 or Wayland display access.
//
// Requires read permission on /dev/input/event* — typically group "input".
// Run: sudo usermod -aG input $USER && newgrp input

import (
	"encoding/binary"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"unsafe"

)

// eviocgbit computes the Linux EVIOCGBIT ioctl number inline.
// Equivalent to the C macro: _IOC(_IOC_READ, 'E', 0x20+ev, len)
// on x86/arm (14-bit size field): dir=2<<30 | type<<8 | nr | size<<16
func eviocgbit(ev, length int) uintptr {
	return uintptr(2<<30 | 'E'<<8 | (0x20+ev) | length<<16)
}

// input_event matches the Linux kernel struct input_event
type inputEvent struct {
	Time  syscall.Timeval
	Type  uint16
	Code  uint16
	Value int32
}

const (
	evKey    = 0x01
	keyPress = 1
)

type linuxListener struct {
	mu       sync.Mutex
	bindings map[Action]uint16 // action → linux keycode
	ch       chan Event
	stopCh   chan struct{}
	fds      []*os.File
}

func newListener() (Listener, error) {
	l := &linuxListener{
		bindings: make(map[Action]uint16),
		ch:       make(chan Event, 32),
		stopCh:   make(chan struct{}),
	}
	// Open all keyboard input devices
	devices, _ := filepath.Glob("/dev/input/event*")
	for _, dev := range devices {
		f, err := os.OpenFile(dev, os.O_RDONLY|syscall.O_NONBLOCK, 0)
		if err != nil {
			continue
		}
		// Check EV_KEY capability (bit 1 of EVIOCGBIT)
		var evBits [4]byte
		if _, _, errno := syscall.Syscall(syscall.SYS_IOCTL, f.Fd(),
			eviocgbit(0, 4), uintptr(unsafe.Pointer(&evBits[0]))); errno == 0 {
			if evBits[0]&0x02 != 0 { // EV_KEY bit
				l.fds = append(l.fds, f)
				continue
			}
		}
		f.Close()
	}
	if len(l.fds) == 0 {
		return l, nil // graceful: no keyboard found, hotkeys simply won't fire
	}
	for _, f := range l.fds {
		go l.readLoop(f)
	}
	return l, nil
}

func (l *linuxListener) readLoop(f *os.File) {
	var ev inputEvent
	sz := int(unsafe.Sizeof(ev))
	buf := make([]byte, sz)
	for {
		select {
		case <-l.stopCh:
			return
		default:
		}
		n, err := f.Read(buf)
		if err != nil || n != sz {
			continue
		}
		ev.Type = binary.LittleEndian.Uint16(buf[8:10])
		ev.Code = binary.LittleEndian.Uint16(buf[10:12])
		ev.Value = int32(binary.LittleEndian.Uint32(buf[12:16]))

		if ev.Type != evKey || ev.Value != keyPress {
			continue
		}
		l.mu.Lock()
		for action, code := range l.bindings {
			if code == ev.Code {
				select {
				case l.ch <- Event{Action: action, Key: fmt.Sprintf("keycode:%d", code)}:
				default:
				}
			}
		}
		l.mu.Unlock()
	}
}

func (l *linuxListener) Register(action Action, keyCombo string) error {
	code := linuxKeyCode(keyCombo)
	if code == 0 {
		return fmt.Errorf("unknown key: %s", keyCombo)
	}
	l.mu.Lock()
	l.bindings[action] = code
	l.mu.Unlock()
	slog.Debug("hotkey registered", "action", action, "key", keyCombo, "code", code)
	return nil
}

func (l *linuxListener) Unregister(action Action) {
	l.mu.Lock()
	delete(l.bindings, action)
	l.mu.Unlock()
}

func (l *linuxListener) Events() <-chan Event { return l.ch }

func (l *linuxListener) Close() {
	close(l.stopCh)
	for _, f := range l.fds {
		f.Close()
	}
}

// linuxKeyCode maps key combo strings to Linux kernel KEY_ constants.
func linuxKeyCode(key string) uint16 {
	m := map[string]uint16{
		"F1": 59, "F2": 60, "F3": 61, "F4": 62,
		"F5": 63, "F6": 64, "F7": 65, "F8": 66,
		"F9": 67, "F10": 68, "F11": 87, "F12": 88,
		"Space": 57, "Enter": 28, "Escape": 1,
		"Insert": 110, "Delete": 111, "Home": 102, "End": 107,
		"PageUp": 104, "PageDown": 109,
		"Left": 105, "Right": 106, "Up": 103, "Down": 108,
	}
	normalized := strings.TrimSpace(strings.ToUpper(key))
	// Handle "Ctrl+F9" style — for simplicity treat the last component
	parts := strings.Split(key, "+")
	last := strings.TrimSpace(parts[len(parts)-1])
	if code, ok := m[last]; ok {
		return code
	}
	if code, ok := m[normalized]; ok {
		return code
	}
	return 0
}
