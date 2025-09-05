const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Sentence = require('../models/Sentence');
const Dialect = require('../models/Dialect');
const Recording = require('../models/Recording');

async function cleanDatabase() {
  try {
    console.log('🧹 Starting database cleanup...');
    
    // Connect to database
    await connectDB();
    
    // Get counts before cleaning
    const sentenceCount = await Sentence.countDocuments();
    const dialectCount = await Dialect.countDocuments();
    const recordingCount = await Recording.countDocuments();
    
    console.log('📊 Current database state:');
    console.log(`   - Sentences: ${sentenceCount}`);
    console.log(`   - Dialects: ${dialectCount}`);
    console.log(`   - Recordings: ${recordingCount}`);
    console.log(`   - Total documents: ${sentenceCount + dialectCount + recordingCount}`);
    
    if (sentenceCount === 0 && dialectCount === 0 && recordingCount === 0) {
      console.log('✅ Database is already clean!');
      return;
    }
    
    console.log('\n🗑️  Cleaning collections...');
    
    // Clean all collections
    const cleanPromises = [
      Recording.deleteMany({}),
      Dialect.deleteMany({}),
      Sentence.deleteMany({})
    ];
    
    const results = await Promise.all(cleanPromises);
    
    console.log('✅ Database cleanup completed!');
    console.log('📊 Deleted:');
    console.log(`   - Recordings: ${results[0].deletedCount}`);
    console.log(`   - Dialects: ${results[1].deletedCount}`);
    console.log(`   - Sentences: ${results[2].deletedCount}`);
    console.log(`   - Total deleted: ${results.reduce((sum, r) => sum + r.deletedCount, 0)}`);
    
    // Verify cleanup
    const finalCounts = await Promise.all([
      Sentence.countDocuments(),
      Dialect.countDocuments(),
      Recording.countDocuments()
    ]);
    
    const totalRemaining = finalCounts.reduce((sum, count) => sum + count, 0);
    
    if (totalRemaining === 0) {
      console.log('✅ Database successfully cleaned - all collections are empty');
    } else {
      console.log(`⚠️  Warning: ${totalRemaining} documents still remain in database`);
    }
    
  } catch (error) {
    console.error('❌ Database cleanup failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔒 Database connection closed');
    process.exit(0);
  }
}

async function cleanRecordings() {
  try {
    console.log('🧹 Cleaning recordings only...');
    
    // Connect to database
    await connectDB();
    
    const recordingCount = await Recording.countDocuments();
    console.log(`📊 Found ${recordingCount} recordings`);
    
    if (recordingCount === 0) {
      console.log('✅ No recordings to clean!');
      return;
    }
    
    // Delete all recordings
    const result = await Recording.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} recordings`);
    
    // Reset all dialects to initial state
    const dialects = await Dialect.find({});
    console.log(`🔄 Resetting ${dialects.length} dialects...`);
    
    for (const dialect of dialects) {
      // Get all sentence IDs
      const allSentences = await Sentence.find({}).select('sentenceId');
      const allSentenceIds = allSentences.map(s => s.sentenceId).sort((a, b) => a - b);
      
      // Reset dialect state
      dialect.recordedSentenceIds = [];
      dialect.unrecordedSentenceIds = [...allSentenceIds];
      dialect.recordingIds = [];
      dialect.status = 'in_progress';
      dialect.lastRecordedAt = undefined;
      
      await dialect.save();
    }
    
    console.log('✅ All dialects reset to initial state');
    console.log('📊 Ready for fresh recordings!');
    
  } catch (error) {
    console.error('❌ Recording cleanup failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔒 Database connection closed');
    process.exit(0);
  }
}

// Check command line arguments
const command = process.argv[2];

if (command === 'recordings') {
  cleanRecordings();
} else {
  cleanDatabase();
}

module.exports = {
  cleanDatabase,
  cleanRecordings
}; 