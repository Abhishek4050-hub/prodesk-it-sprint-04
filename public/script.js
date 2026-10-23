// Elements
const form = document.getElementById("letterForm");
const resumeInput = document.getElementById("resume");
const dropZone = document.getElementById("dropZone");
const fileName = document.getElementById("fileName");
const fileDetails = document.getElementById("fileDetails");
const removeFileBtn = document.getElementById("removeFileBtn");
const generateBtn = document.getElementById("generateBtn");
const btnText = document.getElementById("btnText");
const message = document.getElementById("message");
const resultArea = document.getElementById("resultArea");
const emptyState = document.getElementById("emptyState");
const loadingState = document.getElementById("loadingState");
const letterOutput = document.getElementById("letterOutput");
const modeLabel = document.getElementById("modeLabel");
const warningNotice = document.getElementById("warningNotice");
const warningText = document.getElementById("warningText");
const wordCountEl = document.getElementById("wordCount");
const readTimeEl = document.getElementById("readTime");
const copyBtn = document.getElementById("copyBtn");
const copyBtnIcon = document.getElementById("copyBtnIcon");
const copyBtnText = document.getElementById("copyBtnText");
const copyMessage = document.getElementById("copyMessage");
const downloadBtn = document.getElementById("downloadBtn");
const printBtn = document.getElementById("printBtn");
const fillDemoBtn = document.getElementById("fillDemoBtn");
const themeBtn = document.getElementById("themeBtn");
const serverStatus = document.getElementById("serverStatus");
const serverStatusText = document.getElementById("serverStatusText");
const serverNotice = document.getElementById("serverNotice");
const serverNoticeText = document.getElementById("serverNoticeText");
const dismissNoticeBtn = document.getElementById("dismissNoticeBtn");

// Character Counter Elements
const skillsInput = document.getElementById("skills");
const skillsCounter = document.getElementById("skillsCounter");
const jobDescInput = document.getElementById("jobDescription");
const jobDescCounter = document.getElementById("jobDescCounter");

let generatedLetter = "";
let selectedFile = null;
let tipInterval = null;

// Determine backend API base URL
function getApiBaseUrl() {
    // If the page itself is served on port 3000, use relative paths
    if (window.location.port === "3000") {
        return "";
    }
    // If accessed via Live Server (e.g. port 5500), Vite, or file://, target localhost:3000
    const host = window.location.hostname || "localhost";
    return `http://${host}:3000`;
}

// Check Backend Health
async function checkBackendHealth() {
    try {
        const res = await fetch(`${getApiBaseUrl()}/api/health`, { method: "GET" });
        if (res.ok) {
            const data = await res.json();
            serverStatus.className = "status online";
            serverStatusText.textContent = data.model ? `AI Ready (${data.model})` : "Server Online";
            serverNotice.hidden = true;
        } else {
            throw new Error(`HTTP ${res.status}`);
        }
    } catch {
        serverStatus.className = "status offline";
        serverStatusText.textContent = "Backend Offline";
        if (window.location.port !== "3000") {
            serverNotice.hidden = false;
            serverNoticeText.innerHTML = `Backend server not detected on port 3000. In VS Code terminal, run <code>npm start</code>, then open <a href="http://localhost:3000" target="_blank">http://localhost:3000</a>.`;
        }
    }
}

// Theme Management
function initTheme() {
    const saved = localStorage.getItem("lettercraft_theme");
    if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
        document.body.classList.add("dark");
        themeBtn.textContent = "🌙";
    } else {
        document.body.classList.remove("dark");
        themeBtn.textContent = "☀️";
    }
}

themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    themeBtn.textContent = isDark ? "🌙" : "☀️";
    localStorage.setItem("lettercraft_theme", isDark ? "dark" : "light");
});

// Dismiss server notice
dismissNoticeBtn?.addEventListener("click", () => {
    serverNotice.hidden = true;
});

// Character Counters
function updateCounters() {
    skillsCounter.textContent = `${skillsInput.value.length}/2000`;
    jobDescCounter.textContent = `${jobDescInput.value.length}/6000`;
}
skillsInput.addEventListener("input", updateCounters);
jobDescInput.addEventListener("input", updateCounters);

