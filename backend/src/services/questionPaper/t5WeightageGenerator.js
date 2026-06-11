/**
 * src/services/questionPaper/t5WeightageGenerator.js
 * T5 Assignment Weightage Matrix Compiler.
 * Wraps compiling logic specifically for T5 assignment papers.
 */

import { compileWeightageMatrix } from './weightageGenerator.js';

/**
 * Compiles T5 question items and mapping records into the final weightage matrix.
 * 
 * @param {Array} questions - List of questions from the 'questions' collection.
 * @param {Array} mappings - List of question mapping records from 'question_mappings'.
 * @returns {Object} - Object containing { matrix: Array, coTotals: Object }
 */
export const compileT5WeightageMatrix = (questions, mappings) => {
  return compileWeightageMatrix(questions, mappings);
};
