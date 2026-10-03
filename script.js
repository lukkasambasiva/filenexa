 "use strict";

/* =========================================================
   FILE & QR CONVERTER
   COMPLETE CORRECTED SCRIPT.JS
   ========================================================= */


/* =========================================================
   GLOBAL VARIABLES
   ========================================================= */

let selectedImages = [];
let mergeFiles = [];
let qrScanner = null;

function getElement(id) {
    return document.getElementById(id);
}


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}


function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


async function waitForGlobal(name, timeout = 20000) {

    const start = Date.now();

    while (Date.now() - start < timeout) {

        if (window[name]) {
            return window[name];
        }

        await wait(100);
    }

    throw new Error(
        name + " library is not loaded. Please refresh the page."
    );
}


function getJsPDF() {

    if (window.jspdf && window.jspdf.jsPDF) {
        return window.jspdf.jsPDF;
    }

    if (window.jsPDF) {
        return window.jsPDF;
    }

    return null;
}


function escapeHTML(value) {

    return String(value ?? "").replace(
        /[&<>'"]/g,
        char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;"
        })[char]
    );
}


function xmlEscape(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}


function formatFileSize(bytes) {

    if (!bytes) {
        return "0 B";
    }

    const units = ["B", "KB", "MB", "GB"];

    let index = 0;
    let size = bytes;

    while (
        size >= 1024 &&
        index < units.length - 1
    ) {
        size /= 1024;
        index++;
    }

    return size.toFixed(index === 0 ? 0 : 1)
        + " "
        + units[index];
}


function getOutputFileName(
    originalName,
    suffix = "",
    extension = ""
) {

    const base = String(originalName || "file")
        .replace(/\.[^.]+$/, "");

    return base + suffix + extension;
}


/* =========================================================
   FILE READING
   ========================================================= */

function readFileAsArrayBuffer(file) {

    return new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onload = () => {
            resolve(reader.result);
        };

        reader.onerror = () => {
            reject(
                reader.error ||
                new Error("Unable to read file.")
            );
        };

        reader.readAsArrayBuffer(file);
    });
}


function readFileAsDataURL(file) {

    return new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onload = () => {
            resolve(reader.result);
        };

        reader.onerror = () => {
            reject(
                reader.error ||
                new Error("Unable to read file.")
            );
        };

        reader.readAsDataURL(file);
    });
}


function loadImage(source) {

    return new Promise((resolve, reject) => {

        const image = new Image();

        image.onload = () => {
            resolve(image);
        };

        image.onerror = () => {
            reject(
                new Error("Unable to load image.")
            );
        };

        image.src = source;
    });
}


/* =========================================================
   DOWNLOAD HELPERS
   ========================================================= */

function downloadBlob(blob, filename) {

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);

    link.click();

    link.remove();

    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 1500);
}


function downloadDataURL(dataURL, filename) {

    const link = document.createElement("a");

    link.href = dataURL;
    link.download = filename;

    document.body.appendChild(link);

    link.click();

    link.remove();
}


/* =========================================================
   LOADER
   ========================================================= */

function showLoading(message = "Processing...") {

    let loader = $("global-loader");

    if (!loader) {

        loader = document.createElement("div");

        loader.id = "global-loader";

        loader.innerHTML = `
            <div class="loader-overlay">
                <div class="loader-box">

                    <div class="loader-spinner"></div>

                    <div id="loader-message">
                        Processing...
                    </div>

                </div>
            </div>
        `;

        document.body.appendChild(loader);
    }

    const messageElement = $("loader-message");

    if (messageElement) {
        messageElement.textContent = message;
    }

    loader.style.display = "block";
}


function hideLoading() {

    const loader = $("global-loader");

    if (loader) {
        loader.style.display = "none";
    }
}


/* =========================================================
   PDF.JS WORKER
   IMPORTANT
   ========================================================= */

function setupPDFJS() {

    if (
        window.pdfjsLib &&
        window.pdfjsLib.GlobalWorkerOptions
    ) {

        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
}


/* =========================================================
   PROFESSIONAL TOOL STYLES
   ========================================================= */

function injectProfessionalStyles() {

    if ($("dynamic-tool-styles")) {
        return;
    }

    const style = document.createElement("style");

    style.id = "dynamic-tool-styles";

    style.textContent = `

        :root {
            --primary: #2563eb;
            --primary-dark: #1d4ed8;
            --text: #1e293b;
            --muted: #64748b;
            --border: #e2e8f0;
            --background: #f8fafc;
            --white: #ffffff;
            --success: #15803d;
            --danger: #b91c1c;
        }

        .tool-workspace {
            max-width: 900px;
            margin: 25px auto;
            padding: 30px;
            background: #ffffff;
            border: 1px solid var(--border);
            border-radius: 20px;
            box-shadow: 0 12px 35px rgba(15,23,42,.08);
        }

        .tool-workspace h2 {
            margin-top: 0;
            color: var(--text);
        }

        .tool-workspace p {
            color: var(--muted);
            line-height: 1.7;
        }

        .tool-note {
            margin: 18px 0;
            padding: 13px 15px;
            border-radius: 12px;
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            color: #1e40af;
            line-height: 1.6;
        }

        .upload-box {
            position: relative;
            margin-top: 20px;
            padding: 30px;
            text-align: center;
            background: #f8fbff;
            border: 2px dashed #bfdbfe;
            border-radius: 18px;
            transition: .2s ease;
        }

        .upload-box.drag-over {
            background: #eff6ff;
            border-color: var(--primary);
            transform: scale(1.01);
        }

        .upload-box input[type="file"] {
            display: block;
            width: 100%;
            margin: 15px 0;
        }

        .drop-hint {
            margin-top: 10px;
            color: var(--muted);
            font-size: 13px;
        }

        .file-list {
            margin-top: 18px;
        }

        .file-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 12px 14px;
            margin: 8px 0;
            background: #ffffff;
            border: 1px solid var(--border);
            border-radius: 10px;
        }

        .action-btn,
        .download-btn {
            border: none;
            border-radius: 10px;
            padding: 11px 17px;
            background: var(--primary);
            color: #ffffff;
            font-weight: 700;
            cursor: pointer;
            transition: .2s ease;
            margin: 5px;
        }

        .action-btn:hover,
        .download-btn:hover {
            background: var(--primary-dark);
            transform: translateY(-1px);
        }

        .secondary-btn {
            background: #e2e8f0 !important;
            color: #0f172a !important;
        }

        .result-box {
            margin-top: 18px;
            padding: 15px;
            border-radius: 12px;
            line-height: 1.6;
        }

        .result-box.success {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            color: #166534;
        }

        .result-box.error {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #991b1b;
        }

        .qr-output {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            margin-top: 20px;
        }

        .qr-box {
            padding: 15px;
            background: #ffffff;
            border: 1px solid var(--border);
            border-radius: 10px;
        }

        .info-page {
            max-width: 950px;
            margin: 25px auto;
            padding: 30px;
            background: #ffffff;
            border: 1px solid var(--border);
            border-radius: 20px;
            box-shadow: 0 12px 35px rgba(15,23,42,.07);
        }

        .info-page h2 {
            margin-top: 0;
        }

        .info-page h3 {
            margin-top: 25px;
        }

        .info-page p,
        .info-page li {
            line-height: 1.8;
            color: #475569;
        }

        .info-page li {
            margin: 7px 0;
        }

        .ad-container {
            min-height: 90px;
            margin: 18px 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8fafc;
            border: 1px dashed #cbd5e1;
            border-radius: 12px;
            color: #94a3b8;
        }

        .popup-ad-overlay {
            position: fixed;
            inset: 0;
            z-index: 9998;
            display: none;
            align-items: center;
            justify-content: center;
            background: rgba(15,23,42,.55);
            padding: 20px;
        }

        .popup-ad-box {
            position: relative;
            width: min(420px, 100%);
            padding: 25px;
            background: #ffffff;
            border-radius: 18px;
            box-shadow: 0 25px 70px rgba(0,0,0,.25);
            text-align: center;
        }

        .popup-ad-close {
            position: absolute;
            top: 10px;
            right: 10px;
            width: 32px;
            height: 32px;
            border: none;
            border-radius: 50%;
            background: #0f172a;
            color: #ffffff;
            cursor: pointer;
            font-size: 18px;
        }

        .ad-label {
            margin-bottom: 8px;
            color: #94a3b8;
            font-size: 10px;
            letter-spacing: 1px;
        }

        .ad-placeholder {
            min-height: 120px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #94a3b8;
        }

        .side-ad-rail {
            position: fixed;
            top: 180px;
            width: 160px;
            height: 280px;
            z-index: 90;
        }

        .side-ad-left {
            left: 12px;
        }

        .side-ad-right {
            right: 12px;
        }

        .side-ad-rail .ad-container {
            width: 160px;
            height: 280px;
            margin: 0;
        }

        .loader-overlay {
            position: fixed;
            inset: 0;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(15,23,42,.4);
        }

        .loader-box {
            min-width: 190px;
            padding: 25px 30px;
            background: #ffffff;
            border-radius: 18px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,.2);
        }

        .loader-spinner {
            width: 38px;
            height: 38px;
            margin: 0 auto 12px;
            border: 4px solid #dbeafe;
            border-top-color: var(--primary);
            border-radius: 50%;
            animation: fileqrspin .8s linear infinite;
        }

        @keyframes fileqrspin {
            to {
                transform: rotate(360deg);
            }
        }

        .word-render-container {
    position: fixed;
    left: 0;
    top: 0;
    width: 794px;
    min-height: 1123px;
    background: #ffffff;
    pointer-events: none;
    z-index: 1;
    overflow: visible;
}

        .universal-drop-zone.drag-over {
            background: #eff6ff !important;
            border-color: #2563eb !important;
        }

        @media (max-width: 1250px) {

            .side-ad-rail {
                display: none !important;
            }
        }

        @media (max-width: 700px) {

            .tool-workspace,
            .info-page {
                margin: 15px 8px;
                padding: 20px;
                border-radius: 15px;
            }

            .upload-box {
                padding: 20px;
            }

            .file-item {
                flex-direction: column;
                align-items: flex-start;
            }

            .action-btn,
            .download-btn {
                width: 100%;
                margin: 5px 0;
            }
        }
    `;

    document.head.appendChild(style);
}


/* =========================================================
   ADS
   ========================================================= */

function createAd(id = "", type = "normal") {

    return `
        <div
            class="ad-container ${type === "side" ? "side" : ""}"
            id="${id}"
            data-ad-slot="YOUR_AD_SLOT"
        >
            <div>
                <div class="ad-label">
                    ADVERTISEMENT
                </div>

                <div class="ad-placeholder">
                    <span>
                        Advertisement
                    </span>
                </div>
            </div>
        </div>
    `;
}


function createAdLayout() {

    if (!$("site-ad-layout")) {

        const wrapper = document.createElement("div");

        wrapper.id = "site-ad-layout";

        wrapper.innerHTML = `

            <div class="side-ad-rail side-ad-left">
                ${createAd("left-side-ad", "side")}
            </div>

            <div class="side-ad-rail side-ad-right">
                ${createAd("right-side-ad", "side")}
            </div>

        `;

        document.body.appendChild(wrapper);
    }


    if (!$("site-popup-ad")) {

        const popup = document.createElement("div");

        popup.id = "site-popup-ad";

        popup.className = "popup-ad-overlay";

        popup.innerHTML = `

            <div class="popup-ad-box">

                <button
                    class="popup-ad-close"
                    onclick="closePopupAd()"
                    aria-label="Close advertisement"
                >
                    ×
                </button>

                <div class="ad-label">
                    ADVERTISEMENT
                </div>

                <div class="ad-placeholder">
                    Advertisement
                </div>

            </div>
        `;

        document.body.appendChild(popup);


        popup.addEventListener("click", event => {

            if (event.target === popup) {
                closePopupAd();
            }

        });
    }
}


function showPopupAd() {

    if (qrScanner) {
        return;
    }

    const popup = $("site-popup-ad");

    if (popup) {
        popup.style.display = "flex";
    }
}


function closePopupAd() {

    const popup = $("site-popup-ad");

    if (popup) {
        popup.style.display = "none";
    }
}


window.showPopupAd = showPopupAd;
window.closePopupAd = closePopupAd;


function startPopupAds() {

    setTimeout(() => {

        showPopupAd();

    }, 12000);


    setInterval(() => {

        if (!qrScanner) {
            showPopupAd();
        }

    }, 90000);
}


/* =========================================================
   MOBILE MENU
   ========================================================= */

function setupMobileMenu() {

    const menuButton = $("menu-btn");

    const nav =
        $("nav-menu") ||
        document.querySelector("nav");


    if (!menuButton || !nav) {

        console.warn(
            "Mobile menu elements not found."
        );

        return;
    }


    if (menuButton.dataset.menuReady) {
        return;
    }

    menuButton.dataset.menuReady = "true";


    menuButton.addEventListener(
        "click",
        () => {

            nav.classList.toggle("active");
            nav.classList.toggle("open");

        }
    );


    nav.querySelectorAll("button").forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    nav.classList.remove("active");
                    nav.classList.remove("open");

                }
            );

        }
    );
}


