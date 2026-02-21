#!/usr/bin/env bash
set -euo pipefail

# Fetch LLM resources for bundling with Sovereign Studio
# Downloads platform-specific llama-server binary + TinyLlama 1.1B model
# into src-tauri/resources/llamacpp/ for Tauri to bundle with the installer.
#
# Usage: bash scripts/fetch-llm-resources.sh [--platform windows|linux|macos]

LLAMACPP_VERSION="b8123"
LLAMACPP_BASE_URL="https://github.com/ggml-org/llama.cpp/releases/download/${LLAMACPP_VERSION}"
MODEL_URL="https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf"
MODEL_FILENAME="tinyllama-1b.gguf"
RESOURCES_DIR="src-tauri/resources/llamacpp"

# Parse args
PLATFORM=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --platform) PLATFORM="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# Auto-detect platform if not specified
if [[ -z "$PLATFORM" ]]; then
  case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*) PLATFORM="windows" ;;
    Darwin*) PLATFORM="macos" ;;
    *) PLATFORM="linux" ;;
  esac
fi

echo "=== Fetching LLM resources for: $PLATFORM ==="

# Set platform-specific download URL
case "$PLATFORM" in
  windows)
    ARCHIVE_URL="${LLAMACPP_BASE_URL}/llama-${LLAMACPP_VERSION}-bin-win-cpu-x64.zip"
    ARCHIVE_NAME="llamacpp.zip"
    BINARY_NAME="llama-server.exe"
    ;;
  linux)
    ARCHIVE_URL="${LLAMACPP_BASE_URL}/llama-${LLAMACPP_VERSION}-bin-ubuntu-x64.tar.gz"
    ARCHIVE_NAME="llamacpp.tar.gz"
    BINARY_NAME="llama-server"
    ;;
  macos)
    ARCHIVE_URL="${LLAMACPP_BASE_URL}/llama-${LLAMACPP_VERSION}-bin-macos-arm64.tar.gz"
    ARCHIVE_NAME="llamacpp.tar.gz"
    BINARY_NAME="llama-server"
    ;;
  *)
    echo "Error: Unknown platform '$PLATFORM'. Use windows, linux, or macos."
    exit 1
    ;;
esac

# Create resource directories
mkdir -p "$RESOURCES_DIR/models"

# Download llama-server binary
TMPDIR=$(mktemp -d)
trap "rm -rf '$TMPDIR'" EXIT

echo "Downloading llama-server from $ARCHIVE_URL ..."
curl -L --fail --progress-bar -o "$TMPDIR/$ARCHIVE_NAME" "$ARCHIVE_URL"

echo "Extracting..."
if [[ "$PLATFORM" == "windows" ]]; then
  unzip -qo "$TMPDIR/$ARCHIVE_NAME" -d "$TMPDIR/extracted"
else
  mkdir -p "$TMPDIR/extracted"
  tar -xzf "$TMPDIR/$ARCHIVE_NAME" -C "$TMPDIR/extracted"
fi

# Find and copy llama-server binary (may be in a subdirectory)
FOUND_BINARY=$(find "$TMPDIR/extracted" -name "$BINARY_NAME" -type f | head -1)
if [[ -z "$FOUND_BINARY" ]]; then
  echo "Error: $BINARY_NAME not found in archive"
  echo "Archive contents:"
  find "$TMPDIR/extracted" -type f | head -20
  exit 1
fi

cp "$FOUND_BINARY" "$RESOURCES_DIR/$BINARY_NAME"

# Make binary executable on Unix
if [[ "$PLATFORM" != "windows" ]]; then
  chmod +x "$RESOURCES_DIR/$BINARY_NAME"
fi

echo "llama-server binary: $(ls -lh "$RESOURCES_DIR/$BINARY_NAME")"

# Download TinyLlama model (~640MB)
echo ""
echo "Downloading TinyLlama 1.1B model (~640MB)..."
curl -L --fail --progress-bar -o "$RESOURCES_DIR/models/$MODEL_FILENAME" "$MODEL_URL"

echo ""
echo "=== Done! LLM resources ready in $RESOURCES_DIR ==="
echo "Binary:"
ls -lh "$RESOURCES_DIR/$BINARY_NAME"
echo "Models:"
ls -lh "$RESOURCES_DIR/models/"
