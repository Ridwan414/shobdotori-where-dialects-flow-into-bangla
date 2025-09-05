const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { google } = require('googleapis');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database and Models
const connectDB = require('./config/database');
const Sentence = require('./models/Sentence');
const Dialect = require('./models/Dialect');
const Recording = require('./models/Recording');

// Utilities
const {
  getRandomUnrecordedSentence,
  updateDialectAfterRecording,
  isSentenceRecorded,
  getDialectProgress
} = require('./utils/dialectHelpers');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// Serve static frontend files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Serve index.html for all non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.use(express.json());

// Google Drive Setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const drive = google.drive({ version: 'v3', auth: oauth2Client });

// Multer setup for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 }
});

// Dialect to folder name mapping
const dialectToFolder = {
  'dhaka': 'Dhaka',
  'chittagong': 'Chittagong',
  'rajshahi': 'Rajshahi',
  'khulna': 'Khulna',
  'barisal': 'Barisal',
  'sylhet': 'Sylhet',
  'rangpur': 'Rangpur',
  'mymensingh': 'Mymensingh',
  'noakhali': 'Noakhali',
  'comilla': 'Comilla',
  'feni': 'Feni',
  'brahmanbaria': 'Brahmanbaria',
  'sandwip': 'Sandwip',
  'chandpur': 'Chandpur',
  'lakshmipur': 'Lakshmipur',
  'bhola': 'Bhola',
  'patuakhali': 'Patuakhali',
  'bagerhat': 'Bagerhat',
  'jessore': 'Jessore',
  'kushtia': 'Kushtia',
  'jhenaidah': 'Jhenaidah',
  'gaibandha': 'Gaibandha',
  'kurigram': 'Kurigram',
  'panchagarh': 'Panchagarh',
  'lalmonirhat': 'Lalmonirhat',
  'dinajpur': 'Dinajpur',
  'natore': 'Natore',
  'pabna': 'Pabna',
  'sirajganj': 'Sirajganj',
  'bogura': 'Bogura'
};

// Utility Functions
function sanitizeDialect(dialect) {
  return dialect.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
}

function getFolderName(dialect) {
  const sanitized = sanitizeDialect(dialect);
  return dialectToFolder[sanitized] || sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
}

function generateFilename(dialect, index) {
  return `dialect_${sanitizeDialect(dialect)}_${index}.wav`;
}

async function convertToWav(inputBuffer) {
  return new Promise((resolve, reject) => {
    const tempInput = path.join(__dirname, `temp_input_${Date.now()}.webm`);
    const tempOutput = path.join(__dirname, `temp_output_${Date.now()}.wav`);
    
    // Write input buffer to temp file
    fs.writeFileSync(tempInput, inputBuffer);
    
    ffmpeg(tempInput)
      .toFormat('wav')
      .audioFrequency(16000)
      .audioChannels(1)
      .on('end', () => {
        const wavBuffer = fs.readFileSync(tempOutput);
        // Cleanup temp files
        fs.unlinkSync(tempInput);
        fs.unlinkSync(tempOutput);
        resolve(wavBuffer);
      })
      .on('error', (err) => {
        // Cleanup on error
        if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
        if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
        reject(err);
      })
      .save(tempOutput);
  });
}

async function getOrCreateDialectFolder(dialect) {
  const folderName = getFolderName(dialect);
  
  try {
    // First, check if folder already exists
    const response = await drive.files.list({
      q: `name='${folderName}' and parents in '${process.env.GOOGLE_DRIVE_FOLDER_ID}' and mimeType='application/vnd.google-apps.folder'`,
      fields: 'files(id, name)'
    });
    
    if (response.data.files && response.data.files.length > 0) {
      console.log(`Found existing folder: ${folderName} (ID: ${response.data.files[0].id})`);
      return response.data.files[0].id;
    }
    
    // Create new folder if it doesn't exist
    console.log(`Creating new folder: ${folderName}`);
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]
    };
    
    const folder = await drive.files.create({
      resource: folderMetadata,
      fields: 'id, name'
    });
    
    console.log(`Created folder: ${folderName} (ID: ${folder.data.id})`);
    return folder.data.id;
    
  } catch (error) {
    console.error(`Error getting/creating folder for ${dialect}:`, error);
    throw error;
  }
}

async function uploadToGoogleDrive(buffer, filename, dialect) {
  try {
    console.log(`Starting upload for ${filename}...`);
    
    // Get or create the dialect folder
    const folderId = await getOrCreateDialectFolder(dialect);
    
    const fileMetadata = {
      name: filename,
      parents: [folderId]
    };
    
    const media = {
      mimeType: 'audio/wav',
      body: require('stream').Readable.from(buffer)
    };
    
    console.log(`Uploading ${filename} to Google Drive folder...`);
    
    // Add timeout to prevent hanging
    const uploadPromise = drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name, size, webViewLink'
    });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Upload timeout after 60 seconds')), 60000);
    });
    
    const response = await Promise.race([uploadPromise, timeoutPromise]);
    
    console.log(` Upload completed for ${filename} - ID: ${response.data.id}`);
    return response.data;
    
  } catch (error) {
    console.error(` Upload failed for ${filename}:`, error.message);
    throw error;
  }
}

