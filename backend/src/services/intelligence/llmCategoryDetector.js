/**
 * src/services/intelligence/llmCategoryDetector.js
 * Layer 2: LLM Classification (Fallback).
 * Detects the subject category when the rule-based matcher returns UNKNOWN.
 */

import ollamaConfig from '../../config/ollama.js';

const SYSTEM_PROMPT = `
You are a curriculum classifier expert.
Your job is to analyze the Subject Name, Subject Code, and Syllabus Text, and classify it into exactly one of the following academic categories:
- "COMPUTER_SCIENCE"
- "MATHEMATICS"
- "SCIENCE"
- "COMMUNICATION"
- "MANAGEMENT"
- "OTHER"

### Rules:
1. Return ONLY a valid JSON object matching the schema below.
2. Do NOT output any markdown tags (no \`\`\`json or \`\`\`).
3. Do NOT include preambles, postambles, explanations, or notes.

### Schema:
{
  "category": "One of: COMPUTER_SCIENCE, MATHEMATICS, SCIENCE, COMMUNICATION, MANAGEMENT, OTHER"
}
`;

/**
 * Classifies a subject category using LLM.
 * @param {string} subjectName - Name of the subject.
 * @param {string} subjectCode - Course code.
 * @param {string} syllabusText - Syllabus text or unit details.
 * @returns {Promise<string>} - The detected category.
 */
export const detectCategoryLLM = async (subjectName, subjectCode, syllabusText = '') => {
  try {
    const prompt = `Subject Name: ${subjectName}
Subject Code: ${subjectCode}
Syllabus:
${syllabusText.substring(0, 3000)} // Limiting token count for category detection
`;

    console.log(`[LLMCategoryDetector] Running LLM category detection for: "${subjectName}"...`);
    const response = await ollamaConfig.client.post('/api/generate', {
      model: ollamaConfig.model,
      system: SYSTEM_PROMPT,
      prompt: prompt,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.0 // Strict deterministic classification
      }
    });

    const responseText = response.data.response;
    let parsed;

    try {
      parsed = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[LLMCategoryDetector] JSON parsing failed, attempting cleanup:', responseText);
      const jsonRegex = /{[^]*}/;
      const match = responseText.match(jsonRegex);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('LLM category detection response could not be parsed as valid JSON.');
      }
    }

    const detectedCategory = (parsed.category || 'OTHER').toUpperCase().trim();
    const VALID_CATEGORIES = ['COMPUTER_SCIENCE', 'MATHEMATICS', 'SCIENCE', 'COMMUNICATION', 'MANAGEMENT', 'OTHER'];
    
    if (VALID_CATEGORIES.includes(detectedCategory)) {
      console.log(`[LLMCategoryDetector] Successfully classified "${subjectName}" as: ${detectedCategory}`);
      return detectedCategory;
    }

    console.log(`[LLMCategoryDetector] Invalid category returned: ${detectedCategory}. Defaulting to OTHER.`);
    return 'OTHER';
  } catch (error) {
    console.error(`[LLMCategoryDetector] Error during LLM category classification: ${error.message}`);
    return 'OTHER'; // Graceful fallback
  }
};
