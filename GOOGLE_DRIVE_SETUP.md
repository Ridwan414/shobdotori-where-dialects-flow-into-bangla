# Google Drive API Setup Guide

Complete guide to set up Google Drive API for Shobdotori backend.

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Create Project" or select existing project
3. Name your project (e.g., "Shobdotori Audio Storage")
4. Click "Create"

## Step 2: Enable Google Drive API

1. In Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google Drive API"
3. Click on "Google Drive API"
4. Click "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client ID"
3. If prompted, configure OAuth consent screen:
   - Choose "External" user type
   - Fill required fields (App name, User support email, Developer email)
   - Add your domain to authorized domains if you have one
   - Skip optional fields for now
4. For OAuth 2.0 Client ID:
   - Application type: "Web application"
   - Name: "Shobdotori Backend"
   - Authorized redirect URIs: `https://developers.google.com/oauthplayground`
5. Click "Create"
6. **Save the Client ID and Client Secret** - you'll need these!

## Step 4: Get Refresh Token

1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon (⚙️) in top right
3. Check "Use your own OAuth credentials"
4. Enter your Client ID and Client Secret from Step 3
5. In the left panel:
   - Find "Drive API v3"
   - Select `https://www.googleapis.com/auth/drive`
6. Click "Authorize APIs"
7. Sign in with your Google account
8. Click "Allow" to grant permissions
9. Click "Exchange authorization code for tokens"
10. **Copy the Refresh Token** - you'll need this!

## Step 5: Create Google Drive Folder

1. Go to [Google Drive](https://drive.google.com/)
2. Create a new folder (e.g., "Shobdotori Audio Files")
3. Open the folder
4. Copy the folder ID from the URL:
   ```
   https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j
                                          ^^^^^^^^^^^^^^^^^^^
                                          This is your folder ID
   ```
5. **Save the Folder ID** - you'll need this!

## Step 6: Configure Backend Environment

Create `.env` file in `backend/` directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Google Drive Configuration
GOOGLE_CLIENT_ID=your-client-id-from-step-3
GOOGLE_CLIENT_SECRET=your-client-secret-from-step-3
GOOGLE_REFRESH_TOKEN=your-refresh-token-from-step-4
GOOGLE_DRIVE_FOLDER_ID=your-folder-id-from-step-5

# CORS Configuration (update with your Netlify URL)
ALLOWED_ORIGINS=https://your-netlify-app.netlify.app,http://localhost:3000

# Audio Processing
FFMPEG_PATH=ffmpeg
MAX_FILE_SIZE=10485760
```

## Step 7: Test Local Setup

```bash
cd backend
npm install
npm run dev
```

Visit `http://localhost:3000/api/ping` - you should see:
```json
{
  "status": "ok",
  "services": {
    "googleDrive": {
      "connected": true,
      "user": "your-email@gmail.com"
    }
  }
}
```

## Step 8: Deploy to Render

### Backend Deployment:
1. Push your code to GitHub
2. Go to [Render](https://render.com/)
3. Create new "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**: Add all variables from your `.env` file
6. Deploy

### Frontend Deployment:
1. Go to [Netlify](https://netlify.com/)
2. Drag and drop your project folder (excluding `backend/` and `node_modules/`)
3. Update `index.html` with your Render backend URL:
   ```javascript
   window.APP_CONFIG = { 
     BACKEND_URL: "https://your-render-app.onrender.com"
   };
   ```
4. Redeploy

## Troubleshooting

### Common Issues:

**1. "Invalid client" error**
- Check Client ID and Client Secret are correct
- Ensure OAuth consent screen is configured

**2. "Access denied" error**
- Check refresh token is valid
- Ensure Google Drive API is enabled
- Verify OAuth scopes include Drive API

**3. "Folder not found" error**
- Check folder ID is correct
- Ensure folder is accessible by the authenticated account
- Make sure folder exists in Google Drive

**4. CORS errors**
- Update `ALLOWED_ORIGINS` with your Netlify URL
- Ensure frontend is calling correct backend URL

### Testing Commands:

```bash
# Test Google Drive connection
curl https://your-render-app.onrender.com/api/ping

# Test next index
curl "https://your-render-app.onrender.com/api/next-index?dialect=dhaka"

# List files in Google Drive
curl "https://your-render-app.onrender.com/api/files"
```

## File Organization in Google Drive

Your files will be automatically organized as:
```
Shobdotori Audio Files/
├── Dhaka/
│   ├── dhaka_1.wav
│   ├── dhaka_2.wav
│   └── ...
├── Chittagong/
│   ├── chittagong_1.wav
│   ├── chittagong_2.wav
│   └── ...
├── Mymensingh/
│   ├── mymensingh_1.wav
│   └── ...
└── ... (all other dialect folders)
```

Each file is properly labeled with:
- Dialect name
- Training designation
- Sequential index number
- WAV format (converted automatically)

## Security Notes

- Keep your `.env` file secure and never commit it to Git
- Use environment variables in production (Render/Netlify)
- Consider setting up OAuth consent screen verification for production use
- Monitor your Google Drive storage usage
- Set up folder permissions appropriately

Your Google Drive will now serve as the primary storage for all audio recordings, with no local files or database needed!
