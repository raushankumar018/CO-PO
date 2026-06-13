/**
 * src/services/questionPaper/labWeightageGenerator.js
 * Summative Lab Weightage Matrix Compiler.
 *
 * Generates:
 * 1. Per-set matrices — one WeightageReport per detected Set.
 * 2. Combined matrix  — one WeightageReport across all Sets (setNo: "COMBINED").
 *
 * Each matrix row includes a setNo field so Set-1 Q1 and Set-2 Q1 are distinct rows.
 */

const CO_KEYS = ['CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'CO6'];

/**
 * Builds a single matrix row with CO weights populated from the mapping.
 *
 * @param {Object} question - Question document (setNo, questionNo, marks).
 * @param {Array}  mappedCOs - Array of { coCode, weightage } objects.
 * @returns {Object} Matrix row object.
 */
const buildMatrixRow = (question, mappedCOs = []) => {
  const row = {
    setNo: question.setNo || null,
    questionNo: question.questionNo,
    marks: question.marks,
    CO1: 0,
    CO2: 0,
    CO3: 0,
    CO4: 0,
    CO5: 0,
    CO6: 0
  };

  mappedCOs.forEach((m) => {
    if (CO_KEYS.includes(m.coCode)) {
      row[m.coCode] = Number(m.weightage);
    }
  });

  return row;
};

/**
 * Initialises a zero-filled coTotals object.
 * @returns {Object}
 */
const zeroCOTotals = () => ({ CO1: 0, CO2: 0, CO3: 0, CO4: 0, CO5: 0, CO6: 0 });

/**
 * Accumulates CO weights from a matrix row into a totals object.
 *
 * @param {Object} totals - Running coTotals object (mutated in place).
 * @param {Object} row    - Matrix row.
 */
const accumulateTotals = (totals, row) => {
  CO_KEYS.forEach((co) => {
    totals[co] += row[co] || 0;
  });
};

/**
 * Compiles Summative Lab questions and mappings into per-set and combined matrices.
 *
 * @param {Array} questions - Array of Question documents (must include setNo field).
 * @param {Array} mappings  - Array of QuestionMapping documents (must include setNo field).
 * @returns {Object} {
 *   perSet: [{ setNo: "1", matrix: [], coTotals: {} }, ...],
 *   combined: { matrix: [], coTotals: {} }
 * }
 */
export const compileLabWeightageMatrix = (questions, mappings) => {
  // Build a lookup map: "setNo:questionNo" -> mappedCOs
  const mappingMap = new Map();
  mappings.forEach((m) => {
    const key = `${(m.setNo || '').toString().trim()}:${m.questionNo.toString().trim()}`;
    mappingMap.set(key, m.mappedCOs || []);
  });

  // Group questions by setNo
  const setMap = new Map(); // setNo -> [questions]
  const setOrder = [];
  questions.forEach((q) => {
    const sNo = (q.setNo || '1').toString().trim();
    if (!setMap.has(sNo)) {
      setMap.set(sNo, []);
      setOrder.push(sNo);
    }
    setMap.get(sNo).push(q);
  });

  // Sort sets numerically
  setOrder.sort((a, b) => {
    const nA = parseInt(a, 10);
    const nB = parseInt(b, 10);
    if (!isNaN(nA) && !isNaN(nB)) return nA - nB;
    return a.localeCompare(b);
  });

  const perSet = [];
  const combinedMatrix = [];
  const combinedTotals = zeroCOTotals();

  for (const setNo of setOrder) {
    const setQuestions = setMap.get(setNo);

    // Sort questions within the set numerically
    setQuestions.sort((a, b) =>
      a.questionNo.localeCompare(b.questionNo, undefined, { numeric: true, sensitivity: 'base' })
    );

    const setMatrix = [];
    const setTotals = zeroCOTotals();

    setQuestions.forEach((q) => {
      const key = `${(q.setNo || '').toString().trim()}:${q.questionNo.toString().trim()}`;
      const mappedCOs = mappingMap.get(key) || [];
      const row = buildMatrixRow(q, mappedCOs);
      setMatrix.push(row);
      accumulateTotals(setTotals, row);
      // Also push into combined (preserving setNo on each row for traceability)
      combinedMatrix.push({ ...row });
      accumulateTotals(combinedTotals, row);
    });

    perSet.push({
      setNo,
      matrix: setMatrix,
      coTotals: setTotals
    });
  }

  return {
    perSet,
    combined: {
      matrix: combinedMatrix,
      coTotals: combinedTotals
    }
  };
};
