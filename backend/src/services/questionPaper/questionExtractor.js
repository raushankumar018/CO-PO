/**
 * src/services/questionPaper/questionExtractor.js
 * Phase 7: Question Paper Extraction.
 * Parses raw exam paper text, identifies tool types (T1, T4, T5), syllabus modules (MODULE_1, MODULE_2), question numbers, and marks.
 */

import ollamaConfig from '../../config/ollama.js';

/**
 * Extracts list of questions from raw exam paper text, grouped by module and tool type.
 * 
 * @param {string} rawPaperText - Extracted text from question paper PDF.
 * @returns {Promise<Array>} - List of groups matching: { module: string, toolType: string, questions: Array }
 */
export const extractQuestionsFromText = async (rawPaperText) => {
  const systemPrompt = `
You are an expert university exam paper parsing engine.
Your task is to scan the raw text of a question paper, detect the assessment tool type (e.g., T1, T2, T3, T4, or T5), determine the syllabus module (MODULE_1 or MODULE_2), and extract all questions.

## CRITICAL: Module Detection Rules
- Read the exam paper HEADER carefully. Look for phrases like:
  - "MODULE 1", "MODULE-1", "MODULE_1", "MODULE 1 EXAMINATION" → use "MODULE_1"
  - "MODULE 2", "MODULE-2", "MODULE_2", "MODULE 2 EXAMINATION" → use "MODULE_2"
- If the header says "MODULE 2" or "MODULE-2", ALL questions in this paper belong to "MODULE_2".
- NEVER default all questions to MODULE_1 if the header clearly states MODULE 2.
- If no module is mentioned, default to "MODULE_1".
- Always return module as exactly "MODULE_1" or "MODULE_2" (with underscore, no space).

## For each question, extract:
1. questionNo (e.g., "1", "2a", "Q1", "Q2b", "3.1" — extract exactly as written, do not omit any prefix like 'Q')
2. questionText (the full, literal question text. Do not summarize or alter.)
3. marks (the number of marks allocated, as a numeric integer. Look for [5], (10), 10 marks, etc. If not found, assign 0)

## Output format
Return ONLY a valid JSON array. No markdown, no explanation.

Schema:
[
  {
    "module": "MODULE_1 or MODULE_2 — read from the paper header",
    "toolType": "One of: T1, T2, T3, T4, T5",
    "questions": [
      {
        "questionNo": "string",
        "questionText": "string",
        "marks": number
      }
    ]
  }
]

Important rules:
- All questions in a single-module paper belong to ONE group with the correct module tag.
- Do not split questions across multiple groups unless the paper explicitly covers multiple modules.
- Do not skip any questions. Extract all Q1 through Q13 (or however many exist).
- Return ONLY the JSON array. Do not include formatting marks like \`\`\`json.
`;

  try {
    console.log('[QuestionExtractor] Sending question paper text to Ollama for parsing...');
    const response = await ollamaConfig.client.post('/api/generate', {
      model: ollamaConfig.model,
      system: systemPrompt,
      prompt: `Question Paper Raw Content:\n${rawPaperText}`,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.1 // Highly deterministic parsing
      }
    });

    const responseText = response.data.response;
    let result;

    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[questionExtractor] JSON parsing failed, attempting cleanup:', responseText);
      const jsonRegex = /\[[^]*\]/;
      const match = responseText.match(jsonRegex);
      if (match) {
        result = JSON.parse(match[0]);
      } else {
        throw new Error('Ollama response could not be parsed as valid JSON.');
      }
    }

    return Array.isArray(result) ? result : [result];
  } catch (error) {
    console.error(`[questionExtractor] Error parsing question paper: ${error.message}`);
    throw new Error(`Failed to extract exam questions using Ollama: ${error.message}`);
  }
};