// Fill Sample Data
fillDemoBtn.addEventListener("click", () => {
    document.getElementById("name").value = "Alex Morgan";
    document.getElementById("role").value = "Senior Frontend Engineer";
    document.getElementById("company").value = "Linear";
    skillsInput.value = "React, TypeScript, CSS Architecture, Performance Optimization, Node.js, UI/UX Design Systems";
    jobDescInput.value = "Looking for a Senior Frontend Engineer to build high-performance, polished web applications. You will collaborate with design and product teams to deliver smooth, accessible user experiences.";
    updateCounters();
    showMessage("Sample data loaded. Click 'Generate cover letter' to test!", "success");
});

// File Upload & Drag-Drop Handling
function formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function handleFileSelection(file) {
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        showMessage("Please select a PDF file.", "error");
        clearFile();
        return;
    }

    if (file.size > 3 * 1024 * 1024) {
        showMessage("Resume file size must be less than 3 MB.", "error");
        clearFile();
        return;
    }

    selectedFile = file;
    fileName.textContent = file.name;
    fileDetails.textContent = `${formatBytes(file.size)} · PDF attached`;
    removeFileBtn.hidden = false;
    dropZone.classList.add("has-file");
}

function clearFile() {
    selectedFile = null;
    resumeInput.value = "";
    fileName.textContent = "Upload your resume";
    fileDetails.textContent = "Click or drag & drop a PDF file here (Max 3 MB)";
    removeFileBtn.hidden = true;
    dropZone.classList.remove("has-file");
}

dropZone.addEventListener("click", (e) => {
    if (e.target !== removeFileBtn) {
        resumeInput.click();
    }
});

dropZone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        resumeInput.click();
    }
});

resumeInput.addEventListener("change", () => {
    if (resumeInput.files[0]) {
        handleFileSelection(resumeInput.files[0]);
    }
});

removeFileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    clearFile();
});

// Drag and drop events
["dragenter", "dragover"].forEach((name) => {
    dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.classList.add("drag-over");
    });
});

["dragleave", "drop"].forEach((name) => {
    dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.classList.remove("drag-over");
    });
});

dropZone.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    const file = dt.files[0];
    if (file) {
        handleFileSelection(file);
    }
});

// Loading Tips Carousel
const loadingTips = [
    "Analyzing your skills and target role requirements...",
    "Highlighting key accomplishments and relevant experience...",
    "Drafting compelling introductory and closing statements...",
    "Refining tone for executive professionalism...",
    "Polishing sentence flow and typography structure..."
];

function startLoadingState() {
    emptyState.hidden = true;
    resultArea.hidden = true;
    loadingState.hidden = false;
    generateBtn.disabled = true;
    btnText.textContent = "Generating your letter...";

    let tipIndex = 0;
    const tipEl = document.getElementById("loadingTip");
    tipEl.textContent = loadingTips[0];

    tipInterval = setInterval(() => {
        tipIndex = (tipIndex + 1) % loadingTips.length;
        tipEl.textContent = loadingTips[tipIndex];
    }, 2800);
}

function stopLoadingState() {
    if (tipInterval) {
        clearInterval(tipInterval);
        tipInterval = null;
    }
    loadingState.hidden = true;
    generateBtn.disabled = false;
    btnText.textContent = "✦ Generate cover letter";
}

function showMessage(text, type = "error") {
    message.textContent = text;
    message.className = `message-banner ${type}`;
    message.hidden = false;
}

function clearMessage() {
    message.textContent = "";
    message.hidden = true;
}

// Letter Statistics (word count & read time)
function updateLetterStats(text) {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const readMinutes = Math.max(1, Math.ceil(words / 200));
    wordCountEl.textContent = `${words} words`;
    readTimeEl.textContent = `${readMinutes} min read`;
}

