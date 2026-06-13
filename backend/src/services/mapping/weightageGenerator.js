/**
 * src/services/mapping/weightageGenerator.js
 * Service for computing Course Outcome weightages (marks and percentages) from question mappings.
 */

/**
 * Computes marks weightage and percentage contribution for each Course Outcome.
 * @param {Array} mappings - List of single question mappings: { questionNumber, marks, mappedCOs }.
 * @returns {Object} - Weightage map (CO -> Marks), percentages map (CO -> %), and total paper marks.
 */
export const generateWeightageTable = (mappings) => {
  const weightage = {
    CO1: 0,
    CO2: 0,
    CO3: 0,
    CO4: 0,
    CO5: 0,
    CO6: 0
  };

  let totalPaperMarks = 0;

  mappings.forEach((item) => {
    const marks = Number(item.marks) || 0;
    totalPaperMarks += marks;

    if (item.mappedCOs && Array.isArray(item.mappedCOs)) {
      item.mappedCOs.forEach((co) => {
        const coKey = co.toUpperCase();
        if (weightage[coKey] !== undefined) {
          // Add the full marks allocation of the question to each mapped CO
          weightage[coKey] += marks;
        }
      });
    }
  });

  // Calculate percentage of coverage for each Course Outcome relative to total paper marks
  const percentages = {
    CO1: 0,
    CO2: 0,
    CO3: 0,
    CO4: 0,
    CO5: 0,
    CO6: 0
  };

  Object.keys(weightage).forEach((co) => {
    percentages[co] = totalPaperMarks > 0 
      ? Number(((weightage[co] / totalPaperMarks) * 100).toFixed(2)) 
      : 0;
  });

  return {
    weightage,
    percentages,
    totalPaperMarks
  };
};
