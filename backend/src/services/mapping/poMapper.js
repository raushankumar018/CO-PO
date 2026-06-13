/**
 * src/services/mapping/poMapper.js
 * Service that maps Course Outcomes to Program Outcomes (POs) using Ollama.
 */

import ollamaConfig from '../../config/ollama.js';
import { poMappingSystemPrompt, poMappingUserPrompt } from '../../prompts/poMapping.prompt.js';
import { cleanAndParseJSON } from '../../utils/jsonParser.js';

/**
 * Maps Course Outcomes to the 12 Program Outcomes and 2 PSOs with correlation weights.
 * @param {Object} courseOutcomes - The Subject's CO1-CO6 outcomes.
 * @param {Object} subject - The Subject document containing syllabus info.
 * @returns {Promise<Array>} - Correlation matrix list.
 */
export const mapCOsToPOs = async (courseOutcomes, subject) => {
  try {
    const prompt = poMappingUserPrompt(courseOutcomes, subject);

    const response = await ollamaConfig.client.post('/api/generate', {
      model: ollamaConfig.model,
      system: poMappingSystemPrompt,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.3
      }
    });

    const responseText = response.data.response;
    let result;

    try {
      result = cleanAndParseJSON(responseText);
    } catch (parseError) {
      console.error('[poMapper] JSON self-healing parsing failed:', responseText);
      throw new Error(`Ollama response could not be parsed as valid JSON: ${parseError.message}`);
    }

    const rawMatrix = Array.isArray(result) ? result : (result.coPoMatrix || result.matrix || []);
    
    // Translate LLM schema key names (co, po) to Mongoose model fields (coCode, poCode) and filter
    const translatedMatrix = rawMatrix.map((row) => {
      const coCode = (row.coCode || row.co || '').toUpperCase();
      const mappings = (row.mappings || [])
        .map((m) => {
          const poCode = (m.poCode || m.po || '').toUpperCase();
          const correlation = Number(m.correlation);
          return { poCode, correlation };
        })
        .filter((m) => [1, 2, 3].includes(m.correlation)); // Schema requires correlation in [1, 2, 3]

      return { coCode, mappings };
    });

    return translatedMatrix;
  } catch (error) {
    console.error(`[poMapper] Error mapping COs to POs: ${error.message}`);
    throw new Error(`CO-PO mapping failed: ${error.message}`);
  }
};
