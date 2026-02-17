// Backend API URL - UPDATE THIS AFTER DEPLOYING TO VERCEL
const API_URL = 'https://file-share-backend.vercel.app'; // Change this to your Vercel URL

// Check URL for code on load (from QR scan)
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
        // Switch to receive tab
        document.querySelector('[data-tab="receive"]').click();
        codeInput.value = code;
        // Auto-download after 1 second
        setTimeout(() => receiveFiles(), 1000);
    }
});

let selectedFile = null;

// Tab Switching
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(`${tabName}-content`).classList.add('active');
    });
});

// Upload Area
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const sendBtn = document.getElementById('sendBtn');

uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        handleFileSelect();
    }
});

fileInput.addEventListener('change', handleFileSelect);

function handleFileSelect() {
    selectedFile = fileInput.files[0];
    if (selectedFile) {
        renderFileList();
        sendBtn.disabled = false;
    }
}

function renderFileList() {
    if (!selectedFile) {
        fileList.innerHTML = '';
        return;
    }

    fileList.innerHTML = `
        <div class="file-item">
            <div class="file-info">
                <div class="file-icon">📄</div>
                <div class="file-details">
                    <h4>${selectedFile.name}</h4>
                    <span class="file-size">${formatFileSize(selectedFile.size)}</span>
                </div>
            </div>
        </div>
    `;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Send Files
sendBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    sendBtn.disabled = true;
    showStatus('Uploading...', 'info');

    try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData
        });

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server error. Please try again.');
        }

        const result = await response.json();

        if (response.ok && result.success) {
            document.getElementById('shareCode').textContent = result.code;
            
            // Generate QR Code
            const qrUrl = `${window.location.origin}${window.location.pathname}?code=${result.code}`;
            const canvas = document.getElementById('qrcode');
            QRCode.toCanvas(canvas, qrUrl, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#667eea',
                    light: '#ffffff'
                }
            });
            
            document.getElementById('send-content').querySelector('.upload-area').style.display = 'none';
            document.getElementById('fileList').style.display = 'none';
            sendBtn.style.display = 'none';
            document.getElementById('sendResult').style.display = 'block';
            showStatus('Upload successful!', 'success');
        } else {
            throw new Error(result.error || 'Upload failed');
        }
    } catch (error) {
        showStatus('Upload failed: ' + error.message, 'error');
        sendBtn.disabled = false;
    }
});

function resetSend() {
    selectedFile = null;
    fileInput.value = '';
    document.getElementById('send-content').querySelector('.upload-area').style.display = 'block';
    document.getElementById('fileList').style.display = 'block';
    sendBtn.style.display = 'flex';
    sendBtn.disabled = true;
    document.getElementById('sendResult').style.display = 'none';
    renderFileList();
}

// Receive Files
const codeInput = document.getElementById('codeInput');

codeInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '');
});

async function receiveFiles() {
    const code = codeInput.value.trim();
    
    if (code.length !== 6) {
        showStatus('Please enter a valid 6-digit code', 'error');
        return;
    }

    showStatus('Checking code...', 'info');

    try {
        const checkResponse = await fetch(`${API_URL}/check/${code}`);
        const checkResult = await checkResponse.json();

        if (!checkResult.valid) {
            throw new Error('Code not found or expired');
        }

        showStatus(`Downloading ${checkResult.filename}...`, 'info');

        const downloadUrl = `${API_URL}/download/${code}`;
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = checkResult.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        showStatus('Download started!', 'success');
        codeInput.value = '';
    } catch (error) {
        showStatus(error.message, 'error');
    }
}

// Status Messages
function showStatus(message, type) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = `status-message show ${type}`;
    
    setTimeout(() => {
        statusEl.classList.remove('show');
    }, 3000);
}
