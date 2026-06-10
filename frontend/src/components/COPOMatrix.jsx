import React, { useState, useEffect } from 'react';

const PO_DESCRIPTIONS = [
  {
    code: 'PO1',
    title: 'Engineering Knowledge',
    desc: 'Apply the knowledge of mathematics, science, engineering fundamentals, and computer science and business systems to the solution of complex engineering and societal problems.'
  },
  {
    code: 'PO2',
    title: 'Problem Analysis',
    desc: 'Identify, formulate, review research literature, and analyze complex engineering and business problems reaching substantiated conclusions using first principles of mathematics, natural sciences, and engineering sciences.'
  },
  {
    code: 'PO3',
    title: 'Design/Development of Solutions',
    desc: 'Design solutions for complex engineering problems and design system components or processes that meet the specified needs with appropriate consideration for public health and safety, and cultural, societal, and environmental considerations.'
  },
  {
    code: 'PO4',
    title: 'Conduct Investigations of Complex Problems',
    desc: 'Use research-based knowledge and research methods including design of experiments, analysis and interpretation of data, and synthesis of information to provide valid conclusions.'
  },
  {
    code: 'PO5',
    title: 'Modern Tool Usage',
    desc: 'Create, select, and apply appropriate techniques, resources, and modern engineering and IT tools including prediction and modeling to complex engineering activities with an understanding of their limitations.'
  },
  {
    code: 'PO6',
    title: 'The Engineer and Society',
    desc: 'Apply reasoning informed by contextual knowledge to assess societal, health, safety, legal, and cultural issues and the consequent responsibilities relevant to professional engineering and business practices.'
  },
  {
    code: 'PO7',
    title: 'Environment and Sustainability',
    desc: 'Understand the impact of professional engineering solutions in business, societal, and environmental contexts, and demonstrate knowledge of, and the need for, sustainable development.'
  },
  {
    code: 'PO8',
    title: 'Ethics',
    desc: 'Apply ethical principles and commit to professional ethics, responsibilities, and norms of engineering and business practices.'
  },
  {
    code: 'PO9',
    title: 'Individual and Team Work',
    desc: 'Function effectively as an individual, and as a member or leader in diverse teams and multidisciplinary settings.'
  },
  {
    code: 'PO10',
    title: 'Communication',
    desc: 'Communicate effectively on complex engineering activities with the engineering community and society at large, including the ability to comprehend and write effective reports and design documentation, make effective presentations, and give and receive clear instructions.'
  },
  {
    code: 'PO11',
    title: 'Project Management and Finance',
    desc: 'Demonstrate knowledge and understanding of engineering, business, and management principles and apply these to one’s own work, as a member and leader in a team, to manage projects and multidisciplinary environments.'
  },
  {
    code: 'PO12',
    title: 'Life-long Learning',
    desc: 'Recognize the need for, and have the preparation and ability to engage in independent and life-long learning in the broadest context of technological change.'
  }
,
  {
    code: 'PSO1',
    title: 'Application Development Skills',
    desc: 'Design and develop web applications using technologies such as HTML, JSP, PHP, ASP, and ASP.NET to address societal needs.'
  },
  {
    code: 'PSO2',
    title: 'Enrich Research Skills',
    desc: 'Provide solutions that positively impact geo-socio-economic and environmental scenarios using Machine Learning, Artificial Intelligence, and related technologies.'
  }
];

