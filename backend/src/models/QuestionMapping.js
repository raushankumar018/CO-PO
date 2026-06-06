/**
 * src/models/QuestionMapping.js
 * Mongoose Schema representing mapping of a specific question to Course Outcomes (COs).
 * Strictly enforces weightages of 2 or 3. Excludes zero values.
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
    }
  },
  {
    timestamps: true,
    collection: 'question_mappings'
  }
);

QuestionMappingSchema.index({ questionPaperId: 1 });

const QuestionMapping = mongoose.model('QuestionMapping', QuestionMappingSchema);

export default QuestionMapping;
