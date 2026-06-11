/**
 * src/models/Question.js
 * Mongoose Schema representing a specific question in an exam paper.
 * Stores cognitive level (Bloom's Taxonomy) and classification types.
 */

import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema(
  {
    questionPaperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuestionPaper',
      required: [true, 'Question paper reference is required.']
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject reference is required.']
    },
    module: {
      type: String,
      enum: ['MODULE_1', 'MODULE_2'],
      required: [true, 'Module specification (MODULE_1/MODULE_2) is required.']
    },
    toolType: {
      type: String,
      enum: ['T1', 'T2', 'T3', 'T4', 'T5'],
      required: [true, 'Question assessment tool type (e.g. T1, T4) is required.']
    },
    examType: {
      type: String,
      enum: ['T1', 'T4'],
      required: [true, 'Exam type is required.'],
      default: 'T1'
    },
    questionNo: {
      type: String,
      required: [true, 'Question number (e.g. 1a, 2) is required.'],
      trim: true
    },
    questionText: {
      type: String,
      required: [true, 'Question text is required.'],
      trim: true
    },
    marks: {
      type: Number,
      required: [true, 'Question marks allocation is required.'],
      min: [0, 'Marks cannot be negative.']
    },
    cognitiveLevel: {
      type: String,
      enum: ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'],
      required: [true, "Cognitive classification (Bloom's Taxonomy level) is required."]
    },
    nature: {
      type: String,
      enum: ['Theory', 'Numerical', 'Programming', 'Design', 'Practical'],
      required: [true, 'Nature of the question is required.']
    }
  },
  {
    timestamps: true,
    collection: 'questions'
  }
);

// Optimize search speed on question paper grouping
QuestionSchema.index({ questionPaperId: 1, toolType: 1, examType: 1 });

const Question = mongoose.model('Question', QuestionSchema);

export default Question;
