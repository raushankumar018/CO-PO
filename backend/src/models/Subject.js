/**
 * src/models/Subject.js
 * Mongoose Schema representing a Subject/Syllabus entity.
 */

import mongoose from 'mongoose';

const SubjectSchema = new mongoose.Schema(
  {
    department: {
      type: String,
      required: [true, 'Department is required.'],
      trim: true
    },
    subjectName: {
      type: String,
      required: [true, 'Subject Name is required.'],
      trim: true
    },
    subjectCode: {
      type: String,
      required: [true, 'Subject Code is required.'],
      trim: true
    },
    facultyName: {
      type: String,
      required: [true, 'Faculty Name is required.'],
      trim: true
    },
    semester: {
      type: String,
      required: [true, 'Semester is required.'],
      trim: true
    },
    syllabusPath: {
      type: String,
      required: [true, 'Syllabus PDF file path is required.']
    },
    extractedContent: {
      type: String,
      required: [true, 'Extracted raw syllabus content is required.']
    },
    // Extracted structured units and topics from LLM
    unitsAndTopics: [
      {
        unitNumber: { type: String, trim: true },
        unitTitle: { type: String, trim: true },
        topics: [{ type: String, trim: true }]
      }
    ]
  },
  {
    timestamps: true
  }
);

// Add text search capabilities on name and code
SubjectSchema.index({ subjectName: 'text', subjectCode: 'text' });

const Subject = mongoose.model('Subject', SubjectSchema);

export default Subject;
