/**
 * src/services/mapping/poMapper.js
 * Service that maps Course Outcomes to Program Outcomes (POs) using Ollama.
 */

import ollamaConfig from '../../config/ollama.js';
import { poMappingSystemPrompt, poMappingUserPrompt } from '../../prompts/poMapping.prompt.js';

/**
 * Maps Course Outcomes to the 12 Program Outcomes with correlation weights.
 * @param {Object} courseOutcomes - The Subject's CO1-CO6 outcomes.
 * @returns {Promise<Array>} - Correlation matrix list.
 */
export const mapCOsToPOs = async (courseOutcomes) => {
  try {
    const prompt = poMappingUserPrompt(courseOutcomes);

    const response = await ollamaConfig.client.post('/api/generate', {
      model: ollamaConfig.model,
      system: poMappingSystemPrompt,
      prompt: prompt,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.2
      }
    });

    const responseText = response.data.response;
    let result;

    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[poMapper] JSON parsing failed, attempting cleanup:', responseText);
      const jsonRegex = /{[^]*}/;
      const match = responseText.match(jsonRegex);
      if (match) {
        result = JSON.parse(match[0]);
      } else {
        throw new Error('Ollama response could not be parsed as valid JSON.');
      }
    }

    return result.coPoMatrix || [];
  } catch (error) {
    console.error(`[poMapper] Error mapping COs to POs: ${error.message}`);
    throw new Error(`CO-PO mapping failed: ${error.message}`);
  }
};
