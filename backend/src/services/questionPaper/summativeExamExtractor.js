/**
 * src/services/questionPaper/summativeExamExtractor.js
 * Summative Examination Question Extraction, Classification, and Mapping Service.
 * Parses raw exam text, groups subparts into 6 parent questions (Q1 to Q6),
 * classifies cognitive level/nature, and maps to Course Outcomes in a single LLM call.
 */

import ollamaConfig from '../../config/ollama.js';

/**
 * Extracts, classifies, and maps Summative Exam questions from raw text.
 * 
 * @param {string} rawPaperText - Extracted raw text from exam PDF.
 * @param {Object} coRecord - Course Outcomes (CO1 to CO6).
 * @param {Array} unitsAndTopics - Subject syllabus units.
 * @returns {Promise<Array>} - List of extracted questions.
 */
export const extractQuestionsFromTextSummativeExam = async (rawPaperText, coRecord, unitsAndTopics) => {
  const unitsAndTopicsText = unitsAndTopics
    ? unitsAndTopics
        .map(
          (unit) =>
            `[Unit ${unit.unitNumber || ''}] ${unit.unitTitle || ''}\nTopics: ${
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
You are an expert university exam parsing engine and senior academic curriculum mapping auditor.
Your task is to scan the raw text of a Summative Examination, extract the parent questions, combine all subparts under parent questions, classify their cognitive levels and natures, and map each parent question to Course Outcomes (CO1 to CO6).

### SUMMATIVE EXAMINATION STRUCTURE:
A Summative Examination contains exactly 6 parent questions:
- SECTION A: Question 1, Question 2, Question 3, Question 4.
- SECTION B: Question 5, Question 6.
Each question may contain subparts (e.g., (a), (b), (c), (d)).

### EXTRACTION & AGGREGATION RULES:
1. You MUST extract all subparts and combine them under their parent Question.
2. Store ONLY: "1", "2", "3", "4", "5", "6" as question numbers. Do NOT store subparts like "1(a)" or "1b" as separate questions.
3. For each parent Question, build a "questionText" that appends all subparts' texts separated by a space or semicolon. Crucially, do NOT use raw newlines or line breaks inside the string. Example: "1(a): [text]; 1(b): [text]; 1(c): [text]".
4. Sum the marks of all subparts to calculate the total marks for the parent question. For example, if subparts (a), (b), and (c) have 5, 5, and 10 marks, the parent question should have 20 marks. If no marks are explicitly found, estimate/default based on paper sections.
5. For each question, classify:
   - cognitiveLevel: Bloom's Taxonomy level ("Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create")
   - nature: nature of question ("Theory", "Numerical", "Programming", "Design", "Practical")
   - module: Since a Summative Examination belongs to the entire subject, module is not applicable (return null).

### CO MAPPING & CORRELATION RULES:
1. Map each combined parent Question to Course Outcomes (CO1 to CO6).
2. Correlation weightage levels allowed:
   - 3 (Strong Correlation)
   - 2 (Moderate Correlation)
   - 0 / Unmapped (No Correlation)
   - NEVER use weightage 1.
3. Maximum of 2 COs per question. Never assign more than 2 COs.
4. Perform real-world validation before assigning a CO:
   - Is the topic directly covered by the syllabus?
   - Does the question assess the learning outcome represented by the CO?
   - Would a faculty member justify this mapping?
   - Can this mapping be defended during NBA accreditation?
   - Is the relationship direct?
   If NO to any of these, do not assign the CO (weightage is 0).
5. Provide a short, academic justification. Crucially, the justification MUST be a simple plain text string. Do NOT write double quotes, curly braces {}, square brackets [], or JSON tags/syntax inside the justification string.

### OUTPUT FORMAT:
Return ONLY a valid JSON object matching the schema below. Do not include formatting marks like \`\`\`json. The output MUST start with { and end with }.

### SCHEMA:
{
  "questions": [
    {
      "questionNo": "1 | 2 | 3 | 4 | 5 | 6",
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
`;

  const prompt = `
Syllabus Units & Topics:
${unitsAndTopicsText}

Course Outcomes (CO1-CO6):
${coText}

Summative Exam Raw Content:
${rawPaperText}
`;

  try {
    console.log('[summativeExamExtractor] Sending Summative Exam text to Ollama for parsing, aggregating, classifying, and mapping...');
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
    console.log('[summativeExamExtractor] Ollama raw response:', responseText);
    
    // Sanitize any occasional typos like "weight,age" to "weightage"
    const cleanedResponseText = responseText.replace(/"weight\s*,\s*age"/g, '"weightage"');
    let result;

    try {
      result = JSON.parse(cleanedResponseText);
    } catch (parseError) {
      console.error('[summativeExamExtractor] JSON parsing failed, attempting cleanup:', cleanedResponseText);
      const jsonRegex = /(\[[^]*\]|{[^]*})/;
      const match = cleanedResponseText.match(jsonRegex);
      if (match) {
        result = JSON.parse(match[0]);
      } else {
        throw new Error('Ollama response could not be parsed as valid JSON.');
      }
    }

    const normalizeExamQuestions = (res) => {
      if (!res) return [];
      if (Array.isArray(res)) return res;
      if (typeof res === 'object') {
        if (res.questions && Array.isArray(res.questions)) {
          return res.questions;
        }
        for (const key of Object.keys(res)) {
          if (Array.isArray(res[key])) {
            return res[key];
          }
        }
      }
      return [];
    };

    const questions = normalizeExamQuestions(result);
    console.log('[summativeExamExtractor] Extracted questions count:', questions.length);
    return questions;
  } catch (error) {
    console.error(`[summativeExamExtractor] Error parsing Summative Exam: ${error.message}`);
    throw new Error(`Failed to extract Summative Exam questions using Ollama: ${error.message}`);
  }
};
