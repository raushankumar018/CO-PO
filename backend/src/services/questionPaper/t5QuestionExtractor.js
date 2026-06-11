/**
 * src/services/questionPaper/t5QuestionExtractor.js
 * T5 Assignment Question Extraction, Classification, and Mapping Service.
 * Parses raw assignment text, groups subparts into 4 parent questions (Q1 to Q4) with 20 marks each,
 * classifies cognitive level/nature, and maps to Course Outcomes in a single LLM call.
 */

import ollamaConfig from '../../config/ollama.js';

/**
 * Extracts, classifies, and maps T5 assignment questions from raw text.
 * 
 * @param {string} rawPaperText - Extracted raw text from assignment PDF.
 * @param {Object} coRecord - Course Outcomes (CO1 to CO6).
 * @param {Array} unitsAndTopics - Subject syllabus units.
 * @returns {Promise<Array>} - List of groups matching: { module: string, toolType: string, questions: Array }
 */
export const extractQuestionsFromTextT5 = async (rawPaperText, coRecord, unitsAndTopics) => {
  const unitsAndTopicsText = unitsAndTopics
    ? unitsAndTopics
        .map(
          (unit) =>
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

  const systemPrompt = `
You are an expert university assignment parsing engine and senior academic curriculum mapping auditor.
Your task is to scan the raw text of a T5 Assignment, extract the questions, combine subparts under parent questions, classify their cognitive levels and natures, and map each parent question to Course Outcomes (CO1 to CO6).

### T5 ASSIGNMENT STRUCTURE:
A T5 Assignment contains up to 4 parent questions: Question 1, Question 2, Question 3, Question 4.
Each question may contain subparts (e.g. 1-a, 1-b, 1-c, 1-d or 2a, 2b, 2c, etc.).

### EXTRACTION & AGGREGATION RULES:
1. You MUST extract all subparts and combine them under their parent Question.
2. Store ONLY: "1", "2", "3", "4" as question numbers. Do NOT store subparts like "1-a", "1-b" as separate questions.
3. For each parent Question, build a "questionText" that appends all subparts' texts separated by a space or semicolon. Crucially, do NOT use raw newlines or line breaks inside the string. Example: "1-a: [text]; 1-b: [text]; 1-c: [text]".
4. Assign exactly 20 marks to each parent Question ("marks": 20).
5. For each question, classify:
   - cognitiveLevel: Bloom's Taxonomy level ("Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create")
   - nature: nature of question ("Theory", "Numerical", "Programming", "Design", "Practical")
   - module: One of "MODULE_1", "MODULE_2", "MODULE_3", "MODULE_4" based on the unit numbers from the syllabus corresponding to the question's content.

### T5 CO MAPPING & CORRELATION RULES:
1. Map each combined parent Question to Course Outcomes (CO1 to CO6).
2. Correlation weightage levels allowed:
   - 3 (Strong Correlation)
   - 2 (Moderate Correlation)
   - 0 / Unmapped (No Correlation)
   - NEVER use weightage 1.
3. Maximum of 2 COs per question. Never assign more than 2 COs.
4. Prefer same-module mappings:
   - Module 1 (MODULE_1) Questions -> CO1
   - Module 2 (MODULE_2) Questions -> CO2, CO3
   - Module 3 (MODULE_3) Questions -> CO4, CO5
   - Module 4 (MODULE_4) Questions -> CO6
   Cross-module mappings require strong direct evidence. If no direct relationship exists, do not map.
5. Provide a short, academic justification. Crucially, the justification MUST be a simple plain text string. Do NOT write double quotes, curly braces {}, square brackets [], or JSON tags/syntax inside the justification string.

### OUTPUT FORMAT:
Return ONLY a valid JSON object matching the schema below. Do not include formatting marks like \`\`\`json. The output MUST start with { and end with }.

### SCHEMA:
{
  "groups": [
    {
      "module": "MODULE_1 | MODULE_2 | MODULE_3 | MODULE_4",
      "toolType": "T5",
      "questions": [
        {
          "questionNo": "string",
          "questionText": "string",
          "marks": 20,
          "cognitiveLevel": "string",
          "nature": "string",
          "mappedCOs": [
            {
              "coCode": "CO1 | CO2 | CO3 | CO4 | CO5 | CO6",
              "weightage": 2 | 3
            }
          ],
          "justification": "string"
        }
      ]
    }
  ]
}
`;

  const prompt = `
Syllabus Units & Topics:
${unitsAndTopicsText}

Course Outcomes (CO1-CO6):
${coText}

Assignment Raw Content:
${rawPaperText}
`;

  try {
    console.log('[T5QuestionExtractor] Sending T5 Assignment text to Ollama for parsing, aggregating, classifying, and mapping...');
    const response = await ollamaConfig.client.post('/api/generate', {
      model: ollamaConfig.model,
      system: systemPrompt,
      prompt: prompt,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.1 // High precision
      }
    });

    const responseText = response.data.response;
    console.log('[t5QuestionExtractor] Ollama raw response:', responseText);
    let result;

    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[t5QuestionExtractor] JSON parsing failed, attempting cleanup:', responseText);
      const jsonRegex = /(\[[^]*\]|{[^]*})/;
      const match = responseText.match(jsonRegex);
      if (match) {
        result = JSON.parse(match[0]);
      } else {
        throw new Error('Ollama response could not be parsed as valid JSON.');
      }
    }

    // Helper to normalize the LLM output into expected array of groups
    const normalizeT5Groups = (res) => {
      if (!res) return [];

      const isGroupObj = (obj) => obj && typeof obj === 'object' && Array.isArray(obj.questions);

      // Case 1: Array representation
      if (Array.isArray(res)) {
        if (res.every(isGroupObj)) {
          return res;
        }
        return [{
          module: 'MODULE_1',
          toolType: 'T5',
          questions: res
        }];
      }

      // Case 2: Object representation
      if (typeof res === 'object') {
        // Sub-case 2.1: Wrapped groups list under "groups" or "questions" key
        const listKey = res.groups ? 'groups' : (res.questions ? 'questions' : null);
        if (listKey && Array.isArray(res[listKey])) {
          if (res[listKey].every(isGroupObj)) {
            return res[listKey];
          }
          return [{
            module: res.module || 'MODULE_1',
            toolType: 'T5',
            questions: res[listKey]
          }];
        }

        // Sub-case 2.2: Wrapped groups/questions list under any other array key
        for (const key of Object.keys(res)) {
          if (Array.isArray(res[key])) {
            if (res[key].every(isGroupObj)) {
              return res[key];
            }
            return [{
              module: res.module || 'MODULE_1',
              toolType: 'T5',
              questions: res[key]
            }];
          }
        }

        // Sub-case 2.3: Single group object
        if (isGroupObj(res)) {
          return [res];
        }
      }

      return [];
    };

    const normalized = normalizeT5Groups(result);
    console.log('[t5QuestionExtractor] Normalized groups count:', normalized.length);
    return normalized;
  } catch (error) {
    console.error(`[t5QuestionExtractor] Error parsing T5 assignment: ${error.message}`);
    throw new Error(`Failed to extract T5 assignment questions using Ollama: ${error.message}`);
  }
};
