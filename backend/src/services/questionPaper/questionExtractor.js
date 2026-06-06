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
Your task is to scan the raw text of a question paper, detect the assessment tool type (e.g., T1, T2, T3, T4, or T5), and group the extracted questions by their syllabus module (MODULE_1 or MODULE_2).

For each question, extract:
1. questionNo (e.g., "1", "2a", "Q1", "Q2b", "3.1" - extract exactly as written in the text, do not reject any prefix like 'Q')
2. questionText (the full, literal question text. Do not summarize or alter.)
3. marks (the number of marks allocated, as a numeric integer. Look for [5], (10), 10 marks, etc. If not found, assign 0)

You must return a JSON array of objects, where each object represents a group of questions belonging to a specific module and toolType.

Output format must be strictly valid JSON matching this schema:
[
  {
    "module": "One of: MODULE_1, MODULE_2",
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

Ensure that no questions are skipped. Extract questionNo exactly as written in the text and do not return validation or format errors. Return ONLY the JSON array. Do not include formatting marks like \`\`\`json.
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