// API Routes
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Shobdotori Backend - MongoDB + Google Drive Storage',
    timestamp: new Date().toISOString(),
    features: [
      '400 Bengali sentences',
      '30 dialects supported',
      '12,000 potential recordings',
      'MongoDB tracking',
      'Google Drive storage'
    ]
  });
});

app.get('/api/ping', async (req, res) => {
  try {
    // Test Google Drive connection
    const driveResponse = await drive.about.get({ fields: 'user' });
    
    // Test MongoDB connection
    const sentenceCount = await Sentence.countDocuments();
    const dialectCount = await Dialect.countDocuments();
    const recordingCount = await Recording.countDocuments();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        googleDrive: {
          connected: true,
          user: driveResponse.data.user?.emailAddress || 'Connected'
        },
        mongodb: {
          connected: true,
          sentences: sentenceCount,
          dialects: dialectCount,
          recordings: recordingCount
        },
        ffmpeg: {
          available: true,
          path: process.env.FFMPEG_PATH || 'ffmpeg'
        }
      },
      version: '2.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Service connection failed',
      details: error.message
    });
  }
});

app.get('/api/next-index', async (req, res) => {
  try {
    const { dialect } = req.query;
    
    if (!dialect) {
      return res.status(400).json({
        success: false,
        error: 'Dialect parameter is required'
      });
    }
    
    const dialectDoc = await Dialect.findOne({ dialectCode: dialect.toLowerCase() });
    
    if (!dialectDoc) {
      return res.status(404).json({
        success: false,
        error: 'Dialect not found'
      });
    }
    
    res.json({
      success: true,
      dialect: dialectDoc.dialectCode,
      next_index: dialectDoc.nextIndex,
      recorded_sentences: dialectDoc.recordedSentences,
      total_sentences: dialectDoc.totalSentences,
      completion_percentage: dialectDoc.completionPercentage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get next index',
      details: error.message
    });
  }
});

// Get all dialects
app.get('/api/dialects', async (req, res) => {
  try {
    const dialects = await Dialect.find({})
      .select('dialectCode dialectName status recordedSentenceIds')
      .sort({ dialectCode: 1 });

    res.json({
      success: true,
      dialects: dialects.map(d => ({
        code: d.dialectCode,
        name: d.dialectName,
        status: d.status,
        recorded: d.recordedSentences,
        total: d.totalSentences,
        percentage: d.completionPercentage
      }))
    });

  } catch (error) {
    console.error('❌ Dialects fetch error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dialects',
      error: error.message
    });
  }
});

