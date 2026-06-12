/**
 * src/models/QuestionPaper.js
 * Mongoose Schema representing an uploaded Question Paper.
 * References the 'questions' collection.
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
      enum: ['T1', 'T4', 'T5'],
      required: [true, 'Exam type is required.'],
      default: 'T1'
    },
    paperPath: {
      type: String,
      required: [true, 'Question paper PDF path is required.']
    },
    module: {
      type: String,
      enum: ['MODULE_1', 'MODULE_2'],
      required: [true, 'Module specification (MODULE_1/MODULE_2) is required.'],
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
