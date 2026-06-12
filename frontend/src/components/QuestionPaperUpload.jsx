import React, { useState, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Summative Lab: Set-grouped tree view component
// ─────────────────────────────────────────────────────────────────────────────
function LabSetView({ sets, isEditing, onCellChange, onSave, onCancel, loading }) {
  const [expandedSets, setExpandedSets] = useState({});

  // Auto-expand all sets on first render
  useEffect(() => {
    if (sets && sets.length > 0) {
      const initial = {};
      sets.forEach(s => { initial[s.setNo] = true; });
      setExpandedSets(initial);
    }
  }, [sets]);

  const toggleSet = (setNo) => {
    setExpandedSets(prev => ({ ...prev, [setNo]: !prev[setNo] }));
  };

  const getCognitiveBadge = (level) => {
    const map = {
      'Remember': '#3b82f6',
      'Understand': '#10b981',
      'Apply': '#f59e0b',
      'Analyze': '#ef4444',
      'Evaluate': '#8b5cf6',
      'Create': '#06b6d4',
    };
    return map[level] || '#6b7280';
  };

  if (!sets || sets.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {sets.map((setGroup) => (
        <div key={setGroup.setNo} style={{
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          overflow: 'hidden',
          backgroundColor: 'rgba(255,255,255,0.02)'
        }}>
          {/* Set Header */}
          <div
            onClick={() => toggleSet(setGroup.setNo)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              backgroundColor: 'rgba(59,130,246,0.08)',
              borderBottom: expandedSets[setGroup.setNo] ? '1px solid var(--border-color)' : 'none',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                fontSize: '18px',
                transform: expandedSets[setGroup.setNo] ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
                display: 'inline-block'
              }}>▶</span>
              <span style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: '700',
                fontSize: '15px',
                color: 'var(--text-primary)',
                letterSpacing: '0.5px'
              }}>
                🔬 Set {setGroup.setNo}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="badge badge-blue" style={{ fontSize: '11px' }}>
                {setGroup.questions ? setGroup.questions.length : 0} Questions
              </span>
              {/* Per-set CO totals mini-summary */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {['CO1','CO2','CO3','CO4','CO5','CO6'].map(co => {
                  const total = setGroup.questions
                    ? setGroup.questions.reduce((sum, q) => {
                        const m = (q.mappedCOs || []).find(mc => mc.coCode === co);
                        return sum + (m ? m.weightage : 0);
                      }, 0)
                    : 0;
                  if (total === 0) return null;
                  return (
                    <span key={co} style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(16,185,129,0.12)',
                      color: 'var(--accent-emerald)',
                      fontWeight: '600'
                    }}>
                      {co}:{total}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Questions inside this Set */}
          {expandedSets[setGroup.setNo] && setGroup.questions && setGroup.questions.length > 0 && (
            <div style={{ padding: '0' }}>
              {setGroup.questions.map((q, idx) => (
                <div key={`${setGroup.setNo}-${q.questionNo}`} style={{
                  borderBottom: idx < setGroup.questions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  padding: '16px 20px 16px 36px',
                  transition: 'background 0.15s'
                }}>
                  {/* Question Row Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '10px' }}>
                    {/* Tree connector */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '20px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'monospace' }}>
                        {idx === setGroup.questions.length - 1 ? '└─' : '├─'}
                      </span>
                    </div>

                    {/* Question number badge */}
                    <div style={{
                      minWidth: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(59,130,246,0.15)',
                      border: '1px solid rgba(59,130,246,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      fontSize: '13px',
                      color: '#60a5fa',
                      flexShrink: 0
                    }}>
                      Q{q.questionNo}
                    </div>

                    {/* Metadata badges */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', flex: 1 }}>
                      <span style={{
                        fontSize: '10px',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: getCognitiveBadge(q.cognitiveLevel) + '22',
                        color: getCognitiveBadge(q.cognitiveLevel),
                        fontWeight: '600',
                        border: `1px solid ${getCognitiveBadge(q.cognitiveLevel)}44`
                      }}>
                        {q.cognitiveLevel}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-color)'
                      }}>
                        {q.nature}
                      </span>
                      {q.marks > 0 && (
                        <span style={{
                          fontSize: '10px',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(245,158,11,0.1)',
                          color: '#f59e0b',
                          fontWeight: '600'
                        }}>
                          {q.marks} marks
                        </span>
                      )}
                    </div>

                    {/* Mapped COs (view or edit) */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end', minWidth: '200px' }}>
                      {isEditing ? (
                        ['CO1','CO2','CO3','CO4','CO5','CO6'].map(coKey => {
                          const existing = (q.mappedCOs || []).find(m => m.coCode === coKey);
                          const val = existing ? existing.weightage : 0;
                          return (
                            <div key={coKey} style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '2px' }}>{coKey}</div>
                              <select
                                value={val}
                                onChange={(e) => onCellChange(setGroup.setNo, q.questionNo, coKey, Number(e.target.value))}
                                style={{
                                  width: '44px',
                                  backgroundColor: 'var(--bg-tertiary)',
                                  color: 'var(--text-primary)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '4px',
                                  padding: '2px 4px',
                                  fontSize: '12px',
                                  cursor: 'pointer'
                                }}
                              >
                                <option value={0}>-</option>
                                <option value={2}>2</option>
                                <option value={3}>3</option>
                              </select>
                            </div>
                          );
                        })
                      ) : (
                        q.mappedCOs && q.mappedCOs.length > 0 ? (
                          q.mappedCOs.map((mco, i) => (
                            <span key={i} className={`matrix-cell-weight weight-${mco.weightage}`}
                              style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '6px' }}
                              title={`${mco.coCode} — Weightage ${mco.weightage}`}
                            >
                              {mco.coCode} ({mco.weightage})
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Unmapped</span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Combined A+B Question Text */}
                  <div style={{ marginLeft: '68px' }}>
                    <div style={{
                      fontSize: '13px',
                      color: 'var(--text-primary)',
                      lineHeight: '1.6',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      marginBottom: '8px',
                      whiteSpace: 'pre-line'
                    }}>
                      {q.questionText}
                    </div>
                    {q.justification && q.justification !== 'No mapping recorded.' && (
                      <div style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        fontStyle: 'italic',
                        borderLeft: '3px solid rgba(59,130,246,0.3)',
                        paddingLeft: '10px',
                      }}>
                        💡 {q.justification}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Edit Action Buttons */}
      {isEditing && (
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button onClick={onSave} className="btn btn-success" disabled={loading}
            style={{ padding: '10px 20px', fontSize: '13px' }}>
            Save All Mappings
          </button>
          <button onClick={onCancel} className="btn btn-secondary" disabled={loading}
            style={{ padding: '10px 20px', fontSize: '13px' }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Lab CO Totals Summary Panel (combined)
// ─────────────────────────────────────────────────────────────────────────────
function LabCOSummary({ combinedReport }) {
  if (!combinedReport) return null;

  const totals = combinedReport.coTotals || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Combined CO Totals */}
      <div>
        <h4 style={{
          fontFamily: 'var(--font-heading)', fontSize: '12px', color: 'var(--text-secondary)',
          textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px'
        }}>
          Combined CO Weightage Totals (All Sets)
        </h4>
        <div className="meta-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
          {['CO1','CO2','CO3','CO4','CO5','CO6'].map(co => (
            <div className="meta-card-item" key={co} style={{ padding: '10px 8px', textAlign: 'center' }}>
              <div className="meta-card-label" style={{ fontSize: '10px' }}>{co}</div>
              <div className="meta-card-value" style={{ fontSize: '20px', color: 'var(--accent-blue-hover)' }}>
                {totals[co] || 0}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Lab: Question-to-CO Mapping Details section
// ─────────────────────────────────────────────────────────────────────────────
function LabQuestionMappingDetails({ sets }) {
  const [expandedQuestions, setExpandedQuestions] = React.useState({});

  const toggleQuestion = (setNo, questionNo) => {
    const key = `${setNo}-${questionNo}`;
    setExpandedQuestions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (!sets || sets.length === 0) return null;

  return (
    <div className="glass-card">
      <div className="glass-card-header">
        <h3 className="glass-card-title">
          📋 Question-to-CO Mapping Details
        </h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {sets.map((setGroup, idx) => (
          <div key={setGroup.setNo} style={{
            borderBottom: idx === sets.length - 1 ? 'none' : '1px solid var(--border-color)',
            paddingBottom: idx === sets.length - 1 ? '0' : '20px'
          }}>
            <h4 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '16px',
              fontWeight: '700',
              color: 'var(--text-primary)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🔬 Set {setGroup.setNo}
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px'
            }}>
              {setGroup.questions && setGroup.questions.map((q) => {
                const isExpanded = !!expandedQuestions[`${setGroup.setNo}-${q.questionNo}`];
                return (
                  <div
                    key={q.questionNo}
                    onClick={() => toggleQuestion(setGroup.setNo, q.questionNo)}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.01)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '16px',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.01)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', color: 'var(--accent-blue-hover)', fontSize: '14px' }}>
                        Question {q.questionNo}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                        {isExpanded ? 'Collapse ──' : 'Expand ──'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px' }}>
                      {q.mappedCOs && q.mappedCOs.length > 0 ? (
                        q.mappedCOs.map((mco) => (
                          <div key={mco.coCode} style={{ color: 'var(--accent-emerald)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                            → {mco.coCode} ({mco.weightage})
                          </div>
                        ))
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                          → Unmapped
                        </div>
                      )}
                    </div>

                    {isExpanded && (
                      <div
                        onClick={(e) => e.stopPropagation()} // Prevent collapsing when clicking inside
                        style={{
                          marginTop: '16px',
                          borderTop: '1px solid var(--border-color)',
                          paddingTop: '16px',
                          cursor: 'default'
                        }}
                      >
                        <div style={{ marginBottom: '16px' }}>
                          <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                            Full Combined A+B Question Text
                          </span>
                          <div style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'pre-line', backgroundColor: 'var(--bg-tertiary)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', lineHeight: '1.6' }}>
                            {q.questionText}
                          </div>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                          <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                            Mapped COs:
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {q.mappedCOs && q.mappedCOs.length > 0 ? (
                              q.mappedCOs.map((mco) => (
                                <div key={mco.coCode} style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>
                                  {mco.coCode} = {mco.weightage}
                                </div>
                              ))
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No mapped COs</span>
                            )}
                          </div>
                        </div>

                        {q.justification && q.justification !== 'No mapping recorded.' && (
                          <div>
                            <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                              Justification
                            </span>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', borderLeft: '3px solid var(--accent-blue)', paddingLeft: '10px', lineHeight: '1.6' }}>
                              💡 {q.justification}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Lab: Set-wise Question Mapping Matrices
// ─────────────────────────────────────────────────────────────────────────────
function LabSetMappingMatrices({ sets, isEditing, onCellChange }) {
  if (!sets || sets.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
      {sets.map((setGroup) => {
        const matrix = (setGroup.questions || []).map((q) => {
          const row = { questionNo: q.questionNo, marks: q.marks, CO1: 0, CO2: 0, CO3: 0, CO4: 0, CO5: 0, CO6: 0 };
          (q.mappedCOs || []).forEach((m) => {
            const coKey = m.coCode;
            if (row.hasOwnProperty(coKey)) {
              row[coKey] = Number(m.weightage);
            }
          });
          return row;
        });

        return (
          <div key={setGroup.setNo} className="glass-card" style={{ marginBottom: '0' }}>
            <div className="glass-card-header">
              <h3 className="glass-card-title">
                📊 Set {setGroup.setNo} Mapping Matrix
              </h3>
            </div>
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '60px', backgroundColor: 'var(--bg-tertiary)' }}></th>
                    <th>Question No</th>
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
                  {matrix.map((row, index) => {
                    const displayQNo = row.questionNo.toString().startsWith('Q') ? row.questionNo : `Q${row.questionNo}`;
                    return (
                      <tr key={index}>
                        <td style={{ color: 'var(--text-muted)', fontSize: '12px', width: '60px', backgroundColor: 'var(--bg-tertiary)', fontWeight: 'bold' }}>
                          {index}
                        </td>
                        <td style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{displayQNo}</td>
                        <td style={{ fontWeight: 'bold', color: 'var(--accent-blue-hover)' }}>{row.marks}</td>
                        {['CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'CO6'].map((coKey) => {
                          const val = row[coKey] || 0;
                          return (
                            <td key={coKey} className="matrix-cell" style={{ textAlign: 'center', padding: isEditing ? '4px' : '12px 16px' }}>
                              {isEditing ? (
                                <select
                                  value={val}
                                  onChange={(e) => onCellChange(setGroup.setNo, row.questionNo, coKey, Number(e.target.value))}
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
                                <span className={`matrix-cell-weight weight-${val}`}>{val}</span>
                              ) : (
                                <span className="matrix-cell-empty">0</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main QuestionPaperUpload component
// Props:
//   activeSubject  — the currently selected Subject document
//   activeModule   — 'MODULE_1' | 'MODULE_2' | null (null for Summative Lab)
//   lockedExamType — when provided by App.jsx (e.g. 'SUMMATIVE_LAB'), the
//                    internal exam-type selector is hidden and the component
//                    is permanently locked to that type.
// ─────────────────────────────────────────────────────────────────────────────
export default function QuestionPaperUpload({ activeSubject, activeModule, lockedExamType }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const [paper, setPaper] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [report, setReport] = useState(null);
  const [viewMode, setViewMode] = useState('matrix'); // 'matrix' or 'detailed'
  const [isEditing, setIsEditing] = useState(false);

  // When App.jsx passes lockedExamType (e.g. 'SUMMATIVE_LAB'), lock to it.
  // Otherwise let the user pick inside the component (T1/T4/T5 module tabs).
  const [activeExamType, setActiveExamType] = useState(lockedExamType || 'T1');

  // If the locked type changes (navigation switch), sync internal state.
  useEffect(() => {
    if (lockedExamType) setActiveExamType(lockedExamType);
  }, [lockedExamType]);

  // Summative Lab specific state
  const [labSets, setLabSets] = useState([]);               // set-grouped questions
  const [labSetReports, setLabSetReports] = useState([]);   // per-set WeightageReports
  const [labCombinedReport, setLabCombinedReport] = useState(null); // combined report

  const isLab = activeExamType === 'SUMMATIVE_LAB';
  // Whether to show the internal exam-type selector card.
  // Hidden when App.jsx already chose the type via lockedExamType.
  const showExamTypeSelector = !lockedExamType;

  // ── Fetch existing paper data ──────────────────────────────────────────────
  const fetchPaper = async () => {
    if (!activeSubject) return;
    setLoading(true);
    setError(null);
    setPaper(null);
    setQuestions([]);
    setReport(null);
    setLabSets([]);
    setLabSetReports([]);
    setLabCombinedReport(null);

    const mod = activeModule || 'MODULE_1';

    try {
      const url = isLab
        ? `/api/v1/question-papers/${activeSubject._id}?examType=SUMMATIVE_LAB`
        : `/api/v1/question-papers/${activeSubject._id}?examType=${activeExamType}&module=${mod}`;

      const res = await fetch(url);
      const json = await res.json();

      if (json.success && json.data) {
        setPaper(json.data.paper);

        if (isLab) {
          // Lab response: sets[] + setReports[] + combinedReport
          setLabSets(json.data.sets || []);
          setLabSetReports(json.data.setReports || []);
          setLabCombinedReport(json.data.combinedReport || null);
        } else {
          setReport(json.data.report);
          // Merge questions list and mapping details
          const mergedQuestions = (json.data.questions || []).map((q) => {
            const mapping = (json.data.mappings || []).find(
              (m) => m.questionNo.toString().trim() === q.questionNo.toString().trim()
            );
            return {
              ...q,
              mappedCOs: mapping ? mapping.mappedCOs : [],
              justification: mapping ? mapping.justification : 'No mapping recorded.',
            };
          });
          setQuestions(mergedQuestions);
        }
      }
    } catch (err) {
      console.warn('No previous question paper details found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPaper(null);
    setQuestions([]);
    setReport(null);
    setError(null);
    setSuccess(null);
    setIsEditing(false);
    setLabSets([]);
    setLabSetReports([]);
    setLabCombinedReport(null);
    fetchPaper();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubject, activeExamType, activeModule]);

  // ── Upload ─────────────────────────────────────────────────────────────────
  const uploadFile = async (file) => {
    if (!file || !activeSubject) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    const mod = activeModule || 'MODULE_1';
    const formData = new FormData();
    formData.append('questionPaper', file);
    formData.append('subjectId', activeSubject._id);
    formData.append('examType', activeExamType);
    if (!isLab) formData.append('module', mod);

    try {
      const res = await fetch('/api/v1/question-papers/upload', {
        method: 'POST',
        headers: isLab
          ? { 'subject-id': activeSubject._id, 'exam-type': activeExamType }
          : { 'subject-id': activeSubject._id, 'exam-type': activeExamType, 'module': mod },
        body: formData,
      });
      const json = await res.json();

      if (json.success) {
        const msg = isLab
          ? `Summative Lab: ${json.data.setsDetected} set(s) detected, ${json.data.questionsCount} question(s) extracted and mapped!`
          : `${activeExamType} Exam (${mod}): Uploaded, consolidated, and mapped successfully!`;
        setSuccess(msg);
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

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) uploadFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) uploadFile(e.target.files[0]);
  };

  // ── Matrix cell edit (T1/T4/T5) ────────────────────────────────────────────
  const handleCellChange = (qNo, coKey, val) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.questionNo.toString().trim() !== qNo.toString().trim()) return q;
        let newMappedCOs = [...q.mappedCOs];
        const exists = newMappedCOs.find((m) => m.coCode === coKey);
        if (exists) {
          if (val === 0) newMappedCOs = newMappedCOs.filter((m) => m.coCode !== coKey);
          else newMappedCOs = newMappedCOs.map((m) => m.coCode === coKey ? { ...m, weightage: val } : m);
        } else if (val > 0) {
          newMappedCOs.push({ coCode: coKey, weightage: val });
        }
        return { ...q, mappedCOs: newMappedCOs };
      })
    );
  };

  // ── Lab cell edit ──────────────────────────────────────────────────────────
  const handleLabCellChange = (setNo, questionNo, coKey, val) => {
    setLabSets((prev) =>
      prev.map((s) => {
        if (s.setNo !== setNo) return s;
        return {
          ...s,
          questions: s.questions.map((q) => {
            if (q.questionNo.toString().trim() !== questionNo.toString().trim()) return q;
            let newMappedCOs = [...(q.mappedCOs || [])];
            const exists = newMappedCOs.find((m) => m.coCode === coKey);
            if (exists) {
              if (val === 0) newMappedCOs = newMappedCOs.filter((m) => m.coCode !== coKey);
              else newMappedCOs = newMappedCOs.map((m) => m.coCode === coKey ? { ...m, weightage: val } : m);
            } else if (val > 0) {
              newMappedCOs.push({ coCode: coKey, weightage: val });
            }
            return { ...q, mappedCOs: newMappedCOs };
          })
        };
      })
    );
  };

  // ── Save (T1/T4/T5) ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!paper || !paper._id) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    const mappingsPayload = questions.map((q) => ({
      questionNo: q.questionNo,
      mappedCOs: q.mappedCOs.map((m) => ({ coCode: m.coCode, weightage: m.weightage })),
      justification: q.justification
    }));

    try {
      const res = await fetch(`/api/v1/question-papers/mappings/${paper._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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

  // ── Save (Lab) ─────────────────────────────────────────────────────────────
  const handleLabSave = async () => {
    if (!paper || !paper._id) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Flatten all set-question mappings into a single array with setNo included
    const mappingsPayload = [];
    labSets.forEach((s) => {
      (s.questions || []).forEach((q) => {
        mappingsPayload.push({
          setNo: s.setNo,
          questionNo: q.questionNo,
          mappedCOs: (q.mappedCOs || []).map((m) => ({ coCode: m.coCode, weightage: m.weightage })),
          justification: q.justification || ''
        });
      });
    });

    try {
      const res = await fetch(`/api/v1/question-papers/mappings/${paper._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings: mappingsPayload })
      });
      const json = await res.json();
      if (json.success) {
        setSuccess('Summative Lab mappings and weightage matrices updated successfully!');
        setIsEditing(false);
        fetchPaper();
      } else {
        setError(json.message || 'Failed to save lab mappings.');
      }
    } catch (err) {
      setError('An error occurred while saving lab mappings.');
    } finally {
      setLoading(false);
    }
  };

  // ── Matrix preview (T1/T4/T5) ───────────────────────────────────────────────
  const getMatrixPreview = () => {
    if (!report) return null;
    const matrix = [];
    const coTotals = { CO1: 0, CO2: 0, CO3: 0, CO4: 0, CO5: 0, CO6: 0 };
    questions.forEach((q) => {
      const row = { questionNo: q.questionNo, marks: q.marks, CO1: 0, CO2: 0, CO3: 0, CO4: 0, CO5: 0, CO6: 0 };
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

  const currentPreview = !isLab ? getMatrixPreview() : null;
  const filteredQuestions = questions;

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
        <p>Please select or upload a syllabus in the **Syllabus Ingestion** tab before uploading {activeExamType} Exam PDFs.</p>
      </div>
    );
  }

  // ── Total questions count (across all sets for lab) ────────────────────────
  const labTotalQuestions = labSets.reduce((sum, s) => sum + (s.questions ? s.questions.length : 0), 0);

  return (
    <div className="workspace-container">
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* ── Exam Type Selector (hidden when locked by App.jsx navigation) ───── */}
      {showExamTypeSelector && (
        <div className="glass-card" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Select Assessment Type
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Choose the exam type to load and view independent question mappings and reports.
            </p>
          </div>
          <div className="workspace-tabs" style={{ padding: '4px', borderRadius: '8px' }}>
            {[
              { key: 'T1', label: '📋 T1 Exam' },
              { key: 'T4', label: '🎯 T4 Exam' },
              { key: 'T5', label: '📝 T5 Assignment' },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`tab-btn ${activeExamType === key ? 'active' : ''}`}
                onClick={() => { setActiveExamType(key); setIsEditing(false); }}
                style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '6px' }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Upload Box ────────────────────────────────────────────────────────── */}
      <div className="glass-card">
        <div className="glass-card-header">
          <h3 className="glass-card-title">
            {isLab ? 'Summative Lab Mapping Engine' : `${activeExamType} Exam Mapping Engine`}
          </h3>
          <span className="badge badge-blue">
            Upload {isLab ? 'Lab' : activeExamType} PDF
          </span>
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
          <div className="upload-icon">{isLab ? '🔬' : '📝'}</div>
          <p className="upload-text">
            Drag & drop {isLab ? 'Summative Lab' : `${activeExamType} Exam`} PDF, or click to browse
          </p>
          <span className="upload-hint">
            {activeExamType === 'T1' && 'Sub-questions (e.g. 1a, 1b) will be grouped, marks summed, and mapped automatically'}
            {activeExamType === 'T4' && 'Each question (including MCQs) will be parsed and mapped independently without aggregation'}
            {activeExamType === 'T5' && 'Subparts (e.g. 1-a, 1-b) will be combined under parent Questions (1–4), marks aggregated to 20, and mapped'}
            {isLab && 'All Sets are detected dynamically. A+B sub-parts are combined into parent questions. Each set is mapped independently and a combined report is generated.'}
          </span>
        </div>

        {loading && (
          <div className="loader-container">
            <div className="spinner"></div>
            <p style={{ color: 'var(--text-secondary)' }}>
              {isLab
                ? 'Detecting sets, aggregating A+B questions, and mapping COs via local Qwen LLM...'
                : `Processing ${activeExamType} Exam Mapping data...`}
            </p>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SUMMATIVE LAB RESULTS VIEW
      ════════════════════════════════════════════════════════════════════════ */}
      {isLab && labSets.length > 0 && (
        <>
          {/* Lab Header Controls */}
          <div className="glass-card">
            <div className="glass-card-header">
              <h3 className="glass-card-title">
                🔬 Summative Lab — {labSets.length} Set{labSets.length > 1 ? 's' : ''} Detected
              </h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn btn-secondary"
                    disabled={loading}
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                  >
                    Edit Mappings
                  </button>
                ) : null}
                <span className="badge badge-emerald">{labTotalQuestions} Total Questions</span>
                <span className="badge badge-blue">{labSets.length} Sets</span>
              </div>
            </div>

            {/* CO Totals Summary */}
            <LabCOSummary combinedReport={labCombinedReport} setReports={labSetReports} />
          </div>

          {/* Set-Wise Question Mapping Matrices */}
          <LabSetMappingMatrices
            sets={labSets}
            isEditing={isEditing}
            onCellChange={handleLabCellChange}
          />

          {/* Question-to-CO Mapping Details */}
          <LabQuestionMappingDetails sets={labSets} />

          {/* Set-Grouped Tree View */}
          <div className="glass-card">
            <div className="glass-card-header">
              <h3 className="glass-card-title">Set-wise Question & CO Mapping View</h3>
              {isEditing && (
                <span className="badge badge-amber" style={{ fontSize: '11px' }}>
                  ✏️ Editing Mode — select 0, 2, or 3 for each CO
                </span>
              )}
            </div>

            <LabSetView
              sets={labSets}
              isEditing={isEditing}
              onCellChange={handleLabCellChange}
              onSave={handleLabSave}
              onCancel={() => { setIsEditing(false); fetchPaper(); }}
              loading={loading}
            />
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          T1 / T4 / T5 RESULTS VIEW (unchanged)
      ════════════════════════════════════════════════════════════════════════ */}
      {!isLab && filteredQuestions.length > 0 && (
        <div className="glass-card">
          <div className="glass-card-header">
            <h3 className="glass-card-title">
              Consolidated Questions & CO Mappings ({activeExamType} Exam - {activeModule ? activeModule.replace('_', ' ') : 'All Modules'})
            </h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {isEditing ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleSave} className="btn btn-success" disabled={loading} style={{ padding: '8px 16px', fontSize: '13px' }}>
                    Save Changes
                  </button>
                  <button onClick={() => { setIsEditing(false); fetchPaper(); }} className="btn btn-secondary" disabled={loading} style={{ padding: '8px 16px', fontSize: '13px' }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { setIsEditing(true); setViewMode('matrix'); }} className="btn btn-secondary" disabled={loading} style={{ padding: '8px 16px', fontSize: '13px' }}>
                    Edit Matrix
                  </button>
                  <div className="workspace-tabs" style={{ padding: '3px', borderRadius: '8px', gap: '4px' }}>
                    <button className={`tab-btn ${viewMode === 'matrix' ? 'active' : ''}`} onClick={() => setViewMode('matrix')} style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '6px' }}>
                      Matrix View
                    </button>
                    <button className={`tab-btn ${viewMode === 'detailed' ? 'active' : ''}`} onClick={() => setViewMode('detailed')} style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '6px' }}>
                      Detailed List
                    </button>
                  </div>
                </div>
              )}
              <span className="badge badge-emerald">{filteredQuestions.length} Base Questions</span>
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
                              <span className={`matrix-cell-weight weight-${val}`}>{val}</span>
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
            !isLab && (
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
                    {filteredQuestions.map((q) => (
                      <tr key={q._id}>
                        <td style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{q.questionNo}</td>
                        <td style={{ fontWeight: 'bold', color: 'var(--accent-blue-hover)', textAlign: 'center' }}>{q.marks}</td>
                        <td>
                          <span className={`badge ${getCognitiveBadgeColor(q.cognitiveLevel)}`}>{q.cognitiveLevel}</span>
                        </td>
                        <td>
                          <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>{q.nature}</span>
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
            )
          )}
        </div>
      )}
    </div>
  );
}
