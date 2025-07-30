// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use std::{env, fs, io::Read};


#[tauri::command]
fn save_file(content: String, file_path: String) -> Result<String, String> {

    fs::write(&file_path, content)
        .map_err(|_e: std::io::Error| format!("Error while writing into file"))?;

    Ok(format!("Note saved in {}", &file_path))
}

#[tauri::command]
fn read_file(file_path: String) -> String {
    let mut file: fs::File = fs::File::open(file_path).unwrap();
    let mut file_content: String = String::new();
    file.read_to_string(&mut file_content).unwrap();
    return file_content;
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
