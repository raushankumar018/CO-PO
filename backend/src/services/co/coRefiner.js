/**
 * src/services/co/coRefiner.js
 * Phase 6: CO Refiner.
 * Refines generated Course Outcomes to resolve validation critique comments and meet accredited guidelines.
 */

import ollamaConfig from '../../config/ollama.js';

const REFINER_SYSTEM_PROMPT = `
You are a Senior NBA Accreditation Specialist and University Curriculum Designer.
Your task is to take a set of proposed Course Outcomes (CO1-CO6) and refine/rephrase them to fix all audit failures listed in the Auditor Critique Comments.

### REFINEMENT RULES:
1. **Count**: Return exactly 6 Course Outcomes (CO1-CO6).
2. **Verb Rule**: Fix all weak verb violations by substituting them with active verbs (e.g., instead of "Understand", use "Build foundational concepts of", "Apply", or "Analyze").
3. **No Topic Lists**: Do not enumerate long lists of topics. Group them into active competencies.
4. **Style Alignment**: Maintain professional university curriculum phrasing, appropriate cognitive progression (CO1 remembers, CO2/CO3 applies/implements, CO4 analyzes, CO5 evaluates/designs, CO6 demonstrates).

### OUTPUT FORMAT:
Return ONLY a valid JSON object matching this schema. No markdown blocks, preambles, postambles, explanations, or notes.

### SCHEMA:
{
  "CO1": "Refined and optimized Course Outcome 1",
  "CO2": "Refined and optimized Course Outcome 2",
  "CO3": "Refined and optimized Course Outcome 3",
  "CO4": "Refined and optimized Course Outcome 4",
  "CO5": "Refined and optimized Course Outcome 5",
  "CO6": "Refined and optimized Course Outcome 6"
}
`;

/**
 * Refines a set of Course Outcomes using LLM based on audit comments.
 * 
 * @param {string} subjectName - Name of the subject.
 * @param {string} syllabusText - Syllabus text.
 * @param {Object} proposedCOs - Proposed Outcomes (CO1-CO6).
 * @param {string} auditComments - Comments describing issues found.
 * @returns {Promise<Object>} - Refined Outcomes (CO1-CO6).
 */
export const refineCOs = async (subjectName, syllabusText, proposedCOs, auditComments) => {
  try {
    const prompt = `Subject Name: ${subjectName}
Syllabus:
${syllabusText.substring(0, 3000)}

Proposed Outcomes to Fix:
${JSON.stringify(proposedCOs, null, 2)}

Auditor Critique Comments to Resolve:
${auditComments}
`;

    console.log(`[coRefiner] Querying LLM to refine outcomes based on audit comments...`);
    const response = await ollamaConfig.client.post('/api/generate', {
      model: ollamaConfig.model,
      system: REFINER_SYSTEM_PROMPT,
      prompt: prompt,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.2 // Factual and instruction-heavy
      }
    });

    const responseText = response.data.response;
    let refinedCOs;

    try {
      refinedCOs = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[coRefiner] JSON parsing failed, attempting cleanup:', responseText);
      const jsonRegex = /{[^]*}/;
      const match = responseText.match(jsonRegex);
      if (match) {
        refinedCOs = JSON.parse(match[0]);
      } else {
        throw new Error('Ollama refiner response could not be parsed as valid JSON.');
      }
    }

    // Standardize returned outcomes
    return {
      CO1: refinedCOs.CO1 || proposedCOs.CO1,
      CO2: refinedCOs.CO2 || proposedCOs.CO2,
      CO3: refinedCOs.CO3 || proposedCOs.CO3,
      CO4: refinedCOs.CO4 || proposedCOs.CO4,
      CO5: refinedCOs.CO5 || proposedCOs.CO5,
      CO6: refinedCOs.CO6 || proposedCOs.CO6
    };
  } catch (error) {
    console.error(`[coRefiner] Error refining Course Outcomes: ${error.message}`);
    return proposedCOs; // Fallback gracefully to proposed values
  }
};
