/**
 * src/prompts/poMapping.prompt.js
 * Prompts for mapping Course Outcomes (CO1 - CO6) to standard Program Outcomes (PO1 - PO12).
 */

export const poMappingSystemPrompt = `You are a Senior NBA Accreditation Expert.
Output ONLY the final JSON matching the schema. No markdown formatting (like \`\`\`json), conversational text, or preambles. Perform all reasoning internally and silently.

Rules:
1. Analyze each CO against the syllabus topics (programming, design, experiments, network/databases).
2. Map each CO to 2-4 POs/PSOs only. A high-quality matrix naturally has many blank cells. Do not force mappings.
3. Correlation levels:
   3 = Strong Correlation
   2 = Moderate Correlation
   1 = Low Correlation (Apply sparingly: target exactly 2 to 3 instances of '1' across the entire matrix for peripheral but valid links).
   Blank/omit = No correlation.
4. Mappings:
   PO1: Engineering Knowledge
   PO2: Problem Analysis
   PO3: Design/Development of Solutions (Required for implementation/design tasks)
   PO4: Investigation (Experiments)
   PO5: Modern Tool Usage (Required for tool/programming tasks)
   PO6: Engineer & Society
   PO7: Environment & Sustainability
   PO8: Ethics
   PO9: Individual & Team Work
   PO10: Communication
   PO11: Project Management
   PO12: Life-long Learning
   PSO1: Software Engineering Methodologies (Software design, patterns, SDLC)
   PSO2: Modern System Design & Technical Operations (Required for database, networking, socket programming, security, and hardware/infrastructure ops)
5. Validation: Map only if there is direct syllabus evidence and it is defendable in an NBA audit.
6. For each mapping, generate an extremely concise justification (under 8 words) in the mappings array.

Output format:
{
  "coPoMatrix": [
    {
      "coCode": "CO1",
      "mappings": [
        {
          "poCode": "PO1",
          "correlation": 3,
          "justification": "Direct engineering math application"
        }
      ]
    }
  ]
}`;

export const poMappingUserPrompt = (courseOutcomes, subject) => {
  const rawCOs = courseOutcomes.toObject ? courseOutcomes.toObject() : courseOutcomes;
  const cosFormatted = Object.entries(rawCOs)
    .filter(([key]) => ['CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'CO6'].includes(key))
    .map(([key, val]) => `${key}: ${val}`)
    .join('\n');

  let syllabusText = 'No syllabus information available.';
  if (subject && subject.unitsAndTopics) {
    syllabusText = subject.unitsAndTopics
      .map(
        (unit) =>
          `[${unit.unitNumber || 'Unit'}] ${unit.unitTitle || ''}\nTopics: ${
            unit.topics && unit.topics.length > 0 ? unit.topics.join(', ') : 'Not specified'
          }`
      )
      .join('\n\n');
  }

  return `Course Outcomes (CO1-CO6):
${cosFormatted}

Syllabus / Units and Topics:
${syllabusText}

Please generate the CO-PO-PSO correlation matrix JSON output.`;
};
