# Send Anywhere Clone

A modern file-sharing web application inspired by Send Anywhere, powered by GitHub as the backend storage.

## Features

- 📤 **Send Files** - Upload multiple files and get a 6-digit share code
- 📥 **Receive Files** - Download files using the share code
- 🔒 **Secure** - Files stored in your private GitHub repository
- ⚡ **Fast** - Direct file transfers via GitHub API
- 🌐 **Universal** - Works on any device with a browser
- 🎨 **Modern UI** - Clean, responsive design

## Setup

### 1. Create GitHub Repository

Create a new repository on GitHub:
- Repository name: `file-share-storage`
- Visibility: Public or Private
- Don't initialize with README

### 2. Get GitHub Token

```bash
gh auth token
```

Or create one manually:
- Go to: https://github.com/settings/tokens
- Generate new token (classic)
- Select scope: `repo` (full control)
- Copy the token

### 3. Configure Application

Edit `script.js` and replace:
```javascript
const GITHUB_TOKEN = 'YOUR_GITHUB_TOKEN';
```

With your actual token:
```javascript
const GITHUB_TOKEN = 'ghp_xxxxxxxxxxxxxxxxxxxx';
```

### 4. Run the Application

Simply open `index.html` in your web browser:
```bash
# On Linux/WSL
xdg-open index.html

# Or just double-click the file
```

## Usage

### Sending Files

1. Click "Send" tab
2. Drag & drop files or click to browse
3. Click "Send Files"
4. Share the 6-digit code with recipient

### Receiving Files

1. Click "Receive" tab
2. Enter the 6-digit code
3. Click "Receive Files"
4. Download individual files or all at once

## Technical Details

- **Frontend**: Pure HTML, CSS, JavaScript
- **Backend**: GitHub API
- **Storage**: GitHub Repository
- **File Encoding**: Base64

## Security Notes

⚠️ **Important**: 
- Never commit your GitHub token to a public repository
- For production use, implement a backend server to handle authentication
- This is a demo/personal use application

## File Size Limits

- Maximum file size: 25MB (GitHub API limit)
- Multiple files supported
- Files expire when deleted from repository

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari
- Any modern browser with ES6+ support

## Author

Built by [Jay Sevak](https://github.com/jaysevak)  
Multi-Cloud Engineer | AWS - GCP - Azure

## License

MIT License - Feel free to use and modify
