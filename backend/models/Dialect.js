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
    min: 1,
    max: 400
  }],
  unrecordedSentenceIds: [{
    type: Number,
    min: 1,
    max: 400
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
  return 400;
});

dialectSchema.virtual('recordedSentences').get(function() {
  return this.recordedSentenceIds.length;
});

dialectSchema.virtual('completionPercentage').get(function() {
  return ((this.recordedSentenceIds.length / 400) * 100).toFixed(2);
});

dialectSchema.virtual('nextIndex').get(function() {
  return this.recordedSentenceIds.length;
});

// Include virtuals when converting to JSON
dialectSchema.set('toJSON', { virtuals: true });
dialectSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Dialect', dialectSchema); 