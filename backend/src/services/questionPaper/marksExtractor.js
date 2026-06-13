/**
 * src/services/questionPaper/marksExtractor.js
 * Auxiliary service providing regex utilities to extract or validate marks from question text.
 */

/**
 * Attempts to extract numeric marks from a question text string using regex patterns.
 * e.g., "Explain recursion [5]" -> 5
 * e.g., "Write a bubble sort program (10 Marks)" -> 10
 * @param {string} text - The question text.
 * @returns {number} - The parsed marks value, or 0 if not found.
 */
export const extractMarksUsingRegex = (text) => {
  if (!text) return 0;

  // Patterns typically appearing at the end of questions: [10], (5), {8}, 15 marks
  const patterns = [
    /\[(\d+)\s*(?:marks?|pts|points)?\]\s*$/i,
    /\((\d+)\s*(?:marks?|pts|points)?\)\s*$/i,
    /\{(\d+)\s*(?:marks?|pts|points)?\}\s*$/i,
    /(\d+)\s*(?:marks?|points?|pts)\s*$/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }

  // Broad search inside parenthetical expressions anywhere in the question
  const broadPattern = /(?:\[|\()(\d+)\s*(?:marks?|points?|pts)?(?:\)|\])/i;
  const match = text.match(broadPattern);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }

  return 0;
};
