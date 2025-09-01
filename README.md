# Shobdotori - Bangla Dialect Speech Collection

Minimalistic web platform for collecting Bangladeshi dialect audio recordings with Google Drive storage.

## Architecture

- **Frontend**: Static HTML/CSS/JS (deployed on Netlify)
- **Backend**: Node.js with Google Drive API (deployed on Render)
- **Storage**: Google Drive (no local files, no database)

## Features

- 🎤 Browser-based audio recording
- 🌍 24 Bangladeshi dialects support
- 📁 Direct Google Drive storage
- 🔄 Automatic audio conversion (WebM → WAV)
- 🏷️ Proper file labeling and organization
- ☁️ Cloud-native (Netlify + Render + Google Drive)

## Quick Start

### 1. Setup Google Drive API
Follow the detailed guide in `GOOGLE_DRIVE_SETUP.md`

### 2. Deploy Backend to Render
- Push to GitHub
- Connect to Render
- Set environment variables
- Deploy

### 3. Deploy Frontend to Netlify
- Update backend URL in `index.html`
- Deploy to Netlify

### 4. Start Collecting Audio
- Users select dialect
- Record sentences
- Files automatically stored in Google Drive

## File Organization

Audio files are automatically organized in Google Drive:
```
dialect_train_index.wav
```

Examples:
- `dhaka_train_0.wav`
- `chittagong_train_1.wav`  
- `mymensingh_train_2.wav`

## Project Structure

```
shobdotori/
├── backend/                 # Node.js Google Drive backend
│   ├── server.js           # Main server file
│   ├── package.json        # Dependencies
│   └── .env.example        # Environment template
├── css/                    # Frontend styles
├── js/                     # Frontend JavaScript
├── images/                 # UI assets
├── index.html              # Main frontend
└── GOOGLE_DRIVE_SETUP.md   # Setup guide
```

## Supported Dialects

Dhaka, Chittagong, Mymensingh, Comilla, Noakhali, Feni, Brahmanbaria, Gaibandha, Kurigram, Jessore, Kushtia, Jhenaidah, Bagerhat, Khulna, Patuakhali, Bhola, Panchagarh, Lalmonirhat, Dinajpur, Rajshahi, Natore, Pabna, Sirajganj, Chandpur, Lakshmipur, Sandwip

## API Endpoints

- `GET /api/ping` - Health check
- `GET /api/next-index?dialect=dhaka` - Get next index
- `POST /api/upload` - Upload audio file
- `GET /api/files?dialect=dhaka` - List files

## Technology Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Backend**: Node.js + Express
- **Storage**: Google Drive API
- **Audio**: Web Audio API + FFmpeg
- **Deployment**: Netlify (frontend) + Render (backend)

Minimalistic, efficient, and cloud-native solution for dialect speech collection.
