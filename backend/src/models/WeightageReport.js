/**
 * src/models/WeightageReport.js
 * Mongoose Schema representing compiled exam weightage analysis reports.
 * Supports exam types: T1, T4, T5, SUMMATIVE_LAB
 * For SUMMATIVE_LAB: one report per set + one combined report (setNo: "COMBINED").
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
      enum: ['T1', 'T2', 'T3', 'T4', 'T5', 'SUMMATIVE_LAB'],
      required: [true, 'Assessment tool type is required.']
    },
    // Compiled matrix containing question numbers and values for CO1-CO6 (including 0s)
    matrix: [
      {
        // For SUMMATIVE_LAB: includes setNo for identifying which set a row belongs to.
        setNo: { type: String, default: null },
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
    },
    examType: {
      type: String,
      enum: ['T1', 'T4', 'T5', 'SUMMATIVE_LAB'],
      required: [true, 'Exam type is required.'],
      default: 'T1'
    },
    // For T1/T4/T5: MODULE_1 or MODULE_2.
    // For SUMMATIVE_LAB: not applicable, stored as null.
    module: {
      type: String,
      default: null
    },
    // For SUMMATIVE_LAB: set number (e.g. "1", "2", "3") or "COMBINED" for the aggregated report.
    // Not applicable for T1/T4/T5 (stored as null).
    setNo: {
      type: String,
      default: null,
      trim: true
    }
  },
  {
    timestamps: true,
    collection: 'weightage_reports'
  }
);

WeightageReportSchema.index({ questionPaperId: 1, toolType: 1, examType: 1, module: 1 });
// Index for lab set-wise report lookups
WeightageReportSchema.index({ questionPaperId: 1, examType: 1, setNo: 1 });

const WeightageReport = mongoose.model('WeightageReport', WeightageReportSchema);

export default WeightageReport;
