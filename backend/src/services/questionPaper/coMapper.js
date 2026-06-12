/**
 * src/services/questionPaper/coMapper.js
 * Phase 7: Question-to-CO Mapping Service.
 * Maps exam questions to Course Outcomes using syllabus content and semantic alignment rules.
 * Strictly outputs weightages of 2 or 3 (no 0 or 1 stored).
 */

import ollamaConfig from '../../config/ollama.js';

const SYSTEM_PROMPT = `
You are a Senior OBE Curriculum Auditor and Academic Mapping Expert.
Your task is to map a given exam question (which belongs to a specific Syllabus Module) to one or more Course Outcomes (CO1 to CO6) based on the subject's syllabus.

### MAPPING & WEIGHTAGE SELECTION RULES
1. **Weightage Levels**: You must ONLY use:
   - **3 (Strong Contribution)**: Use when the question directly evaluates the primary competency described by the CO, or more than 70% of the question content belongs to that CO.
   - **2 (Moderate Contribution)**: Use when the question partially evaluates the CO, or the CO acts as a supporting outcome (representing less than 70% of the question content).
2. **Strict Exclusions**: 
   - Never assign weightages of 0 or 1.
   - If a CO is not related to the question, do NOT include that CO in the list.
3. **Outcome Coverage**: Every question must map to at least one CO.

### MODULE BOUNDARY VALIDATION RULES:
1. **Module Context**: You are given the Module of the question (MODULE_1 or MODULE_2).
2. **Dynamic CO-Module Association**: Analyze the syllabus units/topics and CO descriptions to identify which COs align with Module 1 vs Module 2.
3. **Prefer Same-Module Mapping**: Prioritize mapping the question to COs that correspond to the question's module.
4. **Cross-Module Mapping Restrictions**: You may only map to a CO belonging to a different module if there is strong, direct syllabus evidence of cross-topic relevance. If no such evidence exists, map strictly within the module's boundary.
5. **Accreditation-Ready Justification**: Provide an academic justification explaining how the question's module and text map to the chosen Course Outcome(s), and how this mapping aligns with the syllabus boundaries.

### OUTPUT FORMAT
Return ONLY a valid JSON object matching the schema. No markdown format, explanations, or notes.

### SCHEMA:
{
  "mappedCOs": [
    {
      "coCode": "CO1 | CO2 | CO3 | CO4 | CO5 | CO6",
      "weightage": 2 | 3
    }
  ],
  "justification": "Short, clear academic justification for this mapping."
}
`;

/**
 * Maps a single question to Course Outcomes.
 * 
 * @param {Object} question - The question object (containing questionNo, questionText, marks, module).
 * @param {Object} coRecord - The CourseOutcome record (containing CO1 to CO6).
 * @param {Array} unitsAndTopics - Syllabus units and topics.
 * @returns {Promise<Object>} - Object with { questionNo, mappedCOs, justification }
 */
export const mapQuestionToCOs = async (question, coRecord, unitsAndTopics) => {
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
Question Module: ${question.module || 'MODULE_1'}
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
    
    // Sanitize any occasional typos like "weight,age" to "weightage"
    const cleanedResponseText = responseText.replace(/"weight\s*,\s*age"/g, '"weightage"');
    let result;

    try {
      result = JSON.parse(cleanedResponseText);
    } catch (parseError) {
      console.error('[coMapper] JSON parsing failed, attempting cleanup:', cleanedResponseText);
      const jsonRegex = /{[^]*}/;
      const match = cleanedResponseText.match(jsonRegex);
      if (match) {
        result = JSON.parse(match[0]);
      } else {
        throw new Error('Ollama response could not be parsed as valid JSON.');
      }
    }

    // Filter mappedCOs to ensure only valid coCodes and weightages (2 or 3) are mapped
    const filteredMappedCOs = (result.mappedCOs || [])
      .filter((m) => ['CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'CO6'].includes(m.coCode))
      .map((m) => ({
        coCode: m.coCode,
        weightage: m.weightage === 3 ? 3 : 2 // Enforce 2 or 3
      }));

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
    console.error(`[coMapper] Error mapping question ${question.questionNo}: ${error.message}`);
    // Safe fallback mapping
    return {
      questionNo: question.questionNo,
      mappedCOs: [{ coCode: 'CO1', weightage: 2 }],
      justification: 'Default mapping due to analyzer error.'
    };
  }
};
