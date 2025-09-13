use serde::{Deserialize, Serialize};
use sysinfo::{System, Disks};
use std::process::Command;
use std::path::Path;
use std::fs;
use tokio::process::Command as TokioCommand;
use std::sync::Arc;
use parking_lot::Mutex;
use once_cell::sync::Lazy;

#[derive(Serialize, Deserialize, Debug)]
pub struct SystemInfo {
    pub os: String,
    pub os_version: String,
    pub cpu_name: String,
    pub cpu_cores: usize,
    pub total_memory: u64,
    pub available_memory: u64,
    pub total_disk_space: u64,
    pub available_disk_space: u64,
    pub gpu_info: Vec<String>,
    pub python_version: Option<String>,
    pub git_version: Option<String>,
    pub cuda_available: bool,
}

#[derive(Serialize, Deserialize, Clone)]
struct InstallProgress {
    step: String,
    progress: u32,
    message: String,
    is_complete: bool,
    has_error: bool,
}

// Global state for installation progress
static INSTALL_STATE: Lazy<Arc<Mutex<InstallProgress>>> = Lazy::new(|| {
    Arc::new(Mutex::new(InstallProgress {
        step: "idle".to_string(),
        progress: 0,
        message: "Ready to install".to_string(),
        is_complete: false,
        has_error: false,
    }))
});

