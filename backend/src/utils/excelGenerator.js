/**
 * src/utils/excelGenerator.js
 * Service that formats and generates CSV documents (compatible with Microsoft Excel)
 * representing the Course Outcome weightages and question mappings.
 */

/**
 * Generates an Excel-compatible CSV string for course outcome weightage.
 * @param {Object} subject - The subject database document.
 * @param {Array} mappings - List of question-to-CO mappings.
 * @param {Object} weightage - CO mark weightage map.
 * @param {Object} percentages - CO coverage percentage map.
 * @returns {string} - CSV file content.
 */
export const generateCOWeightageCSV = (subject, mappings, weightage, percentages) => {
  let csv = '\uFEFF'; // UTF-8 BOM to ensure Excel opens non-ASCII characters correctly

  // Header metadata block
  csv += `"Outcome Based Education (OBE) - CO Weightage Report"\n`;
  csv += `"Department","${subject.department || ''}"\n`;
  csv += `"Subject Name","${subject.subjectName || ''}"\n`;
  csv += `"Subject Code","${subject.subjectCode || ''}"\n`;
  csv += `"Faculty Name","${subject.facultyName || ''}"\n`;
  csv += `"Semester","${subject.semester || ''}"\n\n`;

  // Section 1: Detailed Question Mapping Table
  csv += `"Detailed Mappings Table"\n`;
  csv += `"Question Number","Allocated Marks","Mapped COs","Justification"\n`;
  
  mappings.forEach((m) => {
    const qNum = m.questionNumber || '';
    const marks = m.marks !== undefined ? m.marks : 0;
    const cos = m.mappedCOs ? m.mappedCOs.join('; ') : '';
    const justification = m.justification ? m.justification.replace(/"/g, '""') : '';
    
    csv += `"${qNum}","${marks}","${cos}","${justification}"\n`;
  });
  csv += '\n';

  // Section 2: Outcomes Summary Table
  csv += `"Course Outcome Weightage Summary"\n`;
  csv += `"Course Outcome","Marks Weightage","Percentage Coverage"\n`;
  
  Object.keys(weightage).forEach((co) => {
    const marks = weightage[co] || 0;
    const pct = percentages[co] !== undefined ? percentages[co] : 0;
    
    csv += `"${co}","${marks}","${pct}%"\n`;
  });

  return csv;
};
