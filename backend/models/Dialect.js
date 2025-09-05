const mongoose = require('mongoose');

const dialectSchema = new mongoose.Schema({
  dialectCode: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  dialectName: { 
    type: String, 
    required: true,
    trim: true
  },
  label: {
    type: String,
    required: true,
    trim: true
  },
  status: { 
    type: String, 
    enum: ['in_progress', 'completed'], 
    default: 'in_progress' 
  },
  lastRecordedAt: { 
    type: Date 
  },
  
  // Embedded arrays for easy querying
  recordedSentenceIds: [{
    type: Number,
    min: 1
  }],
  unrecordedSentenceIds: [{
    type: Number,
    min: 1
  }],
  recordingIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recording'
  }]
}, { 
  timestamps: true,
  collection: 'dialects'
});

// Virtual properties
dialectSchema.virtual('totalSentences').get(function() {
  // Return the sum of recorded and unrecorded sentences
  return this.recordedSentenceIds.length + this.unrecordedSentenceIds.length;
});

dialectSchema.virtual('recordedSentences').get(function() {
  return this.recordedSentenceIds.length;
});

dialectSchema.virtual('completionPercentage').get(function() {
  const total = this.totalSentences;
  return total > 0 ? ((this.recordedSentenceIds.length / total) * 100).toFixed(2) : '0.00';
});

dialectSchema.virtual('nextIndex').get(function() {
  return this.recordedSentenceIds.length + 1; // 1-based indexing
});

// Include virtuals when converting to JSON
dialectSchema.set('toJSON', { virtuals: true });
dialectSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Dialect', dialectSchema); 