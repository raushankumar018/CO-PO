/**
 * src/utils/pdfGenerator.js
 * Generates print-ready HTML documents representing the OBE analysis,
 * suitable for saving as PDF or direct printing in the browser.
 */

/**
 * Returns a styled HTML string of the OBE Mapping report.
 * @param {Object} subject - The subject database document.
 * @param {Array} mappings - List of question-to-CO mappings.
 * @param {Object} weightage - CO marks mapping table.
 * @param {Object} percentages - CO percentage mapping table.
 * @returns {string} - Clean styled HTML template.
 */
export const generateCOWeightageHTML = (subject, mappings, weightage, percentages) => {
  let mappingRows = '';
  mappings.forEach((m) => {
    mappingRows += `
      <tr>
        <td style="font-weight: bold; color: #2d3748;">${m.questionNumber || ''}</td>
        <td>${m.marks !== undefined ? m.marks : 0}</td>
        <td><span class="co-badge">${m.mappedCOs ? m.mappedCOs.join(', ') : ''}</span></td>
        <td style="font-size: 13px; color: #4a5568;">${m.justification || ''}</td>
      </tr>
    `;
  });

  let summaryRows = '';
  Object.keys(weightage).forEach((co) => {
    summaryRows += `
      <tr>
        <td style="font-weight: bold; color: #1a202c;">${co}</td>
        <td>${weightage[co] || 0}</td>
        <td>
          <div class="progress-container">
            <div class="progress-bar" style="width: ${percentages[co] || 0}%"></div>
            <span class="progress-label">${percentages[co] || 0}%</span>
          </div>
        </td>
      </tr>
    `;
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>OBE Course Mapping Report - ${subject.subjectCode || 'Report'}</title>
  <style>
    body {
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #2d3748;
      line-height: 1.5;
      margin: 40px;
      background-color: #ffffff;
    }
    .header {
      border-bottom: 3px solid #3182ce;
      padding-bottom: 12px;
      margin-bottom: 25px;
    }
    .header h1 {
      margin: 0;
      color: #2b6cb0;
      font-size: 26px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .meta-card {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      background-color: #ebf8ff;
      border: 1px solid #bee3f8;
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 30px;
    }
    .meta-item {
      font-size: 14px;
    }
    .meta-item strong {
      color: #2c5282;
    }
    h2 {
      font-size: 18px;
      color: #2b6cb0;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin-top: 30px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 10px 12px;
      text-align: left;
    }
    th {
      background-color: #f7fafc;
      color: #4a5568;
      font-weight: 600;
      font-size: 13px;
      text-transform: uppercase;
    }
    .co-badge {
      background-color: #e2e8f0;
      color: #4a5568;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 12px;
    }
    .progress-container {
      display: flex;
      align-items: center;
      width: 100%;
      background-color: #edf2f7;
      border-radius: 4px;
      overflow: hidden;
      position: relative;
      height: 20px;
    }
    .progress-bar {
      background-color: #4299e1;
      height: 100%;
      transition: width 0.3s ease;
    }
    .progress-label {
      position: absolute;
      right: 8px;
      font-size: 11px;
      font-weight: bold;
      color: #4a5568;
    }
    @media print {
      body { margin: 20px; }
      .meta-card { background-color: #ffffff !important; border: 1px solid #cbd5e0 !important; }
      .progress-bar { background-color: #4a5568 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>

  <div class="header">
    <h1>Outcome Based Education (OBE) Mapping Report</h1>
  </div>

  <div class="meta-card">
    <div class="meta-item"><strong>Department:</strong> ${subject.department || 'N/A'}</div>
    <div class="meta-item"><strong>Subject Name:</strong> ${subject.subjectName || 'N/A'}</div>
    <div class="meta-item"><strong>Subject Code:</strong> ${subject.subjectCode || 'N/A'}</div>
    <div class="meta-item"><strong>Faculty Name:</strong> ${subject.facultyName || 'N/A'}</div>
    <div class="meta-item"><strong>Semester:</strong> ${subject.semester || 'N/A'}</div>
  </div>

  <h2>1. Question-to-Outcome Mappings</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 15%;">Question No.</th>
        <th style="width: 15%;">Marks</th>
        <th style="width: 20%;">Mapped COs</th>
        <th style="width: 50%;">Justification</th>
      </tr>
    </thead>
    <tbody>
      ${mappingRows}
    </tbody>
  </table>

  <h2>2. Course Outcome Weightage Summary</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 30%;">Course Outcome</th>
        <th style="width: 25%;">Total Marks Weightage</th>
        <th style="width: 45%;">Coverage Percentage</th>
      </tr>
    </thead>
    <tbody>
      ${summaryRows}
    </tbody>
  </table>

</body>
</html>
  `;
};
