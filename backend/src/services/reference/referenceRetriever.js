/**
 * src/services/reference/referenceRetriever.js
 * Phase 3: Reference Learning.
 * Retrieves previous golden-standard Course Outcomes from MongoDB to act as style guides.
 */

import CourseOutcomeHistory from '../../models/CourseOutcomeHistory.js';

/**
 * Retrieves the most relevant historical verified Course Outcomes for few-shot learning.
 * Searches by subjectCode, then subjectName regex, and falls back to general verified records.
 * 
 * @param {string} subjectName - Name of the subject.
 * @param {string} subjectCode - Subject course code.
 * @returns {Promise<string>} - Formatted string with reference syllabus and verified outcomes.
 */
export const retrieveReferenceCOs = async (subjectName, subjectCode) => {
  try {
    const code = subjectCode || '';
    const name = subjectName || '';

    let record = null;

    // 1. Try finding a verified record with the exact same Subject Code
    if (code) {
      record = await CourseOutcomeHistory.findOne({
        subjectCode: code,
        isVerified: true
      }).sort({ createdAt: -1 });
    }

    // 2. Fallback: Try finding a verified record with a similar Subject Name
    if (!record && name) {
      // Remove common prefix numbers or punctuation for better search
      const cleanName = name.replace(/[^a-zA-Z\s]/g, '').trim();
      record = await CourseOutcomeHistory.findOne({
        subjectName: { $regex: new RegExp(cleanName, 'i') },
        isVerified: true
      }).sort({ createdAt: -1 });
    }

    // 3. Last Fallback: Retrieve the latest verified outcomes in the system
    if (!record) {
      record = await CourseOutcomeHistory.findOne({
        isVerified: true
      }).sort({ createdAt: -1 });
    }

    if (!record) {
      console.log('[ReferenceRetriever] No historical verified outcomes found in DB.');
      return '';
    }

    console.log(`[ReferenceRetriever] Selected reference outcomes from: ${record.subjectCode} (${record.subjectName})`);

    // Format syllabus content
    const refUnitsAndTopics = record.unitsAndTopics
      .map(
        (unit) =>
          `[${unit.unitNumber || 'Unit'}] ${unit.unitTitle || ''}\nTopics: ${
            unit.topics && unit.topics.length > 0 ? unit.topics.join(', ') : 'Not specified'
          }`
      )
      .join('\n\n');

    // Return the formatted text block representing this golden reference
    return `Subject Code: ${record.subjectCode} (${record.subjectName})
Syllabus / Units and Topics:
${refUnitsAndTopics}

Desired Course Outcomes (CO1-CO6):
{
  "CO1": "${record.CO1}",
  "CO2": "${record.CO2}",
  "CO3": "${record.CO3}",
  "CO4": "${record.CO4}",
  "CO5": "${record.CO5}",
  "CO6": "${record.CO6}"
}`;
  } catch (error) {
    console.error(`[ReferenceRetriever] Error retrieving reference outcomes: ${error.message}`);
    return ''; // Return empty to allow prompt to fall back gracefully
  }
};
