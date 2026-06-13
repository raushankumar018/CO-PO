/**
 * src/models/QuestionMapping.js
 * Mongoose Schema representing mapping of a specific question to Course Outcomes (COs).
 * Strictly enforces weightages of 2 or 3. Excludes zero values.
 * Supports exam types: T1, T4, T5, SUMMATIVE_LAB
 */

import mongoose from 'mongoose';

const MappedCOSchema = new mongoose.Schema({
  coCode: {
    type: String,
    enum: ['CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'CO6'],
    required: [true, 'Course Outcome code is required.']
  },
  weightage: {
    type: Number,
    enum: [2, 3], // Strictly enforces only 2 (Moderate) or 3 (Strong)
    required: [true, 'Weightage level must be moderate (2) or strong (3).']
  }
}, { _id: false });

const QuestionMappingSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: [true, 'Question reference is required.']
    },
    questionPaperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuestionPaper',
      required: [true, 'Question paper reference is required.']
    },
    questionNo: {
      type: String,
      required: [true, 'Question number is required.'],
      trim: true
    },
    mappedCOs: {
      type: [MappedCOSchema],
      validate: {
        validator: function(v) {
          return v && v.length > 0;
        },
        message: 'A question must map to at least one Course Outcome.'
      }
    },
    justification: {
      type: String,
      trim: true,
      default: ''
    },
    examType: {
      type: String,
      enum: ['T1', 'T4', 'T5', 'SUMMATIVE_LAB', 'SUMMATIVE_EXAM'],
      required: [true, 'Exam type is required.'],
      default: 'T1'
    },
    // For T1/T4/T5: MODULE_1 or MODULE_2.
    // For SUMMATIVE_LAB: not applicable, stored as null.
    module: {
      type: String,
      default: null
    },
    // For SUMMATIVE_LAB: set number (e.g. "1", "2", "3").
    // Not applicable for T1/T4/T5 (stored as null).
    setNo: {
      type: String,
      default: null,
      trim: true
    }
  },
  {
    timestamps: true,
    collection: 'question_mappings'
  }
);

QuestionMappingSchema.index({ questionPaperId: 1, examType: 1, module: 1 });
// Compound index for lab set-question mapping lookups
QuestionMappingSchema.index({ questionPaperId: 1, examType: 1, setNo: 1, questionNo: 1 });

const QuestionMapping = mongoose.model('QuestionMapping', QuestionMappingSchema);

export default QuestionMapping;
