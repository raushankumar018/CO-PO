import React, { useState } from 'react';
import SyllabusUpload from './components/SyllabusUpload';
import COManager from './components/COManager';
import QuestionPaperUpload from './components/QuestionPaperUpload';
import COPOMatrix from './components/COPOMatrix';

export default function App() {
  const [activeTab, setActiveTab] = useState('syllabus');
  const [activeSubject, setActiveSubject] = useState(null);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'syllabus':
        return <SyllabusUpload activeSubject={activeSubject} setActiveSubject={setActiveSubject} />;
      case 'co':
        return <COManager activeSubject={activeSubject} />;
      case 'questions':
        return <QuestionPaperUpload activeSubject={activeSubject} />;
      case 'copo':
        return <COPOMatrix activeSubject={activeSubject} />;
      default:
        return <SyllabusUpload activeSubject={activeSubject} setActiveSubject={setActiveSubject} />;
    }
  };

  return (
    <>
      <header className="app-header">
        <div className="logo-section">
          <h1>CO-PO Analytica</h1>
          <p>Outcome Based Education (OBE) Processing Suite</p>
        </div>
        <nav className="workspace-tabs">
          <button 
            className={`tab-btn ${activeTab === 'syllabus' ? 'active' : ''}`} 
            onClick={() => setActiveTab('syllabus')}
          >
            📋 Syllabus Ingestion
          </button>
          <button 
            className={`tab-btn ${activeTab === 'co' ? 'active' : ''}`} 
            onClick={() => setActiveTab('co')}
          >
            🎯 Course Outcomes (CO)
          </button>
          <button 
            className={`tab-btn ${activeTab === 'questions' ? 'active' : ''}`} 
            onClick={() => setActiveTab('questions')}
          >
            📝 Exam Paper Processing
          </button>
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
          <div className="alert alert-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderRadius: '8px', marginBottom: '24px' }}>
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

      <footer style={{ padding: '24px 0', borderTop: '1px solid var(--border-color)', marginTop: '40px', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
        <p>CO-PO Outcome Based Education System Backend Platform. Developed with local LLM integration and MongoDB.</p>
      </footer>
    </>
  );
}
