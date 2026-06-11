/**
 * src/services/questionPaper/t4CoMapper.js
 * T4 Examination Question-to-CO Mapping Service.
 * Maps T4 questions to Course Outcomes using syllabus content, keywords, modules, and Bloom's taxonomy.
 * Strictly enforces T4 mapping rules: Max 2 COs, weights of only 2 or 3 (never 1), and direct validation.
 */

import ollamaConfig from '../../config/ollama.js';

const SYSTEM_PROMPT = `
You are a Senior OBE Curriculum Auditor and Academic Mapping Expert.
Your task is to map a given exam question to Course Outcomes (CO1 to CO6) based on the subject's syllabus for a T4 examination.

### T4 CO MAPPING RULES:
1. **Correlation weightage levels**: You must ONLY use:
   - **3 (Strong Match)**: Use when the question directly evaluates the primary competency described by the CO, or is covered extensively in the syllabus.
   - **2 (Moderate Match)**: Use when the question partially evaluates the CO, or the CO acts as a supporting outcome.
2. **Never assign 1**: Do NOT map any CO with weightage 1.
3. **No Match**: If a CO is not related to the question, do NOT map it (do not include it in the mapped list).
4. **Maximum 2 COs**: A single question can map to a MAXIMUM of 2 COs.
5. **No random COs**: Never assign random COs. Prefer direct module-to-CO relationships.
6. **Real-world validation**: Before assigning a CO, ensure:
   - The syllabus directly supports this mapping.
   - A faculty member would naturally map this question to this CO.
   - The mapping can be justified during an NBA review.
   - The relationship is direct.
   If any of these criteria are not met, do not assign that CO.

### OUTPUT FORMAT:
Return ONLY a valid JSON object matching the schema. Do not write introductory or concluding text, explanations, or notes outside the JSON.

### SCHEMA:
{
  "mappedCOs": [
    {
      "coCode": "CO1 | CO2 | CO3 | CO4 | CO5 | CO6",
      "weightage": 2 | 3
    }
  ],
  "justification": "Short, clear academic justification explaining how the syllabus directly supports this mapping and why it is justifiable for NBA review."
}
`;

/**
 * Maps a single T4 question to Course Outcomes.
 * 
 * @param {Object} question - The question object (containing questionNo, questionText, marks).
 * @param {Object} coRecord - The CourseOutcome record (containing CO1 to CO6).
 * @param {Array} unitsAndTopics - Syllabus units and topics.
 * @returns {Promise<Object>} - Object with { questionNo, mappedCOs, justification }
 */
export const mapQuestionToCOsT4 = async (question, coRecord, unitsAndTopics) => {
  try {
    const unitsAndTopicsText = unitsAndTopics
      .map(
        (unit) =>
          `[${unit.unitNumber || 'Unit'}] ${unit.unitTitle || ''}\nTopics: ${
            unit.topics && unit.topics.length > 0 ? unit.topics.join(', ') : 'Not specified'
          }`
      )
      .join('\n\n');

    const prompt = `Syllabus Units & Topics:
${unitsAndTopicsText}

Course Outcomes (CO1-CO6):
CO1: ${coRecord.CO1}
CO2: ${coRecord.CO2}
CO3: ${coRecord.CO3}
CO4: ${coRecord.CO4}
CO5: ${coRecord.CO5}
CO6: ${coRecord.CO6}

Question to Map:
Question Number: ${question.questionNo}
Question Text: "${question.questionText}"
Marks: ${question.marks}
`;

    const response = await ollamaConfig.client.post('/api/generate', {
      model: ollamaConfig.model,
      system: SYSTEM_PROMPT,
      prompt: prompt,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.1 // Low temperature for consistent semantic mapping
      }
    });

    const responseText = response.data.response;
    let result;

    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[t4CoMapper] JSON parsing failed, attempting cleanup:', responseText);
      const jsonRegex = /{[^]*}/;
      const match = responseText.match(jsonRegex);
      if (match) {
        result = JSON.parse(match[0]);
      } else {
        throw new Error('Ollama response could not be parsed as valid JSON.');
      }
    }

    // Filter mappedCOs to ensure only valid coCodes and weightages (2 or 3) are mapped
    let filteredMappedCOs = (result.mappedCOs || [])
      .filter((m) => ['CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'CO6'].includes(m.coCode))
      .map((m) => ({
        coCode: m.coCode,
        weightage: m.weightage === 2 ? 2 : 3 // Enforce 2 or 3
      }));

    // Enforce Maximum of 2 COs
    if (filteredMappedCOs.length > 2) {
      console.warn(`[t4CoMapper] Question ${question.questionNo} mapped to ${filteredMappedCOs.length} COs. Truncating to top 2.`);
      filteredMappedCOs = filteredMappedCOs.slice(0, 2);
    }

    // Fallback: If LLM returned empty list, map to CO1 with weightage 2 as a safe default
    if (filteredMappedCOs.length === 0) {
      filteredMappedCOs.push({ coCode: 'CO1', weightage: 2 });
    }

    return {
      questionNo: question.questionNo,
      mappedCOs: filteredMappedCOs,
      justification: result.justification || 'Aligned with syllabus outcomes.'
    };
  } catch (error) {
    console.error(`[t4CoMapper] Error mapping T4 question ${question.questionNo}: ${error.message}`);
    // Safe fallback mapping
    return {
      questionNo: question.questionNo,
      mappedCOs: [{ coCode: 'CO1', weightage: 2 }],
      justification: 'Default mapping due to T4 analyzer error.'
    };
  }
};
