# Shobdotori Backend - MongoDB + Google Drive

Complete backend solution for tracking 12,000 recordings (30 dialects × 400 sentences) using MongoDB and Google Drive.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Setup Environment Variables
Copy `env.example` to `.env` and configure:

```bash
cp env.example .env
```

Update `.env` with your configurations:
```env
# MongoDB (local or cloud)
MONGODB_URI=mongodb://localhost:27017/shobdotori

# Google Drive API credentials
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REFRESH_TOKEN=your-google-refresh-token
GOOGLE_DRIVE_FOLDER_ID=your-google-drive-folder-id

# CORS for your frontend
ALLOWED_ORIGINS=https://your-netlify-app.netlify.app
```

### 3. Setup Database
```bash
# Seed database with 400 sentences and 30 dialects
npm run seed
```

### 4. Start Server
```bash
# Development
npm run dev

# Production
npm start
```

## 📊 Database Schema

### Collections Overview

1. **Sentences** (400 documents)
   - All Bengali sentences with IDs 1-400

2. **Dialects** (30 documents)  
   - Each dialect tracks recorded/unrecorded sentences
   - Embedded arrays for fast lookups

3. **Recordings** (up to 12,000 documents)
   - Each recording links to dialect and sentence
   - Stores Google Drive metadata

### Schema Details

**Sentences Collection:**
```javascript
{
  _id: ObjectId("..."),
  sentenceId: 1, // 1-400
  text: "আজ সকালে আমি বাজারে গিয়েছিলাম।",
  createdAt: Date
}
```

**Dialects Collection:**
```javascript
{
  _id: ObjectId("..."),
  dialectCode: "dhaka",
  dialectName: "ঢাকা", 
  status: "in_progress", // or "completed"
  recordedSentenceIds: [1, 5, 12, 23, ...], // Fast lookup
  unrecordedSentenceIds: [2, 3, 4, 6, ...], // Fast random selection
  recordingIds: [ObjectId("..."), ...], // References to recordings
  lastRecordedAt: Date
}
```

**Recordings Collection:**
```javascript
{
  _id: ObjectId("..."),
  dialectId: ObjectId("..."), // Reference to dialect
  sentenceId: ObjectId("..."), // Reference to sentence  
  sentenceText: "আজ সকালে আমি বাজারে গিয়েছিলাম।", // Denormalized
  recordingIndex: 0, // Sequential per dialect (0-399)
  filename: "dhaka_1.wav",
  googleDriveId: "1a2b3c4d5e6f7g8h9i0j",
  googleDriveLink: "https://drive.google.com/file/d/...",
  recordedAt: Date
}
```

## 🔗 API Endpoints

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ping` | Health check with service status |
| GET | `/api/next-sentence?dialect=dhaka` | Get random unrecorded sentence |
| GET | `/api/next-index?dialect=dhaka` | Get next recording index |
| POST | `/api/upload` | Upload audio recording |

### Progress & Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/progress` | All dialects progress summary |
| GET | `/api/progress?dialect=dhaka` | Specific dialect progress |
| GET | `/api/recordings?dialect=dhaka` | List recordings for dialect |
| GET | `/api/stats` | Database statistics |

### Example API Usage

**Get Next Sentence:**
```bash
curl "http://localhost:3000/api/next-sentence?dialect=dhaka"
```

Response:
```json
{
  "success": true,
  "sentence": {
    "id": 42,
    "text": "আজকের আবহাওয়া সত্যিই মনোরম।",
    "_id": "..."
  },
  "progress": {
    "recorded": 15,
    "total": 400,
    "percentage": "3.75",
    "remaining": 385
  }
}
```

**Upload Recording:**
```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@recording.wav" \
  -F "dialect=dhaka" \
  -F "sentence_id=42" \
  -F "sentence_text=আজকের আবহাওয়া সত্যিই মনোরম।"
```

**Get Progress:**
```bash
curl "http://localhost:3000/api/progress"
```

Response:
```json
{
  "success": true,
  "summary": {
    "totalDialects": 30,
    "completedDialects": 2,
    "totalRecordings": 1250,
    "maxPossibleRecordings": 12000,
    "overallProgress": "10.42"
  },
  "dialects": [...]
}
```

## 🎯 Key Features

### Efficient Tracking
- **Fast Lookups**: Embedded arrays in dialect documents
- **No Duplicates**: Automatic prevention of duplicate recordings
- **Progress Tracking**: Real-time completion percentages
- **Random Selection**: Efficient random unrecorded sentence selection

### Scalable Design
- **Indexed Queries**: Optimized database indexes
- **Pagination**: Large result sets handled efficiently  
- **Aggregation**: Complex analytics with MongoDB aggregation
- **References**: Proper relationships between collections

### Production Ready
- **Error Handling**: Comprehensive error responses
- **Validation**: Input validation and sanitization
- **Logging**: Detailed console logging with emojis
- **Graceful Shutdown**: Proper cleanup on termination

## 📈 Progress Tracking

### Dialect Level
Each dialect tracks:
- Total sentences: 400
- Recorded sentences: Current count
- Completion percentage: Auto-calculated
- Status: in_progress → completed
- Next index: Sequential recording index

### System Level  
Overall tracking:
- 30 dialects × 400 sentences = 12,000 total recordings
- Real-time progress across all dialects
- Completion statistics and analytics

## 🛠️ Development

### Database Operations
```bash
# Seed database
npm run seed

# Connect to MongoDB shell
mongo mongodb://localhost:27017/shobdotori

# View collections
db.sentences.count()    // Should be 400
db.dialects.count()     // Should be 30  
db.recordings.count()   // Current recordings
```

### Useful Queries
```javascript
// Get dialect progress
db.dialects.find({}, {dialectCode: 1, recordedSentences: 1, status: 1})

// Get recordings count per dialect
db.recordings.aggregate([
  {$group: {_id: "$dialectId", count: {$sum: 1}}},
  {$sort: {count: -1}}
])

// Find unrecorded sentences for a dialect
db.dialects.findOne({dialectCode: "dhaka"}).unrecordedSentenceIds
```

### File Structure
```
backend/
├── config/
│   └── database.js          # MongoDB connection
├── models/
│   ├── Sentence.js          # Sentence schema
│   ├── Dialect.js           # Dialect schema  
│   └── Recording.js         # Recording schema
├── utils/
│   └── dialectHelpers.js    # Helper functions
├── scripts/
│   └── seedDatabase.js      # Database seeding
├── server.js                # Main server file
├── package.json             # Dependencies
└── env.example              # Environment template
```

## 🚀 Deployment

### Environment Variables for Production
```env
# Production MongoDB (Atlas)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/shobdotori

# Google Drive API
GOOGLE_CLIENT_ID=production-client-id
GOOGLE_CLIENT_SECRET=production-client-secret
GOOGLE_REFRESH_TOKEN=production-refresh-token
GOOGLE_DRIVE_FOLDER_ID=production-folder-id

# Production CORS
ALLOWED_ORIGINS=https://your-production-site.netlify.app
```

### Render Deployment
1. Connect GitHub repository to Render
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Add all environment variables in Render dashboard
5. Deploy

The backend will automatically:
- Connect to MongoDB
- Initialize database if needed
- Start accepting recordings
- Track progress across all dialects

## 📊 Expected Usage

With this setup, you can efficiently:
- Track 12,000 potential recordings
- Get real-time progress updates
- Prevent duplicate recordings
- Generate comprehensive analytics
- Scale to handle high recording volumes

The system is designed to handle the complete data collection process for all 30 Bangladeshi dialects with full tracking and analytics capabilities. 