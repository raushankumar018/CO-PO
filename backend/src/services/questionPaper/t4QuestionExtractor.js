/**
 * src/services/questionPaper/t4QuestionExtractor.js
 * T4 Examination Question Extraction Service.
 * Parses raw exam paper text, identifies syllabus modules, question numbers, and marks for T4 format.
 * Incorporates cognitive classification and CO mapping directly into a single LLM request.
 */

import ollamaConfig from '../../config/ollama.js';

/**
 * Extracts list of T4 questions from raw exam paper text, including classification and CO mapping.
 * 
 * @param {string} rawPaperText - Extracted text from question paper PDF.
 * @param {Object} coRecord - Course Outcome mappings.
 * @param {Array} unitsAndTopics - Subject syllabus units.
 * @returns {Promise<Array>} - List of groups matching: { module: string, toolType: string, questions: Array }
 */
export const extractQuestionsFromTextT4 = async (rawPaperText, coRecord, unitsAndTopics) => {
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
You are an expert university exam paper parsing engine and academic mapping expert.
Your task is to scan the raw text of a T4 exam paper, extract all questions, classify their cognitive level and nature, and map each question to the subject's Course Outcomes (CO1 to CO6) based on the syllabus.

T4 papers contain:
- PART A: Multiple Choice Questions (MCQs) (usually Q1 to Q10, 1 mark each)
- PART B: General descriptive questions (usually Q11, Q12, Q13, 5 marks each)

### EXTRACTION & CLASSIFICATION RULES:
1. Extract EVERY SINGLE question individually. Do NOT merge or aggregate MCQs. Extract Q1, Q2, Q3, etc. as individual, separate objects.
2. For each question, extract:
   - questionNo: string (exactly as written in the text, e.g., "1", "2", "3", "Q11", "Q12")
   - questionText: string (the full literal question text. For MCQs, include the question text and all options)
   - marks: number (marks allocated, e.g., 1 for MCQs, 5 for descriptive questions)
   - cognitiveLevel: Bloom's Taxonomy level ("Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create")
   - nature: nature of question ("Theory", "Numerical", "Programming", "Design", "Practical")

### CO MAPPING RULES:
1. Map each question to Course Outcomes (CO1 to CO6) based on the question content and syllabus.
2. Correlation weightage levels: ONLY use:
   - 3 (Strong Match): Directly evaluates the primary competency.
   - 2 (Moderate Match): Supporting outcome.
3. Never use weightage 1 or 0. If a CO is not related, do not include it.
4. Maximum of 2 COs per question.
5. Provide a short, academic justification for the mapping. Crucially, the justification MUST be a simple plain text string. Do NOT write quotes, curly braces {}, square brackets [], or JSON tags/syntax inside the justification string.

### OUTPUT FORMAT:
Return ONLY a valid JSON object matching the schema below. Do not include formatting marks like \`\`\`json. The output MUST start with { and end with }. All string values must be cleanly closed and escaped.

### SCHEMA:
{
  "groups": [
    {
      "module": "MODULE_1 | MODULE_2",
      "toolType": "T4",
      "questions": [
        {
          "questionNo": "string",
          "questionText": "string",
          "marks": number,
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

Question Paper Raw Content:
${rawPaperText}
`;

  try {
    console.log('[T4QuestionExtractor] Sending T4 question paper text to Ollama for parsing, classifying, and mapping...');
    const response = await ollamaConfig.client.post('/api/generate', {
      model: ollamaConfig.model,
      system: systemPrompt,
      prompt: prompt,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.1 // Highly deterministic parsing
      }
    });

    const responseText = response.data.response;
    console.log('[t4QuestionExtractor] Ollama raw response:', responseText);
    let result;

    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[t4QuestionExtractor] JSON parsing failed, attempting cleanup:', responseText);
      const jsonRegex = /(\[[^]*\]|{[^]*})/;
      const match = responseText.match(jsonRegex);
      if (match) {
        result = JSON.parse(match[0]);
      } else {
        throw new Error('Ollama response could not be parsed as valid JSON.');
      }
    }

    // Helper to normalize the LLM output into expected array of groups
    const normalizeT4Groups = (res) => {
      if (!res) return [];

      const isGroupObj = (obj) => obj && typeof obj === 'object' && Array.isArray(obj.questions);

      // Case 1: Array representation
      if (Array.isArray(res)) {
        if (res.every(isGroupObj)) {
          return res;
        }
        return [{
          module: 'MODULE_1',
          toolType: 'T4',
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
            toolType: res.toolType || 'T4',
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
              toolType: res.toolType || 'T4',
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

    const normalized = normalizeT4Groups(result);
    console.log('[t4QuestionExtractor] Normalized groups count:', normalized.length);
    return normalized;
  } catch (error) {
    console.error(`[t4QuestionExtractor] Error parsing T4 question paper: ${error.message}`);
    throw new Error(`Failed to extract T4 exam questions using Ollama: ${error.message}`);
  }
};