#[derive(Serialize, Deserialize)]
struct InstallConfig {
    install_path: String,
    model_type: String,
    use_gpu: bool,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_default_install_path() -> Result<String, String> {
    match std::env::var("HOME") {
        Ok(home) => Ok(format!("{}/Documents/IndexTTS", home)),
        Err(_) => {
            // Fallback for systems without HOME env var
            Ok("/Users/Shared/IndexTTS".to_string())
        }
    }
}

#[tauri::command]
async fn get_system_info() -> Result<SystemInfo, String> {
    let mut sys = System::new_all();
    sys.refresh_all();

    // Get OS info
    let os = System::name().unwrap_or_else(|| "Unknown".to_string());
    let os_version = System::os_version().unwrap_or_else(|| "Unknown".to_string());

    // Get CPU info
    let cpu_name = sys.cpus().first()
        .map(|cpu| cpu.name().to_string())
        .unwrap_or_else(|| "Unknown".to_string());
    let cpu_cores = sys.cpus().len();

    // Get memory info (in bytes)
    let total_memory = sys.total_memory();
    let available_memory = sys.available_memory();

    // Get disk info
    let disks = Disks::new_with_refreshed_list();
    let mut total_disk_space = 0;
    let mut available_disk_space = 0;
    for disk in &disks {
        total_disk_space += disk.total_space();
        available_disk_space += disk.available_space();
    }

    // Get GPU info (simplified)
    let gpu_info = get_gpu_info();

    // Check Python version
    let python_version = get_command_version("python3", &["--version"])
        .or_else(|| get_command_version("python", &["--version"]));

    // Check Git version
    let git_version = get_command_version("git", &["--version"]);

    // Check CUDA availability
    let cuda_available = check_cuda_availability();

    Ok(SystemInfo {
        os,
        os_version,
        cpu_name,
        cpu_cores,
        total_memory,
        available_memory,
        total_disk_space,
        available_disk_space,
        gpu_info,
        python_version,
        git_version,
        cuda_available,
    })
}

#[tauri::command]
async fn start_installation(config: InstallConfig) -> Result<String, String> {
    // Create installation directory
    let install_path = Path::new(&config.install_path);
    if !install_path.exists() {
        fs::create_dir_all(install_path)
            .map_err(|e| format!("Failed to create install directory: {}", e))?;
    }

    // Start installation process in background
    tokio::spawn(async move {
        let _ = run_installation_process(config).await;
    });

    Ok("Installation started".to_string())
}

#[tauri::command]
async fn get_installation_progress() -> Result<InstallProgress, String> {
    let state = INSTALL_STATE.lock();
    Ok(state.clone())
}

fn update_install_progress(step: &str, progress: u32, message: &str, is_complete: bool, has_error: bool) {
    let mut state = INSTALL_STATE.lock();
    state.step = step.to_string();
    state.progress = progress;
    state.message = message.to_string();
    state.is_complete = is_complete;
    state.has_error = has_error;
}

async fn run_installation_process(config: InstallConfig) -> Result<(), String> {
    // Step 1: Prepare installation
    update_install_progress("preparing", 5, "准备安装环境...", false, false);
    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
    
    // Step 2: Clone repository
    update_install_progress("cloning", 20, "正在克隆 IndexTTS 源代码...", false, false);
    let clone_result = TokioCommand::new("git")
        .args(["clone", "https://github.com/X-T-E-R/IndexTTS.git", &config.install_path])
        .output()
        .await;
    
    match clone_result {
        Ok(output) if output.status.success() => {
            update_install_progress("cloned", 40, "源代码克隆完成", false, false);
        }
        Ok(output) => {
            let error_msg = format!("Git clone failed: {}", String::from_utf8_lossy(&output.stderr));
            update_install_progress("error", 0, &error_msg, false, true);
            return Err(error_msg);
        }
        Err(e) => {
            let error_msg = format!("Failed to run git clone: {}", e);
            update_install_progress("error", 0, &error_msg, false, true);
            return Err(error_msg);
        }
    }
    
    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;

    // Step 3: Install Python dependencies
    update_install_progress("dependencies", 60, "正在安装 Python 依赖...", false, false);
    let pip_result = TokioCommand::new("pip")
        .args(["install", "-r", "requirements.txt"])
        .current_dir(&config.install_path)
        .output()
        .await;
    
    match pip_result {
        Ok(output) if output.status.success() => {
            update_install_progress("deps_installed", 80, "依赖安装完成", false, false);
        }
        Ok(output) => {
            let error_msg = format!("Pip install failed: {}", String::from_utf8_lossy(&output.stderr));
            update_install_progress("error", 0, &error_msg, false, true);
            return Err(error_msg);
        }
        Err(e) => {
            let error_msg = format!("Failed to run pip install: {}", e);
            update_install_progress("error", 0, &error_msg, false, true);
            return Err(error_msg);
        }
    }
    
    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;

    // Step 4: Setup models directory
    update_install_progress("models", 90, "正在设置模型目录...", false, false);
    let models_dir = Path::new(&config.install_path).join("checkpoints");
    if let Err(e) = fs::create_dir_all(&models_dir) {
        let error_msg = format!("Failed to create models directory: {}", e);
        update_install_progress("error", 0, &error_msg, false, true);
        return Err(error_msg);
    }
    
    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
    
    // Step 5: Complete
    update_install_progress("completed", 100, "IndexTTS 安装完成！", true, false);
    
    Ok(())
}

#[tauri::command]
async fn launch_indextts(install_path: String) -> Result<String, String> {
    let app_path = Path::new(&install_path);
    
    if !app_path.exists() {
        return Err("Installation path does not exist".to_string());
    }
    
    // Check if main.py exists
    let main_py = app_path.join("main.py");
    if !main_py.exists() {
        return Err("IndexTTS main.py not found in installation directory".to_string());
    }
    
    // Launch IndexTTS using Python
    let launch_result = TokioCommand::new("python")
        .arg("main.py")
        .current_dir(&install_path)
        .spawn();
    
    match launch_result {
        Ok(_) => Ok("IndexTTS launched successfully".to_string()),
        Err(e) => Err(format!("Failed to launch IndexTTS: {}", e)),
    }
}

#[tauri::command]
async fn open_install_directory(install_path: String) -> Result<(), String> {
    let path = Path::new(&install_path);
    
    if !path.exists() {
        return Err("Installation directory does not exist".to_string());
    }
    
    // Open directory in file manager (macOS)
    let open_result = TokioCommand::new("open")
        .arg(&install_path)
        .spawn();
    
    match open_result {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to open directory: {}", e)),
    }
}

fn get_gpu_info() -> Vec<String> {
    let mut gpu_info = Vec::new();
    
    // Try to get GPU info using system_profiler on macOS
    if let Ok(output) = Command::new("system_profiler")
        .args(&["SPDisplaysDataType"])
        .output()
    {
        if let Ok(output_str) = String::from_utf8(output.stdout) {
            for line in output_str.lines() {
                if line.trim().starts_with("Chipset Model:") {
                    if let Some(gpu_name) = line.split(':').nth(1) {
                        gpu_info.push(gpu_name.trim().to_string());
                    }
                }
            }
        }
    }
    
    if gpu_info.is_empty() {
        gpu_info.push("Unknown GPU".to_string());
    }
    
    gpu_info
}

fn get_command_version(command: &str, args: &[&str]) -> Option<String> {
    Command::new(command)
        .args(args)
        .output()
        .ok()
        .and_then(|output| String::from_utf8(output.stdout).ok())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

fn check_cuda_availability() -> bool {
    Command::new("nvidia-smi")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, get_system_info, get_default_install_path, start_installation, get_installation_progress, launch_indextts, open_install_directory])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
