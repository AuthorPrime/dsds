use std::io::Write;
use std::sync::Mutex;
use tauri::Manager;

// Global state for managed LLM server process
struct LlmServerState(Mutex<Option<std::process::Child>>);

/// Invoke Piper TTS — takes text, returns WAV audio bytes.
/// Piper binary and model must exist at the specified paths.
#[tauri::command]
async fn speak_piper(text: String, piper_path: String, model_path: String) -> Result<Vec<u8>, String> {
    let mut child = std::process::Command::new(&piper_path)
        .args(["--model", &model_path, "--output_file", "-"])
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start Piper: {}", e))?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(text.as_bytes())
            .map_err(|e| format!("Failed to write to Piper stdin: {}", e))?;
    }

    let output = child
        .wait_with_output()
        .map_err(|e| format!("Piper process error: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Piper TTS failed: {}", stderr));
    }

    Ok(output.stdout)
}

/// Check if Piper binary exists at the given path
#[tauri::command]
async fn check_piper_installed(piper_path: String) -> bool {
    std::path::Path::new(&piper_path).exists()
}

/// Download a file from a URL and save it to the given path.
/// Creates parent directories if needed.
#[tauri::command]
async fn download_file(url: String, dest_path: String) -> Result<String, String> {
    // Create parent directories
    if let Some(parent) = std::path::Path::new(&dest_path).parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directories: {}", e))?;
    }

    let response = ureq::get(&url)
        .call()
        .map_err(|e| format!("Download failed: {}", e))?;

    let mut file = std::fs::File::create(&dest_path)
        .map_err(|e| format!("Failed to create file: {}", e))?;

    std::io::copy(&mut response.into_reader(), &mut file)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(dest_path)
}

/// Get the app's data directory path (for storing Piper binaries and models)
#[tauri::command]
async fn get_app_data_dir(app: tauri::AppHandle) -> Result<String, String> {
    app.path()
        .app_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| format!("Could not resolve app data dir: {}", e))
}

/// Extract an archive (zip or tar.gz) to a destination directory.
/// Detects format by file extension. Creates dest dir if needed.
#[tauri::command]
async fn extract_archive(archive_path: String, dest_dir: String) -> Result<String, String> {
    let archive = std::path::Path::new(&archive_path);
    let dest = std::path::Path::new(&dest_dir);

    std::fs::create_dir_all(dest)
        .map_err(|e| format!("Failed to create destination dir: {}", e))?;

    let name = archive.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_lowercase();

    if name.ends_with(".zip") {
        let file = std::fs::File::open(archive)
            .map_err(|e| format!("Failed to open archive: {}", e))?;
        let mut zip = zip::ZipArchive::new(file)
            .map_err(|e| format!("Invalid zip archive: {}", e))?;

        for i in 0..zip.len() {
            let mut entry = zip.by_index(i)
                .map_err(|e| format!("Zip entry error: {}", e))?;
            let out_path = dest.join(entry.mangled_name());

            if entry.is_dir() {
                std::fs::create_dir_all(&out_path)
                    .map_err(|e| format!("Failed to create dir: {}", e))?;
            } else {
                if let Some(parent) = out_path.parent() {
                    std::fs::create_dir_all(parent)
                        .map_err(|e| format!("Failed to create parent dir: {}", e))?;
                }
                let mut outfile = std::fs::File::create(&out_path)
                    .map_err(|e| format!("Failed to create file: {}", e))?;
                std::io::copy(&mut entry, &mut outfile)
                    .map_err(|e| format!("Failed to extract file: {}", e))?;

                // Preserve executable permission on Unix
                #[cfg(unix)]
                {
                    use std::os::unix::fs::PermissionsExt;
                    if let Some(mode) = entry.unix_mode() {
                        std::fs::set_permissions(&out_path, std::fs::Permissions::from_mode(mode)).ok();
                    }
                }
            }
        }
    } else if name.ends_with(".tar.gz") || name.ends_with(".tgz") {
        let file = std::fs::File::open(archive)
            .map_err(|e| format!("Failed to open archive: {}", e))?;
        let gz = flate2::read::GzDecoder::new(file);
        let mut tar = tar::Archive::new(gz);

        tar.unpack(dest)
            .map_err(|e| format!("Failed to extract tar.gz: {}", e))?;
    } else {
        return Err(format!("Unsupported archive format: {}", name));
    }

    // Clean up archive after successful extraction
    std::fs::remove_file(archive).ok();

    Ok(dest_dir)
}

/// Get the app's resource directory path (for bundled Piper binary + voice)
#[tauri::command]
async fn get_resource_dir(app: tauri::AppHandle) -> Result<String, String> {
    app.path()
        .resource_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| format!("Could not resolve resource dir: {}", e))
}

/// Start the bundled llama-server process.
/// The server runs on the specified port with the given model.
#[tauri::command]
async fn start_llm_server(
    server_path: String,
    model_path: String,
    port: u16,
    state: tauri::State<'_, LlmServerState>,
) -> Result<String, String> {
    let mut lock = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;

    // Stop existing server if running
    if let Some(ref mut child) = *lock {
        let _ = child.kill();
        let _ = child.wait();
    }

    let child = std::process::Command::new(&server_path)
        .args([
            "--model", &model_path,
            "--port", &port.to_string(),
            "--host", "127.0.0.1",
            "--ctx-size", "4096",
            "--n-gpu-layers", "0",  // CPU only for maximum compatibility
        ])
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start LLM server: {}", e))?;

    let pid = child.id();
    *lock = Some(child);

    Ok(format!("LLM server started on port {} (PID: {})", port, pid))
}

/// Stop the bundled llama-server process
#[tauri::command]
async fn stop_llm_server(state: tauri::State<'_, LlmServerState>) -> Result<String, String> {
    let mut lock = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;

    if let Some(ref mut child) = *lock {
        child.kill().map_err(|e| format!("Failed to kill server: {}", e))?;
        child.wait().map_err(|e| format!("Failed to wait: {}", e))?;
        *lock = None;
        Ok("LLM server stopped".to_string())
    } else {
        Ok("No server running".to_string())
    }
}

/// Check if the LLM server process is running
#[tauri::command]
async fn is_llm_server_running(state: tauri::State<'_, LlmServerState>) -> Result<bool, String> {
    let mut lock = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;

    if let Some(ref mut child) = *lock {
        match child.try_wait() {
            Ok(Some(_)) => {
                // Process has exited
                *lock = None;
                Ok(false)
            }
            Ok(None) => Ok(true),   // Still running
            Err(_) => Ok(false),
        }
    } else {
        Ok(false)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(LlmServerState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            speak_piper,
            check_piper_installed,
            download_file,
            extract_archive,
            get_app_data_dir,
            get_resource_dir,
            start_llm_server,
            stop_llm_server,
            is_llm_server_running,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
