/**
 * src/services/questionPaper/questionClassifier.js
 * Phase 7: Question Classification.
 * Classifies each question into cognitive level (Bloom's Taxonomy) and question nature (Theory, Numerical, etc.).
 */

import ollamaConfig from '../../config/ollama.js';

const SYSTEM_PROMPT = `
You are a senior Bloom's Taxonomy expert and academic curriculum auditor.
Your job is to analyze the text of an exam question and classify it based on two dimensions:

1. **Cognitive Level (Bloom's Taxonomy)**:
   - "Remember": Recall of facts, definitions, or terms.
   - "Understand": Explain ideas, interpret models, or explain concepts.
   - "Apply": Solve problems, use a method, run an algorithm, write code, or execute a procedure.
   - "Analyze": Compare, differentiate, diagram, organize, or explain structural systems.
   - "Evaluate": Judge, critique, evaluate performance metrics, or choose optimization methods.
   - "Create": Design, construct, develop, formulate, or assemble a new system/proof.

2. **Question Nature**:
   - "Theory": Conceptual descriptions, derivations, or explanations.
   - "Numerical": Mathematical computations or calculations.
   - "Programming": Writing source code, scripts, or database queries.
   - "Design": Drawing architecture diagrams, designing databases, or system modeling.
   - "Practical": Troubleshooting, NIC setup, crimping tools, hardware testing, or using simulators.

### Output format
Return ONLY a valid JSON object matching the schema below. No markdown formatting, explanations, or notes.

### Schema
{
  "cognitiveLevel": "Remember | Understand | Apply | Analyze | Evaluate | Create",
  "nature": "Theory | Numerical | Programming | Design | Practical"
}
`;

/**
 * Classifies a specific question's cognitive level and nature.
 * 
 * @param {string} questionText - The text of the question.
 * @returns {Promise<Object>} - Object with { cognitiveLevel, nature }
 */
export const classifyQuestionText = async (questionText) => {
  try {
    const prompt = `Question Text to classify:\n"${questionText}"`;

    const response = await ollamaConfig.client.post('/api/generate', {
      model: ollamaConfig.model,
      system: SYSTEM_PROMPT,
      prompt: prompt,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.1 // Highly deterministic classification
      }
    });

    const responseText = response.data.response;
    let result;

    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[questionClassifier] JSON parsing failed, attempting cleanup:', responseText);
      const jsonRegex = /{[^]*}/;
      const match = responseText.match(jsonRegex);
      if (match) {
        result = JSON.parse(match[0]);
      } else {
        throw new Error('Ollama response could not be parsed as valid JSON.');
      }
    }

    const cognitiveLevel = result.cognitiveLevel || 'Understand';
    const nature = result.nature || 'Theory';

    return { cognitiveLevel, nature };
  } catch (error) {
    console.error(`[questionClassifier] Error classifying question: ${error.message}`);
    return { cognitiveLevel: 'Understand', nature: 'Theory' }; // Safe fallbacks
  }
};
