const Dialect = require('../models/Dialect');
const Sentence = require('../models/Sentence');
const Recording = require('../models/Recording');

const fs = require('fs');
const path = require('path');

// Load dialects from JSON file
const dialectsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/dialects.json'), 'utf8'));

// Initialize a single dialect with all sentence IDs
async function initializeDialect(dialectCode, dialectName) {
  try {
    // Check if dialect already exists
    const existingDialect = await Dialect.findOne({ dialectCode });
    if (existingDialect) {
      console.log(`✅ Dialect ${dialectCode} already exists`);
      return existingDialect;
    }

    // Get all sentence IDs (dynamic count)
    const allSentences = await Sentence.find({}).select('sentenceId');
    const allSentenceIds = allSentences.map(s => s.sentenceId).sort((a, b) => a - b);
    
    console.log(`📊 Found ${allSentenceIds.length} sentences for dialect initialization`);

    const dialect = new Dialect({
      dialectCode,
      dialectName,
      status: 'in_progress',
      recordedSentenceIds: [],
      unrecordedSentenceIds: [...allSentenceIds], // Start with all sentences unrecorded
      recordingIds: []
    });

    await dialect.save();
    console.log(`✅ Initialized dialect: ${dialectCode} (${dialectName})`);
    return dialect;
  } catch (error) {
    console.error(`❌ Error initializing dialect ${dialectCode}:`, error.message);
    throw error;
  }
}

// Initialize all dialects
async function initializeAllDialects() {
  try {
    console.log('🚀 Initializing all dialects...');
    
    for (const dialect of dialectsData) {
      await initializeDialect(dialect.code, dialect.name);
    }
    
    console.log(`✅ Successfully initialized ${dialectsData.length} dialects`);
  } catch (error) {
    console.error('❌ Error initializing dialects:', error.message);
    throw error;
  }
}

// Update dialect after recording
async function updateDialectAfterRecording(dialectId, sentenceNumericId, recordingId) {
  try {
    const dialect = await Dialect.findById(dialectId);
    
    if (!dialect) {
      throw new Error('Dialect not found');
    }

    // Move sentence from unrecorded to recorded
    dialect.unrecordedSentenceIds = dialect.unrecordedSentenceIds.filter(id => id !== sentenceNumericId);
    
    if (!dialect.recordedSentenceIds.includes(sentenceNumericId)) {
      dialect.recordedSentenceIds.push(sentenceNumericId);
    }
    
    if (!dialect.recordingIds.includes(recordingId)) {
      dialect.recordingIds.push(recordingId);
    }

    // Update status and timestamp
    dialect.lastRecordedAt = new Date();
    
    // Check if completed (when all sentences are recorded)
    if (dialect.unrecordedSentenceIds.length === 0) {
      dialect.status = 'completed';
    }

    await dialect.save();
    const totalSentences = dialect.recordedSentenceIds.length + dialect.unrecordedSentenceIds.length;
    console.log(`✅ Updated dialect ${dialect.dialectCode}: ${dialect.recordedSentenceIds.length}/${totalSentences} sentences recorded`);
    
    return dialect;
  } catch (error) {
    console.error('❌ Error updating dialect:', error.message);
    throw error;
  }
}

// Get next sequential unrecorded sentence for a dialect
async function getNextSequentialUnrecordedSentence(dialectCode) {
  try {
    const dialect = await Dialect.findOne({ dialectCode });
    
    if (!dialect) {
      throw new Error('Dialect not found');
    }

    if (dialect.unrecordedSentenceIds.length === 0) {
      return null; // All sentences recorded
    }

    // Get the smallest unrecorded sentence ID (sequential order)
    const nextSentenceId = Math.min(...dialect.unrecordedSentenceIds);
    
    // Get the sentence document
    const sentence = await Sentence.findOne({ sentenceId: nextSentenceId });
    
    return sentence;
  } catch (error) {
    console.error('❌ Error getting next sequential unrecorded sentence:', error.message);
    throw error;
  }
}

// Check if sentence is already recorded for dialect
async function isSentenceRecorded(dialectCode, sentenceNumericId) {
  try {
    const dialect = await Dialect.findOne({ dialectCode });
    
    if (!dialect) {
      return false;
    }

    return dialect.recordedSentenceIds.includes(sentenceNumericId);
  } catch (error) {
    console.error('❌ Error checking if sentence is recorded:', error.message);
    throw error;
  }
}

// Get dialect progress summary
async function getDialectProgress(dialectCode = null) {
  try {
    if (dialectCode) {
      // Get specific dialect progress
      const dialect = await Dialect.findOne({ dialectCode });
      return dialect;
    } else {
      // Get all dialects progress
      const dialects = await Dialect.find({}).sort({ dialectCode: 1 });
      return dialects;
    }
  } catch (error) {
    console.error('❌ Error getting dialect progress:', error.message);
    throw error;
  }
}

module.exports = {
  dialectsData,
  initializeDialect,
  initializeAllDialects,
  updateDialectAfterRecording,
  getNextSequentialUnrecordedSentence,
  isSentenceRecorded,
  getDialectProgress
}; 