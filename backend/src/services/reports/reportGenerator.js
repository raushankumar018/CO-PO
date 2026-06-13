/**
 * src/services/reports/reportGenerator.js
 * Phase 7: Report Generation Service.
 * Compiles Course Outcomes mapping matrix and assessment tool weightage tables into a printable, premium-styled HTML report.
 */

/**
 * Generates a styled HTML string containing the CO Mapping Matrix and Tool Weightages.
 * Uses curating color palettes, Google Fonts (Inter), and clean layout styles.
 * 
 * @param {Object} subject - The subject model.
 * @param {Object} coRecord - The Course Outcomes model.
 * @param {Array} reports - List of WeightageReport documents (matrices for T1, T2, T4, T5).
 * @returns {string} - Styled HTML string.
 */
export const generateReportHTML = (subject, coRecord, reports) => {
  // Build CO Definitions block
  const coDefinitionsHtml = ['CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'CO6']
    .map(key => `
      <div class="co-card">
        <span class="co-badge">${key}</span>
        <span class="co-text">${coRecord[key] || 'Not Defined'}</span>
      </div>
    `).join('');

  // Build tables for each report (T1, T2, T4, T5)
  const tablesHtml = reports.map(rep => {
    const rowsHtml = rep.matrix.map(row => `
      <tr>
        <td class="bold text-center">${row.questionNo}</td>
        <td class="text-center">${row.marks}</td>
        <td class="text-center ${row.CO1 > 0 ? 'active-cell' : 'zero-cell'}">${row.CO1}</td>
        <td class="text-center ${row.CO2 > 0 ? 'active-cell' : 'zero-cell'}">${row.CO2}</td>
        <td class="text-center ${row.CO3 > 0 ? 'active-cell' : 'zero-cell'}">${row.CO3}</td>
        <td class="text-center ${row.CO4 > 0 ? 'active-cell' : 'zero-cell'}">${row.CO4}</td>
        <td class="text-center ${row.CO5 > 0 ? 'active-cell' : 'zero-cell'}">${row.CO5}</td>
        <td class="text-center ${row.CO6 > 0 ? 'active-cell' : 'zero-cell'}">${row.CO6}</td>
      </tr>
    `).join('');

    return `
      <div class="report-section">
        <h3>Assessment Tool Weightage Table: ${rep.toolType}</h3>
        <table class="report-table">
          <thead>
            <tr>
              <th rowspan="2">Question No</th>
              <th rowspan="2">Marks</th>
              <th colspan="6" class="text-center">Mapped Course Outcomes (Weightage)</th>
            </tr>
            <tr>
              <th class="text-center">CO1</th>
              <th class="text-center">CO2</th>
              <th class="text-center">CO3</th>
              <th class="text-center">CO4</th>
              <th class="text-center">CO5</th>
              <th class="text-center">CO6</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr class="total-row">
              <td colspan="2" class="bold text-right">Sum of Contributions:</td>
              <td class="text-center bold">${rep.coTotals?.CO1 || 0}</td>
              <td class="text-center bold">${rep.coTotals?.CO2 || 0}</td>
              <td class="text-center bold">${rep.coTotals?.CO3 || 0}</td>
              <td class="text-center bold">${rep.coTotals?.CO4 || 0}</td>
              <td class="text-center bold">${rep.coTotals?.CO5 || 0}</td>
              <td class="text-center bold">${rep.coTotals?.CO6 || 0}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }).join('<hr class="report-divider" />');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>OBE Analysis Report - ${subject.subjectName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: HSL(220, 85%, 45%);
      --secondary: HSL(215, 60%, 15%);
      --background: HSL(210, 25%, 98%);
      --surface: HSL(0, 0%, 100%);
      --text: HSL(210, 40%, 12%);
      --text-muted: HSL(210, 15%, 45%);
      --border: HSL(210, 15%, 88%);
      --active-bg: HSL(220, 85%, 96%);
      --active-text: HSL(220, 85%, 35%);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', sans-serif;
      color: var(--text);
      background-color: var(--background);
      line-height: 1.5;
      padding: 40px;
    }

    .report-container {
      max-width: 900px;
      margin: 0 auto;
      background: var(--surface);
      border-radius: 12px;
      border: 1px solid var(--border);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03);
      padding: 40px;
    }

    .header {
      border-bottom: 2px solid var(--border);
      padding-bottom: 24px;
      margin-bottom: 30px;
    }

    .header h1 {
      font-size: 24px;
      font-weight: 700;
      color: var(--secondary);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .meta-item {
      font-size: 14px;
    }

    .meta-item span.label {
      font-weight: 600;
      color: var(--text-muted);
    }

    h2 {
      font-size: 18px;
      font-weight: 600;
      color: var(--secondary);
      margin-bottom: 16px;
    }

    h3 {
      font-size: 15px;
      font-weight: 600;
      color: var(--secondary);
      margin-bottom: 12px;
    }

    .co-section {
      margin-bottom: 36px;
    }

    .co-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
    }

    .co-card {
      display: flex;
      align-items: flex-start;
      background: var(--background);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
    }

    .co-badge {
      background: var(--secondary);
      color: var(--surface);
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      margin-right: 12px;
      white-space: nowrap;
    }

    .co-text {
      font-size: 13px;
      font-weight: 500;
      color: var(--text);
    }

    .report-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 13px;
    }

    .report-table th, .report-table td {
      border: 1px solid var(--border);
      padding: 10px;
    }

    .report-table th {
      background-color: var(--background);
      font-weight: 600;
      color: var(--secondary);
    }

    .text-center {
      text-align: center;
    }

    .text-right {
      text-align: right;
    }

    .bold {
      font-weight: 700;
    }

    .zero-cell {
      color: var(--text-muted);
      opacity: 0.4;
    }

    .active-cell {
      background-color: var(--active-bg);
      color: var(--active-text);
      font-weight: 600;
    }

    .total-row {
      background-color: var(--background);
    }

    .report-divider {
      border: 0;
      height: 1px;
      background: var(--border);
      margin: 36px 0;
    }

    @media print {
      body {
        background-color: var(--surface);
        padding: 0;
      }
      .report-container {
        border: 0;
        box-shadow: none;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="header">
      <h1>OBE Attainment & Weightage Report</h1>
      <div class="meta-grid">
        <div class="meta-item"><span class="label">Subject Name:</span> ${subject.subjectName}</div>
        <div class="meta-item"><span class="label">Subject Code:</span> ${subject.subjectCode}</div>
        <div class="meta-item"><span class="label">Department:</span> ${subject.department}</div>
        <div class="meta-item"><span class="label">Semester:</span> ${subject.semester}</div>
      </div>
    </div>

    <div class="co-section">
      <h2>Approved Course Outcomes (CO1-CO6)</h2>
      <div class="co-grid">
        ${coDefinitionsHtml}
      </div>
    </div>

    <hr class="report-divider" />

    ${tablesHtml}
  </div>
</body>
</html>
  `;
};
