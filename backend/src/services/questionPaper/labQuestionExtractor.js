/**
 * src/services/questionPaper/labQuestionExtractor.js
 * Summative Lab Question Extraction, Aggregation, Classification, and CO Mapping Service.
 *
 * ARCHITECTURE — Two-phase pipeline to prevent LLM timeout:
 *
 * Phase 1 (no LLM, instant): Regex-based splitting of raw PDF text into
 *   per-set chunks using set header patterns ("Set-1", "SET 1", etc.).
 *
 * Phase 2 (one LLM call per set): Each set's text is sent independently
 *   to Ollama. The prompt is small and focused, completing within seconds.
 *   Each call: aggregate A+B sub-parts, classify cognitive level + nature,
 *   map to Course Outcomes.
 *
 * This eliminates the 300-second timeout caused by a single massive LLM call
 * covering the entire paper (all sets × all questions × full PDF text).
 *
 * Dynamic Detection: The number of Sets and the number of questions per Set
 * are detected from the PDF text. Nothing is hardcoded.
 */

import ollamaConfig from '../../config/ollama.js';

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1 — Regex-based set splitter (no LLM, instant)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Splits raw lab paper text into per-set chunks using regex set-header detection.
 * Handles all common formats: "Set-1", "Set 1", "SET 1", "SET-2", "SECTION A - SET 1", etc.
 *
 * @param {string} rawText - Full extracted PDF text.
 * @returns {Array<{ setNo: string, text: string }>} Ordered array of set chunks.
 */
const splitTextIntoSets = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return [];

  // Pattern matches: Set-1, Set 1, SET-2, SET 2, Set-III, SECTION A - SET 3, etc.
  // Captured group 1 = the set number/label (digit or roman numeral)
  const SET_HEADER_REGEX = /(?:^|\n)[ \t]*(?:section\s+\w+\s*[-–]\s*)?set[-\s]*(\d+|[IVXivx]+)[ \t]*(?:\r?\n|$)/gi;

  const splits = [];
  let match;

  while ((match = SET_HEADER_REGEX.exec(rawText)) !== null) {
    const rawLabel = match[1].trim();
    // Normalise Roman numerals to Arabic
    const setNo = romanToArabic(rawLabel) || rawLabel;
    // Use match.index so the set header line itself is included in the chunk
    splits.push({ setNo: String(setNo), index: match.index });
  }

  if (splits.length === 0) {
    // No set headers found → treat the whole text as Set 1
    console.log('[labQuestionExtractor] No set headers detected. Treating entire paper as Set 1.');
    return [{ setNo: '1', text: rawText.trim() }];
  }

  // Slice the raw text between consecutive set headers
  const setChunks = [];
  for (let i = 0; i < splits.length; i++) {
    const start = splits[i].index;
    const end = i + 1 < splits.length ? splits[i + 1].index : rawText.length;
    const text = rawText.slice(start, end).trim();
    if (text.length > 10) { // Guard against empty slices
      setChunks.push({ setNo: splits[i].setNo, text });
    }
  }

  console.log(`[labQuestionExtractor] Phase 1 — Detected ${setChunks.length} set(s) via regex:`,
    setChunks.map(s => `Set ${s.setNo} (${s.text.length} chars)`).join(', ')
  );

  return setChunks;
};

/**
 * Converts simple Roman numerals (I–XX) to Arabic digits.
 * Returns null if the input is already numeric or unrecognised.
 */
