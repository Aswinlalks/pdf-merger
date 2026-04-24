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
        // Create a new empty PDF document
        const mergedPdf = await PDFLib.PDFDocument.create();

        // Loop through all selected files
        for (let i = 0; i < fileInput.files.length; i++) {
            const file = fileInput.files[i];
            const arrayBuffer = await file.arrayBuffer();
            
            // Load the current PDF
            const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
            
            // Copy all pages from current PDF into the merged PDF
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        // Serialize the merged PDF to a byte array
        const mergedPdfBytes = await mergedPdf.save();

        // Create a Blob from the bytes and trigger a download
        const blob = new Blob([mergedPdfBytes], { type: "application/pdf" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = "merged_document.pdf";
        link.click();

        statusText.innerText = "Done! Your PDF has been downloaded.";
        statusText.style.color = "green";

    } catch (error) {
        console.error(error);
        statusText.innerText = "An error occurred while merging.";
        statusText.style.color = "red";
    }
});