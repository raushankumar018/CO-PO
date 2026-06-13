/**
 * src/services/questionPaper/summativeExamWeightageGenerator.js
 * Summative Examination Weightage Matrix Compiler.
 * Wraps compiling logic specifically for Summative Exam papers.
 */

import { compileWeightageMatrix } from './weightageGenerator.js';

/**
 * Compiles Summative Exam question items and mapping records into the final weightage matrix.
 * 
 * @param {Array} questions - List of questions from the 'questions' collection.
 * @param {Array} mappings - List of question mapping records from 'question_mappings'.
 * @returns {Object} - Object containing { matrix: Array, coTotals: Object }
 */
export const compileSummativeExamWeightageMatrix = (questions, mappings) => {
  return compileWeightageMatrix(questions, mappings);
};
