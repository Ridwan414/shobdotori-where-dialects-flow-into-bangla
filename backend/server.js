const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { google } = require('googleapis');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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

// Utility Functions
function sanitizeDialect(dialect) {
  return dialect.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
}

function generateFilename(dialect, index) {
  return `${sanitizeDialect(dialect)}_${index}.wav`;
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

async function getNextIndex(dialect) {
  try {
    const response = await drive.files.list({
      q: `name contains '${sanitizeDialect(dialect)}_' and parents in '${process.env.GOOGLE_DRIVE_FOLDER_ID}'`,
      fields: 'files(name)'
    });

    const files = response.data.files || [];
    const indices = files.map(file => {
      const match = file.name.match(/_(\d+)\.wav$/);
      return match ? parseInt(match[1]) : -1;
    }).filter(index => index >= 0);

    return indices.length > 0 ? Math.max(...indices) + 1 : 0;
  } catch (error) {
    console.error('Error getting next index:', error);
    return 0;
  }
}

async function uploadToGoogleDrive(buffer, filename, dialect) {
  try {
    console.log(`Starting upload for ${filename}...`);
    
    const fileMetadata = {
      name: filename,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]
    };
   
    const media = {
      mimeType: 'audio/wav',
      body: require('stream').Readable.from(buffer)
    };
    
    console.log(`Uploading ${filename} to Google Drive...`);
    
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
    message: 'Shobdotori Backend - Google Drive Storage',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/ping', async (req, res) => {
  try {
    // Test Google Drive connection
    const response = await drive.about.get({ fields: 'user' });
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        googleDrive: {
          connected: true,
          user: response.data.user?.emailAddress || 'Connected'
        },
        ffmpeg: {
          available: true,
          path: process.env.FFMPEG_PATH || 'ffmpeg'
        }
      },
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Google Drive connection failed',
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
    
    const nextIndex = await getNextIndex(dialect);
    
    res.json({
      success: true,
      dialect: sanitizeDialect(dialect),
      next_index: nextIndex
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get next index',
      details: error.message
    });
  }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const { dialect, index, sentence_no } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }
    
    if (!dialect) {
      return res.status(400).json({
        success: false,
        error: 'Dialect is required'
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
    
    // Get next index if not provided
    const fileIndex = index ? parseInt(index) : await getNextIndex(dialect);
    const finalFilename = generateFilename(dialect, fileIndex);
    
    // Convert to WAV if needed
    let audioBuffer = req.file.buffer;
    if (!filename.endsWith('.wav')) {
      console.log('Converting audio to WAV format...');
      audioBuffer = await convertToWav(req.file.buffer);
    }
    
    // Upload to Google Drive
    console.log(` Starting Google Drive upload for ${finalFilename}...`);
    const driveFile = await uploadToGoogleDrive(audioBuffer, finalFilename, dialect);
    
    console.log(` Upload process completed successfully for ${finalFilename}`);
    console.log(` File stored in Google Drive with ID: ${driveFile.id}`);
    
    res.json({
      success: true,
      status: 'ok',
      dialect: sanitizeDialect(dialect),
      index: fileIndex,
      filename: finalFilename,
      googleDriveId: driveFile.id,
      googleDriveLink: driveFile.webViewLink,
      fileSize: parseInt(driveFile.size),
      message: 'File uploaded successfully to Google Drive'
    });
    
  } catch (error) {
    console.error(' Upload error:', error.message);
    console.error(' Error details:', error);
    
    // Send error response
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      details: error.message
    });
  }
});

app.get('/api/files', async (req, res) => {
  try {
    const { dialect } = req.query;
    
    let query = `parents in '${process.env.GOOGLE_DRIVE_FOLDER_ID}'`;
    if (dialect) {
      query += ` and name contains '${sanitizeDialect(dialect)}_train_'`;
    }
    
    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name, size, createdTime, webViewLink)',
      orderBy: 'name'
    });
    
    const files = response.data.files || [];
    
    res.json({
      success: true,
      files: files.map(file => ({
        id: file.id,
        name: file.name,
        size: parseInt(file.size),
        createdAt: file.createdTime,
        downloadLink: file.webViewLink
      })),
      total: files.length
    });
    
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
  console.log(` Shobdotori Backend running on port ${PORT}`);
  console.log(` Google Drive Folder ID: ${process.env.GOOGLE_DRIVE_FOLDER_ID}`);
  console.log(` Environment: ${process.env.NODE_ENV}`);
  console.log(` Server started at: ${new Date().toISOString()}`);
  console.log(` API endpoints available at: http://localhost:${PORT}/api/*`);
  console.log(` Frontend available at: http://localhost:${PORT}/`);
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
