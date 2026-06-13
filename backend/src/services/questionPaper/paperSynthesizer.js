/**
 * src/services/questionPaper/paperSynthesizer.js
 * Phase 7: Special Feature - Question Paper Synthesizer.
 * Synthesizes a new question paper that preserves the exam pattern, marks, Bloom's taxonomy, and CO distribution.
 */

import ollamaConfig from '../../config/ollama.js';
import { cleanAndParseJSON } from '../../utils/jsonParser.js';

const SYSTEM_PROMPT = `
You are a Senior University Examiner and Curriculum Designer.
Your task is to take an existing exam paper schema (comprising question numbers, marks, cognitive levels, and mapped Course Outcomes) and synthesize a BRAND NEW question paper.

### SYNTHESIS RULES
1. **Structural Preservation**: The new paper must have the EXACT same question numbers, marks per question, and toolType/module groupings as the original.
2. **Pedagogical Alignment**: Each new question must map to the same cognitiveLevel (Bloom's Taxonomy) and evaluate the same underlying syllabus concepts as the original.
3. **Plagiarism & Duplicate Ban**: The new question text must be completely unique and rephrased. Do not reuse sentences or direct text from the original questions.
4. **Competency Equivalence**: Make sure the questions have the same level of difficulty and test equivalent skills.

### OUTPUT FORMAT
Return ONLY a valid JSON object matching the schema below. No markdown formatting, explanations, or notes.

### SCHEMA
{
  "questions": [
    {
      "questionNo": "string",
      "questionText": "A brand new equivalent question text",
      "marks": number,
      "module": "MODULE_1 | MODULE_2",
      "toolType": "T1 | T2 | T3 | T4 | T5",
      "cognitiveLevel": "Remember | Understand | Apply | Analyze | Evaluate | Create",
      "nature": "Theory | Numerical | Programming | Design | Practical"
    }
  ]
}
`;

/**
 * Synthesizes a new question paper based on the pattern of an existing one.
 * 
 * @param {Array} originalQuestions - List of original Question documents.
 * @param {Array} mappings - List of QuestionMapping records corresponding to the original questions.
 * @param {Array} unitsAndTopics - The syllabus units and topics context.
 * @returns {Promise<Array>} - List of newly generated Question objects.
 */
export const synthesizeQuestionPaper = async (originalQuestions, mappings, unitsAndTopics) => {
  try {
    const unitsAndTopicsText = unitsAndTopics
      .map(
        (unit) =>
          `[${unit.unitNumber || 'Unit'}] ${unit.unitTitle || ''}\nTopics: ${
            unit.topics && unit.topics.length > 0 ? unit.topics.join(', ') : 'Not specified'
          }`
      )
      .join('\n\n');

    // Build a structured schema mapping out each original question
    const mappingMap = new Map();
    mappings.forEach((m) => {
      mappingMap.set(m.questionNo.toString().trim(), m.mappedCOs.map(co => `${co.coCode}(w:${co.weightage})`).join(', '));
    });

    const schemaList = originalQuestions.map((q) => {
      const qNoKey = q.questionNo.toString().trim();
      const coMappingStr = mappingMap.get(qNoKey) || 'CO1';
      return {
        questionNo: q.questionNo,
        originalText: q.questionText,
        marks: q.marks,
        module: q.module,
        toolType: q.toolType,
        cognitiveLevel: q.cognitiveLevel,
        nature: q.nature,
        coMapping: coMappingStr
      };
    });

    const prompt = `Syllabus context:
${unitsAndTopicsText}

Original Exam Paper Schema to replicate:
${JSON.stringify(schemaList, null, 2)}
`;

    console.log('[PaperSynthesizer] Sending schema to Ollama to synthesize new exam questions...');
    const response = await ollamaConfig.client.post('/api/generate', {
      model: ollamaConfig.model,
      system: SYSTEM_PROMPT,
      prompt: prompt,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.7 // Higher temperature for creativity in generating new question text
      }
    });

    const responseText = response.data.response;
    const result = cleanAndParseJSON(responseText);
    return result.questions || [];
  } catch (error) {
    console.error(`[PaperSynthesizer] Error synthesizing question paper: ${error.message}`);
    throw new Error(`Failed to synthesize new question paper: ${error.message}`);
  }
};