// Get next sentence for recording
app.get('/api/next-sentence', async (req, res) => {
  try {
    const { dialect } = req.query;
    
    if (!dialect) {
      return res.status(400).json({
        success: false,
        error: 'Dialect parameter is required'
      });
    }
    
    const dialectDoc = await Dialect.findOne({ dialectCode: dialect.toLowerCase() });
    
    if (!dialectDoc) {
      return res.status(404).json({
        success: false,
        error: 'Dialect not found'
      });
    }
    
    // Check if completed
    if (dialectDoc.status === 'completed') {
      return res.json({
        success: true,
        message: 'All sentences recorded for this dialect',
        sentence: null,
        progress: {
          recorded: dialectDoc.recordedSentences,
          total: dialectDoc.totalSentences,
          percentage: dialectDoc.completionPercentage,
          status: 'completed'
        }
      });
    }
    
    // Get random unrecorded sentence
    const sentence = await getRandomUnrecordedSentence(dialect.toLowerCase());
    
    if (!sentence) {
      return res.json({
        success: true,
        message: 'All sentences recorded for this dialect',
        sentence: null,
        progress: {
          recorded: dialectDoc.recordedSentences,
          total: dialectDoc.totalSentences,
          percentage: dialectDoc.completionPercentage,
          status: 'completed'
        }
      });
    }
    
    res.json({
      success: true,
      sentence: {
        id: sentence.sentenceId,
        text: sentence.text,
        _id: sentence._id
      },
      progress: {
        recorded: dialectDoc.recordedSentences,
        total: dialectDoc.totalSentences,
        percentage: dialectDoc.completionPercentage,
        remaining: dialectDoc.unrecordedSentenceIds.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get next sentence',
      details: error.message
    });
  }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const { dialect, index, sentence_id, sentence_text } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }
    
    if (!dialect || !sentence_id) {
      return res.status(400).json({
        success: false,
        error: 'Dialect and sentence_id are required'
      });
    }
    
    // Find dialect and sentence
    const dialectDoc = await Dialect.findOne({ dialectCode: dialect.toLowerCase() });
    const sentenceDoc = await Sentence.findOne({ sentenceId: parseInt(sentence_id) });
    
    if (!dialectDoc) {
      return res.status(404).json({
        success: false,
        error: 'Dialect not found'
      });
    }
    
    if (!sentenceDoc) {
      return res.status(404).json({
        success: false,
        error: 'Sentence not found'
      });
    }
    
    // Check if already recorded
    if (await isSentenceRecorded(dialect.toLowerCase(), parseInt(sentence_id))) {
      return res.status(400).json({
        success: false,
        error: 'This sentence is already recorded for this dialect'
      });
    }
    
    // Validate file extension
    const allowedExtensions = ['.wav', '.webm', '.ogg', '.mp3'];
    const filename = req.file.originalname.toLowerCase();
    const hasValidExtension = allowedExtensions.some(ext => filename.endsWith(ext));
    
    if (!hasValidExtension) {
      return res.status(400).json({
        success: false,
        error: `File type not supported. Allowed: ${allowedExtensions.join(', ')}`
      });
    }
    
    // Use provided index or get next index
    const fileIndex = index ? parseInt(index) : dialectDoc.nextIndex;
    const finalFilename = generateFilename(dialect, fileIndex);
    
    // Convert to WAV if needed
    let audioBuffer = req.file.buffer;
    if (!filename.endsWith('.wav')) {
      console.log('Converting audio to WAV format...');
      audioBuffer = await convertToWav(req.file.buffer);
    }
    
    // Upload to Google Drive
    console.log(`📤 Starting Google Drive upload for ${finalFilename}...`);
    const driveFile = await uploadToGoogleDrive(audioBuffer, finalFilename, dialect);
    
    // Create recording in database
    const recording = new Recording({
      dialectId: dialectDoc._id,
      sentenceId: sentenceDoc._id,
      sentenceText: sentence_text || sentenceDoc.text,
      recordingIndex: fileIndex,
      filename: finalFilename,
      googleDriveId: driveFile.id,
      googleDriveLink: driveFile.webViewLink
    });
    
    await recording.save();
    
    // Update dialect progress
    await updateDialectAfterRecording(dialectDoc._id, parseInt(sentence_id), recording._id);
    
    console.log(`✅ Recording saved successfully: ${finalFilename}`);
    console.log(`📊 Progress: ${dialectDoc.dialectCode} - ${dialectDoc.recordedSentences + 1}/400`);
    
    res.json({
      success: true,
      recording: {
        id: recording._id,
        filename: recording.filename,
        dialectCode: dialectDoc.dialectCode,
        sentenceId: parseInt(sentence_id),
        recordingIndex: fileIndex
      },
      googleDrive: {
        id: driveFile.id,
        link: driveFile.webViewLink,
        size: parseInt(driveFile.size)
      },
      message: 'Recording uploaded and saved successfully'
    });
    
  } catch (error) {
    console.error('❌ Upload error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      details: error.message
    });
  }
});

