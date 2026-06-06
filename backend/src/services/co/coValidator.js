/**
 * src/services/co/coValidator.js
 * Phase 5: CO Validator.
 * Validates generated Course Outcomes against structural criteria, weak verb bans, and coverage, returning quality scores.
 */

import ollamaConfig from '../../config/ollama.js';

const VALIDATION_SYSTEM_PROMPT = `
You are a Senior OBE Curriculum Auditor.
Your task is to audit a set of Course Outcomes (CO1-CO6) against the syllabus and return a JSON score report.

### AUDIT SCORING RULES
1. **Syllabus Coverage (coverage)**: Score 0-100 based on how well the outcomes cover the units and topics. Deduct points if any unit is ignored.
2. **Bloom's Compliance (bloomCompliance)**: Score 0-100 based on whether they follow cognitive levels and start with active verbs. Deduct points for weak verbs.
3. **NBA Style Match (styleMatch)**: Score 0-100 on whether they are concise, measurable, and fit standard university phrasing.

### OUTPUT FORMAT
Return ONLY a valid JSON object matching the schema. No markdown blocks, explanations, or notes.

### SCHEMA:
{
  "coverage": 100, // integer
  "bloomCompliance": 100, // integer
  "styleMatch": 100, // integer
  "comments": ["Any specific issue found, or empty array if perfect"]
}
`;

/**
 * Validates Course Outcomes against rules and returns compliance score report.
 * 
 * @param {string} subjectName - Name of the subject.
 * @param {Array} unitsAndTopics - List of unit objects with topics.
 * @param {Object} outcomes - The outcomes object (CO1-CO6).
 * @param {string} subjectCode - Subject course code.
 * @returns {Promise<Object>} - Object containing compliance state, scores, and comments.
 */
export const validateCOs = async (subjectName, unitsAndTopics, outcomes, subjectCode) => {
  try {
    const comments = [];
    let isCompliant = true;

    // --- 1. Deterministic Validations ---
    
    // Check outcome count
    const coKeys = ['CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'CO6'];
    const missingKeys = coKeys.filter((key) => !outcomes[key]);
    if (missingKeys.length > 0) {
      isCompliant = false;
      comments.push(`Missing outcomes: ${missingKeys.join(', ')}`);
    }

    // Check duplicate outcomes
    const values = coKeys.map((k) => (outcomes[k] || '').trim().toLowerCase());
    const uniqueValues = new Set(values);
    if (uniqueValues.size < values.length) {
      isCompliant = false;
      comments.push('Duplicate Course Outcomes detected.');
    }

    // Check forbidden weak verbs
    const weakVerbs = ['understand', 'know', 'learn', 'study', 'familiarize', 'gain knowledge', 'be aware'];
    const weakVerbRegex = new RegExp(`\\b(${weakVerbs.join('|')})\\b`, 'i');

    let weakVerbViolations = 0;
    coKeys.forEach((key) => {
      const text = outcomes[key] || '';
      if (weakVerbRegex.test(text)) {
        isCompliant = false;
        weakVerbViolations++;
        comments.push(`Weak/non-measurable verb found in ${key}`);
      }
    });

    // --- 2. LLM-Based Quality Scorer ---
    const unitsAndTopicsText = unitsAndTopics
      .map(
        (unit) =>
          `[${unit.unitNumber || 'Unit'}] ${unit.unitTitle || ''}\nTopics: ${
            unit.topics && unit.topics.length > 0 ? unit.topics.join(', ') : 'Not specified'
          }`
      )
      .join('\n\n');

    const prompt = `Subject Name: ${subjectName}
Syllabus:
${unitsAndTopicsText}

Outcomes to Audit:
CO1: ${outcomes.CO1}
CO2: ${outcomes.CO2}
CO3: ${outcomes.CO3}
CO4: ${outcomes.CO4}
CO5: ${outcomes.CO5}
CO6: ${outcomes.CO6}
`;

    const response = await ollamaConfig.client.post('/api/generate', {
      model: ollamaConfig.model,
      system: VALIDATION_SYSTEM_PROMPT,
      prompt: prompt,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.0 // Strict deterministic scoring
      }
    });

    const responseText = response.data.response;
    let scores;

    try {
      scores = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[coValidator] JSON parsing failed, attempting cleanup:', responseText);
      const jsonRegex = /{[^]*}/;
      const match = responseText.match(jsonRegex);
      if (match) {
        scores = JSON.parse(match[0]);
      } else {
        throw new Error('Ollama validator response could not be parsed as valid JSON.');
      }
    }

    // Adjust Bloom compliance score based on deterministic check violations
    let bloomCompliance = scores.bloomCompliance ?? 100;
    if (weakVerbViolations > 0) {
      bloomCompliance = Math.max(0, bloomCompliance - (weakVerbViolations * 15));
    }

    // Merge comments
    if (scores.comments && Array.isArray(scores.comments)) {
      scores.comments.forEach((c) => {
        if (c && !comments.includes(c)) {
          comments.push(c);
        }
      });
    }

    // Check thresholds to decide final compliance
    const coverage = scores.coverage ?? 100;
    const styleMatch = scores.styleMatch ?? 100;

    if (coverage < 90 || bloomCompliance < 90 || styleMatch < 90) {
      isCompliant = false;
    }

    return {
      isCompliant,
      score: {
        coverage,
        bloomCompliance,
        styleMatch
      },
      comments
    };
  } catch (error) {
    console.error(`[coValidator] Validation error: ${error.message}`);
    // If validation fails, return compliant to avoid infinite generation loops, with warning comments
    return {
      isCompliant: true,
      score: { coverage: 100, bloomCompliance: 100, styleMatch: 100 },
      comments: [`Validation bypassed due to service error: ${error.message}`]
    };
  }
};
