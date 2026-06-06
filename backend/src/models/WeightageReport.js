/**
 * src/models/WeightageReport.js
 * Mongoose Schema representing compiled exam weightage analysis reports.
 */

import mongoose from 'mongoose';

const WeightageReportSchema = new mongoose.Schema(
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
    toolType: {
      type: String,
      enum: ['T1', 'T2', 'T3', 'T4', 'T5'],
      required: [true, 'Assessment tool type is required.']
    },
    // Compiled matrix containing question numbers and values for CO1-CO6 (including 0s)
    matrix: [
      {
        questionNo: { type: String, required: true },
        marks: { type: Number, required: true },
        CO1: { type: Number, default: 0 },
        CO2: { type: Number, default: 0 },
        CO3: { type: Number, default: 0 },
        CO4: { type: Number, default: 0 },
        CO5: { type: Number, default: 0 },
        CO6: { type: Number, default: 0 }
      }
    ],
    // Sum of weightage contributions per CO
    coTotals: {
      CO1: { type: Number, default: 0 },
      CO2: { type: Number, default: 0 },
      CO3: { type: Number, default: 0 },
      CO4: { type: Number, default: 0 },
      CO5: { type: Number, default: 0 },
      CO6: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true,
    collection: 'weightage_reports'
  }
);

WeightageReportSchema.index({ questionPaperId: 1, toolType: 1 });

const WeightageReport = mongoose.model('WeightageReport', WeightageReportSchema);

export default WeightageReport;
