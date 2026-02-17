// Using file.io API for unlimited file sharing
let selectedFiles = [];
const CODE_STORAGE_API = 'https://api.jsonbin.io/v3/b';
const FILE_STORAGE_API = 'https://file.io';

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
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

function handleFiles(files) {
    selectedFiles = Array.from(files);
    renderFileList();
    sendBtn.disabled = selectedFiles.length === 0;
}

function renderFileList() {
    if (selectedFiles.length === 0) {
        fileList.innerHTML = '';
        return;
    }

    fileList.innerHTML = selectedFiles.map((file, index) => `
        <div class="file-item">
            <div class="file-info">
                <div class="file-icon">📄</div>
                <div class="file-details">
                    <h4>${file.name}</h4>
                    <span class="file-size">${formatFileSize(file.size)}</span>
                </div>
            </div>
            <button class="remove-btn" onclick="removeFile(${index})">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            </button>
        </div>
    `).join('');
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    renderFileList();
    sendBtn.disabled = selectedFiles.length === 0;
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
    if (selectedFiles.length === 0) return;

    sendBtn.disabled = true;
    showStatus('Uploading files...', 'info');

    try {
        const code = generateCode();
        const fileLinks = [];

        // Upload each file to file.io
        for (const file of selectedFiles) {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(FILE_STORAGE_API, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');
            
            const result = await response.json();
            fileLinks.push({
                name: file.name,
                size: file.size,
                type: file.type,
                link: result.link,
                key: result.key
            });
        }

        // Store metadata with code
        const payload = {
            code: code,
            files: fileLinks,
            timestamp: Date.now()
        };

        const metaResponse = await fetch(CODE_STORAGE_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Bin-Name': code
            },
            body: JSON.stringify(payload)
        });

        if (!metaResponse.ok) throw new Error('Metadata storage failed');
        
        const metaResult = await metaResponse.json();
        const binId = metaResult.metadata.id;
        
        // Store mapping
        localStorage.setItem(`code_${code}`, binId);

        // Generate shareable link
        const shareUrl = `${window.location.origin}${window.location.pathname}?code=${code}`;
        
        document.getElementById('shareCode').textContent = code;
        document.getElementById('send-content').querySelector('.upload-area').style.display = 'none';
        document.getElementById('fileList').style.display = 'none';
        sendBtn.style.display = 'none';
        
        const resultDiv = document.getElementById('sendResult');
        resultDiv.style.display = 'block';
        
        // Remove old share URL if exists
        const oldUrl = resultDiv.querySelector('.share-url');
        if (oldUrl) oldUrl.remove();
        
        // Add share URL
        const shareLink = document.createElement('div');
        shareLink.className = 'link share-url';
        shareLink.innerHTML = `<small>Share this link:</small><br><a href="${shareUrl}" target="_blank">${shareUrl}</a>`;
        resultDiv.appendChild(shareLink);
        
        showStatus('Files uploaded successfully!', 'success');

    } catch (error) {
        showStatus('Upload failed: ' + error.message, 'error');
        sendBtn.disabled = false;
    }
});

function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve({
                name: file.name,
                type: file.type,
                size: file.size,
                data: btoa(reader.result)
            });
        };
        reader.onerror = reject;
        reader.readAsBinaryString(file);
    });
}

function copyCode() {
    const code = document.getElementById('shareCode').textContent;
    navigator.clipboard.writeText(code);
    showStatus('Code copied to clipboard!', 'success');
}

function resetSend() {
    selectedFiles = [];
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
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
});

// Check URL for code on load
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
        codeInput.value = code;
        document.querySelector('[data-tab="receive"]').click();
        setTimeout(() => receiveFiles(), 500);
    }
});

async function receiveFiles() {
    const code = codeInput.value.trim();
    
    if (code.length !== 6) {
        showStatus('Please enter a valid 6-digit code', 'error');
        return;
    }

    showStatus('Fetching files...', 'info');

    try {
        // Get binId from localStorage
        let binId = localStorage.getItem(`code_${code}`);
        
        if (!binId) {
            showStatus('Code not found. Files may have expired or code is incorrect.', 'error');
            return;
        }

        const response = await fetch(`${CODE_STORAGE_API}/${binId}/latest`, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Files not found');

        const result = await response.json();
        const payload = result.record;

        if (payload.code !== code) {
            showStatus('Invalid code', 'error');
            return;
        }

        displayDownloadList(payload.files);
        showStatus('Files ready to download!', 'success');

    } catch (error) {
        showStatus('Files not found or expired. Please check the code.', 'error');
    }
}

function displayDownloadList(files) {
    const downloadList = document.getElementById('downloadList');
    const receiveResult = document.getElementById('receiveResult');

    downloadList.innerHTML = `
        <h3 style="margin-bottom: 1rem;">Available Files (${files.length})</h3>
        ${files.map((file, index) => `
            <div class="download-item">
                <div class="file-info">
                    <div class="file-icon">📄</div>
                    <div class="file-details">
                        <h4>${file.name}</h4>
                        <span class="file-size">${formatFileSize(file.size)}</span>
                    </div>
                </div>
                <button class="download-btn" onclick="downloadFileFromLink('${file.link}', '${file.name}')">
                    Download
                </button>
            </div>
        `).join('')}
    `;

    receiveResult.style.display = 'block';
    window.currentFiles = files;
}

function downloadFileFromLink(link, filename) {
    const a = document.createElement('a');
    a.href = link;
    a.download = filename;
    a.target = '_blank';
    a.click();
    showStatus(`Downloading: ${filename}`, 'success');
}

function displayDownloadList(files) {
    const downloadList = document.getElementById('downloadList');
    const receiveResult = document.getElementById('receiveResult');

    downloadList.innerHTML = `
        <h3 style="margin-bottom: 1rem;">Available Files (${files.length})</h3>
        ${files.map((file, index) => `
            <div class="download-item">
                <div class="file-info">
                    <div class="file-icon">📄</div>
                    <div class="file-details">
                        <h4>${file.name}</h4>
                        <span class="file-size">${formatFileSize(file.size)}</span>
                    </div>
                </div>
                <button class="download-btn" onclick="downloadFile(${index})">
                    Download
                </button>
            </div>
        `).join('')}
        <button class="primary-btn" onclick="downloadAll()" style="margin-top: 1rem;">
            Download All Files
        </button>
    `;

    receiveResult.style.display = 'block';
    window.currentFiles = files;
}

function downloadFile(index) {
    const file = window.currentFiles[index];
    const blob = new Blob([base64ToArrayBuffer(file.data)], { type: file.type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
    showStatus(`Downloaded: ${file.name}`, 'success');
}

function downloadAll() {
    window.currentFiles.forEach((file, index) => {
        setTimeout(() => downloadFileFromLink(file.link, file.name), index * 500);
    });
}

function base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
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
