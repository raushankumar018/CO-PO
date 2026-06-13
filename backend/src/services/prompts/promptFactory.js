/**
 * src/services/prompts/promptFactory.js
 * Phase 2: Prompt Factory.
 * Resolves the appropriate system and user prompts based on category + domain.
 */

// Import prompt modules
import * as networkPrompt from '../../prompts/network.prompt.js';
import * as dbmsPrompt from '../../prompts/dbms.prompt.js';
import * as aiPrompt from '../../prompts/ai.prompt.js';
import * as mathPrompt from '../../prompts/mathematics.prompt.js';
import * as sciencePrompt from '../../prompts/science.prompt.js';
import * as commPrompt from '../../prompts/communication.prompt.js';
import * as mgmtPrompt from '../../prompts/management.prompt.js';
import * as generalPrompt from '../../prompts/generateCO.prompt.js';

/**
 * Returns the prompt builders tailored to the category and domain.
 * @param {string} category - Detected subject category (e.g. 'COMPUTER_SCIENCE').
 * @param {string} domain - Detected subject domain (e.g. 'NETWORKS').
 * @returns {Object} - Object containing { systemPrompt, userPrompt }.
 */
export const getPrompts = (category, domain) => {
  const cat = (category || 'OTHER').toUpperCase();
  const dom = (domain || 'GENERAL').toUpperCase();

  console.log(`[PromptFactory] Selecting prompt template for: ${cat} + ${dom}`);

  switch (cat) {
    case 'COMPUTER_SCIENCE':
      if (dom === 'NETWORKS' || dom === 'CYBER_SECURITY') {
        return {
          systemPrompt: networkPrompt.systemPrompt,
          userPrompt: networkPrompt.userPrompt
        };
      }
      if (dom === 'DATABASES') {
        return {
          systemPrompt: dbmsPrompt.systemPrompt,
          userPrompt: dbmsPrompt.userPrompt
        };
      }
      if (dom === 'AI_ML') {
        return {
          systemPrompt: aiPrompt.systemPrompt,
          userPrompt: aiPrompt.userPrompt
        };
      }
      // Fallback for general programming / software engineering / other CS domains
      return {
        systemPrompt: generalPrompt.generateCOSystemPrompt,
        userPrompt: generalPrompt.generateCOUserPrompt
      };

    case 'MATHEMATICS':
      return {
        systemPrompt: mathPrompt.systemPrompt,
        userPrompt: mathPrompt.userPrompt
      };

    case 'SCIENCE':
      return {
        systemPrompt: sciencePrompt.systemPrompt,
        userPrompt: sciencePrompt.userPrompt
      };

    case 'COMMUNICATION':
      return {
        systemPrompt: commPrompt.systemPrompt,
        userPrompt: commPrompt.userPrompt
      };

    case 'MANAGEMENT':
      return {
        systemPrompt: mgmtPrompt.systemPrompt,
        userPrompt: mgmtPrompt.userPrompt
      };

    default:
      // Fallback to the general OBE curriculum prompt
      return {
        systemPrompt: generalPrompt.generateCOSystemPrompt,
        userPrompt: generalPrompt.generateCOUserPrompt
      };
  }
};
