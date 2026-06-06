/**
 * src/models/CourseOutcome.js
 * Mongoose Schema representing Course Outcomes (CO1 to CO6) for a Subject.
 */

import mongoose from 'mongoose';

const CourseOutcomeSchema = new mongoose.Schema(
  {
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject reference is required.'],
      unique: true // One set of Course Outcomes per Subject
    },
    CO1: {
      type: String,
      required: [true, 'CO1 outcome description is required.'],
      trim: true
    },
    CO2: {
      type: String,
      required: [true, 'CO2 outcome description is required.'],
      trim: true
    },
    CO3: {
      type: String,
      required: [true, 'CO3 outcome description is required.'],
      trim: true
    },
    CO4: {
      type: String,
      required: [true, 'CO4 outcome description is required.'],
      trim: true
    },
    CO5: {
      type: String,
      required: [true, 'CO5 outcome description is required.'],
      trim: true
    },
    CO6: {
      type: String,
      required: [true, 'CO6 outcome description is required.'],
      trim: true
    }
  },
  {
    timestamps: true
  }
);

const CourseOutcome = mongoose.model('CourseOutcome', CourseOutcomeSchema);

export default CourseOutcome;
