/**
 * src/services/syllabus/subjectExtractor.js
 * Service that integrates with Ollama to extract structured metadata (department, code, unit topics) from syllabus text.
 */

import ollamaConfig from '../../config/ollama.js';

/**
 * Extracts academic metadata and unit topics from cleaned syllabus text using Ollama.
 * @param {string} cleanedText - Preprocessed syllabus text.
 * @returns {Promise<Object>} - The structured details object.
 */
export const extractSubjectDetails = async (cleanedText) => {
  const systemPrompt = `You are a precise academic data extractor.
Your job is to read the course syllabus and extract the following details:
1. Department (e.g., Computer Science, Mechanical Engineering)
2. Subject Name
3. Subject Code
4. Faculty Name (if not specified, default to "Not Specified")
5. Semester (e.g., Semester 1, Fall 2026)
6. Units and Topics (a list of units, each having a unitNumber like "Unit I", unitTitle, and topics as an array of strings).

Output must be in JSON format matching this schema:
{
  "department": "string",
  "subjectName": "string",
  "subjectCode": "string",
  "facultyName": "string",
  "semester": "string",
  "unitsAndTopics": [
    {
      "unitNumber": "string",
      "unitTitle": "string",
      "topics": ["string"]
    }
  ]
}

Only return valid JSON. Do not write introductory or concluding text.`;

  try {
    const response = await ollamaConfig.client.post('/api/generate', {
      model: ollamaConfig.model,
      system: systemPrompt,
      prompt: `Syllabus Text:\n${cleanedText}`,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.1 // Low temperature for factual extraction
      }
    });

    const responseText = response.data.response;
    let parsedData;
    
    try {
      parsedData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[subjectExtractor] JSON parsing failed, trying to isolate JSON string:', responseText);
      // Fallback regex to find JSON object in case markdown code blocks are returned
      const jsonRegex = /{[^]*}/;
      const match = responseText.match(jsonRegex);
      if (match) {
        parsedData = JSON.parse(match[0]);
      } else {
        throw new Error('LLM did not return a valid JSON object.');
      }
    }

    return parsedData;
  } catch (error) {
    console.error(`[subjectExtractor] Error: ${error.message}`);
    throw new Error(`Syllabus data extraction via Ollama failed: ${error.message}`);
  }
};