// Get dialect progress
app.get('/api/progress', async (req, res) => {
  try {
    const { dialect } = req.query;
    
    if (dialect) {
      // Get specific dialect progress
      const dialectDoc = await Dialect.findOne({ dialectCode: dialect.toLowerCase() })
        .populate({
          path: 'recordingIds',
          select: 'filename recordedAt sentenceText',
          options: { sort: { recordedAt: -1 }, limit: 10 }
        });
      
      if (!dialectDoc) {
        return res.status(404).json({
          success: false,
          error: 'Dialect not found'
        });
      }
      
      res.json({
        success: true,
        dialect: {
          code: dialectDoc.dialectCode,
          name: dialectDoc.dialectName,
          status: dialectDoc.status,
          totalSentences: dialectDoc.totalSentences,
          recordedSentences: dialectDoc.recordedSentences,
          completionPercentage: dialectDoc.completionPercentage,
          lastRecordedAt: dialectDoc.lastRecordedAt,
          remainingSentences: dialectDoc.unrecordedSentenceIds.length
        },
        recentRecordings: dialectDoc.recordingIds
      });
    } else {
      // Get all dialects progress
      const dialects = await Dialect.find({}).sort({ dialectCode: 1 });
      
      const totalRecordings = dialects.reduce((sum, d) => sum + d.recordedSentences, 0);
      const completedDialects = dialects.filter(d => d.status === 'completed').length;
      
      res.json({
        success: true,
        summary: {
          totalDialects: dialects.length,
          completedDialects,
          inProgressDialects: dialects.length - completedDialects,
          totalRecordings,
          maxPossibleRecordings: 12000,
          overallProgress: ((totalRecordings / 12000) * 100).toFixed(2)
        },
        dialects: dialects.map(d => ({
          code: d.dialectCode,
          name: d.dialectName,
          status: d.status,
          recordedSentences: d.recordedSentences,
          totalSentences: d.totalSentences,
          completionPercentage: d.completionPercentage,
          lastRecordedAt: d.lastRecordedAt
        }))
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get progress',
      details: error.message
    });
  }
});

// Get recordings for a dialect
app.get('/api/recordings', async (req, res) => {
  try {
    const { dialect, page = 1, limit = 20 } = req.query;
    
    if (!dialect) {
      return res.status(400).json({
        success: false,
        error: 'Dialect parameter is required'
      });
    }
    
    const dialectDoc = await Dialect.findOne({ dialectCode: dialect.toLowerCase() });
    
    if (!dialectDoc) {
      return res.status(404).json({
        success: false,
        error: 'Dialect not found'
      });
    }
    
    // Get recordings with pagination
    const recordings = await Recording.find({ dialectId: dialectDoc._id })
      .populate('sentenceId', 'sentenceId text')
      .sort({ recordedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Recording.countDocuments({ dialectId: dialectDoc._id });
    
    res.json({
      success: true,
      dialect: {
        code: dialectDoc.dialectCode,
        name: dialectDoc.dialectName
      },
      recordings: recordings.map(r => ({
        id: r._id,
        filename: r.filename,
        sentence: {
          id: r.sentenceId.sentenceId,
          text: r.sentenceText
        },
        recordingIndex: r.recordingIndex,
        googleDriveId: r.googleDriveId,
        googleDriveLink: r.googleDriveLink,
        recordedAt: r.recordedAt
      })),
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get recordings',
      details: error.message
    });
  }
});

// Get database statistics
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await Recording.aggregate([
      {
        $lookup: {
          from: 'dialects',
          localField: 'dialectId',
          foreignField: '_id',
          as: 'dialect'
        }
      },
      {
        $unwind: '$dialect'
      },
      {
        $group: {
          _id: '$dialect.dialectCode',
          dialectName: { $first: '$dialect.dialectName' },
          recordingCount: { $sum: 1 },
          latestRecording: { $max: '$recordedAt' }
        }
      },
      {
        $sort: { recordingCount: -1 }
      }
    ]);
    
    const totalStats = await Recording.aggregate([
      {
        $group: {
          _id: null,
          totalRecordings: { $sum: 1 },
          earliestRecording: { $min: '$recordedAt' },
          latestRecording: { $max: '$recordedAt' }
        }
      }
    ]);
    
    res.json({
      success: true,
      overall: totalStats[0] || { totalRecordings: 0 },
      byDialect: stats,
      maxPossible: 12000,
      completionRate: totalStats[0] ? ((totalStats[0].totalRecordings / 12000) * 100).toFixed(2) : 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
      details: error.message
    });
  }
});

app.get('/api/files', async (req, res) => {
  try {
    const { dialect } = req.query;
    
    if (dialect) {
      // Get files from specific dialect folder
      const folderId = await getOrCreateDialectFolder(dialect);
      const response = await drive.files.list({
        q: `parents in '${folderId}'`,
        fields: 'files(id, name, size, createdTime, webViewLink)',
        orderBy: 'name'
      });
      
      const files = response.data.files || [];
      
      res.json({
        success: true,
        dialect: sanitizeDialect(dialect),
        folder: getFolderName(dialect),
        files: files.map(file => ({
          id: file.id,
          name: file.name,
          size: parseInt(file.size),
          createdAt: file.createdTime,
          downloadLink: file.webViewLink
        })),
        total: files.length
      });
    } else {
      // Get all folders and their file counts
      const response = await drive.files.list({
        q: `parents in '${process.env.GOOGLE_DRIVE_FOLDER_ID}' and mimeType='application/vnd.google-apps.folder'`,
        fields: 'files(id, name)',
        orderBy: 'name'
      });
      
      const folders = response.data.files || [];
      const folderStats = [];
      
      for (const folder of folders) {
        const filesResponse = await drive.files.list({
          q: `parents in '${folder.id}'`,
          fields: 'files(id)'
        });
        
        folderStats.push({
          id: folder.id,
          name: folder.name,
          fileCount: filesResponse.data.files?.length || 0
        });
      }
      
      res.json({
        success: true,
        folders: folderStats,
        total: folderStats.length
      });
    }
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to list files',
      details: error.message
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: err.message
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Shobdotori Backend running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Server started at: ${new Date().toISOString()}`);
  console.log(`🔗 API endpoints available at: http://localhost:${PORT}/api/*`);
  console.log(`🎯 Frontend available at: http://localhost:${PORT}/`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log(' SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log(' Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log(' SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log(' Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(' Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(' Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
