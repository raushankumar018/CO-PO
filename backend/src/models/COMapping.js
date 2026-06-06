/**
 * src/models/COMapping.js
 * Mongoose Schema representing Question-to-CO mappings and the overall weightage matrix.
 */

import mongoose from 'mongoose';

const SingleQuestionMappingSchema = new mongoose.Schema({
  questionNumber: {
    type: String,
    required: [true, 'Question number is required.'],
    trim: true
  },
  marks: {
    type: Number,
    required: [true, 'Marks are required.'],
    min: [0, 'Marks cannot be negative.']
  },
  mappedCOs: [{
    type: String,
    enum: ['CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'CO6'],
    required: [true, 'Mapped Course Outcomes list is required.']
  }],
  justification: {
    type: String,
    trim: true,
    default: ''
  }
});

const COMappingSchema = new mongoose.Schema(
  {
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject reference is required.']
    },
    questionPaperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuestionPaper',
      required: [true, 'Question paper reference is required.']
    },
    mappings: [SingleQuestionMappingSchema],
    // Compiled weightage of marks per CO, e.g. { "CO1": 15, "CO2": 25, ... }
    weightage: {
      type: Map,
      of: Number,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

const COMapping = mongoose.model('COMapping', COMappingSchema);

export default COMapping;
