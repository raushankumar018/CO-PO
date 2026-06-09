/**
 * src/services/co/coGenerator.js
 * Phase 4: Dynamic CO Generation & Orchestration.
 * Coordinates category classification, domain detection, reference retrieval, dynamic prompt selection, and validation/refinement.
 */

import ollamaConfig from '../../config/ollama.js';
import { detectCategoryRuleBased } from '../intelligence/ruleBasedDetector.js';
import { detectCategoryLLM } from '../intelligence/llmCategoryDetector.js';
import { detectDomain } from '../intelligence/domainDetector.js';
import { retrieveReferenceCOs } from '../reference/referenceRetriever.js';
import { getPrompts } from '../prompts/promptFactory.js';
import { validateCOs } from './coValidator.js';
import { refineCOs } from './coRefiner.js';

/**
 * Generates 6 Course Outcomes based on subject units and topics using the Dynamic OBE Pipeline.
 * 
 * @param {string} subjectName - Name of the subject.
 * @param {Array} unitsAndTopics - List of unit objects.
 * @param {string} subjectCode - Course code.
 * @returns {Promise<Object>} - Object containing CO1 to CO6.
 */
export const generateCOs = async (subjectName, unitsAndTopics, subjectCode) => {
  try {
    // 1. Format syllabus units and topics text
    const unitsAndTopicsText = unitsAndTopics
      .map(
        (unit) =>
          `[${unit.unitNumber || 'Unit'}] ${unit.unitTitle || ''}\nTopics: ${
            unit.topics && unit.topics.length > 0 ? unit.topics.join(', ') : 'Not specified'
          }`
      )
      .join('\n\n');

    // 2. Perform Category Classification
    let category = detectCategoryRuleBased(subjectName, subjectCode);
    if (category === 'UNKNOWN') {
      category = await detectCategoryLLM(subjectName, subjectCode, unitsAndTopicsText);
    }
    console.log(`[coGenerator] Final Subject Category Classified: ${category}`);

    // 3. Perform Domain Detection
    const domain = detectDomain(category, subjectName, subjectCode);
    console.log(`[coGenerator] Final Subject Domain Detected: ${domain}`);

    // 4. Retrieve Historical Reference Outcomes (RAG memory)
    const referenceCOsText = await retrieveReferenceCOs(subjectName, subjectCode);

    // 5. Select Category & Domain Specific Prompts
    const { systemPrompt, userPrompt } = getPrompts(category, domain);

    // 6. Build the prompt and call Ollama
    const prompt = userPrompt(subjectName, unitsAndTopicsText, referenceCOsText);

    console.log(`[coGenerator] Initiating LLM Course Outcomes generation for category ${category} / domain ${domain}...`);
    const response = await ollamaConfig.client.post('/api/generate', {
      model: ollamaConfig.model,
      system: systemPrompt,
      prompt: prompt,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.4 // Lower temperature for high alignment with rules
      }
    });

    const responseText = response.data.response;
    let parsedCOs;

    try {
      parsedCOs = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[coGenerator] JSON parsing failed, attempting cleanup:', responseText);
      const jsonRegex = /{[^]*}/;
      const match = responseText.match(jsonRegex);
      if (match) {
        parsedCOs = JSON.parse(match[0]);
      } else {
        throw new Error('Ollama response could not be parsed as valid JSON.');
      }
    }

    // Standardize generated outcomes
    let finalCOs = {
      CO1: parsedCOs.CO1 || 'Build foundational knowledge of the subject.',
      CO2: parsedCOs.CO2 || 'Apply concepts to solve practical problems.',
      CO3: parsedCOs.CO3 || 'Implement applications using modern standard methodologies.',
      CO4: parsedCOs.CO4 || 'Analyze complex systems and domain architectures.',
      CO5: parsedCOs.CO5 || 'Evaluate design performance indicators and trade-offs.',
      CO6: parsedCOs.CO6 || 'Demonstrate practical system operations or project work.'
    };

    // 7. Self-healing loop: Refine outcomes until they pass validation (compliance score >= 90%)
    console.log('[coGenerator] Auditing and validating generated outcomes...');
    let validationReport = await validateCOs(subjectName, unitsAndTopics, finalCOs, subjectCode);
    
    let attempts = 0;
    const maxAttempts = 3;
    
    while (!validationReport.isCompliant && attempts < maxAttempts) {
      attempts++;
      console.log(`[coGenerator] Validation check failed on attempt ${attempts} (Bloom Compliance: ${validationReport.score.bloomCompliance}%, Coverage: ${validationReport.score.coverage}%). Triggering refinement loop...`);
      
      finalCOs = await refineCOs(subjectName, unitsAndTopicsText, finalCOs, validationReport.comments.join('; '));
      console.log(`[coGenerator] Outcomes refined. Re-auditing outcomes...`);
      
      validationReport = await validateCOs(subjectName, unitsAndTopics, finalCOs, subjectCode);
    }
    
    if (validationReport.isCompliant) {
      console.log(`[coGenerator] Outcomes successfully passed compliance validation (Score: ${validationReport.score.bloomCompliance}% Bloom compliance).`);
    } else {
      console.log(`[coGenerator] Validation check did not reach compliance threshold after ${maxAttempts} attempts. Proceeding with best-effort outcomes.`);
    }

    return finalCOs;
  } catch (error) {
    console.error(`[coGenerator] Error in dynamic CO generator pipeline: ${error.message}`);
    throw new Error(`Dynamic CO generation failed: ${error.message}`);
  }
};