const romanToArabic = (str) => {
  if (/^\d+$/.test(str)) return parseInt(str, 10); // already numeric
  const roman = { I: 1, V: 5, X: 10, L: 50, C: 100 };
  const upper = str.toUpperCase();
  if (!/^[IVXLC]+$/.test(upper)) return null;
  let result = 0;
  for (let i = 0; i < upper.length; i++) {
    const cur = roman[upper[i]];
    const next = roman[upper[i + 1]] || 0;
    result += cur < next ? -cur : cur;
  }
  return result || null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2 — Per-set LLM extraction (small, focused prompt per set)
// ─────────────────────────────────────────────────────────────────────────────

const PER_SET_SYSTEM_PROMPT = `
You are an expert university Summative Lab exam parsing engine and senior academic curriculum mapping auditor.
Your task is to parse ONE SET of a Summative Lab assessment. The set text is provided in the user prompt.

### STEP 1 — QUESTION DETECTION:
1. Detect ALL parent questions in this set. Common formats: "Q1", "Question 1", "1.", "Q.1", etc.
2. Do NOT assume a fixed number of questions. Detect however many appear.
3. Store each question with a clean numeric question number string: "1", "2", "3", etc.

### STEP 2 — A+B AGGREGATION:
1. Every parent question contains an A Part and a B Part (common formats: "A.", "(A)", "Part A", "1-a", "1A", etc.).
2. Combine BOTH sub-parts into a single "questionText" string.
3. Format: "A: [part A text]; B: [part B text]"
4. Store ONLY the combined parent question. NEVER produce entries like "1A", "1B", "2A", "2B" as separate question numbers.

### STEP 3 — CLASSIFICATION (Bloom's Taxonomy):
For each combined parent question assign:
- cognitiveLevel: One of "Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"
- nature: One of "Theory", "Numerical", "Programming", "Design", "Practical"
  (Lab questions are usually "Practical" or "Programming")
- marks: numeric marks if stated in the text, else use 10 as default

### STEP 4 — CO MAPPING (NBA Accreditation Standards):
1. Evaluate the COMPLETE combined A+B question as a single practical learning unit.
2. Maximum 2 COs per question. Never assign more than 2.
3. Allowed weightage values ONLY:
   - 3 = Strong Correlation (question directly evaluates the primary CO competency)
   - 2 = Moderate Correlation (question partially supports the CO)
   - NEVER use weightage 1 or 0.
4. Real-world validation — before assigning any CO, verify ALL of the following:
   a. Is the practical activity directly related to the CO description?
   b. Is there direct syllabus evidence (unit/topic coverage)?
   c. Can a faculty member defend this mapping during NBA accreditation?
   d. Is the relationship direct (not peripheral or assumed)?
   If any answer is NO: do NOT map that CO.
5. Justification: Provide a short, plain-text academic justification. Do NOT include quotes, curly braces, square brackets, or any JSON syntax inside the justification string.

### OUTPUT FORMAT:
Return ONLY a valid JSON object. Do NOT include \`\`\`json markers or anything outside the JSON.
The output MUST start with { and end with }.

### SCHEMA:
{
  "questions": [
    {
      "questionNo": "1",
      "questionText": "A: [part A text]; B: [part B text]",
      "marks": 10,
      "cognitiveLevel": "Apply",
      "nature": "Practical",
      "mappedCOs": [
        { "coCode": "CO2", "weightage": 3 },
        { "coCode": "CO4", "weightage": 2 }
      ],
      "justification": "The packet tracer task and programming task directly evaluate the student ability to configure and analyze network protocols, aligning strongly with CO2 and moderately with CO4 per the syllabus unit on network layers."
    }
  ]
}
`;

/**
 * Calls Ollama for a single set chunk. Returns the parsed questions array.
 *
 * @param {string} setNo    - Set number string (e.g. "1", "2").
 * @param {string} setText  - Raw text of this set only.
 * @param {Object} coRecord - CourseOutcome record (CO1–CO6 descriptions).
 * @param {string} unitsAndTopicsText - Pre-formatted syllabus text.
 * @param {string} coText             - Pre-formatted CO text.
 * @returns {Promise<Array>} Array of question objects for this set.
 */
const extractSingleSet = async (setNo, setText, unitsAndTopicsText, coText) => {
  const prompt = `
Syllabus Units & Topics:
${unitsAndTopicsText}

Course Outcomes (CO1-CO6):
${coText}

Set ${setNo} — Lab Paper Content:
${setText}
`;

  console.log(`[labQuestionExtractor] Phase 2 — Sending Set ${setNo} (${setText.length} chars) to Ollama...`);

  const response = await ollamaConfig.client.post('/api/generate', {
    model: ollamaConfig.model,
    system: PER_SET_SYSTEM_PROMPT,
    prompt: prompt,
    stream: false,
    format: 'json',
    options: {
      temperature: 0.1 // High determinism for structured extraction
    }
  });

  const responseText = response.data.response;
  console.log(`[labQuestionExtractor] Set ${setNo} raw response (${responseText.length} chars):`, responseText.slice(0, 200));

  // Sanitize occasional LLM typos
  const cleaned = responseText
    .replace(/"weight\s*,\s*age"/g, '"weightage"')
    .replace(/"weight_age"/g, '"weightage"');

  let result;
  try {
    result = JSON.parse(cleaned);
  } catch {
    console.warn(`[labQuestionExtractor] Set ${setNo}: JSON parse failed, attempting extraction.`);
    const m = cleaned.match(/(\{[\s\S]*\})/);
    if (m) result = JSON.parse(m[0]);
    else throw new Error(`Set ${setNo} response could not be parsed as JSON.`);
  }

  // Normalize: LLM may return { questions: [] } or a top-level array
  let questions = [];
  if (Array.isArray(result)) {
    questions = result;
  } else if (result && Array.isArray(result.questions)) {
    questions = result.questions;
  } else if (result && typeof result === 'object') {
    // Search for any array-valued key
    for (const key of Object.keys(result)) {
      if (Array.isArray(result[key]) && result[key].length > 0) {
        questions = result[key];
        break;
      }
    }
  }

  // Enforce mapping rules on LLM output
  questions = questions.map((q) => {
    let mappedCOs = (q.mappedCOs || [])
      .filter(m => ['CO1','CO2','CO3','CO4','CO5','CO6'].includes(m.coCode) && [2,3].includes(Number(m.weightage)))
      .map(m => ({ coCode: m.coCode, weightage: Number(m.weightage) }));

    if (mappedCOs.length > 2) mappedCOs = mappedCOs.slice(0, 2);
    if (mappedCOs.length === 0) mappedCOs = [{ coCode: 'CO1', weightage: 2 }];

    return {
      questionNo: String(q.questionNo || '?').trim(),
      questionText: (q.questionText || q.text || 'No question text.').trim(),
      marks: Number(q.marks) || 10,
      cognitiveLevel: q.cognitiveLevel || 'Apply',
      nature: q.nature || 'Practical',
      mappedCOs,
      justification: (q.justification || 'Aligned with lab syllabus outcomes.').trim()
    };
  });

  console.log(`[labQuestionExtractor] Set ${setNo}: extracted ${questions.length} question(s).`);
  return questions;
};

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts, aggregates, classifies, and maps all questions from a Summative Lab paper.
 * Uses a two-phase pipeline: regex set-splitting (Phase 1) + per-set LLM call (Phase 2).
 *
 * @param {string} rawPaperText   - Extracted and cleaned text from the lab PDF.
 * @param {Object} coRecord       - CourseOutcome record (CO1–CO6 descriptions).
 * @param {Array}  unitsAndTopics - Subject syllabus units with topics.
 * @returns {Promise<Array>} Array of set groups:
 *   [{ setNo: "1", questions: [{ questionNo, questionText, marks, cognitiveLevel, nature, mappedCOs, justification }] }]
 */
export const extractQuestionsFromLabPaper = async (rawPaperText, coRecord, unitsAndTopics) => {
  // ── Build shared context strings (built once, reused per set call) ─────────
  const unitsAndTopicsText = unitsAndTopics
    ? unitsAndTopics
        .map(unit =>
          `[${unit.unitNumber || 'Unit'}] ${unit.unitTitle || ''}\nTopics: ${
            unit.topics && unit.topics.length > 0 ? unit.topics.join(', ') : 'Not specified'
          }`
        )
        .join('\n\n')
    : 'No syllabus units provided.';

  const coText = coRecord
    ? `CO1: ${coRecord.CO1 || 'Not specified'}
CO2: ${coRecord.CO2 || 'Not specified'}
CO3: ${coRecord.CO3 || 'Not specified'}
CO4: ${coRecord.CO4 || 'Not specified'}
CO5: ${coRecord.CO5 || 'Not specified'}
CO6: ${coRecord.CO6 || 'Not specified'}`
    : 'No Course Outcomes provided.';

  // ── Phase 1: Split raw PDF text into set chunks (no LLM, instant) ─────────
  const setChunks = splitTextIntoSets(rawPaperText);

  if (setChunks.length === 0) {
    throw new Error('No sets could be detected in the lab paper. Ensure the PDF contains valid Set headers (e.g. Set-1, Set 2).');
  }

  // ── Phase 2: Process each set sequentially (one small LLM call per set) ───
  const results = [];

  for (const { setNo, text } of setChunks) {
    try {
      const questions = await extractSingleSet(setNo, text, unitsAndTopicsText, coText);
      results.push({ setNo, questions });
    } catch (err) {
      console.error(`[labQuestionExtractor] Set ${setNo} extraction failed: ${err.message}. Skipping set.`);
      // Push an empty set rather than failing the whole upload
      results.push({ setNo, questions: [] });
    }
  }

  console.log(`[labQuestionExtractor] Extraction complete. ${results.length} set(s), ${results.reduce((s, r) => s + r.questions.length, 0)} total question(s).`);
  return results;
};