/* =========================================================
   TOOL SHELL
   ========================================================= */

function toolShell(
    title,
    description,
    body
) {

    return `

        <div class="tool-workspace">

            <button
                class="action-btn secondary-btn"
                type="button"
                onclick="backHome()"
            >
                ← All Tools
            </button>

            <h2>${escapeHTML(title)}</h2>

            <p>
                ${description}
            </p>

            ${body}

        </div>
    `;
}


function backHome() {

    stopQRScanner();

    const content = $("tool-content");

    if (!content) {
        return;
    }

    content.innerHTML = `

        <div class="welcome-box">

            <div class="welcome-icon">
                🛠️
            </div>

            <h2>
                Select a Tool
            </h2>

            <p>
                Choose any tool above to get started.
            </p>

        </div>
    `;

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   FILE INPUT HTML
   ========================================================= */

function setupInput(
    id,
    accept,
    multiple = false
) {

    return `

        <div class="upload-box">

            <h3>
                Select File${multiple ? "s" : ""}
            </h3>

            <input
                type="file"
                id="${id}"
                accept="${accept}"
                ${multiple ? "multiple" : ""}
            >

            <div class="drop-hint">
                Drag & drop your file${multiple ? "s" : ""}
                here, or click to browse.
            </div>

        </div>
    `;
}


/* =========================================================
   OPEN TOOL
   ========================================================= */

async function openTool(tool) {

    await stopQRScanner();

    const content = $("tool-content");

    if (!content) {
        return;
    }


    const toolMap = {

        "jpg-pdf": showJPGToPDF,
        "jpg-to-pdf": showJPGToPDF,

        "pdf-jpg": showPDFToJPG,
        "pdf-to-jpg": showPDFToJPG,

        "text-qr": showTextToQR,
        "text-to-qr": showTextToQR,

        "qr-scanner": showQRScanner,
        "qr": showQRScanner,

        "pdf-word": showPDFToWord,
        "pdf-to-word": showPDFToWord,

        "word-pdf": showWordToPDF,
        "word-to-pdf": showWordToPDF,

        "pdf-excel": showPDFToExcel,
        "pdf-to-excel": showPDFToExcel,

        "excel-pdf": showExcelToPDF,
        "excel-to-pdf": showExcelToPDF,

        "merge-pdf": showMergePDF,
        "merge": showMergePDF,

        "page-numbers": showPageNumbers,
        "add-page-numbers": showPageNumbers

    };


    const selectedTool = toolMap[tool];


    if (!selectedTool) {

        content.innerHTML = toolShell(
            "Tool Not Found",
            "Please select a valid tool.",
            ""
        );

        return;
    }


    try {

        selectedTool();

    } catch (error) {

        console.error(error);

        content.innerHTML = `

            <div class="tool-workspace">

                <h2>
                    Tool Error
                </h2>

                <div class="result-box error">
                    ${escapeHTML(error.message)}
                </div>

            </div>
        `;
    }


    const nav =
        $("nav-menu") ||
        document.querySelector("nav");

    if (nav) {

        nav.classList.remove("active");
        nav.classList.remove("open");
    }


    setTimeout(() => {

        content.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }, 50);
}


window.openTool = openTool;


/* =========================================================
   JPG TO PDF
   ========================================================= */

function showJPGToPDF() {

    selectedImages = [];

    const content = $("tool-content");

    content.innerHTML = toolShell(

        "JPG to PDF",

        "Convert one or multiple JPG, JPEG or PNG images into a PDF.",

        `

            ${createAd("jpg-pdf-top-ad")}

            ${setupInput(
                "jpg-files",
                "image/jpeg,image/jpg,image/png",
                true
            )}

            <div
                id="jpg-file-list"
                class="file-list"
            ></div>

            <button
                class="action-btn"
                type="button"
                onclick="convertImagesToPDF()"
            >
                Convert to PDF
            </button>

            <div id="jpg-result"></div>

            ${createAd("jpg-pdf-bottom-ad")}

        `
    );


    const input = $("jpg-files");

    input.addEventListener(
        "change",
        event => {

            selectedImages =
                Array.from(event.target.files || []);

            renderJPGFileList();
        }
    );
}


function renderJPGFileList() {

    const list = $("jpg-file-list");

    if (!list) {
        return;
    }


    if (!selectedImages.length) {

        list.innerHTML = "";

        return;
    }


    list.innerHTML =
        selectedImages.map(
            (file, index) => `

                <div class="file-item">

                    <span>
                        ${escapeHTML(file.name)}
                        <br>
                        <small>
                            ${formatFileSize(file.size)}
                        </small>
                    </span>

                    <button
                        class="action-btn secondary-btn"
                        type="button"
                        onclick="
                            selectedImages.splice(${index},1);
                            renderJPGFileList();
                        "
                    >
                        Remove
                    </button>

                </div>

            `
        ).join("");
}


async function convertImagesToPDF() {

    const output = $("jpg-result");

    if (!selectedImages.length) {

        output.innerHTML = `
            <div class="result-box error">
                Please select at least one image.
            </div>
        `;

        return;
    }


    showLoading("Creating PDF...");


    try {

        const jsPDF = getJsPDF();

        if (!jsPDF) {
            throw new Error(
                "jsPDF library is not available."
            );
        }


        const pdf =
            new jsPDF({
                unit: "mm",
                format: "a4",
                orientation: "portrait"
            });


        for (
            let index = 0;
            index < selectedImages.length;
            index++
        ) {

            const file =
                selectedImages[index];

            const dataURL =
                await readFileAsDataURL(file);

            const image =
                await loadImage(dataURL);


            if (index > 0) {
                pdf.addPage();
            }


            const landscape =
                image.width > image.height;


            if (
                pdf.internal.pageSize
                .setOrientation
            ) {

                pdf.internal.pageSize.setOrientation(
                    landscape
                        ? "landscape"
                        : "portrait"
                );
            }


            const pageWidth =
                pdf.internal.pageSize.getWidth();

            const pageHeight =
                pdf.internal.pageSize.getHeight();


            const margin = 10;

            let width =
                pageWidth - margin * 2;

            let height =
                image.height /
                image.width *
                width;


            if (
                height >
                pageHeight - margin * 2
            ) {

                height =
                    pageHeight - margin * 2;

                width =
                    image.width /
                    image.height *
                    height;
            }


            const x =
                (pageWidth - width) / 2;

            const y =
                (pageHeight - height) / 2;


            let format = "JPEG";

            if (
                file.type === "image/png"
            ) {
                format = "PNG";
            }


            pdf.addImage(
                dataURL,
                format,
                x,
                y,
                width,
                height,
                undefined,
                "FAST"
            );
        }


        pdf.save(
            "images-to-pdf.pdf"
        );


        output.innerHTML = `
            <div class="result-box success">
                PDF created successfully.
            </div>
        `;

    } catch (error) {

        console.error(error);

        output.innerHTML = `
            <div class="result-box error">
                JPG to PDF failed:
                ${escapeHTML(error.message)}
            </div>
        `;

    } finally {

        hideLoading();
    }
}


/* =========================================================
   PDF TO JPG
   ========================================================= */

function showPDFToJPG() {

    const content = $("tool-content");

    content.innerHTML = toolShell(

        "PDF to JPG",

        "Convert every page of a PDF into a JPG image.",

        `

            ${setupInput(
                "pdf-jpg-file",
                "application/pdf"
            )}

            <div id="pdf-jpg-result"></div>

        `
    );


    $("pdf-jpg-file").addEventListener(
        "change",
        convertPDFToJPG
    );
}


async function convertPDFToJPG(event) {

    const file =
        event.target.files?.[0];

    const output =
        $("pdf-jpg-result");


    if (!file) {
        return;
    }


    showLoading(
        "Rendering PDF pages..."
    );


    try {

        const pdfjs =
            await waitForGlobal(
                "pdfjsLib"
            );


        setupPDFJS();


        const arrayBuffer =
            await readFileAsArrayBuffer(file);


        const pdf =
            await pdfjs.getDocument({
                data: arrayBuffer
            }).promise;


        let html = `

            <div class="result-box success">
                PDF rendered successfully.
                Download each page below.
            </div>
        `;


        const downloads = [];


        for (
            let pageNumber = 1;
            pageNumber <= pdf.numPages;
            pageNumber++
        ) {

            const page =
                await pdf.getPage(pageNumber);


            const viewport =
                page.getViewport({
                    scale: 2
                });


            const canvas =
                document.createElement("canvas");


            canvas.width =
                Math.ceil(viewport.width);

            canvas.height =
                Math.ceil(viewport.height);


            const context =
                canvas.getContext("2d");


            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;


            const imageURL =
                canvas.toDataURL(
                    "image/jpeg",
                    0.92
                );


            const filename =
                getOutputFileName(
                    file.name,
                    "-page-" + pageNumber,
                    ".jpg"
                );


            const id =
                "pdf-jpg-download-" +
                pageNumber;


            html += `

                <div class="file-item">

                    <span>
                        Page ${pageNumber}
                    </span>

                    <button
                        id="${id}"
                        class="download-btn"
                        type="button"
                    >
                        Download JPG
                    </button>

                </div>
            `;


            downloads.push({
                id,
                imageURL,
                filename
            });
        }


        output.innerHTML = html;


        downloads.forEach(item => {

            const button =
                $(item.id);

            if (!button) {
                return;
            }


            button.addEventListener(
                "click",
                () => {

                    downloadDataURL(
                        item.imageURL,
                        item.filename
                    );

                }
            );

        });


    } catch (error) {

        console.error(error);

        output.innerHTML = `
            <div class="result-box error">
                PDF to JPG failed:
                ${escapeHTML(error.message)}
            </div>
        `;

    } finally {

        hideLoading();
    }
}


/* =========================================================
   TEXT TO QR
   ========================================================= */

function showTextToQR() {

    const content = $("tool-content");

    content.innerHTML = toolShell(

        "Text to QR",

        "Create a QR code from text, URL or any message.",

        `

            <textarea
                id="qr-text"
                rows="6"
                style="
                    width:100%;
                    box-sizing:border-box;
                    padding:14px;
                    border:1px solid #cbd5e1;
                    border-radius:12px;
                    resize:vertical;
                "
                placeholder="Enter text or URL..."
            ></textarea>

            <br>

            <button
                class="action-btn"
                type="button"
                onclick="generateQRCode()"
            >
                Generate QR
            </button>

            <div
                id="qr-output"
                class="qr-output"
            ></div>

        `
    );
}


async function generateQRCode() {

    const textElement =
        $("qr-text");

    const output =
        $("qr-output");


    const text =
        textElement.value.trim();


    if (!text) {

        output.innerHTML = `
            <div class="result-box error">
                Please enter text first.
            </div>
        `;

        return;
    }


    try {

        const QRCode =
            await waitForGlobal(
                "QRCode"
            );


        output.innerHTML = `

            <div
                id="qr-code"
                class="qr-box"
            ></div>

            <button
                id="qr-download"
                class="download-btn"
                type="button"
            >
                Download QR
            </button>

            <button
                id="qr-copy"
                class="action-btn secondary-btn"
                type="button"
            >
                Copy Text
            </button>

        `;


        const qrElement =
            $("qr-code");


        new QRCode(
            qrElement,
            {
                text: text,
                width: 240,
                height: 240,
                correctLevel:
                    QRCode.CorrectLevel.H
            }
        );


        await wait(300);


        const canvas =
            qrElement.querySelector(
                "canvas"
            );


        const image =
            qrElement.querySelector(
                "img"
            );


        const downloadButton =
            $("qr-download");


        if (canvas) {

            downloadButton.onclick =
                () => {

                    downloadDataURL(
                        canvas.toDataURL(
                            "image/png"
                        ),
                        "qr-code.png"
                    );

                };

        } else if (image) {

            downloadButton.onclick =
                () => {

                    downloadDataURL(
                        image.src,
                        "qr-code.png"
                    );

                };
        }


        $("qr-copy").onclick =
            async () => {

                try {

                    await navigator.clipboard
                        .writeText(text);

                    $("qr-copy").textContent =
                        "Copied ✓";

                } catch (error) {

                    alert(
                        "Copy is not available in this browser."
                    );
                }
            };


    } catch (error) {

        console.error(error);

        output.innerHTML = `
            <div class="result-box error">
                QR generation failed:
                ${escapeHTML(error.message)}
            </div>
        `;
    }
}


/* =========================================================
   QR SCANNER
   ========================================================= */
function showQRScanner() {

    const content = getElement("tool-content");

    content.innerHTML = toolShell(
        "QR Scanner",
        "Scan a QR code using your camera or upload an image.",
        `
        <div class="qr-scanner-options">

            <!-- CAMERA -->
            <div class="scanner-card">

                <div class="scanner-card-icon">📷</div>

                <h3>Scan with Camera</h3>

                <p>
                    Use your phone or computer camera
                    to scan a QR code.
                </p>

                <button
                    class="primary-btn"
                    onclick="startQRScanner()">
                    📷 Start Camera
                </button>

                <button
                    class="secondary-btn"
                    onclick="stopQRScanner()">
                    ⏹ Stop Camera
                </button>

                <div
                    id="qr-reader"
                    class="qr-reader">
                </div>

            </div>


            <!-- IMAGE -->
            <div class="scanner-card">

                <div class="scanner-card-icon">🖼️</div>

                <h3>Scan from Image</h3>

                <p>
                    Upload or drag & drop an image
                    containing a QR code.
                </p>

                <div
                    id="qr-image-drop"
                    class="qr-image-drop">

                    <div class="drop-icon">📤</div>

                    <strong>
                        Drag & Drop QR Image Here
                    </strong>

                    <span>or</span>

                    <label
                        for="qr-image-input"
                        class="upload-btn">
                        🖼️ Choose Image
                    </label>

                    <input
                        type="file"
                        id="qr-image-input"
                        accept="image/*"
                        hidden>

                    <small>
                        JPG, JPEG, PNG, WEBP
                    </small>

                </div>

                <div
                    id="qr-image-preview"
                    class="qr-image-preview">
                </div>

            </div>

        </div>


        <div
            id="qr-scan-result"
            class="qr-scan-result">
        </div>
        `
    );

    setupQRImageScanner();
}

function setupQRImageScanner() {

    const input = document.getElementById("qr-image-input");
    const dropZone = document.getElementById("qr-image-drop");

    if (!input || !dropZone) return;

    input.addEventListener("change", function () {

        if (this.files && this.files.length) {
            scanQRFromImage(this.files[0]);
        }

    });


    /*
     * Drag Over
     */

    dropZone.addEventListener("dragover", function (event) {

        event.preventDefault();

        dropZone.classList.add("drag-over");

    });


    /*
     * Drag Leave
     */

    dropZone.addEventListener("dragleave", function () {

        dropZone.classList.remove("drag-over");

    });


    /*
     * Drop
     */

    dropZone.addEventListener("drop", function (event) {

        event.preventDefault();

        dropZone.classList.remove("drag-over");

        const files = event.dataTransfer.files;

        if (!files || !files.length) return;

        const file = files[0];

        if (!file.type.startsWith("image/")) {

            alert("Please drop an image file.");

            return;
        }

        scanQRFromImage(file);

    });

}
async function scanQRFromImage(file) {

    const resultBox =
        document.getElementById("qr-scan-result");

    const preview =
        document.getElementById("qr-image-preview");

    if (!resultBox) return;

    resultBox.innerHTML = `
        <div class="scan-loading">
            🔍 Scanning QR code...
        </div>
    `;

    if (preview) {

        const imageURL =
            URL.createObjectURL(file);

        preview.innerHTML = `
            <img
                src="${imageURL}"
                alt="QR Image Preview">
        `;
    }

    try {

        await waitForGlobal("Html5Qrcode");

        if (typeof Html5Qrcode === "undefined") {
            throw new Error(
                "QR scanner library is not loaded."
            );
        }

        let scannerContainer =
            document.getElementById(
                "qr-image-preview-scanner"
            );

        if (!scannerContainer) {

            scannerContainer =
                document.createElement("div");

            scannerContainer.id =
                "qr-image-preview-scanner";

            scannerContainer.style.display =
                "none";

            document.body.appendChild(
                scannerContainer
            );
        }

        const imageScanner =
            new Html5Qrcode(
                "qr-image-preview-scanner"
            );

        const decodedText =
            await imageScanner.scanFile(
                file,
                true
            );

        window.lastQRResult =
            decodedText;

        resultBox.innerHTML = `
            <div class="scan-success">

                <div class="success-icon">✅</div>

                <h3>QR Code Found</h3>

                <div class="qr-result-text">
                    ${escapeHTML(decodedText)}
                </div>

                <div class="qr-result-actions">

                    <button
                        class="primary-btn"
                        onclick="copyQRResult()">
                        📋 Copy Result
                    </button>

                    <button
                        class="secondary-btn"
                        onclick="openQRResult()">
                        🔗 Open Link
                    </button>

                </div>

            </div>
        `;

        try {
            await imageScanner.clear();
        } catch (e) {
            console.warn("Scanner cleanup:", e);
        }

    } catch (error) {

        console.error(
            "Image QR Scan Error:",
            error
        );

        resultBox.innerHTML = `
            <div class="scan-error">

                <div class="error-icon">❌</div>

                <h3>QR Code Not Found</h3>

                <p>
                    No QR code was detected in this image.
                </p>

                <small>
                    Try a clear image where the complete
                    QR code is visible.
                </small>

            </div>
        `;
    }
}
async function copyQRResult() {

    if (!window.lastQRResult) return;

    try {

        await navigator.clipboard.writeText(
            window.lastQRResult
        );

        alert("QR result copied!");

    } catch (error) {

        const textarea =
            document.createElement("textarea");

        textarea.value =
            window.lastQRResult;

        document.body.appendChild(
            textarea
        );

        textarea.select();

        document.execCommand("copy");

        textarea.remove();

        alert("QR result copied!");

    }
}
function openQRResult() {

    const result =
        window.lastQRResult;

    if (!result) return;

    if (
        result.startsWith("http://") ||
        result.startsWith("https://")
    ) {

        window.open(
            result,
            "_blank",
            "noopener,noreferrer"
        );

    } else {

        alert(
            "This QR code does not contain a web link."
        );
    }
}
async function startQRScanner() {

    const output =
        $("qr-scan-result");


    try {

        const Html5Qrcode =
            await waitForGlobal(
                "Html5Qrcode",
                25000
            );


        if (qrScanner) {
            await stopQRScanner();
        }


        qrScanner =
            new Html5Qrcode(
                "qr-reader"
            );


        await qrScanner.start(

            {
                facingMode: "environment"
            },

            {
                fps: 10,
                qrbox: {
                    width: 250,
                    height: 250
                }
            },

            decodedText => {

                if (output) {

                    output.innerHTML = `

                        <div class="result-box success">

                            <strong>
                                QR Result:
                            </strong>

                            <br><br>

                            ${escapeHTML(
                                decodedText
                            )}

                        </div>
                    `;
                }

            },

            () => {
                // Ignore normal scan failures.
            }
        );


    } catch (error) {

        console.error(error);

        qrScanner = null;


        if (output) {

            output.innerHTML = `

                <div class="result-box error">

                    QR Scanner could not start.

                    <br><br>

                    ${escapeHTML(
                        error.message
                    )}

                    <br><br>

                    Camera access usually requires
                    HTTPS and browser permission.

                </div>
            `;
        }
    }
}


async function stopQRScanner() {

    if (!qrScanner) {
        return;
    }


    try {

        await qrScanner.stop();

    } catch (error) {

        console.warn(
            "QR scanner stop:",
            error
        );
    }


    try {

        await qrScanner.clear();

    } catch (error) {

        console.warn(
            "QR scanner clear:",
            error
        );
    }


    qrScanner = null;
}


window.stopQRScanner =
    stopQRScanner;


/* =========================================================
   PDF TEXT EXTRACTION
   ========================================================= */

async function extractPDFPages(file) {

    const pdfjs =
        await waitForGlobal(
            "pdfjsLib"
        );


    setupPDFJS();


    const data =
        await readFileAsArrayBuffer(
            file
        );


    const pdf =
        await pdfjs.getDocument({
            data: data
        }).promise;


    const pages = [];


    for (
        let pageNumber = 1;
        pageNumber <= pdf.numPages;
        pageNumber++
    ) {

        const page =
            await pdf.getPage(
                pageNumber
            );


        const textContent =
            await page.getTextContent();


        pages.push({

            pageNumber: pageNumber,

            items:
                textContent.items || []

        });
    }


    return pages;
}


function groupPDFTextIntoLines(items) {

    const sorted =
        [...items].sort(
            (a, b) => {

                const ay =
                    a.transform?.[5] || 0;

                const by =
                    b.transform?.[5] || 0;

                if (
                    Math.abs(
                        by - ay
                    ) > 4
                ) {
                    return by - ay;
                }


                const ax =
                    a.transform?.[4] || 0;

                const bx =
                    b.transform?.[4] || 0;

                return ax - bx;
            }
        );


    const lines = [];


    for (const item of sorted) {

        const y =
            item.transform?.[5] || 0;


        let line =
            lines.find(
                current =>
                    Math.abs(
                        current.y - y
                    ) < 4
            );


        if (!line) {

            line = {
                y: y,
                items: []
            };

            lines.push(line);
        }


        line.items.push(item);
    }


    lines.sort(
        (a, b) =>
            b.y - a.y
    );


    return lines

        .map(line => {

            line.items.sort(
                (a, b) =>
                    (a.transform?.[4] || 0) -
                    (b.transform?.[4] || 0)
            );


            return line.items

                .map(item =>
                    item.str || ""
                )

                .join(" ")

                .replace(/\s+/g, " ")

                .trim();
        })

        .filter(Boolean);
}


/* =========================================================
   PDF TO WORD
   ========================================================= */

async function createDocxPackage(pages, title = "Converted Document") {

    const zip = new JSZip();

    const now = new Date().toISOString();

    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">

    <Default Extension="rels"
        ContentType="application/vnd.openxmlformats-package.relationships+xml"/>

    <Default Extension="xml"
        ContentType="application/xml"/>

    <Override PartName="/word/document.xml"
        ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>

    <Override PartName="/word/styles.xml"
        ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>

    <Override PartName="/docProps/core.xml"
        ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>

    <Override PartName="/docProps/app.xml"
        ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>

</Types>`;

    const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships
    xmlns="http://schemas.openxmlformats.org/package/2006/relationships">

    <Relationship
        Id="rId1"
        Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
        Target="word/document.xml"/>

    <Relationship
        Id="rId2"
        Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties"
        Target="docProps/core.xml"/>

    <Relationship
        Id="rId3"
        Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties"
        Target="docProps/app.xml"/>

</Relationships>`;

    const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships
    xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;

    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles
    xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">

    <w:docDefaults>

        <w:rPrDefault>
            <w:rPr>

                <w:rFonts
                    w:ascii="Arial"
                    w:hAnsi="Arial"
                    w:eastAsia="Arial"/>

                <w:sz w:val="22"/>

                <w:szCs w:val="22"/>

            </w:rPr>
        </w:rPrDefault>

        <w:pPrDefault>
            <w:pPr>
                <w:spacing
                    w:after="100"
                    w:line="276"
                    w:lineRule="auto"/>
            </w:pPr>
        </w:pPrDefault>

    </w:docDefaults>

    <w:style
        w:type="paragraph"
        w:default="1"
        w:styleId="Normal">

        <w:name w:val="Normal"/>

        <w:qFormat/>

    </w:style>

</w:styles>`;

    const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties
    xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:dcterms="http://purl.org/dc/terms/"
    xmlns:dcmitype="http://purl.org/dc/dcmitype/"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">

    <dc:title>${xmlEscape(title)}</dc:title>

    <dc:creator>File &amp; QR Converter</dc:creator>

    <cp:lastModifiedBy>File &amp; QR Converter</cp:lastModifiedBy>

    <dcterms:created
        xsi:type="dcterms:W3CDTF">
        ${now}
    </dcterms:created>

    <dcterms:modified
        xsi:type="dcterms:W3CDTF">
        ${now}
    </dcterms:modified>

</cp:coreProperties>`;

    const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties
    xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
    xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">

    <Application>File &amp; QR Converter</Application>

</Properties>`;

    let bodyXml = "";

    pages.forEach((page, pageIndex) => {

        const lines = page.lines || [];

        if (lines.length === 0) {

            bodyXml += `
<w:p>
    <w:r>
        <w:t xml:space="preserve"></w:t>
    </w:r>
</w:p>`;

        } else {

            lines.forEach(line => {

                const text = String(line || "")
                    .replace(/\u0000/g, "")
                    .trimEnd();

                bodyXml += `
<w:p>

    <w:pPr>
        <w:spacing
            w:after="80"
            w:line="276"
            w:lineRule="auto"/>
    </w:pPr>

    <w:r>

        <w:rPr>
            <w:rFonts
                w:ascii="Arial"
                w:hAnsi="Arial"/>
            <w:sz w:val="22"/>
        </w:rPr>

        <w:t xml:space="preserve">${xmlEscape(text)}</w:t>

    </w:r>

</w:p>`;
            });
        }

        // Page break except after last page
        if (pageIndex < pages.length - 1) {

            bodyXml += `
<w:p>

    <w:r>

        <w:br w:type="page"/>

    </w:r>

</w:p>`;
        }

    });

    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>

<w:document
    xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">

    <w:body>

        ${bodyXml}

        <w:sectPr>

            <w:pgSz
                w:w="11906"
                w:h="16838"/>

            <w:pgMar
                w:top="900"
                w:right="900"
                w:bottom="900"
                w:left="900"
                w:header="450"
                w:footer="450"
                w:gutter="0"/>

        </w:sectPr>

    </w:body>

</w:document>`;

    zip.file("[Content_Types].xml", contentTypes);
    zip.folder("_rels").file(".rels", rootRels);

    zip.folder("word")
        .file("document.xml", documentXml);

    zip.folder("word")
        .folder("_rels")
        .file("document.xml.rels", documentRels);

    zip.folder("word")
        .file("styles.xml", stylesXml);

    zip.folder("docProps")
        .file("core.xml", coreXml);

    zip.folder("docProps")
        .file("app.xml", appXml);

    return await zip.generateAsync({
        type: "blob",
        mimeType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
}

function showPDFToWord() {

    const content = getElement("tool-content");

    content.innerHTML = toolShell(
        "PDF to Word",
        "Convert a selectable-text PDF into an editable DOCX document.",
        `
        ${setupInput(
            "pdf-word-input",
            ".pdf,application/pdf",
            false
        )}

        <button
            class="primary-btn"
            onclick="convertPDFToWord()">
            📝 Convert to Word
        </button>

        <div class="info-box">
            <strong>Important:</strong>
            Scanned or image-only PDFs require OCR.
            Complex layouts, images and tables may not be preserved exactly.
        </div>
        `
    );
}


async function convertPDFToWord() {

    const input = document.getElementById("pdf-word-input");

    if (!input || !input.files || !input.files.length) {
        alert("Please select a PDF file.");
        return;
    }

    const file = input.files[0];

    if (file.type !== "application/pdf") {
        alert("Please select a valid PDF file.");
        return;
    }

    showLoading("Reading PDF and creating Word file...");

    try {

        const pages = await extractPDFPages(file);

        if (!pages || !pages.length) {
            throw new Error("Unable to read PDF pages.");
        }

        const convertedPages = [];

        let totalCharacters = 0;

        for (const page of pages) {

            const lines = groupPDFTextIntoLines(page.items || []);

            const cleanLines = lines
                .map(line => String(line || "").trim())
                .filter(line => line.length > 0);

            totalCharacters += cleanLines.join(" ").length;

            convertedPages.push({
                pageNumber: page.pageNumber,
                lines: cleanLines
            });
        }

        /*
         * Detect image/scanned PDF.
         * If almost no selectable text exists,
         * don't create an empty DOCX.
         */

        if (totalCharacters < 5) {

            throw new Error(
                "This PDF appears to be scanned/image-only. " +
                "PDF to Word requires selectable text. " +
                "OCR support is required for scanned PDFs."
            );
        }

        showLoading("Building DOCX file...");

        const docxBlob = await createDocxPackage(
            convertedPages,
            file.name.replace(/\.pdf$/i, "")
        );

        if (!docxBlob || docxBlob.size < 100) {
            throw new Error("DOCX file could not be created.");
        }

        const outputName =
            file.name.replace(/\.pdf$/i, "") + ".docx";

        downloadBlob(docxBlob, outputName);

        alert(
            "PDF converted to Word successfully.\n\n" +
            "Note: Text is extracted from the PDF. " +
            "Complex layouts, images and tables may not exactly match the original."
        );

    } catch (error) {

        console.error("PDF → Word Error:", error);

        alert(
            "PDF to Word conversion failed.\n\n" +
            (error.message || "Unknown error.")
        );

    } finally {

        hideLoading();
    }
}


/* =========================================================
   WORD TO PDF
   ========================================================= */

function showWordToPDF() {

    const content = getElement("tool-content");

    content.innerHTML = toolShell(
        "Word to PDF",
        "Convert a DOCX Word document into a PDF file.",
        `
        ${setupInput(
            "word-pdf-input",
            ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            false
        )}

        <button
            class="primary-btn"
            onclick="convertWordToPDF()">
            📃 Convert to PDF
        </button>

        <div class="info-box">
            <strong>How it works:</strong>
            Your Word document is rendered in the browser
            and converted into PDF pages.
        </div>
        `
    );
}
async function convertWordToPDF() {

    const input = document.getElementById("word-pdf-input");

    if (!input || !input.files || !input.files.length) {
        alert("Please select a Word DOCX file.");
        return;
    }

    const file = input.files[0];

    const isDocx =
        file.name.toLowerCase().endsWith(".docx") ||
        file.type ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    if (!isDocx) {
        alert("Please select a valid .docx Word file.");
        return;
    }

    showLoading("Preparing Word document...");

    let renderHost = null;

    try {

        await waitForGlobal("docx");
        await waitForGlobal("html2canvas");
        await waitForGlobal("jspdf");

        if (!window.docx || typeof window.docx.renderAsync !== "function") {
            throw new Error("DOCX preview library failed to load.");
        }

        if (!window.html2canvas) {
            throw new Error("HTML rendering library failed to load.");
        }

        const jsPDF = await getJsPDF();

        if (!jsPDF) {
            throw new Error("jsPDF failed to load.");
        }

        const buffer = await readFileAsArrayBuffer(file);

        /*
         * Create a real visible render area.
         * Global loader stays above it while conversion happens.
         */

        renderHost = document.createElement("div");

        renderHost.className = "word-render-container";

        renderHost.style.position = "fixed";
        renderHost.style.left = "0";
        renderHost.style.top = "0";
        renderHost.style.width = "794px";
        renderHost.style.minHeight = "1123px";
        renderHost.style.background = "#ffffff";
        renderHost.style.pointerEvents = "none";
        renderHost.style.zIndex = "1";

        document.body.appendChild(renderHost);

        showLoading("Rendering Word document...");

        await window.docx.renderAsync(
            buffer,
            renderHost,
            null,
            {
                className: "docx",
                inWrapper: true,

                ignoreWidth: false,
                ignoreHeight: false,

                breakPages: true,

                renderHeaders: true,
                renderFooters: true,

                experimental: true
            }
        );

        /*
         * Allow fonts, images and page layout
         * to finish rendering.
         */

        await wait(500);

        if (document.fonts && document.fonts.ready) {
            try {
                await document.fonts.ready;
            } catch (e) {
                console.warn("Font loading warning:", e);
            }
        }

        await wait(300);

        /*
         * Find actual Word pages.
         */

        let pages = Array.from(
            renderHost.querySelectorAll(
                ".docx-wrapper > section"
            )
        );

        if (!pages.length) {

            pages = Array.from(
                renderHost.querySelectorAll(
                    "section.docx"
                )
            );
        }

        if (!pages.length) {

            pages = Array.from(
                renderHost.querySelectorAll(
                    "section"
                )
            );
        }

        /*
         * Final fallback
         */

        if (!pages.length) {
            pages = [renderHost];
        }

        pages = pages.filter(page => {

            const rect = page.getBoundingClientRect();

            return (
                rect.width > 20 &&
                rect.height > 20
            );
        });

        if (!pages.length) {
            throw new Error(
                "No printable pages were generated from this DOCX file."
            );
        }

        showLoading(
            `Creating PDF... 0 / ${pages.length}`
        );

        let pdf = null;

        for (let i = 0; i < pages.length; i++) {

            const page = pages[i];

            /*
             * Make sure images/fonts inside the page
             * are completely ready.
             */

            const images = Array.from(
                page.querySelectorAll("img")
            );

            await Promise.all(
                images.map(img => {

                    if (img.complete) {
                        return Promise.resolve();
                    }

                    return new Promise(resolve => {

                        img.onload = resolve;
                        img.onerror = resolve;

                    });
                })
            );

            await wait(150);

            const rect = page.getBoundingClientRect();

            if (
                !rect.width ||
                !rect.height
            ) {
                continue;
            }

            /*
             * Detect orientation from the actual
             * rendered Word page.
             */

            const orientation =
                rect.width > rect.height
                    ? "landscape"
                    : "portrait";

            /*
             * Convert CSS pixels → millimeters.
             *
             * 96 CSS px = 1 inch
             * 1 inch = 25.4 mm
             */

            let pageWidth =
                rect.width * 25.4 / 96;

            let pageHeight =
                rect.height * 25.4 / 96;

            /*
             * Protect against abnormal browser dimensions.
             */

            if (
                !Number.isFinite(pageWidth) ||
                !Number.isFinite(pageHeight) ||
                pageWidth < 50 ||
                pageHeight < 50 ||
                pageWidth > 500 ||
                pageHeight > 500
            ) {

                pageWidth =
                    orientation === "landscape"
                        ? 297
                        : 210;

                pageHeight =
                    orientation === "landscape"
                        ? 210
                        : 297;
            }

            showLoading(
                `Creating PDF... ${i + 1} / ${pages.length}`
            );

            const canvas = await html2canvas(
                page,
                {
                    scale: 2,

                    backgroundColor: "#ffffff",

                    useCORS: true,
                    allowTaint: false,

                    logging: false,

                    imageTimeout: 20000,

                    width: Math.ceil(rect.width),
                    height: Math.ceil(rect.height),

                    windowWidth: Math.ceil(rect.width),
                    windowHeight: Math.ceil(rect.height),

                    scrollX: 0,
                    scrollY: 0
                }
            );

            if (
                !canvas ||
                canvas.width < 10 ||
                canvas.height < 10
            ) {
                throw new Error(
                    `Unable to render Word page ${i + 1}.`
                );
            }

            /*
             * Create PDF on first page.
             */

            if (!pdf) {

                pdf = new jsPDF({
                    orientation,
                    unit: "mm",
                    format: [pageWidth, pageHeight],
                    compress: true
                });

            } else {

                pdf.addPage(
                    [pageWidth, pageHeight],
                    orientation
                );
            }

            /*
             * Keep small margins.
             */

            const margin = 4;

            const availableWidth =
                pageWidth - margin * 2;

            const availableHeight =
                pageHeight - margin * 2;

            const canvasRatio =
                canvas.width / canvas.height;

            let imageWidth =
                availableWidth;

            let imageHeight =
                imageWidth / canvasRatio;

            if (imageHeight > availableHeight) {

                imageHeight =
                    availableHeight;

                imageWidth =
                    imageHeight * canvasRatio;
            }

            const x =
                (pageWidth - imageWidth) / 2;

            const y =
                (pageHeight - imageHeight) / 2;

            /*
             * JPEG gives much smaller PDFs than PNG
             * while keeping good text quality.
             */

            const imageData =
                canvas.toDataURL(
                    "image/jpeg",
                    0.95
                );

            pdf.addImage(
                imageData,
                "JPEG",
                x,
                y,
                imageWidth,
                imageHeight,
                undefined,
                "FAST"
            );

            /*
             * Release canvas memory.
             */

            canvas.width = 1;
            canvas.height = 1;
        }

        if (!pdf) {
            throw new Error(
                "PDF could not be created."
            );
        }

        showLoading("Downloading PDF...");

        const outputName =
            file.name.replace(
                /\.docx$/i,
                ""
            ) + ".pdf";

        pdf.save(outputName);

        alert(
            "Word to PDF conversion completed successfully."
        );

    } catch (error) {

        console.error(
            "Word → PDF Error:",
            error
        );

        alert(
            "Word to PDF conversion failed.\n\n" +
            (error.message ||
                "Unknown conversion error.")
        );

    } finally {

        if (renderHost) {

            try {
                renderHost.remove();
            } catch (e) {
                console.warn(
                    "Render cleanup failed:",
                    e
                );
            }
        }

        hideLoading();
    }
}
/* =========================================================
   PDF TO EXCEL
   ========================================================= */

function showPDFToExcel() {

    const content =
        $("tool-content");


    content.innerHTML = toolShell(

        "PDF to Excel",

        "Extract PDF text into an Excel worksheet.",

        `

            ${setupInput(
                "pdf-excel-file",
                "application/pdf"
            )}

            <div class="tool-note">

                This tool extracts text from the PDF.
                Complex tables may require manual cleanup.

            </div>

            <div id="pdf-excel-result"></div>

        `
    );


    $("pdf-excel-file").addEventListener(
        "change",
        convertPDFToExcel
    );
}


async function convertPDFToExcel(event) {

    const file =
        event.target.files?.[0];

    const output =
        $("pdf-excel-result");


    if (!file) {
        return;
    }


    showLoading(
        "Creating Excel file..."
    );


    try {

        const XLSX =
            await waitForGlobal(
                "XLSX"
            );


        const pages =
            await extractPDFPages(
                file
            );


        const rows = [
            ["Page", "Text"]
        ];


        pages.forEach(page => {

            const lines =
                groupPDFTextIntoLines(
                    page.items
                );


            lines.forEach(line => {

                rows.push([
                    page.pageNumber,
                    line
                ]);

            });

        });


        const workbook =
            XLSX.utils.book_new();


        const worksheet =
            XLSX.utils.aoa_to_sheet(
                rows
            );


        worksheet["!cols"] = [
            {
                wch: 10
            },
            {
                wch: 90
            }
        ];


        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "PDF Text"
        );


        XLSX.writeFile(
            workbook,
            getOutputFileName(
                file.name,
                "",
                ".xlsx"
            )
        );


        output.innerHTML = `

            <div class="result-box success">

                Excel file created successfully.

            </div>
        `;

    } catch (error) {

        console.error(error);

        output.innerHTML = `

            <div class="result-box error">

                PDF to Excel failed:

                ${escapeHTML(
                    error.message
                )}

            </div>
        `;

    } finally {

        hideLoading();
    }
}


/* =========================================================
   EXCEL TO PDF
   ========================================================= */

function showExcelToPDF() {

    const content =
        $("tool-content");


    content.innerHTML = toolShell(

        "Excel to PDF",

        "Convert the first worksheet of an Excel file into a PDF table.",

        `

            ${setupInput(
                "excel-pdf-file",
                ".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            )}

            <div id="excel-pdf-result"></div>

        `
    );


    $("excel-pdf-file").addEventListener(
        "change",
        convertExcelToPDF
    );
}


async function convertExcelToPDF(event) {

    const file =
        event.target.files?.[0];

    const output =
        $("excel-pdf-result");


    if (!file) {
        return;
    }


    showLoading(
        "Creating Excel PDF..."
    );


    try {

        const XLSX =
            await waitForGlobal(
                "XLSX"
            );


        const jsPDF =
            getJsPDF();


        if (!jsPDF) {

            throw new Error(
                "jsPDF library is not available."
            );
        }


        const buffer =
            await readFileAsArrayBuffer(
                file
            );


        const workbook =
            XLSX.read(
                buffer,
                {
                    type: "array",
                    raw: false
                }
            );


        const sheetName =
            workbook.SheetNames[0];


        if (!sheetName) {

            throw new Error(
                "No worksheet found."
            );
        }


        const worksheet =
            workbook.Sheets[
                sheetName
            ];


        const rows =
            XLSX.utils.sheet_to_json(
                worksheet,
                {
                    header: 1,
                    raw: false,
                    defval: ""
                }
            );


        if (!rows.length) {

            throw new Error(
                "The worksheet is empty."
            );
        }


        const pdf =
            new jsPDF({
                orientation: "landscape",
                unit: "mm",
                format: "a4"
            });


        const pageWidth =
            pdf.internal.pageSize.getWidth();

        const pageHeight =
            pdf.internal.pageSize.getHeight();


        const margin = 8;

        const maxColumns =
            Math.min(
                12,
                Math.max(
                    ...rows.map(
                        row => row.length
                    )
                )
            );


        const columnWidth =
            (
                pageWidth -
                margin * 2
            ) /
            maxColumns;


        const rowHeight = 7;

        let y = margin;


        function drawRow(
            row,
            isHeader
        ) {

            if (
                y + rowHeight >
                pageHeight - margin
            ) {

                pdf.addPage(
                    "a4",
                    "landscape"
                );

                y = margin;
            }


            for (
                let column = 0;
                column < maxColumns;
                column++
            ) {

                const x =
                    margin +
                    column *
                    columnWidth;


                pdf.rect(
                    x,
                    y,
                    columnWidth,
                    rowHeight
                );


                pdf.setFontSize(7);


                if (isHeader) {

                    pdf.setFont(
                        undefined,
                        "bold"
                    );

                } else {

                    pdf.setFont(
                        undefined,
                        "normal"
                    );
                }


                let text =
                    String(
                        row[column] ?? ""
                    );


                while (
                    text.length > 1 &&
                    pdf.getTextWidth(
                        text
                    ) >
                    columnWidth - 2
                ) {

                    text =
                        text.slice(
                            0,
                            -1
                        );
                }


                pdf.text(
                    text,
                    x + 1,
                    y + 4.5,
                    {
                        maxWidth:
                            columnWidth - 2
                    }
                );
            }


            y += rowHeight;
        }


        rows.forEach(
            (row, index) => {

                drawRow(
                    row,
                    index === 0
                );

            }
        );


        pdf.save(
            getOutputFileName(
                file.name,
                "",
                ".pdf"
            )
        );


        output.innerHTML = `

            <div class="result-box success">

                Excel converted to PDF successfully.

            </div>
        `;

    } catch (error) {

        console.error(error);

        output.innerHTML = `

            <div class="result-box error">

                Excel to PDF failed:

                ${escapeHTML(
                    error.message
                )}

            </div>
        `;

    } finally {

        hideLoading();
    }
}


/* =========================================================
   MERGE PDF
   ========================================================= */

function showMergePDF() {

    mergeFiles = [];


    const content =
        $("tool-content");


    content.innerHTML = toolShell(

        "Merge PDF",

        "Combine multiple PDF files into one PDF.",

        `

            ${setupInput(
                "merge-pdf-files",
                "application/pdf",
                true
            )}

            <div
                id="merge-list"
                class="file-list"
            ></div>

            <button
                class="action-btn"
                type="button"
                onclick="convertMergePDF()"
            >
                Merge PDFs
            </button>

            <div id="merge-result"></div>

        `
    );


    $("merge-pdf-files").addEventListener(
        "change",
        event => {

            mergeFiles =
                Array.from(
                    event.target.files || []
                );

            renderMergeList();
        }
    );
}


function renderMergeList() {

    const list =
        $("merge-list");


    if (!list) {
        return;
    }


    list.innerHTML =
        mergeFiles.map(
            (file, index) => `

                <div class="file-item">

                    <span>
                        ${index + 1}.
                        ${escapeHTML(file.name)}

                        <br>

                        <small>
                            ${formatFileSize(file.size)}
                        </small>
                    </span>

                    <button
                        class="action-btn secondary-btn"
                        type="button"
                        onclick="
                            mergeFiles.splice(${index},1);
                            renderMergeList();
                        "
                    >
                        Remove
                    </button>

                </div>
            `
        ).join("");
}


async function convertMergePDF() {

    const output =
        $("merge-result");


    if (mergeFiles.length < 2) {

        output.innerHTML = `

            <div class="result-box error">

                Please select at least two PDF files.

            </div>
        `;

        return;
    }


    showLoading(
        "Merging PDFs..."
    );


    try {

        const PDFLib =
            await waitForGlobal(
                "PDFLib"
            );


        const mergedPDF =
            await PDFLib.PDFDocument.create();


        for (const file of mergeFiles) {

            const source =
                await PDFLib.PDFDocument.load(
                    await readFileAsArrayBuffer(
                        file
                    )
                );


            const pages =
                await mergedPDF.copyPages(
                    source,
                    source.getPageIndices()
                );


            pages.forEach(
                page => {
                    mergedPDF.addPage(
                        page
                    );
                }
            );
        }


        const bytes =
            await mergedPDF.save();


        downloadBlob(
            new Blob(
                [bytes],
                {
                    type:
                        "application/pdf"
                }
            ),
            "merged-pdf.pdf"
        );


        output.innerHTML = `

            <div class="result-box success">

                PDFs merged successfully.

            </div>
        `;

    } catch (error) {

        console.error(error);

        output.innerHTML = `

            <div class="result-box error">

                PDF merge failed:

                ${escapeHTML(
                    error.message
                )}

            </div>
        `;

    } finally {

        hideLoading();
    }
}


/* =========================================================
   PAGE NUMBERS
   ========================================================= */

function showPageNumbers() {

    const content =
        $("tool-content");


    content.innerHTML = toolShell(

        "Add Page Numbers",

        "Add page numbers to an existing PDF.",

        `

            ${setupInput(
                "page-number-file",
                "application/pdf"
            )}

            <div id="page-number-result"></div>

        `
    );


    $("page-number-file").addEventListener(
        "change",
        convertPageNumbers
    );
}


async function convertPageNumbers(event) {

    const file =
        event.target.files?.[0];

    const output =
        $("page-number-result");


    if (!file) {
        return;
    }


    showLoading(
        "Adding page numbers..."
    );


    try {

        const PDFLib =
            await waitForGlobal(
                "PDFLib"
            );


        const pdf =
            await PDFLib.PDFDocument.load(
                await readFileAsArrayBuffer(
                    file
                )
            );


        const font =
            await pdf.embedFont(
                PDFLib.StandardFonts.Helvetica
            );


        const pages =
            pdf.getPages();


        pages.forEach(
            (page, index) => {

                const number =
                    String(index + 1);


                const fontSize = 10;


                const textWidth =
                    font.widthOfTextAtSize(
                        number,
                        fontSize
                    );


                page.drawText(
                    number,
                    {
                        x:
                            (
                                page.getWidth() -
                                textWidth
                            ) / 2,

                        y: 12,

                        size:
                            fontSize,

                        font:
                            font,

                        color:
                            PDFLib.rgb(
                                0.25,
                                0.25,
                                0.30
                            )
                    }
                );
            }
        );


        const bytes =
            await pdf.save();


        downloadBlob(
            new Blob(
                [bytes],
                {
                    type:
                        "application/pdf"
                }
            ),
            getOutputFileName(
                file.name,
                "-numbered",
                ".pdf"
            )
        );


        output.innerHTML = `

            <div class="result-box success">

                Page numbers added successfully.

            </div>
        `;

    } catch (error) {

        console.error(error);

        output.innerHTML = `

            <div class="result-box error">

                Page numbering failed:

                ${escapeHTML(
                    error.message
                )}

            </div>
        `;

    } finally {

        hideLoading();
    }
}


/* =========================================================
   INFORMATION / LEGAL PAGES
   ========================================================= */

const informationPages = {

    about: {

        title:
            "About File & QR Converter",

        html: `

            <p>
                File & QR Converter is a browser-based collection
                of useful tools for PDF, image, Word, Excel and QR
                related tasks.
            </p>

            <h3>
                What you can do
            </h3>

            <ul>

                <li>
                    Convert images to PDF.
                </li>

                <li>
                    Convert PDF pages to JPG.
                </li>

                <li>
                    Convert PDF text to Word.
                </li>

                <li>
                    Convert Word documents to PDF.
                </li>

                <li>
                    Convert PDF text to Excel.
                </li>

                <li>
                    Convert Excel worksheets to PDF.
                </li>

                <li>
                    Merge PDF files.
                </li>

                <li>
                    Add page numbers to PDF files.
                </li>

                <li>
                    Generate and scan QR codes.
                </li>

            </ul>

        `
    },


    how: {

        title:
            "How to Use",

        html: `

            <ol>

                <li>
                    Select the tool you want to use.
                </li>

                <li>
                    Choose your file using the upload button.
                </li>

                <li>
                    You can also drag and drop supported files.
                </li>

                <li>
                    Click the conversion or processing button.
                </li>

                <li>
                    Wait for the conversion to complete.
                </li>

                <li>
                    Download your generated file.
                </li>

            </ol>

            <p>
                QR Scanner requires camera permission and normally
                requires a secure HTTPS website.
            </p>

        `
    },


    faq: {

        title:
            "Frequently Asked Questions",

        html: `

            <h3>
                Are my files uploaded?
            </h3>

            <p>
                The supported conversion tools are designed to process
                files in your browser. The website also loads external
                JavaScript libraries from CDN providers.
            </p>


            <h3>
                Can PDF to Word convert scanned PDFs?
            </h3>

            <p>
                Scanned PDFs contain images rather than selectable text.
                OCR is required to convert scanned content into editable
                text.
            </p>


            <h3>
                Can Word to PDF preserve the document?
            </h3>

            <p>
                The Word document is rendered in the browser and then
                converted into PDF pages. Complex documents may render
                differently depending on fonts and document structure.
            </p>


            <h3>
                Why does QR Scanner need camera permission?
            </h3>

            <p>
                Browser camera access requires user permission and
                normally requires a secure HTTPS context.
            </p>

        `
    },


    privacy: {

        title:
            "Privacy Policy",

        html: `

            <p>
                Your privacy is important to us.
            </p>


            <h3>
                File Processing
            </h3>

            <p>
                Supported conversion tools are designed to process
                files locally in your browser instead of sending
                the file to a File & QR Converter conversion server.
            </p>


            <h3>
                Third-Party Resources
            </h3>

            <p>
                The website uses third-party JavaScript libraries
                loaded from CDN providers. Your browser may contact
                those providers to download the required libraries.
            </p>


            <h3>
                Generated Files
            </h3>

            <p>
                Generated files are created in your browser and
                downloaded through your browser.
            </p>


            <h3>
                Updates
            </h3>

            <p>
                This policy may be updated when website features
                or services change.
            </p>

        `
    },


    terms: {

        title:
            "Terms & Conditions",

        html: `

            <p>
                By using this website, you agree to use the available
                tools responsibly and only for lawful purposes.
            </p>


            <h3>
                User Responsibility
            </h3>

            <p>
                You are responsible for the files you choose to process.
                Keep backup copies of important documents.
            </p>


            <h3>
                Conversion Quality
            </h3>

            <p>
                Conversion results can vary depending on file structure,
                fonts, images, tables, encryption and browser capabilities.
            </p>


            <h3>
                Service Availability
            </h3>

            <p>
                Website tools may be updated, modified or temporarily
                unavailable when maintenance or technical changes are
                required.
            </p>

        `
    },


    security: {

        title:
            "Security & File Privacy",

        html: `

            <p>
                Many supported tools process files directly in your
                browser.
            </p>

            <ul>

                <li>
                    Use HTTPS whenever possible.
                </li>

                <li>
                    Avoid processing confidential documents on
                    public computers.
                </li>

                <li>
                    Keep your browser and operating system updated.
                </li>

                <li>
                    Review browser extensions when processing
                    sensitive documents.
                </li>

            </ul>

        `
    },


    contact: {

        title:
            "Contact",

        html: `

            <p>
                For feedback, bug reports or feature requests,
                contact the website owner using your official
                support email address.
            </p>

            <p>
                Add your real support email address here before
                publishing the website.
            </p>

        `
    }

};


function openInfo(type) {

    stopQRScanner();


    const content =
        $("tool-content");


    const page =
        informationPages[type] ||
        informationPages.about;


    content.innerHTML = `

        <article class="info-page">

            <button
                class="action-btn secondary-btn"
                type="button"
                onclick="backHome()"
            >
                ← Back to Tools
            </button>

            <h2>
                ${page.title}
            </h2>

            ${page.html}

        </article>
    `;


    content.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


window.openInfo = openInfo;


/*
 * Compatibility with the footer code
 * we added earlier.
 */

function showInfoSection(type) {

    const map = {

        "about":
            "about",

        "how-to-use":
            "how",

        "faq":
            "faq",

        "security":
            "security",

        "contact":
            "contact",

        "privacy":
            "privacy",

        "terms":
            "terms",

        "cookies":
            "privacy"
    };


    openInfo(
        map[type] || "about"
    );
}


window.showInfoSection =
    showInfoSection;


/* =========================================================
   UNIVERSAL DRAG & DROP
   ========================================================= */

function setupUniversalDragAndDrop() {

    document
        .querySelectorAll(
            'input[type="file"]'
        )
        .forEach(
            setupDropZoneForInput
        );


    const content =
        $("tool-content");


    if (!content) {
        return;
    }


    if (
        content.dataset.dropObserverReady
    ) {
        return;
    }


    content.dataset.dropObserverReady =
        "true";


    const observer =
        new MutationObserver(
            () => {

                content
                    .querySelectorAll(
                        'input[type="file"]'
                    )
                    .forEach(
                        setupDropZoneForInput
                    );

            }
        );


    observer.observe(
        content,
        {
            childList: true,
            subtree: true
        }
    );
}


function setupDropZoneForInput(input) {

    if (!input) {
        return;
    }


    if (input.dataset.dragSetup) {
        return;
    }


    input.dataset.dragSetup =
        "true";


    const zone =
        input.closest(
            ".upload-box"
        ) ||
        input.parentElement;


    if (!zone) {
        return;
    }


    zone.classList.add(
        "universal-drop-zone"
    );


    [
        "dragenter",
        "dragover"
    ].forEach(
        eventName => {

            zone.addEventListener(
                eventName,
                event => {

                    event.preventDefault();
                    event.stopPropagation();

                    zone.classList.add(
                        "drag-over"
                    );

                }
            );

        }
    );


    [
        "dragleave",
        "drop"
    ].forEach(
        eventName => {

            zone.addEventListener(
                eventName,
                event => {

                    event.preventDefault();
                    event.stopPropagation();

                    zone.classList.remove(
                        "drag-over"
                    );

                }
            );

        }
    );


    zone.addEventListener(
        "drop",
        event => {

            const files =
                Array.from(
                    event.dataTransfer.files || []
                );


            if (!files.length) {
                return;
            }


            try {

                const dataTransfer =
                    new DataTransfer();


                files.forEach(
                    file => {

                        dataTransfer.items.add(
                            file
                        );

                    }
                );


                input.files =
                    dataTransfer.files;


                input.dispatchEvent(
                    new Event(
                        "change",
                        {
                            bubbles: true
                        }
                    )
                );

            } catch (error) {

                console.error(
                    "Drag & drop error:",
                    error
                );
            }
        }
    );
}


/* =========================================================
   LIBRARY CHECK
   ========================================================= */

function checkLibraries() {

    const libraries = {

        jsPDF:
            !!getJsPDF(),

        PDFJS:
            !!window.pdfjsLib,

        PDFLib:
            !!window.PDFLib,

        JSZip:
            !!window.JSZip,

        XLSX:
            !!window.XLSX,

        QRCode:
            !!window.QRCode,

        Html5Qrcode:
            !!window.Html5Qrcode,

        html2canvas:
            !!window.html2canvas,

        docxPreview:
            !!window.docx

    };


    console.table(
        libraries
    );


    const missing =
        Object.entries(
            libraries
        )
        .filter(
            ([name, loaded]) =>
                !loaded
        )
        .map(
            ([name]) => name
        );


    if (missing.length) {

        console.warn(
            "Missing libraries:",
            missing
        );

    } else {

        console.log(
            "All required libraries loaded successfully."
        );
    }
}


/* =========================================================
   STARTUP
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "File & QR Converter starting..."
        );


        /*
         * IMPORTANT:
         * Set PDF worker immediately.
         */

        setupPDFJS();


        /*
         * Dynamic styles
         */

        injectProfessionalStyles();


        /*
         * Ads
         */

        createAdLayout();


        /*
         * Mobile navigation
         */

        setupMobileMenu();


        /*
         * Drag & Drop
         */

        setupUniversalDragAndDrop();


        /*
         * Check libraries after CDN scripts
         * have had enough time to initialize.
         */

        setTimeout(
            () => {

                setupPDFJS();
                checkLibraries();

            },
            1200
        );


        /*
         * Popup advertisements
         */

        startPopupAds();


        console.log(
            "File & QR Converter loaded successfully."
        );
    }
);


/* =========================================================
   GLOBAL ERROR HANDLING
   ========================================================= */

window.addEventListener(
    "error",
    event => {

        console.error(
            "Global JavaScript error:",
            event.error || event.message
        );

    }
);


window.addEventListener(
    "unhandledrejection",
    event => {

        console.error(
            "Unhandled Promise error:",
            event.reason
        );

    }
);
async function scanQRFromImage(file) {

    const resultBox =
        document.getElementById("qr-scan-result");

    const preview =
        document.getElementById("qr-image-preview");

    if (!resultBox) return;

    resultBox.innerHTML = `
        <div class="scan-loading">
            🔍 Scanning QR code...
        </div>
    `;

    /*
     * Preview image
     */

    if (preview) {

        const imageURL =
            URL.createObjectURL(file);

        preview.innerHTML = `
            <img
                src="${imageURL}"
                alt="QR Image Preview">
        `;
    }


    try {

        await waitForGlobal("Html5Qrcode");


        if (
            typeof Html5Qrcode === "undefined"
        ) {

            throw new Error(
                "QR scanner library is not loaded."
            );
        }


        /*
         * Temporary scanner instance
         */

        const scanner =
            new Html5Qrcode(
                "qr-image-preview-scanner"
            );

    } catch (error) {

        /*
         * Html5Qrcode needs a DOM element
         * for scanFile in some versions.
         */

    }


    /*
     * Create temporary scanner container
     */

    let scannerContainer =
        document.getElementById(
            "qr-image-preview-scanner"
        );

    if (!scannerContainer) {

        scannerContainer =
            document.createElement("div");

        scannerContainer.id =
            "qr-image-preview-scanner";

        scannerContainer.style.display =
            "none";

        document.body.appendChild(
            scannerContainer
        );
    }


    try {

        const imageScanner =
            new Html5Qrcode(
                "qr-image-preview-scanner"
            );

        const decodedText =
            await imageScanner.scanFile(
                file,
                true
            );

        resultBox.innerHTML = `
            <div class="scan-success">

                <div class="success-icon">
                    ✅
                </div>

                <h3>QR Code Found</h3>

                <div class="qr-result-text">
                    ${escapeHTML(decodedText)}
                </div>

                <div class="qr-result-actions">

                    <button
                        class="primary-btn"
                        onclick="copyQRResult()">
                        📋 Copy Result
                    </button>

                    <button
                        class="secondary-btn"
                        onclick="openQRResult()">
                        🔗 Open Link
                    </button>

                </div>

            </div>
        `;

        window.lastQRResult =
            decodedText;

        await imageScanner.clear();

    } catch (error) {

        console.error(
            "Image QR Scan Error:",
            error
        );

        resultBox.innerHTML = `
            <div class="scan-error">

                <div class="error-icon">
                    ❌
                </div>

                <h3>QR Code Not Found</h3>

                <p>
                    We could not detect a QR code
                    in this image.
                </p>

                <small>
                    Try a clear image with the
                    complete QR code visible.
                </small>

            </div>
        `;

    }
}