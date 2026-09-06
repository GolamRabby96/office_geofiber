import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema({
  customer_name: {
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
  details: {
    type: String,
    default: ''
  },
  pop_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DistributionPoint',
    required: true
  }
}, {
  timestamps: true
});

CustomerSchema.index({ pop_id: 1 });

export default mongoose.model('Customer', CustomerSchema);
