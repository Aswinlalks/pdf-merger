import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getDatabase, ref, onValue, update, increment } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyCOV48Dq2ADTQReDmFI2S0IZJxnI0o7LjI",
  authDomain: "pdf-merger-counter.firebaseapp.com",
  databaseURL: "https://pdf-merger-counter-d2776-default-rtdb.asia-southeast1.firebasedatabase.app", 
  projectId: "pdf-merger-counter",
  storageBucket: "pdf-merger-counter.firebasestorage.app",
  messagingSenderId: "863646075419",
  appId: "1:863646075419:web:a822038ffeb5819841c6be",
  measurementId: "G-23MSM3JFS5"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const statsRef = ref(db, 'siteStats');

// Global Counter Listener
onValue(statsRef, (snapshot) => {
    const data = snapshot.val();
    const currentTotal = data ? data.totalMerged : 0;
    const counterElement = document.getElementById('globalCounter');
    if (counterElement) counterElement.innerText = `Global PDFs merged: ${currentTotal}`;
});

// --- HELPER FUNCTION: Format Bytes to MB ---
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// --- UI & DRAG-AND-DROP LOGIC ---
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const mergeBtn = document.getElementById('mergeBtn');
const statusText = document.getElementById('status');
const sizeScale = document.getElementById('sizeScale');
const scaleValueDisplay = document.getElementById('scaleValue');

let filesArray = []; 
let dragStartIndex;

// Update label when slider moves
sizeScale.addEventListener('input', (e) => {
    const percent = Math.round(e.target.value * 100);
    scaleValueDisplay.innerText = `Scale: ${percent}% ${percent < 100 ? '(Compressed Size)' : '(Original Size)'}`;
});

// File Management Functions
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); addFiles(e.dataTransfer.files); });
fileInput.addEventListener('change', (e) => addFiles(e.target.files));

function addFiles(files) {
    for (let i = 0; i < files.length; i++) {
        if (files[i].type === "application/pdf") filesArray.push(files[i]);
    }
    renderFileList();
}

function renderFileList() {
    fileList.innerHTML = '';
    filesArray.forEach((file, index) => {
        const li = document.createElement('li');
        li.className = 'file-item';
        li.setAttribute('draggable', 'true');
        
        let displayName = file.name.length > 30 ? file.name.substring(0, 30) + '...' : file.name;
        li.innerHTML = `<span>☰ ${displayName}</span><button class="remove-btn" onclick="removeFile(${index})">✖</button>`;
        
        li.addEventListener('dragstart', () => dragStartIndex = index);
        li.addEventListener('dragover', (e) => { e.preventDefault(); li.classList.add('drag-over'); });
        li.addEventListener('dragleave', () => li.classList.remove('drag-over'));
        li.addEventListener('drop', () => { li.classList.remove('drag-over'); swapFiles(dragStartIndex, index); });
        
        fileList.appendChild(li);
    });
    mergeBtn.disabled = filesArray.length < 2;
}

function swapFiles(fromIndex, toIndex) {
    const itemOne = filesArray[fromIndex];
    filesArray.splice(fromIndex, 1);
    filesArray.splice(toIndex, 0, itemOne);
    renderFileList();
}

// Make remove function global so the inline HTML button can see it
window.removeFile = function(index) {
    filesArray.splice(index, 1);
    renderFileList();
}

// --- MERGE & COMPRESS LOGIC ---
mergeBtn.addEventListener('click', async () => {
    statusText.innerText = "Processing... Please wait.";
    statusText.style.color = "#0070f3";
    mergeBtn.disabled = true;
    
    // Hide the size box while processing
    document.getElementById('sizeInfo').style.display = 'none';

    const scaleFactor = parseFloat(sizeScale.value);
    let totalInputBytes = 0;

    try {
        const mergedPdf = await PDFLib.PDFDocument.create();
        
        for (let i = 0; i < filesArray.length; i++) {
            totalInputBytes += filesArray[i].size; // Track input size
            
            const arrayBuffer = await filesArray[i].arrayBuffer();
            const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
            
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            
            copiedPages.forEach((page) => {
                if (scaleFactor < 1.0) {
                    page.scale(scaleFactor, scaleFactor); // Visually scale the page
                }
                mergedPdf.addPage(page);
            });
        }

        const mergedPdfBytes = await mergedPdf.save();
        const totalOutputBytes = mergedPdfBytes.length; // Track output size

        const blob = new Blob([mergedPdfBytes], { type: "application/pdf" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = scaleFactor < 1.0 ? "merged_resized.pdf" : "merged_document.pdf";
        link.click();

        statusText.innerText = "Success! Your PDF is ready.";
        statusText.style.color = "green";

        // Display the sizes to the user
        document.getElementById('inputSize').innerText = formatBytes(totalInputBytes);
        document.getElementById('outputSize').innerText = formatBytes(totalOutputBytes);
        document.getElementById('sizeInfo').style.display = 'block';

        // Update Firebase Global Counter
        update(statsRef, { totalMerged: increment(filesArray.length) });

    } catch (error) {
        console.error(error);
        statusText.innerText = "An error occurred during processing.";
        statusText.style.color = "red";
    } finally {
        mergeBtn.disabled = false;
    }
});