export default function COPOMatrix({ activeSubject }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [matrixData, setMatrixData] = useState([]);
  const [isEditing, setIsEditing] = useState(false);

  const normalizeMatrix = (backendMatrix) => {
    if (!backendMatrix || !Array.isArray(backendMatrix)) return [];
    
    // Normalize to standard coCode and mappings format
    return backendMatrix.map(row => {
      const coCode = (row.coCode || row.co || '').toUpperCase();
      const rawMappings = row.mappings || [];
      
      const mappings = rawMappings.map(m => {
        return {
          poCode: (m.poCode || m.po || '').toUpperCase(),
          correlation: Number(m.correlation) || 0
        };
      });

      return { coCode, mappings };
    });
  };

  const fetchMatrix = async () => {
    if (!activeSubject) return;
    setLoading(true);
    setError(null);
    setMatrixData([]);
    try {
      // Attempt to retrieve existing matrix
      const res = await fetch(`/api/v1/mappings/co-po/retrieve/${activeSubject._id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setMatrixData(normalizeMatrix(json.data.matrix));
      }
    } catch (err) {
      console.warn('Matrix not found for this subject.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, [activeSubject]);

  const handleGenerate = async () => {
    if (!activeSubject) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/v1/mappings/co-po/${activeSubject._id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSuccess('CO-PO correlation matrix generated successfully!');
        setMatrixData(normalizeMatrix(json.data.coPoMatrix.matrix));
      } else {
        setError(json.message || 'Generation failed.');
      }
    } catch (err) {
      setError('An error occurred during matrix generation.');
    } finally {
      setLoading(false);
    }
  };

  const handleCellChange = (co, po, val) => {
    setMatrixData(prev => {
      const exists = prev.find(r => r.coCode === co);
      let newMatrix = [...prev];
      if (exists) {
        newMatrix = prev.map(row => {
          if (row.coCode !== co) return row;
          const mExists = row.mappings.find(m => m.poCode === po);
          let newMappings = [];
          if (mExists) {
            if (val === 0) {
              newMappings = row.mappings.filter(m => m.poCode !== po);
            } else {
              newMappings = row.mappings.map(m => m.poCode === po ? { ...m, correlation: val } : m);
            }
          } else if (val > 0) {
            newMappings = [...row.mappings, { poCode: po, correlation: val }];
          } else {
            newMappings = row.mappings;
          }
          return { ...row, mappings: newMappings };
        });
      } else if (val > 0) {
        newMatrix.push({
          coCode: co,
          mappings: [{ poCode: po, correlation: val }]
        });
      }
      return newMatrix;
    });
  };

  const handleSave = async () => {
    if (!activeSubject) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/v1/mappings/co-po/${activeSubject._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ matrix: matrixData })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setSuccess('CO-PO correlation matrix updated successfully!');
        setMatrixData(normalizeMatrix(json.data.coPoMatrix.matrix));
        setIsEditing(false);
      } else {
        setError(json.message || 'Saving failed.');
      }
    } catch (err) {
      setError('An error occurred while saving the matrix.');
    } finally {
      setLoading(false);
    }
  };

  const getCorrelation = (co, po) => {
    const row = matrixData.find(r => r.coCode === co);
    if (!row) return 0;
    const mapping = row.mappings.find(m => m.poCode === po);
    return mapping ? mapping.correlation : 0;
  };

  if (!activeSubject) {
    return (
      <div className="alert alert-info">
        <h3>Syllabus Required</h3>
        <p>Please select or upload a syllabus in the **Syllabus Ingestion** tab to generate the CO-PO matrix.</p>
      </div>
    );
  }

  return (
    <div className="workspace-container">
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="glass-card">
        <div className="glass-card-header">
          <h3 className="glass-card-title">CO-PO Correlation Matrix (Outcome Mapping)</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            {isEditing ? (
              <>
                <button 
                  onClick={handleSave} 
                  className="btn btn-success" 
                  disabled={loading}
                >
                  Save Changes
                </button>
                <button 
                  onClick={() => { setIsEditing(false); fetchMatrix(); }} 
                  className="btn btn-secondary" 
                  disabled={loading}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                {matrixData.length > 0 && (
                  <button 
                    onClick={() => setIsEditing(true)} 
                    className="btn btn-secondary" 
                    disabled={loading}
                  >
                    Edit Matrix
                  </button>
                )}
                <button 
                  onClick={handleGenerate} 
                  className="btn btn-primary" 
                  disabled={loading}
                >
                  {matrixData.length > 0 ? 'Regenerate Matrix' : 'Generate Matrix'}
                </button>
              </>
            )}
          </div>
        </div>

        {loading && (
          <div className="loader-container">
            <div className="spinner"></div>
            <p style={{ color: 'var(--text-secondary)' }}>Processing outcome mappings...</p>
          </div>
        )}

        {matrixData.length > 0 ? (
          <div>
            <div className="table-responsive" style={{ marginBottom: '32px' }}>
              <table style={{ minWidth: '800px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '100px', backgroundColor: 'var(--bg-tertiary)' }}>Outcomes</th>
                    {PO_DESCRIPTIONS.map(p => (
                      <th key={p.code} style={{ textAlign: 'center', cursor: 'help' }} title={p.title}>
                        {p.code}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {['CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'CO6'].map(co => (
                    <tr key={co}>
                      <td style={{ fontWeight: 'bold', color: 'var(--text-primary)', backgroundColor: 'var(--bg-tertiary)' }}>
                        {co}
                      </td>
                      {PO_DESCRIPTIONS.map(p => {
                        const corr = getCorrelation(co, p.code);
                        return (
                          <td key={p.code} className="matrix-cell" style={{ padding: isEditing ? '4px' : '12px 16px' }}>
                            {isEditing ? (
                              <select 
                                value={corr} 
                                onChange={(e) => handleCellChange(co, p.code, Number(e.target.value))}
                                style={{
                                  backgroundColor: 'var(--bg-tertiary)',
                                  color: 'var(--text-primary)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '13px',
                                  width: '100%',
                                  textAlign: 'center',
                                  cursor: 'pointer'
                                }}
                              >
                                <option value={0}>-</option>
                                <option value={1}>1</option>
                                <option value={2}>2</option>
                                <option value={3}>3</option>
                              </select>
                            ) : corr > 0 ? (
                              <span className={`matrix-cell-weight weight-${corr}`}>
                                {corr}
                              </span>
                            ) : (
                              <span className="matrix-cell-empty">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="matrix-cell-weight weight-3" style={{ width: '20px', height: '20px' }}></span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>3: Strong Correlation</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="matrix-cell-weight weight-2" style={{ width: '20px', height: '20px' }}></span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>2: Moderate Correlation</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="matrix-cell-weight weight-1" style={{ width: '20px', height: '20px' }}></span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>1: Low Correlation</span>
              </div>
            </div>
          </div>
        ) : (
          !loading && (
            <div style={{ padding: '60px 40px', textAlignment: 'center', color: 'var(--text-secondary)' }}>
              No correlation data generated yet. Click **Generate Matrix** to analyze mapping metrics.
            </div>
          )
        )}
      </div>

      {/* Program Outcomes Definitions Grid */}
      <div className="glass-card">
        <div className="glass-card-header">
          <h3 className="glass-card-title">Program Outcomes (POs) Definitions</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {PO_DESCRIPTIONS.map(p => (
            <div key={p.code} style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '10px' }}>
              <span className="badge badge-blue" style={{ marginBottom: '8px' }}>{p.code}</span>
              <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--text-primary)' }}>{p.title}</strong>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
