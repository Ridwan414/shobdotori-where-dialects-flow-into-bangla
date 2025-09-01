# Shobdotori Backend - Google Drive Storage

Minimalistic Node.js backend that stores audio recordings directly in Google Drive.

## Features
- Direct Google Drive storage (no local files, no database)
- Audio conversion (WebM → WAV)
- Automatic file naming and indexing
- CORS support for Netlify frontend
- Ready for Render deployment

## Setup

### 1. Google Drive API Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google Drive API
4. Create OAuth 2.0 credentials
5. Create a shared Google Drive folder
6. Get folder ID from URL: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`

### 2. Environment Variables
Copy `.env.example` to `.env` and configure:

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token
GOOGLE_DRIVE_FOLDER_ID=your-google-drive-folder-id
ALLOWED_ORIGINS=https://your-netlify-app.netlify.app
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Locally
```bash
npm run dev
```

### 5. Deploy to Render
1. Connect GitHub repository
2. Set environment variables in Render dashboard
3. Deploy

## API Endpoints

- `GET /` - Server status
- `GET /api/ping` - Health check with Google Drive connection
- `GET /api/next-index?dialect=dhaka` - Get next available index
- `POST /api/upload` - Upload audio file (form-data: file, dialect, index)
- `GET /api/files?dialect=dhaka` - List files in Google Drive

## File Naming Convention

Files are automatically named: `dialect_train_index.wav`

Examples:
- `dhaka_train_0.wav`
- `chittagong_train_1.wav`
- `mymensingh_train_2.wav`

All files are stored in your specified Google Drive folder with proper labeling.