// Display Letter
function showLetter(letter, mode, warning) {
    letterOutput.textContent = "";
    const paragraphs = letter.split(/\n\s*\n/).filter(Boolean);

    paragraphs.forEach((para) => {
        const p = document.createElement("p");
        p.textContent = para.trim();
        letterOutput.appendChild(p);
    });

    modeLabel.textContent = mode === "ai" ? "✦ Gemini AI" : "Smart Template";

    if (warning) {
        warningText.textContent = warning;
        warningNotice.hidden = false;
    } else {
        warningNotice.hidden = true;
    }

    updateLetterStats(letter);
    emptyState.hidden = true;
    resultArea.hidden = false;
}

// Form Submission
form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    startLoadingState();

    const formData = new FormData(form);

    // If resume was attached
    if (selectedFile) {
        formData.set("resume", selectedFile);
    } else {
        formData.delete("resume");
    }

    const apiUrl = `${getApiBaseUrl()}/api/generate`;

    try {
        let response;
        try {
            response = await fetch(apiUrl, {
                method: "POST",
                body: formData
            });
        } catch (fetchErr) {
            console.error("Fetch network error:", fetchErr);
            throw new Error(
                "Could not connect to the backend server. Please make sure the server is running on http://localhost:3000 (run 'npm start' in terminal)."
            );
        }

        const text = await response.text();
        let result;

        try {
            result = JSON.parse(text);
        } catch {
            if (response.status === 405) {
                throw new Error(
                    "Received HTTP 405 Method Not Allowed from static server. Please open the app directly at http://localhost:3000"
                );
            }
            throw new Error(`Server returned unexpected response (HTTP ${response.status}). Check backend terminal.`);
        }

        if (!response.ok) {
            throw new Error(result.error || "Could not generate cover letter.");
        }

        generatedLetter = result.letter;
        showLetter(generatedLetter, result.mode, result.warning);
        showMessage("Cover letter generated successfully!", "success");

        // Scroll smoothly to result on smaller screens
        if (window.innerWidth < 900) {
            resultArea.scrollIntoView({ behavior: "smooth" });
        }
    } catch (error) {
        console.error("Submission failed:", error);
        showMessage(error.message || "Failed to generate letter. Please try again.", "error");
        emptyState.hidden = false;
        resultArea.hidden = true;
    } finally {
        stopLoadingState();
    }
});

// Update word count if user edits the letter directly
letterOutput.addEventListener("input", () => {
    generatedLetter = letterOutput.innerText;
    updateLetterStats(generatedLetter);
});

// Copy to Clipboard (with fallback)
copyBtn.addEventListener("click", async () => {
    const textToCopy = letterOutput.innerText || generatedLetter;
    if (!textToCopy) return;

    let success = false;

    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(textToCopy);
            success = true;
        } catch {
            success = false;
        }
    }

    if (!success) {
        // Fallback for older browsers or non-secure contexts
        const textarea = document.createElement("textarea");
        textarea.value = textToCopy;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        try {
            success = document.execCommand("copy");
        } catch {
            success = false;
        }
        document.body.removeChild(textarea);
    }

    if (success) {
        copyBtnIcon.textContent = "✓";
        copyBtnText.textContent = "Copied!";
        copyMessage.textContent = "Cover letter copied to clipboard.";
        copyMessage.hidden = false;

        setTimeout(() => {
            copyBtnIcon.textContent = "📋";
            copyBtnText.textContent = "Copy letter";
            copyMessage.hidden = true;
        }, 2500);
    } else {
        copyMessage.textContent = "Could not automatically copy. Please select the text and press Ctrl+C.";
        copyMessage.hidden = false;
    }
});

// Download .txt
downloadBtn.addEventListener("click", () => {
    const textToDownload = letterOutput.innerText || generatedLetter;
    if (!textToDownload) return;

    const role = document.getElementById("role").value.trim() || "Cover-Letter";
    const company = document.getElementById("company").value.trim() || "Application";
    const filename = `${role.replace(/\s+/g, "_")}_${company.replace(/\s+/g, "_")}.txt`;

    const blob = new Blob([textToDownload], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
});

// Print / PDF
printBtn.addEventListener("click", () => {
    window.print();
});

// Initialize on page load
initTheme();
updateCounters();
checkBackendHealth();
