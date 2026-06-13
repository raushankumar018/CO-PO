import React, { useState, useEffect } from 'react';

export default function SyllabusUpload({ activeSubject, setActiveSubject }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Fetch existing subjects/courses
  const fetchSubjects = async () => {
    try {
      const res = await fetch('/api/v1/syllabus');
      const json = await res.json();
      if (json.success) {
        setSubjects(json.data);
      }
    } catch (err) {
      console.error('Error fetching subjects:', err);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleSubjectChange = async (e) => {
    const id = e.target.value;
    if (!id) {
      setActiveSubject(null);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/syllabus/${id}`);
      const json = await res.json();
      if (json.success) {
        setActiveSubject(json.data);
      } else {
        setError(json.message);
      }
    } catch (err) {
      setError('Failed to fetch course details.');
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file) => {
    if (!file) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    const formData = new FormData();
    formData.append('syllabus', file);

    try {
      const res = await fetch('/api/v1/syllabus/upload', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      
      if (json.success) {
        setSuccess('Syllabus uploaded and processed successfully!');
        setActiveSubject(json.data);
        fetchSubjects(); // Refresh lists
      } else {
        setError(json.message || 'Failed to process syllabus.');
      }
    } catch (err) {
      setError('An error occurred while uploading. Ensure backend is running.');
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

  return (
    <div className="workspace-container">
      {/* Existing Subject Selector */}
      <div className="subject-selector-bar">
        <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Select Active Course:</label>
        <div className="select-wrapper">
          <select 
            value={activeSubject ? activeSubject._id : ''} 
            onChange={handleSubjectChange}
            disabled={loading}
          >
            <option value="">-- Choose an existing course or upload below --</option>
            {subjects.map((sub) => (
              <option key={sub._id} value={sub._id}>
                {sub.subjectCode} - {sub.subjectName} ({sub.semester})
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="grid-cols-2">
        {/* Upload Form Area */}
        <div className="glass-card">
          <div className="glass-card-header">
            <h3 className="glass-card-title">Syllabus Ingestion</h3>
            <span className="badge badge-blue">PDF Only</span>
          </div>
          
          <div 
            className={`upload-dropzone ${dragActive ? 'active' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('syllabus-file-input').click()}
          >
            <input 
              type="file" 
              id="syllabus-file-input" 
              style={{ display: 'none' }} 
              accept=".pdf"
              onChange={handleFileChange}
              disabled={loading}
            />
            <div className="upload-icon">📁</div>
            <p className="upload-text">Drag & drop syllabus PDF, or click to browse</p>
            <span className="upload-hint">Upload non-standard or corrupted PDFs to test our fallback extraction engine</span>
          </div>

          {loading && (
            <div className="loader-container">
              <div className="spinner"></div>
              <p style={{ color: 'var(--text-secondary)' }}>Extracting curriculum topics & academic metadata via local Qwen LLM...</p>
            </div>
          )}
        </div>

        {/* Detailed Parsed Syllabus Metadata */}
        <div className="glass-card">
          <div className="glass-card-header">
            <h3 className="glass-card-title">Syllabus Metadata Viewer</h3>
            {activeSubject && <span className="badge badge-emerald">Active</span>}
          </div>

          {activeSubject ? (
            <div>
              <div className="meta-grid">
                <div className="meta-card-item">
                  <div className="meta-card-label">Subject Code</div>
                  <div className="meta-card-value">{activeSubject.subjectCode}</div>
                </div>
                <div className="meta-card-item">
                  <div className="meta-card-label">Subject Name</div>
                  <div className="meta-card-value">{activeSubject.subjectName}</div>
                </div>
                <div className="meta-card-item">
                  <div className="meta-card-label">Semester</div>
                  <div className="meta-card-value">{activeSubject.semester}</div>
                </div>
                <div className="meta-card-item">
                  <div className="meta-card-label">Department</div>
                  <div className="meta-card-value">{activeSubject.department}</div>
                </div>
                <div className="meta-card-item" style={{ gridColumn: 'span 2' }}>
                  <div className="meta-card-label">Faculty Name</div>
                  <div className="meta-card-value">{activeSubject.facultyName}</div>
                </div>
              </div>

              <h4 style={{ fontFamily: 'var(--font-heading)', margin: '20px 0 10px', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
                Extracted Course Units & Topics
              </h4>
              
              <div className="unit-list">
                {activeSubject.unitsAndTopics && activeSubject.unitsAndTopics.length > 0 ? (
                  activeSubject.unitsAndTopics.map((unit, idx) => (
                    <div className="unit-item" key={idx}>
                      <div className="unit-header">
                        <span className="unit-title">{unit.unitNumber || `Unit ${idx + 1}`}: {unit.unitTitle || 'General Topics'}</span>
                      </div>
                      <div className="topic-tags">
                        {unit.topics && unit.topics.map((topic, tidx) => (
                          <span className="topic-tag" key={tidx}>{topic}</span>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No units parsed.</p>
                )}
              </div>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlignment: 'center', color: 'var(--text-secondary)' }}>
              No course selected. Ingest a syllabus PDF or select an existing course to view parsed structures.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
