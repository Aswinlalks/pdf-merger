// 1. Import Firebase tools directly from Google's CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getDatabase, ref, onValue, update, increment } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

// 2. Your specific Firebase configuration (with correct asia-southeast1 URL)
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

// 3. Initialize Firebase and the Database
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const statsRef = ref(db, 'siteStats');

// 4. Listen for real-time updates from the database
onValue(statsRef, (snapshot) => {
    const data = snapshot.val();
    const currentTotal = data ? data.totalMerged : 0;
    
    const counterElement = document.getElementById('globalCounter');
    if (counterElement) {
        counterElement.innerText = `Global PDFs merged: ${currentTotal}`;
    }
});

// 5. Your PDF merge logic
document.getElementById('mergeBtn').addEventListener('click', async () => {
    const fileInput = document.getElementById('fileInput');
    const statusText = document.getElementById('status');

    if (fileInput.files.length < 2) {
        statusText.innerText = "Please select at least 2 PDF files.";
        statusText.style.color = "red";
        return;
    }

    statusText.innerText = "Merging... Please wait.";
    statusText.style.color = "black";

    try {
        const mergedPdf = await PDFLib.PDFDocument.create();
        const numberOfFiles = fileInput.files.length;

        for (let i = 0; i < numberOfFiles; i++) {
            const file = fileInput.files[i];
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        const mergedPdfBytes = await mergedPdf.save();
        const blob = new Blob([mergedPdfBytes], { type: "application/pdf" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = "merged_document.pdf";
        link.click();

        statusText.innerText = "Done! Your PDF has been downloaded.";
        statusText.style.color = "green";

        // 6. Tell Firebase to add the new files to the global total
        update(statsRef, {
            totalMerged: increment(numberOfFiles)
        });

    } catch (error) {
        console.error(error);
        statusText.innerText = "An error occurred while merging.";
        statusText.style.color = "red";
    }
});