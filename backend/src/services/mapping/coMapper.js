/**
 * src/services/mapping/coMapper.js
 * Service that maps questions in a question paper to Course Outcomes (CO1 - CO6) using Ollama.
 */

import ollamaConfig from '../../config/ollama.js';
import { coMappingSystemPrompt, coMappingUserPrompt } from '../../prompts/coMapping.prompt.js';

/**
 * Maps question objects to relevant Course Outcomes.
 * @param {Object} courseOutcomes - The Subject's CO1-CO6 outcomes.
 * @param {Array} questions - Array of questions { questionNumber, text, marks }.
 * @returns {Promise<Array>} - List of mapped questions with mappedCOs array and justification.
 */
export const mapQuestionsToCOs = async (courseOutcomes, questions) => {
  try {
    if (!questions || questions.length === 0) {
      return [];
    }

    const prompt = coMappingUserPrompt(courseOutcomes, questions);

    const response = await ollamaConfig.client.post('/api/generate', {
      model: ollamaConfig.model,
      system: coMappingSystemPrompt,
      prompt: prompt,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.1 // High precision for strict classification
      }
    });

    const responseText = response.data.response;
    let result;

    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[coMapper] JSON parsing failed, attempting cleanup:', responseText);
      const jsonRegex = /{[^]*}/;
      const match = responseText.match(jsonRegex);
      if (match) {
        result = JSON.parse(match[0]);
      } else {
        throw new Error('Ollama response could not be parsed as valid JSON.');
      }
    }

    return result.mappings || [];
  } catch (error) {
    console.error(`[coMapper] Error mapping questions: ${error.message}`);
    throw new Error(`CO Mapping failed: ${error.message}`);
  }
};
