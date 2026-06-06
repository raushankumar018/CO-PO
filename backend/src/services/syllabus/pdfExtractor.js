/**
 * src/services/syllabus/pdfExtractor.js
 * Service for extracting raw text from PDF files.
 * Includes resilience against corrupted PDFs (bad XRef entries, broken structures).
 */

import fs from 'fs';
import pdf from 'pdf-parse';

/**
 * Custom page renderer that extracts text content from each page.
 * Used as a fallback when the default renderer encounters errors.
 */
const customPageRenderer = (pageData) => {
  return pageData.getTextContent({
    normalizeWhitespace: true,
    disableCombineTextItems: false
  }).then((textContent) => {
    return textContent.items.map((item) => item.str).join(' ');
  });
};

/**
 * Reads a PDF file from the disk and extracts its text.
 * Attempts multiple parsing strategies to handle corrupted or non-standard PDFs.
 * @param {string} filePath - Absolute or relative path to the PDF file.
 * @returns {Promise<string>} - The raw text content of the PDF.
 */
export const extractTextFromPDF = async (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at: ${filePath}`);
    }

    const dataBuffer = fs.readFileSync(filePath);
    let pdfData;

    // Attempt 1: Standard parsing
    try {
      pdfData = await pdf(dataBuffer);
    } catch (primaryError) {
      console.warn(`[pdfExtractor] Primary parse failed (${primaryError.message}). Trying fallback with custom renderer...`);

      // Attempt 2: Parse with custom page renderer (handles some XRef issues)
      try {
        pdfData = await pdf(dataBuffer, {
          pagerender: customPageRenderer,
          max: 0 // Parse all pages
        });
      } catch (fallbackError) {
        console.error(`[pdfExtractor] Fallback parse also failed: ${fallbackError.message}`);
        throw new Error(`PDF text extraction failed after all attempts: ${primaryError.message}`);
      }
    }

    if (!pdfData || !pdfData.text || pdfData.text.trim().length === 0) {
      throw new Error('PDF parsing completed but no text content was found.');
    }

    return pdfData.text;
  } catch (error) {
    console.error(`[pdfExtractor] Error: ${error.message}`);
    throw new Error(`PDF text extraction failed: ${error.message}`);
  }
};

