const mongoose = require('mongoose');

const sentenceSchema = new mongoose.Schema({
  sentenceId: { 
    type: Number, 
    required: true, 
    unique: true,
    min: 1,
    max: 400
  },
  text: { 
    type: String, 
    required: true,
    trim: true
  }
}, { 
  timestamps: true,
  collection: 'sentences'
});

module.exports = mongoose.model('Sentence', sentenceSchema); 