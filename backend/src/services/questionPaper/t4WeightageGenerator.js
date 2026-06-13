/**
 * src/services/questionPaper/t4WeightageGenerator.js
 * T4 Examination Weightage Matrix Compiler.
 * Wraps compiling logic specifically for T4 examination papers.
 */

import { compileWeightageMatrix } from './weightageGenerator.js';

/**
 * Compiles T4 question items and mapping records into the final weightage matrix.
 * 
 * @param {Array} questions - List of questions from the 'questions' collection.
 * @param {Array} mappings - List of question mapping records from 'question_mappings'.
 * @returns {Object} - Object containing { matrix: Array, coTotals: Object }
 */
export const compileT4WeightageMatrix = (questions, mappings) => {
  return compileWeightageMatrix(questions, mappings);
};
