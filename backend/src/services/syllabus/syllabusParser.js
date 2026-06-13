/**
 * src/services/syllabus/syllabusParser.js
 * Utility service to preprocess and clean raw text extracted from syllabus PDFs.
 */

/**
 * Normalizes newlines, trims spaces, and sanitizes characters.
 * @param {string} rawText - Raw text from PDF.
 * @returns {string} - Cleaned, readable text.
 */
export const cleanSyllabusText = (rawText) => {
  if (!rawText) return '';

  return rawText
    .replace(/\r\n/g, '\n')                // Normalize Windows newlines
    .replace(/\r/g, '\n')                  // Normalize Mac newlines
    .replace(/[^\x00-\x7F]+/g, ' ')         // Replace non-ASCII characters with spaces
    .replace(/([^\n])\n{2,}([^\n])/g, '$1\n\n$2') // Reduce excessive consecutive newlines to two
    .replace(/[ \t]+/g, ' ')               // Normalize multiple spaces and tabs to single spaces
    .split('\n')
    .map(line => line.trim())              // Trim spaces from each line
    .filter(line => line.length > 0)       // Remove empty lines
    .join('\n');
};
