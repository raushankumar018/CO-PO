import React, { useState, useEffect } from 'react';

export default function QuestionPaperUpload({ activeSubject }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  
  const [paper, setPaper] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [report, setReport] = useState(null);
  const [viewMode, setViewMode] = useState('matrix'); // 'matrix' or 'detailed'
  const [isEditing, setIsEditing] = useState(false);

  // Fetch question paper & mappings if they exist
  const fetchPaper = async () => {
    if (!activeSubject) return;
    setLoading(true);
    setError(null);
    setPaper(null);
    setQuestions([]);
    setReport(null);
    try {
      const res = await fetch(`/api/v1/question-papers/${activeSubject._id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setPaper(json.data.paper);
        setReport(json.data.report);
        
        // Merge questions list and mapping details
        const mergedQuestions = (json.data.questions || []).map((q) => {
          const mapping = (json.data.mappings || []).find((m) => m.questionNo.toString().trim() === q.questionNo.toString().trim());
          return {
            ...q,
            mappedCOs: mapping ? mapping.mappedCOs : [],
            justification: mapping ? mapping.justification : 'No mapping recorded.',
          };
        });
        setQuestions(mergedQuestions);
      }
    } catch (err) {
      console.warn('No previous question paper details found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaper();
  }, [activeSubject]);

  const uploadFile = async (file) => {
    if (!file || !activeSubject) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    const formData = new FormData();
    formData.append('questionPaper', file);
    formData.append('subjectId', activeSubject._id);

    try {
      const res = await fetch('/api/v1/question-papers/upload', {
        method: 'POST',
        headers: {
          'subject-id': activeSubject._id
        },
        body: formData,
      });
      const json = await res.json();
      
      if (json.success) {
        setSuccess('Question paper uploaded, consolidated, and mapped successfully!');
        fetchPaper();
      } else {
        setError(json.message || 'Parsing failed.');
      }
    } catch (err) {
      setError('An error occurred during file upload.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const handleCellChange = (qNo, coKey, val) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.questionNo.toString().trim() !== qNo.toString().trim()) return q;
        
        let newMappedCOs = [...q.mappedCOs];
        const exists = newMappedCOs.find((m) => m.coCode === coKey);
        
        if (exists) {
          if (val === 0) {
            newMappedCOs = newMappedCOs.filter((m) => m.coCode !== coKey);
          } else {
            newMappedCOs = newMappedCOs.map((m) =>
              m.coCode === coKey ? { ...m, weightage: val } : m
            );
          }
        } else if (val > 0) {
          newMappedCOs.push({ coCode: coKey, weightage: val });
        }
        
        return {
          ...q,
          mappedCOs: newMappedCOs
        };
      })
    );
  };

  const handleSave = async () => {
    if (!paper || !paper._id) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    const mappingsPayload = questions.map((q) => ({
      questionNo: q.questionNo,
      mappedCOs: q.mappedCOs.map((m) => ({
        coCode: m.coCode,
        weightage: m.weightage
      })),
      justification: q.justification
    }));

    try {
      const res = await fetch(`/api/v1/question-papers/mappings/${paper._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mappings: mappingsPayload })
      });
      const json = await res.json();
      if (json.success) {
        setSuccess('Question mappings and weightages updated successfully!');
        setIsEditing(false);
        fetchPaper();
      } else {
        setError(json.message || 'Failed to save mappings.');
      }
    } catch (err) {
      setError('An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  const getMatrixPreview = () => {
    if (!report) return null;
    const matrix = [];
    const coTotals = { CO1: 0, CO2: 0, CO3: 0, CO4: 0, CO5: 0, CO6: 0 };
    
    questions.forEach((q) => {
      const row = {
        questionNo: q.questionNo,
        marks: q.marks,
        CO1: 0,
        CO2: 0,
        CO3: 0,
        CO4: 0,
        CO5: 0,
        CO6: 0
      };
      
      q.mappedCOs.forEach((m) => {
        const coKey = m.coCode;
        if (row.hasOwnProperty(coKey)) {
          row[coKey] = Number(m.weightage);
          coTotals[coKey] += Number(m.weightage);
        }
      });
      matrix.push(row);
    });
    
    return { matrix, coTotals };
  };

  const currentPreview = isEditing ? getMatrixPreview() : report;

  const getCognitiveBadgeColor = (level) => {
    switch (level) {
      case 'Remember': return 'badge-blue';
      case 'Understand': return 'badge-emerald';
      case 'Apply': return 'badge-amber';
      case 'Analyze': return 'badge-rose';
      case 'Evaluate': return 'badge-blue';
      case 'Create': return 'badge-emerald';
      default: return 'badge-blue';
    }
  };

  if (!activeSubject) {
    return (
      <div className="alert alert-info">
        <h3>Syllabus Required</h3>
        <p>Please select or upload a syllabus in the **Syllabus Ingestion** tab before uploading exam question papers.</p>
      </div>
    );
  }

  return (
    <div className="workspace-container">
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Upload Form Box */}
      <div className="glass-card">
        <div className="glass-card-header">
          <h3 className="glass-card-title">Exam Ingestion Engine</h3>
          <span className="badge badge-blue">Upload Exam PDF</span>
        </div>

        <div 
          className={`upload-dropzone ${dragActive ? 'active' : ''}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('qp-file-input').click()}
        >
          <input 
            type="file" 
            id="qp-file-input" 
            style={{ display: 'none' }} 
            accept=".pdf"
            onChange={handleFileChange}
            disabled={loading}
          />
          <div className="upload-icon">📝</div>
          <p className="upload-text">Drag & drop question paper PDF, or click to browse</p>
          <span className="upload-hint">Sub-questions (e.g. 1a, 1b) will be grouped, marks summed, and mapped automatically</span>
        </div>

        {loading && (
          <div className="loader-container">
            <div className="spinner"></div>
            <p style={{ color: 'var(--text-secondary)' }}>Processing question paper mapping data...</p>
          </div>
        )}
      </div>

      {/* Mapped Questions Consolidated Viewer */}
      {questions.length > 0 && (
        <div className="glass-card">
          <div className="glass-card-header">
            <h3 className="glass-card-title">Consolidated Questions & CO Mappings</h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {isEditing ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={handleSave} 
                    className="btn btn-success" 
                    disabled={loading}
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                  >
                    Save Changes
                  </button>
                  <button 
                    onClick={() => { setIsEditing(false); fetchPaper(); }} 
                    className="btn btn-secondary" 
                    disabled={loading}
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => { setIsEditing(true); setViewMode('matrix'); }} 
                    className="btn btn-secondary" 
                    disabled={loading}
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                  >
                    Edit Matrix
                  </button>
                  <div className="workspace-tabs" style={{ padding: '3px', borderRadius: '8px', gap: '4px' }}>
                    <button 
                      className={`tab-btn ${viewMode === 'matrix' ? 'active' : ''}`}
                      onClick={() => setViewMode('matrix')}
                      style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '6px' }}
                    >
                      Matrix View
                    </button>
                    <button 
                      className={`tab-btn ${viewMode === 'detailed' ? 'active' : ''}`}
                      onClick={() => setViewMode('detailed')}
                      style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '6px' }}
                    >
                      Detailed List
                    </button>
                  </div>
                </div>
              )}
              <span className="badge badge-emerald">{questions.length} Base Questions</span>
            </div>
          </div>

          {currentPreview && currentPreview.coTotals && (
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                Course Outcome Weightage Sum Totals
              </h4>
              <div className="meta-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
                {['CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'CO6'].map((coKey) => (
                  <div className="meta-card-item" key={coKey} style={{ padding: '10px 8px', textAlign: 'center' }}>
                    <div className="meta-card-label" style={{ fontSize: '10px' }}>{coKey}</div>
                    <div className="meta-card-value" style={{ fontSize: '18px', color: 'var(--accent-blue-hover)' }}>
                      {currentPreview.coTotals[coKey] || 0}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === 'matrix' && currentPreview && currentPreview.matrix ? (
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '60px', backgroundColor: 'var(--bg-tertiary)' }}></th>
                    <th>questionNo</th>
                    <th>marks</th>
                    <th style={{ textAlign: 'center' }}>CO1</th>
                    <th style={{ textAlign: 'center' }}>CO2</th>
                    <th style={{ textAlign: 'center' }}>CO3</th>
                    <th style={{ textAlign: 'center' }}>CO4</th>
                    <th style={{ textAlign: 'center' }}>CO5</th>
                    <th style={{ textAlign: 'center' }}>CO6</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPreview.matrix.map((row, index) => (
                    <tr key={index}>
                      <td style={{ color: 'var(--text-muted)', fontSize: '12px', width: '60px', backgroundColor: 'var(--bg-tertiary)', fontWeight: 'bold' }}>
                        {index}
                      </td>
                      <td style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{row.questionNo}</td>
                      <td style={{ fontWeight: 'bold', color: 'var(--accent-blue-hover)' }}>{row.marks}</td>
                      {['CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'CO6'].map((coKey) => {
                        const val = row[coKey] || 0;
                        return (
                          <td key={coKey} className="matrix-cell" style={{ textAlign: 'center', padding: isEditing ? '4px' : '12px 16px' }}>
                            {isEditing ? (
                              <select 
                                value={val} 
                                onChange={(e) => handleCellChange(row.questionNo, coKey, Number(e.target.value))}
                                style={{
                                  backgroundColor: 'var(--bg-tertiary)',
                                  color: 'var(--text-primary)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '13px',
                                  width: '80px',
                                  textAlign: 'center',
                                  cursor: 'pointer'
                                }}
                              >
                                <option value={0}>-</option>
                                <option value={2}>2</option>
                                <option value={3}>3</option>
                              </select>
                            ) : val > 0 ? (
                              <span className={`matrix-cell-weight weight-${val}`}>
                                {val}
                              </span>
                            ) : (
                              <span className="matrix-cell-empty">0</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>QNo</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Marks</th>
                    <th style={{ width: '150px' }}>Cognitive Level</th>
                    <th style={{ width: '120px' }}>Nature</th>
                    <th style={{ width: '120px' }}>Mapped COs</th>
                    <th>Consolidated Text & Semantic Justification</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q) => (
                    <tr key={q._id}>
                      <td style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{q.questionNo}</td>
                      <td style={{ fontWeight: 'bold', color: 'var(--accent-blue-hover)', textAlign: 'center' }}>
                        {q.marks}
                      </td>
                      <td>
                        <span className={`badge ${getCognitiveBadgeColor(q.cognitiveLevel)}`}>
                          {q.cognitiveLevel}
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                          {q.nature}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {q.mappedCOs && q.mappedCOs.length > 0 ? (
                            q.mappedCOs.map((mco, idx) => (
                              <span key={idx} className="badge badge-emerald" style={{ fontSize: '10px', padding: '2px 6px' }}>
                                {mco.coCode} (w:{mco.weightage})
                              </span>
                            ))
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Unmapped</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ fontSize: '14px', whiteSpace: 'pre-line', color: 'var(--text-primary)' }}>
                            {q.questionText}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', borderLeft: '2px solid var(--border-color)', paddingLeft: '8px', fontStyle: 'italic' }}>
                            💡 {q.justification}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
