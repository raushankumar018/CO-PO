/**
 * src/prompts/coMapping.prompt.js
 * Prompts for mapping exam questions to Course Outcomes (CO1 - CO6).
 */

export const coMappingSystemPrompt = `You are an expert academic evaluator and OBE coordinator.
Your task is to map each exam question to the most appropriate Course Outcome(s) (CO1 to CO6) from the list provided.
A question can map to one or more COs (normally 1, maximum 2).

For each question, evaluate:
1. The topic tested by the question vs the topics covered in the COs.
2. The cognitive level (e.g., Remembering, Applying, Analyzing) vs the action verb of the COs.

Output format must be strictly valid JSON without conversational wrapper text or markdown blocks.

Schema:
{
  "mappings": [
    {
      "questionNumber": "1a",
      "mappedCOs": ["CO1"],
      "justification": "Why this question maps to the selected COs based on keywords and cognitive levels."
    }
  ]
}`;

export const coMappingUserPrompt = (courseOutcomes, questions) => {
  const cosFormatted = Object.entries(courseOutcomes)
    .filter(([key]) => ['CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'CO6'].includes(key))
    .map(([key, val]) => `${key}: ${val}`)
    .join('\n');

  const questionsFormatted = questions
    .map((q) => `QNo ${q.questionNumber} (${q.marks} Marks): ${q.text}`)
    .join('\n');

  return `Course Outcomes (CO1-CO6):
${cosFormatted}

Questions to Map:
${questionsFormatted}

Please perform the mapping and return the JSON output.`;
};
