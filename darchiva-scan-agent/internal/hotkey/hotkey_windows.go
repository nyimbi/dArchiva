//go:build windows

package hotkey

// Windows global hotkey listener using RegisterHotKey Win32 API.
//
// RegisterHotKey registers a system-wide hotkey that fires regardless of
// which application has focus — exactly what we need for foot pedals and
// scan-station shortcuts.
//
// Foot pedals on Windows register as standard HID keyboard devices and their
// key codes can be remapped via the agent's hotkey configuration.

import (
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	user32          = windows.NewLazySystemDLL("user32.dll")
	registerHotKey  = user32.NewProc("RegisterHotKey")
	unregisterHotKey = user32.NewProc("UnregisterHotKey")
	getMessage       = user32.NewProc("GetMessageW")
	translateMessage = user32.NewProc("TranslateMessage")
	dispatchMessage  = user32.NewProc("DispatchMessageW")
)

const (
	wmHotKey    = 0x0312
	modAlt      = 0x0001
	modControl  = 0x0002
	modShift    = 0x0004
	modWin      = 0x0008
	modNoRepeat = 0x4000
)

// MSG is the Windows MSG structure.
type winMSG struct {
	HWND    uintptr
	Message uint32
	WParam  uintptr
	LParam  uintptr
	Time    uint32
	Pt      struct{ X, Y int32 }
}

type windowsListener struct {
	mu       sync.Mutex
	bindings map[Action]int32  // action → hotkey id
	idMap    map[int32]Action
	nextID   int32
	ch       chan Event
	stopCh   chan struct{}
}

func newListener() (Listener, error) {
	l := &windowsListener{
		bindings: make(map[Action]int32),
		idMap:    make(map[int32]Action),
		ch:       make(chan Event, 32),
		stopCh:   make(chan struct{}),
	}
	go l.messageLoop()
	return l, nil
}

func (l *windowsListener) messageLoop() {
	var msg winMSG
	for {
		select {
		case <-l.stopCh:
			return
		default:
		}
		ret, _, _ := getMessage.Call(
			uintptr(unsafe.Pointer(&msg)),
			0, 0, 0,
		)
		if ret == 0 {
			return
		}
		if msg.Message == wmHotKey {
			id := int32(msg.WParam)
			l.mu.Lock()
			action, ok := l.idMap[id]
			l.mu.Unlock()
			if ok {
				select {
				case l.ch <- Event{Action: action}:
				default:
				}
			}
		}
	}
}

func (l *windowsListener) Register(action Action, keyCombo string) error {
	vk, mods, err := parseWinKeyCombo(keyCombo)
	if err != nil {
		return err
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	l.nextID++
	id := l.nextID
	ret, _, lastErr := registerHotKey.Call(0, uintptr(id), uintptr(mods|modNoRepeat), uintptr(vk))
	if ret == 0 {
		return fmt.Errorf("RegisterHotKey failed for %s: %w", keyCombo, lastErr)
	}
	l.bindings[action] = id
	l.idMap[id] = action
	slog.Debug("hotkey registered (Windows)", "action", action, "key", keyCombo, "id", id)
	return nil
}

func (l *windowsListener) Unregister(action Action) {
	l.mu.Lock()
	defer l.mu.Unlock()
	id, ok := l.bindings[action]
	if !ok {
		return
	}
	unregisterHotKey.Call(0, uintptr(id))
	delete(l.bindings, action)
	delete(l.idMap, id)
}

func (l *windowsListener) Events() <-chan Event { return l.ch }

func (l *windowsListener) Close() {
	l.mu.Lock()
	for _, id := range l.bindings {
		unregisterHotKey.Call(0, uintptr(id))
	}
	l.mu.Unlock()
	close(l.stopCh)
}

// Windows virtual key codes
var winVKCodes = map[string]uint32{
	"F1": 0x70, "F2": 0x71, "F3": 0x72, "F4": 0x73,
	"F5": 0x74, "F6": 0x75, "F7": 0x76, "F8": 0x77,
	"F9": 0x78, "F10": 0x79, "F11": 0x7A, "F12": 0x7B,
	"Space":    0x20,
	"Return":   0x0D,
	"Escape":   0x1B,
	"Insert":   0x2D,
	"Delete":   0x2E,
	"Home":     0x24,
	"End":      0x23,
	"PageUp":   0x21,
	"PageDown": 0x22,
	"Left":     0x25,
	"Up":       0x26,
	"Right":    0x27,
	"Down":     0x28,
	"A": 0x41, "B": 0x42, "C": 0x43, "D": 0x44, "E": 0x45,
	"F": 0x46, "G": 0x47, "H": 0x48, "I": 0x49, "J": 0x4A,
	"K": 0x4B, "L": 0x4C, "M": 0x4D, "N": 0x4E, "O": 0x4F,
	"P": 0x50, "Q": 0x51, "R": 0x52, "S": 0x53, "T": 0x54,
	"U": 0x55, "V": 0x56, "W": 0x57, "X": 0x58, "Y": 0x59,
	"Z": 0x5A,
}

func parseWinKeyCombo(combo string) (vk uint32, mods uint32, err error) {
	parts := strings.Split(combo, "+")
	key := strings.TrimSpace(parts[len(parts)-1])
	for _, mod := range parts[:len(parts)-1] {
		switch strings.TrimSpace(strings.ToLower(mod)) {
		case "ctrl", "control":
			mods |= modControl
		case "shift":
			mods |= modShift
		case "alt":
			mods |= modAlt
		case "win", "windows":
			mods |= modWin
		}
	}
	code, ok := winVKCodes[strings.ToUpper(key)]
	if !ok {
		return 0, 0, fmt.Errorf("unknown key: %s", key)
	}
	return code, mods, nil
}
