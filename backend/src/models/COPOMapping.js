import mongoose from 'mongoose';

const poMappingSchema = new mongoose.Schema(
  {
    poCode: {
      type: String,
      required: true
    },
    correlation: {
      type: Number,
      enum: [1, 2, 3],
      required: true
    }
  },
  { _id: false }
);

const coPoRowSchema = new mongoose.Schema(
  {
    coCode: {
      type: String,
      required: true
    },

    mappings: [poMappingSchema]
  },
  { _id: false }
);

const coPoMappingSchema = new mongoose.Schema(
  {
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
      unique: true
    },

    matrix: {
      type: [coPoRowSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model(
  'COPOMapping',
  coPoMappingSchema
);