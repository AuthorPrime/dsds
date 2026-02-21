#!/usr/bin/env bash
set -euo pipefail

# Fetch Piper TTS resources for bundling with Sovereign Studio
# Downloads platform-specific Piper binary + Amy voice model
# into src-tauri/resources/piper/ for Tauri to bundle with the installer.
#
# Usage: bash scripts/fetch-piper-resources.sh [--platform windows|linux|macos]

PIPER_VERSION="2023.11.14-2"
PIPER_BASE_URL="https://github.com/rhasspy/piper/releases/download/${PIPER_VERSION}"
VOICE_BASE_URL="https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/amy/medium"
RESOURCES_DIR="src-tauri/resources/piper"

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

echo "=== Fetching Piper resources for: $PLATFORM ==="

# Set platform-specific download URL
case "$PLATFORM" in
  windows)
    ARCHIVE_URL="${PIPER_BASE_URL}/piper_windows_amd64.zip"
    ARCHIVE_NAME="piper.zip"
    ;;
  linux)
    ARCHIVE_URL="${PIPER_BASE_URL}/piper_linux_x86_64.tar.gz"
    ARCHIVE_NAME="piper.tar.gz"
    ;;
  macos)
    ARCHIVE_URL="${PIPER_BASE_URL}/piper_macos_x64.tar.gz"
    ARCHIVE_NAME="piper.tar.gz"
    ;;
  *)
    echo "Error: Unknown platform '$PLATFORM'. Use windows, linux, or macos."
    exit 1
    ;;
esac

# Create resource directories
mkdir -p "$RESOURCES_DIR/voices"

# Download Piper binary archive
TMPDIR=$(mktemp -d)
trap "rm -rf '$TMPDIR'" EXIT

echo "Downloading Piper binary from $ARCHIVE_URL ..."
curl -L --fail --progress-bar -o "$TMPDIR/$ARCHIVE_NAME" "$ARCHIVE_URL"

echo "Extracting..."
if [[ "$PLATFORM" == "windows" ]]; then
  unzip -qo "$TMPDIR/$ARCHIVE_NAME" -d "$TMPDIR"
else
  tar -xzf "$TMPDIR/$ARCHIVE_NAME" -C "$TMPDIR"
fi

# Copy all files from extracted piper/ directory (includes binary + required libs)
if [[ -d "$TMPDIR/piper" ]]; then
  cp -r "$TMPDIR/piper/"* "$RESOURCES_DIR/"
else
  echo "Error: Expected piper/ directory not found in archive"
  ls -la "$TMPDIR/"
  exit 1
fi

# Make binary executable on Unix
if [[ "$PLATFORM" != "windows" ]]; then
  chmod +x "$RESOURCES_DIR/piper"
fi

# Download default voice model (Amy, medium quality, ~30MB)
echo "Downloading Amy voice model..."
curl -L --fail --progress-bar -o "$RESOURCES_DIR/voices/en_US-amy-medium.onnx" \
  "$VOICE_BASE_URL/en_US-amy-medium.onnx"
curl -L --fail --progress-bar -o "$RESOURCES_DIR/voices/en_US-amy-medium.onnx.json" \
  "$VOICE_BASE_URL/en_US-amy-medium.onnx.json"

echo ""
echo "=== Done! Piper resources ready in $RESOURCES_DIR ==="
echo "Binary:"
ls -lh "$RESOURCES_DIR/"*.exe "$RESOURCES_DIR/piper" 2>/dev/null || true
echo "Voice models:"
ls -lh "$RESOURCES_DIR/voices/"
