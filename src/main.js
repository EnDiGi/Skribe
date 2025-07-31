
const { invoke } = window.__TAURI__.core;
const tauri = window.__TAURI__
const { getCurrentWindow } = window.__TAURI__.window
const { unregister } = window.__TAURI__.globalShortcut;
const breakpointWidth = 600;

window.page = {
    "title": "",
    "rawText": "",
    "path": "",
    "extension": "md",
    "saved": false
}

let viewMode = "both"

const rawContentElement = document.getElementById("raw-content");
const markdownPreviewElement = document.getElementById("markdown-preview");


window.closeWindow = async function () {
    const win = await getCurrentWindow();
    await win.close();
}

window.minimizeWindow = async function () {
    const win = await getCurrentWindow();
    await win.minimize()
}

window.toggleMaximize = async function () {
    const win = await getCurrentWindow();
    win.isMaximized().then(async (result) => {
        if (result) {
            await win.unmaximize();
        } else {
            await win.maximize();
        }
    })
}

function updateStatusBar() {

    document.getElementById("file-path").textContent = page.path == "" ? "No file path" : page.path.split(/[/\\]/).pop()

    document.getElementById("file-saved").textContent = page.saved ? "Saved" : page.saved == false ? "Unsaved changes" : "Saving..."
    const formattedText = rawContentElement.value
        .trim()
        .replace(/( |\t)+/g, " ")
        .replace(/(\n|\r)+/g, "\n")

    const characters = rawContentElement.value.length;

    const words = formattedText
        .split(/\s/)
        .filter(el => el.trim() !== "")
        .length;
    document.getElementById("text-summary").textContent = `${words}w | ${characters}ch`;
}


function newToast(message) {
    const toast = document.createElement("div")

    console.log("created toast")

    toast.classList.add("toast")
    toast.textContent = message

    document.body.appendChild(toast)

    console.log("appended toast")

    setTimeout(() => {
        toast.classList.add("fadeOut")
        setTimeout(() => {
            toast.remove()
        }, 500)
    }, 3000)
}

function toggleVisibility(element, state = null) {
    if (state == true) element.style.display = "block"
    else element.style.display = "none"
}

function changeView(newView) {
    viewMode = newView

    if (window.innerWidth < breakpointWidth && newView === "both") viewMode = "raw"

    if (viewMode == "raw") {
        toggleVisibility(rawContentElement, true)
        toggleVisibility(markdownPreviewElement, false)
        rawContentElement.focus()
    } else if (viewMode == "md") {
        toggleVisibility(rawContentElement, false)
        toggleVisibility(markdownPreviewElement, true)
    } else if (viewMode == "both") {
        toggleVisibility(rawContentElement, true)
        toggleVisibility(markdownPreviewElement, true)
        rawContentElement.focus()
    }
    refresh()
    document.getElementById("view-mode").textContent = `View mode: ${viewMode}`
}


function refreshPage() {

    page.rawText = rawContentElement.value;

    const markdown = marked.parse(page.rawText);
    markdownPreviewElement.innerHTML = markdown;
}

function refreshUI() {

    rawContentElement.innerHTML = page.rawText
    rawContentElement.style.height = 'auto';
    rawContentElement.style.height = rawContentElement.scrollHeight + 'px';

}

function refresh(inverse = false) {
    if (!inverse) refreshPage()
    refreshUI()
    if (inverse) refreshPage()
    updateStatusBar()
}

window.addEventListener("DOMContentLoaded", () => {

    rawContentElement.focus()

    if (window.innerWidth < breakpointWidth && viewMode == "both") {
        changeView("raw")
    }

    window.addEventListener("resize", () => {
        if (window.innerWidth < breakpointWidth && viewMode == "both") {
            changeView("raw")
        }
    })

    rawContentElement.innerHTML = "";
    rawContentElement.addEventListener("input", () => {
        page.saved = false
        refresh();
    })

    window.addEventListener('keydown', async function (event) {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
            event.preventDefault()
            await saveFile(event.altKey)
        }
        else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') {
            event.preventDefault();
            await openFile()
        }
        else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
            event.preventDefault();
            newFile()
        }
        else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'e' && page.extension == "md") {
            event.preventDefault();
            if (viewMode == "raw") {
                changeView("md")
            } else if (viewMode == "md") {
                changeView("both")
            } else if (viewMode == "both") {
                changeView("raw")
            }
        }
    });

    refresh()
});


window.saveFile = async function (saveAs = false) {

    page.saved = null
    updateStatusBar()

    // Saves without opening the dialog
    if (page.path !== "" && !saveAs) {
        console.log("page.path:", page.path)
        try {
            const res = await invoke("save_file", {
                "content": page.rawText,
                "filePath": page.path
            });
            newToast("File saved!")
            page.saved = true
            if(page.extension == "txt") {
                changeView("raw")
            }
            updateStatusBar()
            refresh()
        } catch (e) {
            newToast("Error saving file")
        }
        return
    }

    try {
        const path = await tauri.dialog.save({
            filters: [
                {
                    name: 'Markdown',
                    extensions: ['md', 'markdown', 'txt'],
                },
            ],
        });

        // If the path exists
        if (path && path.trim() !== "") {
            const res = await invoke("save_file", {
                "content": page.rawText,
                "filePath": path
            });
            newToast("File saved!")
            page.extension = path.split(".").pop()
            page.saved = true
            page.path = path

            if(page.extension == "txt") {
                console.log("change view to raw")
                changeView("raw")
            }
            refresh()
        }
        else {
            // No path selected
            page.saved = false
        }

    } catch (e) {
        newToast("Error saving file");
        page.saved = false
    }

    updateStatusBar()
}

window.openFile = async function () {

    try {

        const path = await tauri.dialog.open({
            "multiple": false,
            "directory": false,
            "extensions": ["md", "markdown", 'txt']
        })
        console.log("open file path " + path);
        if (path && path.trim() !== "") {
            const content = await invoke("read_file", {
                "filePath": path
            });
            page.path = path
            page.extension = path.split(".").pop()
            page.saved = true;
            page.rawText = content;
            rawContentElement.value = page.rawText

            if(page.extension == "txt") {
                console.log("change to raw")
                changeView("raw")
            }
            refresh()
        }

    } catch (e) {
        console.error("Invoke error:", e);
    }

    updateStatusBar()
}

window.newFile = function () {
    page.rawText = ""
    page.saved = true
    page.extension = "md"
    rawContentElement.value = ""
    markdownPreviewElement.innerHTML = ""
    page.path = ""
    refresh()
    updateStatusBar()
}