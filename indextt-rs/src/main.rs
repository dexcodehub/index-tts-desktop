use clap::Parser;
use std::path::Path;
use std::process::Command;

/// IndexTTS Command Line Tool
#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Text to be synthesized
    text: String,

    /// Path to the audio prompt file (wav format)
    #[arg(short, long, value_name = "FILE")]
    voice: String,

    /// Path to the output wav file
    #[arg(short, long, value_name = "FILE", default_value = "gen.wav")]
    output_path: String,

    /// Path to the config file
    #[arg(short, long, value_name = "FILE", default_value = "checkpoints/config.yaml")]
    config: String,

    /// Path to the model directory
    #[arg(long, default_value = "checkpoints")]
    model_dir: String,

    /// Use FP16 for inference if available
    #[arg(long)]
    fp16: bool,

    /// Force to overwrite the output file if it exists
    #[arg(short, long)]
    force: bool,

    /// Device to run the model on (cpu, cuda, mps, xpu)
    #[arg(short, long)]
    device: Option<String>,
}

fn main() {
    let args = Args::parse();

    // Validate inputs
    if args.text.trim().is_empty() {
        eprintln!("ERROR: Text is empty.");
        std::process::exit(1);
    }

    if !Path::new(&args.voice).exists() {
        eprintln!("Audio prompt file {} does not exist.", args.voice);
        std::process::exit(1);
    }

    if !Path::new(&args.config).exists() {
        eprintln!("Config file {} does not exist.", args.config);
        std::process::exit(1);
    }

    if Path::new(&args.output_path).exists() {
        if !args.force {
            eprintln!("ERROR: Output file {} already exists. Use --force to overwrite.", args.output_path);
            std::process::exit(1);
        }
        // 删除已存在的文件以匹配Python版本的行为
        if let Err(e) = std::fs::remove_file(&args.output_path) {
            eprintln!("Failed to remove existing file {}: {}", args.output_path, e);
            std::process::exit(1);
        }
    }

    // Build the Python command by calling the existing CLI script
    let mut cmd = Command::new("uv");
    cmd.arg("run")
        .arg("indextts/cli.py")
        .arg(&args.text)
        .arg("-v")
        .arg(&args.voice)
        .arg("-o")
        .arg(&args.output_path)
        .arg("-c")
        .arg(&args.config)
        .arg("--model_dir")
        .arg(&args.model_dir);

    if args.fp16 {
        cmd.arg("--fp16");
    }

    if args.force {
        cmd.arg("-f");
    }

    // 传递设备参数，如果未指定则在Python端自动检测
    if let Some(device) = &args.device {
        cmd.arg("-d").arg(device);
    }

    // Execute the command
    println!("Executing: {:?}", cmd);
    
    let output = match cmd.output() {
        Ok(output) => output,
        Err(e) => {
            eprintln!("Failed to execute command: {}", e);
            std::process::exit(1);
        }
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        eprintln!("Command failed with error: {}", stderr);
        std::process::exit(output.status.code().unwrap_or(1));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    println!("{}", stdout);

    println!("Audio saved to: {}", args.output_path);
}