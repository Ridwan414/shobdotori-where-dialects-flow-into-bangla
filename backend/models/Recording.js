const mongoose = require('mongoose');

const recordingSchema = new mongoose.Schema({
  dialectId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Dialect', 
    required: true 
  },
  sentenceId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Sentence', 
    required: true 
  },
  sentenceText: { 
    type: String, 
    required: true,
    trim: true
  }, // Denormalized for quick access
  recordingIndex: { 
    type: Number, 
    required: true,
    min: 1
  }, // Sequential per dialect (starts from 1)
  filename: { 
    type: String, 
    required: true,
    trim: true
  },
  googleDriveId: { 
    type: String, 
    required: true,
    trim: true
  },
  googleDriveLink: { 
    type: String,
    trim: true
  }
}, { 
  timestamps: { createdAt: 'recordedAt', updatedAt: true },
  collection: 'recordings'
});

// Compound indexes for efficient queries
recordingSchema.index({ dialectId: 1, sentenceId: 1 }, { unique: true });
recordingSchema.index({ dialectId: 1, recordingIndex: 1 });
recordingSchema.index({ recordedAt: -1 });
recordingSchema.index({ googleDriveId: 1 });

module.exports = mongoose.model('Recording', recordingSchema); 