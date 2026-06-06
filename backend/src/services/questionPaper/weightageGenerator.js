/**
 * src/services/questionPaper/weightageGenerator.js
 * Phase 7: Weightage Generator.
 * Compiles stored sparse mappings into the final matrix representation where unmapped COs appear as 0.
 */

/**
 * Compiles question items and mapping records into the final weightage matrix.
 * 
 * @param {Array} questions - List of questions from the 'questions' collection.
 * @param {Array} mappings - List of question mapping records from 'question_mappings'.
 * @returns {Object} - Object containing { matrix: Array, coTotals: Object }
 */
export const compileWeightageMatrix = (questions, mappings) => {
  // Create quick lookup map for mappings by question number
  const mappingMap = new Map();
  mappings.forEach((m) => {
    mappingMap.set(m.questionNo.toString().trim(), m.mappedCOs);
  });

  const matrix = [];
  const coTotals = { CO1: 0, CO2: 0, CO3: 0, CO4: 0, CO5: 0, CO6: 0 };

  questions.forEach((q) => {
    const qNoKey = q.questionNo.toString().trim();
    const mappedCOs = mappingMap.get(qNoKey) || [];

    // Initialize matrix row with 0s
    const row = {
      questionNo: q.questionNo,
      marks: q.marks,
      CO1: 0,
      CO2: 0,
      CO3: 0,
      CO4: 0,
      CO5: 0,
      CO6: 0
    };

    // Populate actual weights from mapping
    mappedCOs.forEach((m) => {
      const coKey = m.coCode;
      if (row.hasOwnProperty(coKey)) {
        row[coKey] = m.weightage; // Must be 2 or 3
        coTotals[coKey] += m.weightage;
      }
    });

    matrix.push(row);
  });

  return {
    matrix,
    coTotals
  };
};
