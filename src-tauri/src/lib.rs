// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use serde::Deserialize;
use std::{env, fs, io::Read};

#[derive(Deserialize)]
struct Page {
    title: String,
    raw_text: String,
}

#[tauri::command]
fn save_file(page_attr: Page, file_path: String) -> Result<String, String> {
    if page_attr.title.trim().is_empty() {
        return Err("No title!".into());
    }

    let file_contents: String = page_attr.title + "\n" + &page_attr.raw_text;

    fs::write(&file_path, file_contents)
        .map_err(|e: std::io::Error| format!("Error while writing into file: {}", e))?;

    Ok(format!("Note saved in {}", &file_path))
}

#[tauri::command]
fn read_file(file_path: String) -> Result<Vec<String>, String> {
    let mut file: fs::File = fs::File::open(file_path).unwrap();
    let mut file_content: String = String::new();
    file.read_to_string(&mut file_content).unwrap();
    let mut lines: std::str::Lines<'_> = file_content.lines();

    let title: String = lines.next().unwrap_or("").to_string();
    let content: String = lines.collect::<Vec<&str>>().join("\n");

    Ok(vec![title, content])
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![save_file, read_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
