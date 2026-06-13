/**
 * src/models/CourseOutcomeHistory.js
 * Mongoose Schema representing historical versions of Course Outcomes (CO1 to CO6) for a Subject.
 * Stores both automatic generations and human edits to allow pattern learning.
 */

import mongoose from 'mongoose';

const CourseOutcomeHistorySchema = new mongoose.Schema(
  {
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject reference is required.']
    },
    subjectCode: {
      type: String,
      required: [true, 'Subject Code is required.'],
      trim: true,
      index: true
    },
    subjectName: {
      type: String,
      required: [true, 'Subject Name is required.'],
      trim: true
    },
    CO1: {
      type: String,
      required: [true, 'CO1 description is required.'],
      trim: true
    },
    CO2: {
      type: String,
      required: [true, 'CO2 description is required.'],
      trim: true
    },
    CO3: {
      type: String,
      required: [true, 'CO3 description is required.'],
      trim: true
    },
    CO4: {
      type: String,
      required: [true, 'CO4 description is required.'],
      trim: true
    },
    CO5: {
      type: String,
      required: [true, 'CO5 description is required.'],
      trim: true
    },
    CO6: {
      type: String,
      required: [true, 'CO6 description is required.'],
      trim: true
    },
    unitsAndTopics: [
      {
        unitNumber: { type: String, trim: true },
        unitTitle: { type: String, trim: true },
        topics: [{ type: String, trim: true }]
      }
    ],
    isVerified: {
      type: Boolean,
      default: false // Set to true when outcomes are verified/updated by a human
    },
    source: {
      type: String,
      enum: ['generated', 'user-updated'],
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Index on subjectCode and isVerified to speed up lookup for learning examples
CourseOutcomeHistorySchema.index({ subjectCode: 1, isVerified: 1, createdAt: -1 });

const CourseOutcomeHistory = mongoose.model('CourseOutcomeHistory', CourseOutcomeHistorySchema);

export default CourseOutcomeHistory;
