BINARY   := darchiva-scan-agent
VERSION  := $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
LDFLAGS  := -ldflags "-X main.Version=$(VERSION) -s -w"

.PHONY: all build-all darwin linux windows clean test

all: build-all

## macOS (arm64 + amd64 universal)
darwin:
	GOOS=darwin GOARCH=arm64 go build $(LDFLAGS) -o dist/$(BINARY)-darwin-arm64 ./cmd/agent
	GOOS=darwin GOARCH=amd64 go build $(LDFLAGS) -o dist/$(BINARY)-darwin-amd64 ./cmd/agent
	lipo -create -output dist/$(BINARY)-darwin dist/$(BINARY)-darwin-arm64 dist/$(BINARY)-darwin-amd64

## Linux (amd64 + arm64)
linux:
	GOOS=linux GOARCH=amd64 go build $(LDFLAGS) -o dist/$(BINARY)-linux-amd64 ./cmd/agent
	GOOS=linux GOARCH=arm64 go build $(LDFLAGS) -o dist/$(BINARY)-linux-arm64 ./cmd/agent

## Windows (amd64) — systray requires CGO on Windows; cross-compile with zig cc
windows:
	GOOS=windows GOARCH=amd64 CGO_ENABLED=1 \
	  CC="zig cc -target x86_64-windows" \
	  go build $(LDFLAGS) -o dist/$(BINARY)-windows-amd64.exe ./cmd/agent

build-all: darwin linux windows

clean:
	rm -rf dist/

test:
	go test ./...

dist/:
	mkdir -p dist
