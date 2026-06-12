import React, { useState, useEffect } from 'react';
import SyllabusUpload from './components/SyllabusUpload';
import COManager from './components/COManager';
import QuestionPaperUpload from './components/QuestionPaperUpload';
import COPOMatrix from './components/COPOMatrix';

export default function App() {
  const [activeTab, setActiveTab] = useState('syllabus');
  const [activeSubject, setActiveSubject] = useState(null);

  // Determine what the top-level tab represents
  const isModuleTab = activeTab.startsWith('MODULE_');
  const isLabTab = activeTab === 'SUMMATIVE_LAB';
  const isExamTab = activeTab === 'SUMMATIVE_EXAM';

  // Guard: if subject is removed, reset module/lab/exam tabs back to syllabus
  useEffect(() => {
    const hasUnits = activeSubject && activeSubject.unitsAndTopics && activeSubject.unitsAndTopics.length > 0;
    if (!hasUnits && (isModuleTab || isLabTab || isExamTab)) {
      setActiveTab('syllabus');
    }
  }, [activeSubject]);

  const renderTabContent = () => {
    // ── Summative Lab tab → subject-wide, no module context ──────────────────
    if (isLabTab) {
      return (
        <QuestionPaperUpload
          activeSubject={activeSubject}
          activeModule={null}
          lockedExamType="SUMMATIVE_LAB"
        />
      );
    }

    // ── Summative Exam tab → subject-wide, no module context ─────────────────
    if (isExamTab) {
      return (
        <QuestionPaperUpload
          activeSubject={activeSubject}
          activeModule={null}
          lockedExamType="SUMMATIVE_EXAM"
        />
      );
    }

    // ── Module tabs → pass the MODULE_x string to the component ──────────────
    if (isModuleTab) {
      return <QuestionPaperUpload activeSubject={activeSubject} activeModule={activeTab} />;
    }

    // ── All other tabs ────────────────────────────────────────────────────────
    switch (activeTab) {
      case 'syllabus':
        return <SyllabusUpload activeSubject={activeSubject} setActiveSubject={setActiveSubject} />;
      case 'co':
        return <COManager activeSubject={activeSubject} />;
      case 'copo':
        return <COPOMatrix activeSubject={activeSubject} />;
      default:
        return <SyllabusUpload activeSubject={activeSubject} setActiveSubject={setActiveSubject} />;
    }
  };

  const hasUnits = activeSubject && activeSubject.unitsAndTopics && activeSubject.unitsAndTopics.length > 0;

  return (
    <>
      <header className="app-header">
        <div className="logo-section">
          <h1>CO-PO Analytica</h1>
          <p>Outcome Based Education (OBE) Processing Suite</p>
        </div>
        <nav className="workspace-tabs">
          {/* ── Syllabus ── */}
          <button
            className={`tab-btn ${activeTab === 'syllabus' ? 'active' : ''}`}
            onClick={() => setActiveTab('syllabus')}
          >
            📋 Syllabus Ingestion
          </button>

          {/* ── Course Outcomes ── */}
          <button
            className={`tab-btn ${activeTab === 'co' ? 'active' : ''}`}
            onClick={() => setActiveTab('co')}
          >
            🎯 Course Outcomes (CO)
          </button>

          {/* ── Module tabs (T1 / T4 / T5) — only shown when subject has units ── */}
          {hasUnits ? (
            activeSubject.unitsAndTopics.slice(0, 2).map((unit, index) => {
              const moduleKey = `MODULE_${index + 1}`;
              const moduleLabel = `Module ${index + 1}`;
              return (
                <button
                  key={moduleKey}
                  className={`tab-btn ${activeTab === moduleKey ? 'active' : ''}`}
                  onClick={() => setActiveTab(moduleKey)}
                >
                  📝 {moduleLabel}
                </button>
              );
            })
          ) : (
            /* Placeholder tab when no subject is loaded */
            <button
              className={`tab-btn ${isModuleTab ? 'active' : ''}`}
              onClick={() => setActiveTab('MODULE_1')}
            >
              📝 Exam Mapping
            </button>
          )}

          {/* ── Summative Lab — subject-level, never under a module ── */}
          {hasUnits && (
            <button
              className={`tab-btn ${isLabTab ? 'active' : ''}`}
              onClick={() => setActiveTab('SUMMATIVE_LAB')}
            >
              🔬 Summative Lab
            </button>
          )}

          {/* ── Summative Exam — subject-level, never under a module ── */}
          {hasUnits && (
            <button
              className={`tab-btn ${isExamTab ? 'active' : ''}`}
              onClick={() => setActiveTab('SUMMATIVE_EXAM')}
            >
              📝 Summative Exam
            </button>
          )}

          {/* ── CO-PO Matrix ── */}
          <button
            className={`tab-btn ${activeTab === 'copo' ? 'active' : ''}`}
            onClick={() => setActiveTab('copo')}
          >
            📊 CO-PO Matrix
          </button>
        </nav>
      </header>

      <main style={{ flexGrow: 1 }}>
        {activeSubject && (
          <div
            className="alert alert-info"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 20px',
              borderRadius: '8px',
              marginBottom: '24px'
            }}
          >
            <span>
              Selected Course: <strong>{activeSubject.subjectCode} - {activeSubject.subjectName}</strong>
            </span>
            <span className="badge badge-emerald" style={{ textTransform: 'uppercase', fontSize: '11px' }}>
              {activeSubject.department} Department
            </span>
          </div>
        )}
        {renderTabContent()}
      </main>

      <footer style={{
        padding: '24px 0',
        borderTop: '1px solid var(--border-color)',
        marginTop: '40px',
        color: 'var(--text-muted)',
        fontSize: '12px',
        textAlign: 'center'
      }}>
        <p>CO-PO Outcome Based Education System Backend Platform. Developed with local LLM integration and MongoDB.</p>
      </footer>
    </>
  );
}
