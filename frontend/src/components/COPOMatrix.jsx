import React, { useState, useEffect } from 'react';

const PO_DESCRIPTIONS = [
  { code: 'PO1', title: 'Engineering Knowledge', desc: 'Apply mathematical and scientific concepts to solve complex engineering problems.' },
  { code: 'PO2', title: 'Problem Analysis', desc: 'Identify, formulate, and analyze research-backed engineering formulations.' },
  { code: 'PO3', title: 'Design/Development', desc: 'Design systems or component structures meeting security and environment standards.' },
  { code: 'PO4', title: 'Conduct Investigations', desc: 'Investigate complex issues using experiments, data synthesis, and analysis.' },
  { code: 'PO5', title: 'Modern Tool Usage', desc: 'Apply modern engineering techniques, resources, and IT/modeling software tools.' },
  { code: 'PO6', title: 'The Engineer & Society', desc: 'Evaluate social, safety, legal, and cultural implications of engineering practice.' },
  { code: 'PO7', title: 'Environment & Sustainability', desc: 'Assess sustainable solutions within environmental constraints.' },
  { code: 'PO8', title: 'Ethics', desc: 'Commit to professional ethics, responsibilities, and code of conduct standards.' },
  { code: 'PO9', title: 'Individual & Team Work', desc: 'Function effectively as an individual or member of diverse/multidisciplinary teams.' },
  { code: 'PO10', title: 'Communication', desc: 'Communicate clearly, write reports, and deliver effective technical presentations.' },
  { code: 'PO11', title: 'Project Management', desc: 'Apply financial/management principles to organize projects.' },
  { code: 'PO12', title: 'Life-long Learning', desc: 'Recognize the need for, and engage in, independent learning in technology changes.' }
];

export default function COPOMatrix({ activeSubject }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [matrixData, setMatrixData] = useState([]);

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
          <button 
            onClick={handleGenerate} 
            className="btn btn-primary" 
            disabled={loading}
          >
            {matrixData.length > 0 ? 'Regenerate Matrix' : 'Generate Matrix'}
          </button>
        </div>

        {loading && (
          <div className="loader-container">
            <div className="spinner"></div>
            <p style={{ color: 'var(--text-secondary)' }}>Semantically auditing course outcomes against standard program outcomes via local Ollama...</p>
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
                          <td key={p.code} className="matrix-cell">
                            {corr > 0 ? (
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
