@echo off
wsl -d Ubuntu -e bash -c "DISPLAY=:0 WAYLAND_DISPLAY=wayland-0 XDG_RUNTIME_DIR=/mnt/wslg/runtime-dir ./src-tauri/target/release/app"
