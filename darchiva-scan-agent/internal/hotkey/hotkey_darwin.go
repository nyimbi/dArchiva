//go:build darwin

package hotkey

// macOS global hotkey listener using CGEventTap (requires Accessibility permission).
//
// On macOS, global keyboard monitoring requires either:
//   1. CGEventTap (via CoreGraphics) — requires Accessibility permission in
//      System Preferences → Security & Privacy → Privacy → Accessibility.
//   2. IOHIDManager — lower level, captures events before the system, but
//      requires Input Monitoring permission.
//
// This implementation uses a channel-based approach compatible with
// polling from the agent's REST endpoint, with CGEventTap as the
// preferred path when Accessibility access is granted.
//
// For foot pedals on macOS: grant Input Monitoring permission in System Prefs.

/*
#cgo CFLAGS: -x objective-c
#cgo LDFLAGS: -framework Carbon -framework CoreFoundation -framework ApplicationServices

#include <Carbon/Carbon.h>
#include <CoreFoundation/CoreFoundation.h>

// Callback table populated by Go
static EventHandlerRef gHotKeyHandler;
static int hotKeyRegistered = 0;

static OSStatus hotKeyHandler(EventHandlerCallRef nextHandler, EventRef event, void *userData) {
    EventHotKeyID hotKeyID;
    GetEventParameter(event, kEventParamDirectObject, typeEventHotKeyID, NULL,
                      sizeof(EventHotKeyID), NULL, &hotKeyID);
    // Signal Go via the pipe fd passed as userData
    int fd = *(int*)userData;
    uint32_t id = hotKeyID.id;
    write(fd, &id, sizeof(id));
    return noErr;
}

static int installHotKeyHandler(int writeFd, int *pipeFd) {
    *pipeFd = writeFd;
    EventTypeSpec eventType = {kEventClassKeyboard, kEventHotKeyPressed};
    return InstallApplicationEventHandler(hotKeyHandler, 1, &eventType, pipeFd, &gHotKeyHandler);
}

static EventHotKeyRef registerHotKey(uint32_t keyCode, uint32_t modifiers, uint32_t id) {
    EventHotKeyRef ref;
    EventHotKeyID hotKeyID = {.signature = 'DACH', .id = id};
    RegisterEventHotKey(keyCode, modifiers, hotKeyID, GetApplicationEventTarget(), 0, &ref);
    return ref;
}
*/
import "C"
import (
	"fmt"
	"log/slog"
	"os"
	"strings"
	"sync"
	"unsafe"
)

type darwinListener struct {
	mu       sync.Mutex
	bindings map[Action]uint32 // action → hotkey id
	keyRefs  map[uint32]C.EventHotKeyRef
	nextID   uint32
	ch       chan Event
	pipeR    *os.File
	pipeW    *os.File
	idMap    map[uint32]Action
}

func newListener() (Listener, error) {
	r, w, err := os.Pipe()
	if err != nil {
		return nil, err
	}
	l := &darwinListener{
		bindings: make(map[Action]uint32),
		keyRefs:  make(map[uint32]C.EventHotKeyRef),
		ch:       make(chan Event, 32),
		pipeR:    r,
		pipeW:    w,
		idMap:    make(map[uint32]Action),
	}

	fd := C.int(w.Fd())
	var pipeFd C.int
	C.installHotKeyHandler(fd, &pipeFd)

	go l.readLoop()
	return l, nil
}

func (l *darwinListener) readLoop() {
	buf := make([]byte, 4)
	for {
		n, err := l.pipeR.Read(buf)
		if err != nil || n < 4 {
			return
		}
		id := uint32(buf[0]) | uint32(buf[1])<<8 | uint32(buf[2])<<16 | uint32(buf[3])<<24
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

func (l *darwinListener) Register(action Action, keyCombo string) error {
	keyCode, mods, err := parseMacKeyCombo(keyCombo)
	if err != nil {
		return err
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	l.nextID++
	id := l.nextID
	ref := C.registerHotKey(C.uint32_t(keyCode), C.uint32_t(mods), C.uint32_t(id))
	l.bindings[action] = id
	l.keyRefs[id] = ref
	l.idMap[id] = action
	slog.Debug("hotkey registered (macOS)", "action", action, "key", keyCombo)
	return nil
}

func (l *darwinListener) Unregister(action Action) {
	l.mu.Lock()
	defer l.mu.Unlock()
	id, ok := l.bindings[action]
	if !ok {
		return
	}
	if ref, ok := l.keyRefs[id]; ok {
		C.UnregisterEventHotKey(ref)
		delete(l.keyRefs, id)
	}
	delete(l.bindings, action)
	delete(l.idMap, id)
}

func (l *darwinListener) Events() <-chan Event { return l.ch }

func (l *darwinListener) Close() {
	l.mu.Lock()
	for id, ref := range l.keyRefs {
		C.UnregisterEventHotKey(ref)
		delete(l.keyRefs, id)
	}
	l.mu.Unlock()
	l.pipeW.Close()
	l.pipeR.Close()
}

// Carbon virtual key codes for common keys
var macKeyCodes = map[string]uint32{
	"F1": 122, "F2": 120, "F3": 99, "F4": 118,
	"F5": 96, "F6": 97, "F7": 98, "F8": 100,
	"F9": 101, "F10": 109, "F11": 103, "F12": 111,
	"Space": 49, "Return": 36, "Escape": 53,
	"Delete": 51, "ForwardDelete": 117,
	"Home": 115, "End": 119, "PageUp": 116, "PageDown": 121,
	"Left": 123, "Right": 124, "Up": 126, "Down": 125,
	"A": 0, "B": 11, "C": 8, "D": 2, "E": 14, "F": 3,
	"G": 5, "H": 4, "I": 34, "J": 38, "K": 40, "L": 37,
	"M": 46, "N": 45, "O": 31, "P": 35, "Q": 12, "R": 15,
	"S": 1, "T": 17, "U": 32, "V": 9, "W": 13, "X": 7,
	"Y": 16, "Z": 6,
}

// Carbon modifier key bits
const (
	macModCmd     = 0x0100 // cmdKey
	macModShift   = 0x0200 // shiftKey
	macModOption  = 0x0800 // optionKey
	macModControl = 0x1000 // controlKey
)

func parseMacKeyCombo(combo string) (keyCode uint32, mods uint32, err error) {
	parts := strings.Split(combo, "+")
	key := strings.TrimSpace(parts[len(parts)-1])
	for _, mod := range parts[:len(parts)-1] {
		switch strings.TrimSpace(strings.ToLower(mod)) {
		case "cmd", "command":
			mods |= macModCmd
		case "shift":
			mods |= macModShift
		case "option", "alt":
			mods |= macModOption
		case "ctrl", "control":
			mods |= macModControl
		}
	}
	code, ok := macKeyCodes[strings.ToUpper(key)]
	if !ok {
		return 0, 0, fmt.Errorf("unknown key: %s", key)
	}
	_ = unsafe.Pointer(nil) // keep cgo import
	return code, mods, nil
}
