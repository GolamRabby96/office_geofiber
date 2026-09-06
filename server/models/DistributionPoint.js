import mongoose from 'mongoose';

const DistributionPointSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['POP', 'Splitter'],
    required: true,
    default: 'Splitter'
  },
  address: {
    type: String,
    default: ''
  },
  originalId: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, {
  timestamps: true
});

DistributionPointSchema.index({ latitude: 1, longitude: 1 });

export default mongoose.model('DistributionPoint', DistributionPointSchema);
