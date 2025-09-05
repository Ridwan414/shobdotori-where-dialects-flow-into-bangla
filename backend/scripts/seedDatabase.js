const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const connectDB = require('../config/database');
const Sentence = require('../models/Sentence');
const Dialect = require('../models/Dialect');

// Load data from JSON files
const sentencesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/sentences.json'), 'utf8'));
const dialectsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/dialects.json'), 'utf8'));

async function seedSentences() {
  try {
    console.log('🌱 Seeding sentences...');
    
    // Clear existing sentences
    await Sentence.deleteMany({});
    console.log('🗑️  Cleared existing sentences');
    
    // Insert all sentences from JSON file
    await Sentence.insertMany(sentencesData);
    console.log(`✅ Successfully seeded ${sentencesData.length} sentences`);
    
  } catch (error) {
    console.error('❌ Error seeding sentences:', error.message);
    throw error;
  }
}

async function seedDialects() {
  try {
    console.log('🌱 Seeding dialects...');
    
    // Clear existing dialects
    await Dialect.deleteMany({});
    console.log('🗑️  Cleared existing dialects');
    
    // Get all sentence IDs (1-400)
    const allSentences = await Sentence.find({}).select('sentenceId');
    const allSentenceIds = allSentences.map(s => s.sentenceId).sort((a, b) => a - b);
    
    // if (allSentenceIds.length !== 400) {
    //   throw new Error(`Expected 400 sentences, found ${allSentenceIds.length}`);
    // }

    // Create dialect documents
    const dialectDocs = dialectsData.map(dialect => ({
      dialectCode: dialect.code,
      dialectName: dialect.name,
      label: dialect.label,
      status: 'in_progress',
      recordedSentenceIds: [],
      unrecordedSentenceIds: [...allSentenceIds], // Start with all sentences unrecorded
      recordingIds: []
    }));

    await Dialect.insertMany(dialectDocs);
    console.log(`✅ Successfully seeded ${dialectDocs.length} dialects`);
    
  } catch (error) {
    console.error('❌ Error seeding dialects:', error.message);
    throw error;
  }
}

async function seedDatabase() {
  try {
    // Connect to database
    await connectDB();
    
    // Seed sentences first
    await seedSentences();
    
    // Seed dialects
    await seedDialects();
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - ${sentencesData.length} sentences created`);
    console.log(`   - ${dialectsData.length} dialects initialized`);
    console.log(`   - Ready for ${dialectsData.length * sentencesData.length} recordings (${dialectsData.length} × ${sentencesData.length})`);
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔒 Database connection closed');
    process.exit(0);
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = {
  seedDatabase,
  seedSentences,
  seedDialects
}; 