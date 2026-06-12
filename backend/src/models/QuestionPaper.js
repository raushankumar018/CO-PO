/**
 * src/models/QuestionPaper.js
 * Mongoose Schema representing an uploaded Question Paper.
 * References the 'questions' collection.
 * Supports exam types: T1, T4, T5, SUMMATIVE_LAB
 */

import mongoose from 'mongoose';

const QuestionPaperSchema = new mongoose.Schema(
  {
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject reference is required.']
    },
    examType: {
      type: String,
      enum: ['T1', 'T4', 'T5', 'SUMMATIVE_LAB'],
      required: [true, 'Exam type is required.'],
      default: 'T1'
    },
    paperPath: {
      type: String,
      required: [true, 'Question paper PDF path is required.']
    },
    // For T1/T4/T5: MODULE_1 or MODULE_2.
    // For SUMMATIVE_LAB: defaults to MODULE_1 (scoping done via examType).
    module: {
      type: String,
      enum: ['MODULE_1', 'MODULE_2'],
      default: 'MODULE_1'
    }
  },
  {
    timestamps: true,
    collection: 'question_papers'
  }
);

QuestionPaperSchema.index({ subjectId: 1, examType: 1, module: 1 });

const QuestionPaper = mongoose.model('QuestionPaper', QuestionPaperSchema);

export default QuestionPaper;
