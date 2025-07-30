
const { invoke } = window.__TAURI__.core;
const tauri = window.__TAURI__
const { getCurrentWindow } = window.__TAURI__.window
const { unregister } = window.__TAURI__.globalShortcut;
const breakpointWidth = 600;

window.page = {
    "title": "",
    "rawText": ""
}

let currentFilePath = ""

let viewMode = "both"

const rawContentElement = document.getElementById("raw-content");
const markdownPreviewElement = document.getElementById("markdown-preview");
const titleElement = document.getElementById("page-title")
const rawTextElement = document.getElementById("raw-text")



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

    const characters = rawContentElement.value.length;
    document.getElementById("char-count").textContent = `${characters} characters`;

    const formattedText = rawContentElement.value
        .trim()
        .replace(/( |\t)+/g, " ")
        .replace(/(\n|\r)+/g, "\n")

    const words = formattedText
        .split(" ")
        .filter(el => el.trim() !== "")
        .length;
    document.getElementById("word-count").textContent = `${words} words`;

    const lines = formattedText
        .split("\n")
        .filter(el => el.trim() !== "").length;
    document.getElementById("line-count").textContent = `${lines} lines`;
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
        toggleVisibility(rawTextElement, true)
        toggleVisibility(markdownPreviewElement, false)
    } else if (viewMode == "md") {
        toggleVisibility(rawTextElement, false)
        toggleVisibility(markdownPreviewElement, true)
    } else if (viewMode == "both") {
        toggleVisibility(rawTextElement, true)
        toggleVisibility(markdownPreviewElement, true)
    }
    refresh()
    document.getElementById("view-mode").textContent = `View mode: ${viewMode}`
}


function refreshPage() {

    page.title = titleElement.textContent
    page.rawText = rawContentElement.value;

    const markdown = marked.parse("# " + page.title + "  \n" + page.rawText);
    console.log("marldown: ", markdown)
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

    if (window.innerWidth < breakpointWidth && viewMode == "both") {
        changeView("raw")
    }

    window.addEventListener("resize", () => {
        if (window.innerWidth < breakpointWidth && viewMode == "both") {
            changeView("raw")
        }
    })

    titleElement.textContent = "";
    rawContentElement.innerHTML = "";

    titleElement.addEventListener("keypress", (e) => {
        if (e.key === "Enter")
            e.preventDefault();
    })

    titleElement.addEventListener("input", refresh)
    rawContentElement.addEventListener("input", refresh)

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
        else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'e') {
            event.preventDefault();
            if (viewMode == "raw") {
                changeView("md")
            } else if (viewMode == "md") {
                changeView("both")
            } else if (viewMode == "both") {
                changeView("raw")
            }
        }
        else if (event.key === 'Tab') {
            event.preventDefault()
            if (this.document.activeElement == rawContentElement) {
                titleElement.focus()
            } else {
                rawContentElement.focus()
            }
        }
    });

    refresh()
});


window.saveFile = async function (saveAs = false) {
    if (page.title.trim() === "") {
        newToast("Can't save a file without a title")
        return
    }

    // Saves without opening the dialog
    if (currentFilePath !== "" && !saveAs) {
        console.log("currentfilepath:", currentFilePath)
        try {
            const res = await invoke("save_file", {
                "pageAttr": {
                    "title": page.title,
                    "raw_text": page.rawText
                }, "filePath": currentFilePath
            });
        } catch (e) {
            console.error("Invoke error:", e)
        }
        return
    }

    try {
        const path = await tauri.dialog.save({
            filters: [
                {
                    name: 'Markdown',
                    extensions: ['md', 'markdown'],
                },
            ],
        });
        if (path && path.trim() !== "") {
            const res = await invoke("save_file", {
                "pageAttr": {
                    "title": page.title,
                    "raw_text": page.rawText
                }, "filePath": path
            });
            currentFilePath = path
        }

    } catch (e) {
        console.error("Invoke error:", e);
    }
}

window.openFile = async function () {

    try {

        const path = await tauri.dialog.open({
            "multiple": false,
            "directory": false,
            "extensions": ["md", "markdown"]
        })
        console.log("open file path " + path);
        if (path && path.trim() !== "") {
            const pageAttributes = await invoke("read_file", {
                "filePath": path
            });
            currentFilePath = path

            page.title = pageAttributes[0];
            page.rawText = pageAttributes[1];
            titleElement.textContent = page.title
            rawContentElement.value = page.rawText
            refresh()
        }

    } catch (e) {
        console.error("Invoke error:", e);
    }
}

window.newFile = function () {
    page.title = ""
    page.rawText = ""
    rawContentElement.value = ""
    titleElement.textContent = ""
    markdownPreviewElement.innerHTML = ""
    currentFilePath = ""
}