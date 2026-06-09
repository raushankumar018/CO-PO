import React, { useState, useEffect } from 'react';

export default function COManager({ activeSubject }) {
  const [coId, setCoId] = useState(null);
  const [outcomes, setOutcomes] = useState({
    CO1: '',
    CO2: '',
    CO3: '',
    CO4: '',
    CO5: '',
    CO6: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [auditReport, setAuditReport] = useState(null);

  // Fetch saved COs for active subject
  const fetchCOs = async () => {
    if (!activeSubject) return;
    setLoading(true);
    setError(null);
    setAuditReport(null);
    try {
      const res = await fetch(`/api/v1/co/${activeSubject._id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setCoId(json.data._id);
        setOutcomes({
          CO1: json.data.CO1 || '',
          CO2: json.data.CO2 || '',
          CO3: json.data.CO3 || '',
          CO4: json.data.CO4 || '',
          CO5: json.data.CO5 || '',
          CO6: json.data.CO6 || '',
        });
      } else {
        // Reset CO fields if none exist
        setCoId(null);
        setOutcomes({ CO1: '', CO2: '', CO3: '', CO4: '', CO5: '', CO6: '' });
      }
    } catch (err) {
      console.warn('Failed to fetch COs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCOs();
  }, [activeSubject]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setOutcomes((prev) => ({ ...prev, [name]: value }));
  };

  // Triggers Qwen LLM dynamic generation pipeline
  const handleGenerate = async () => {
    if (!activeSubject) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    setAuditReport(null);
    try {
      const res = await fetch('/api/v1/co/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId: activeSubject._id }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess('Course Outcomes auto-generated and saved!');
        setCoId(json.data._id);
        setOutcomes({
          CO1: json.data.CO1 || '',
          CO2: json.data.CO2 || '',
          CO3: json.data.CO3 || '',
          CO4: json.data.CO4 || '',
          CO5: json.data.CO5 || '',
          CO6: json.data.CO6 || '',
        });
      } else {
        setError(json.message || 'Generation failed.');
      }
    } catch (err) {
      setError('An error occurred during generation.');
    } finally {
      setLoading(false);
    }
  };

  // Audits proposed COs against Bloom's taxonomy & unit coverage
  const handleAuditVerify = async () => {
    if (!activeSubject) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    setAuditReport(null);
    try {
      const res = await fetch('/api/v1/co/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: activeSubject._id,
          ...outcomes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess('Course Outcomes updated and audited successfully.');
        setCoId(json.data.coRecord._id);
        setAuditReport(json.data.auditReport);
      } else {
        setError(json.message || 'Audit validation check failed.');
      }
    } catch (err) {
      setError('An error occurred during audit verification.');
    } finally {
      setLoading(false);
    }
  };

  // Directly saves changes using ID update endpoint
  const handleDirectUpdate = async () => {
    if (!coId) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/v1/co/${coId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(outcomes),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess('Direct update to database succeeded!');
      } else {
        setError(json.message || 'Failed to update database.');
      }
    } catch (err) {
      setError('An error occurred while updating database.');
    } finally {
      setLoading(false);
    }
  };

  if (!activeSubject) {
    return (
      <div className="alert alert-info">
        <h3>Syllabus Required</h3>
        <p>Please select or upload a syllabus in the **Syllabus Ingestion** tab to manage Course Outcomes.</p>
      </div>
    );
  }

  return (
    <div className="workspace-container">
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="grid-cols-2">
        {/* Editor Form */}
        <div className="glass-card">
          <div className="glass-card-header">
            <h3 className="glass-card-title">Course Outcomes Editor (CO1 - CO6)</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={handleGenerate} 
                className="btn btn-secondary" 
                disabled={loading}
                style={{ padding: '8px 14px', fontSize: '13px' }}
              >
                Auto-Generate
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {['CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'CO6'].map((coKey) => (
              <div className="form-group" key={coKey} style={{ margin: 0 }}>
                <label className="form-label">{coKey} description</label>
                <textarea
                  name={coKey}
                  value={outcomes[coKey]}
                  onChange={handleInputChange}
                  className="form-control"
                  rows={2}
                  disabled={loading}
                  placeholder={`Describe competence evaluated for ${coKey}...`}
                  style={{ resize: 'vertical' }}
                />
              </div>
            ))}
          </div>

          <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
            <button 
              onClick={handleAuditVerify} 
              className="btn btn-primary" 
              disabled={loading}
              style={{ flexGrow: 1 }}
            >
              Audit & Verify
            </button>
            {coId && (
              <button 
                onClick={handleDirectUpdate} 
                className="btn btn-success" 
                disabled={loading}
              >
                Direct Save
              </button>
            )}
          </div>

          {loading && (
            <div className="loader-container" style={{ padding: '20px 0' }}>
              <div className="spinner"></div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Executing AI agent services pipeline...</p>
            </div>
          )}
        </div>

        {/* Audit Quality Auditor Feedback */}
        <div className="glass-card">
          <div className="glass-card-header">
            <h3 className="glass-card-title">Bloom's Taxonomy Audit Results</h3>
            {auditReport && (
              <span className={`badge ${auditReport.isCompliant ? 'badge-emerald' : 'badge-rose'}`}>
                {auditReport.isCompliant ? 'NBA Compliant' : 'Needs Review'}
              </span>
            )}
          </div>

          {auditReport ? (
            <div>
              <div className="meta-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="audit-metric-card">
                  <div className="meta-card-label">Syllabus Coverage</div>
                  <div className={`audit-metric-score ${auditReport.score.coverage >= 90 ? 'badge-emerald' : 'badge-amber'}`} style={{ background: 'none', border: 'none' }}>
                    {auditReport.score.coverage}%
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${auditReport.score.coverage}%`, backgroundColor: auditReport.score.coverage >= 90 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}></div>
                  </div>
                </div>

                <div className="audit-metric-card">
                  <div className="meta-card-label">Bloom compliance</div>
                  <div className={`audit-metric-score ${auditReport.score.bloomCompliance >= 90 ? 'badge-emerald' : 'badge-amber'}`} style={{ background: 'none', border: 'none' }}>
                    {auditReport.score.bloomCompliance}%
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${auditReport.score.bloomCompliance}%`, backgroundColor: auditReport.score.bloomCompliance >= 90 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}></div>
                  </div>
                </div>

                <div className="audit-metric-card">
                  <div className="meta-card-label">Style Alignment</div>
                  <div className={`audit-metric-score ${auditReport.score.styleMatch >= 90 ? 'badge-emerald' : 'badge-amber'}`} style={{ background: 'none', border: 'none' }}>
                    {auditReport.score.styleMatch}%
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${auditReport.score.styleMatch}%`, backgroundColor: auditReport.score.styleMatch >= 90 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}></div>
                  </div>
                </div>
              </div>

              <div className="audit-comments">
                <h4>Auditor Critique & Recommendation Notes</h4>
                {auditReport.comments && auditReport.comments.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {auditReport.comments.map((comment, index) => (
                      <div className="audit-comment-item" key={index}>
                        ⚠️ {comment}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--accent-emerald)', fontSize: '13px', fontWeight: '500' }}>
                    ✅ Exceptional curriculum outcomes! Zero design flaws identified. Perfect verb alignment.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div style={{ padding: '60px 40px', textAlignment: 'center', color: 'var(--text-secondary)' }}>
              No audit run. Configure outcomes and trigger the **Audit & Verify** evaluation process to review quality index reports.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
