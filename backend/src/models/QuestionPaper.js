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
    paperPath: {
      type: String,
      required: [true, 'Question paper PDF path is required.']
    }
  },
  {
    timestamps: true,
    collection: 'question_papers'
  }
);

const QuestionPaper = mongoose.model('QuestionPaper', QuestionPaperSchema);

export default QuestionPaper;
