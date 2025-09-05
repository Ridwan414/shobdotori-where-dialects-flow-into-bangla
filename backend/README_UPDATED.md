# Shobdotori Backend - Updated MongoDB + JSON System

Complete backend solution with JSON-based data management for tracking 12,000 recordings (30 dialects × 400 sentences).

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

### 3. Database Management
```bash
# Seed database with 400 sentences and 30 dialects
npm run seed

# Clean entire database
npm run clean

# Clean only recordings (keep sentences and dialects)
npm run clean:recordings

# Reset database (clean + seed)
npm run reset
```

### 4. Start Server
```bash
# Development
npm run dev

# Production
npm start
```

## 📊 New JSON-Based Architecture

### Data Files
- `backend/data/sentences.json` - 400 Bengali sentences
- `backend/data/dialects.json` - 30 dialect definitions

### Benefits
- ✅ **Centralized Data**: All sentences and dialects in JSON files
- ✅ **Easy Management**: Simple to add/modify sentences or dialects
- ✅ **Version Control**: JSON files can be tracked in Git
- ✅ **Flexible Seeding**: Quick database setup from JSON
- ✅ **Clean Separation**: Frontend no longer contains hardcoded data

## 🛠️ Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| **Seed** | `npm run seed` | Load sentences and dialects from JSON files |
| **Clean All** | `npm run clean` | Remove all data (sentences, dialects, recordings) |
| **Clean Recordings** | `npm run clean:recordings` | Remove only recordings, reset dialects |
| **Reset** | `npm run reset` | Clean all + seed fresh data |
| **Dev** | `npm run dev` | Start development server with nodemon |
| **Start** | `npm start` | Start production server |

## 📁 Updated File Structure

```
backend/
├── config/
│   └── database.js              # MongoDB connection (no deprecated warnings)
├── data/                        # 📁 NEW: JSON data files
│   ├── sentences.json           # 400 Bengali sentences
│   └── dialects.json            # 30 dialect definitions
├── models/
│   ├── Sentence.js              # Sentence schema (cleaned indexes)
│   ├── Dialect.js               # Dialect schema (cleaned indexes)
│   └── Recording.js             # Recording schema
├── scripts/
│   ├── seedDatabase.js          # 🔄 UPDATED: Uses JSON files
│   └── cleanDatabase.js         # 🆕 NEW: Database cleaning script
├── utils/
│   └── dialectHelpers.js        # 🔄 UPDATED: Uses JSON data
├── server.js                    # Main server (MongoDB integrated)
├── package.json                 # 🔄 UPDATED: New scripts added
└── README_UPDATED.md            # This file
```

## 🔗 API Endpoints

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ping` | Health check with service status |
| GET | `/api/next-sentence?dialect=dhaka` | Get random unrecorded sentence from DB |
| GET | `/api/next-index?dialect=dhaka` | Get next recording index |
| POST | `/api/upload` | Upload audio recording |

### Progress & Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/progress` | All dialects progress summary |
| GET | `/api/progress?dialect=dhaka` | Specific dialect progress |
| GET | `/api/recordings?dialect=dhaka` | List recordings for dialect |
| GET | `/api/stats` | Database statistics |

## 🎯 Key Improvements

### 1. Resolved Warnings
- ✅ Fixed duplicate schema index warnings
- ✅ Removed deprecated MongoDB connection options
- ✅ Clean console output during seeding

### 2. JSON-Based Data Management
- ✅ Sentences moved from frontend to JSON file
- ✅ Dialects defined in separate JSON file
- ✅ Easy to modify and version control

### 3. Enhanced Scripts
- ✅ Database cleaning functionality
- ✅ Selective cleaning (recordings only)
- ✅ One-command reset capability

### 4. Frontend Integration
- ✅ Frontend now uses `/api/next-sentence` endpoint
- ✅ No more hardcoded sentences in JavaScript
- ✅ Real-time progress tracking

## 💾 Database Operations

### Seeding Process
```bash
npm run seed
```
**What happens:**
1. Connects to MongoDB
2. Clears existing sentences and dialects
3. Loads 400 sentences from `data/sentences.json`
4. Loads 30 dialects from `data/dialects.json`
5. Initializes each dialect with all unrecorded sentences

### Cleaning Options

**Clean Everything:**
```bash
npm run clean
```
- Removes all sentences, dialects, and recordings
- Complete fresh start

**Clean Recordings Only:**
```bash
npm run clean:recordings
```
- Keeps sentences and dialects
- Removes all recordings
- Resets dialects to initial state (all sentences unrecorded)

**Reset Database:**
```bash
npm run reset
```
- Combines clean + seed
- Fresh database with original data

## 📊 Data Structure

### Sentences JSON Format
```json
[
  { "sentenceId": 1, "text": "আজ সকালে আমি বাজারে গিয়েছিলাম।" },
  { "sentenceId": 2, "text": "তুমি কি নতুন বই পড়তে চাও?" },
  ...
]
```

### Dialects JSON Format
```json
[
  { "code": "dhaka", "name": "ঢাকা" },
  { "code": "chittagong", "name": "চট্টগ্রাম" },
  ...
]
```

## 🔄 Workflow

### 1. Development Setup
```bash
npm install
cp env.example .env
# Configure .env with your credentials
npm run seed
npm run dev
```

### 2. Adding New Sentences
1. Edit `backend/data/sentences.json`
2. Add new sentence with next `sentenceId`
3. Run `npm run reset` to update database

### 3. Adding New Dialects
1. Edit `backend/data/dialects.json`
2. Add new dialect with `code` and `name`
3. Run `npm run reset` to update database

### 4. Fresh Start
```bash
npm run reset
```

### 5. Clean Recordings Only
```bash
npm run clean:recordings
```

## 🚀 Production Deployment

### Environment Variables
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

### Deployment Steps
1. Set environment variables in hosting platform
2. Deploy code with JSON files
3. Database will be seeded automatically if empty
4. Monitor via `/api/ping` endpoint

## 🎯 Expected Usage

With this updated system:
- ✅ **12,000 recordings** efficiently tracked
- ✅ **JSON-based management** for easy updates
- ✅ **Clean database operations** for testing
- ✅ **Separation of concerns** between frontend and data
- ✅ **Version-controlled data** with Git
- ✅ **No more hardcoded arrays** in JavaScript

The system is now more maintainable, flexible, and production-ready! 