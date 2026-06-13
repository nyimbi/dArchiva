// Package hotkey listens for global keyboard shortcuts including USB foot pedals.
//
// Foot pedals (Olympus RS-31H, Infinity IN-USB-2, generic USB HID pedals) register
// as standard HID keyboard devices and emit configurable key codes. No special
// driver is needed — they appear as keyboard input with configurable key mappings.
//
// This package registers global hotkeys so they fire even when the agent window
// is not focused. Platform implementations are in hotkey_{linux,darwin,windows}.go.
package hotkey

import "context"

// Action identifies the user-defined scan action triggered by a hotkey.
type Action string

const (
	ActionScanNextPage  Action = "scan_next_page"
	ActionAcceptPage    Action = "accept_page"
	ActionRejectPage    Action = "reject_page"
	ActionEndBatch      Action = "end_batch"
	ActionCaptureCamera Action = "capture_camera"
)

// Event is sent on the channel returned by Listen when a hotkey fires.
type Event struct {
	Action Action
	Key    string
}

// Listener registers global hotkeys and emits events.
type Listener interface {
	// Register binds a key combo string (e.g. "F9", "Ctrl+F1") to an action.
	Register(action Action, keyCombo string) error
	// Unregister removes a binding.
	Unregister(action Action)
	// Events returns the channel on which hotkey events are delivered.
	Events() <-chan Event
	// Close releases OS hotkey registrations.
	Close()
}

// Manager wraps a Listener with config-driven bindings.
type Manager struct {
	listener Listener
}

// New creates a Manager using the platform Listener and registers the provided
// bindings (action → key combo string).
func New(bindings map[Action]string) (*Manager, error) {
	l, err := newListener()
	if err != nil {
		return nil, err
	}
	for action, key := range bindings {
		if key == "" {
			continue
		}
		if err := l.Register(action, key); err != nil {
			// Log but don't fail — some keys may be taken by other apps
			_ = err
		}
	}
	return &Manager{listener: l}, nil
}

// Events returns the event stream.
func (m *Manager) Events() <-chan Event { return m.listener.Events() }

// UpdateBindings re-registers all hotkeys from a new binding map.
func (m *Manager) UpdateBindings(bindings map[Action]string) {
	for _, a := range []Action{ActionScanNextPage, ActionAcceptPage, ActionRejectPage, ActionEndBatch, ActionCaptureCamera} {
		m.listener.Unregister(a)
	}
	for action, key := range bindings {
		if key != "" {
			_ = m.listener.Register(action, key)
		}
	}
}

// Close shuts down the listener.
func (m *Manager) Close() { m.listener.Close() }

// Run processes hotkey events and calls the provided handler until ctx is cancelled.
func (m *Manager) Run(ctx context.Context, handler func(Event)) {
	ch := m.listener.Events()
	for {
		select {
		case <-ctx.Done():
			return
		case ev, ok := <-ch:
			if !ok {
				return
			}
			handler(ev)
		}
	}
}
