// Peer-to-peer file sharing using PeerJS (like Send Anywhere)
let selectedFiles = [];
let peer = null;
let connections = {};

// Initialize PeerJS
function initPeer() {
    peer = new Peer({
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ]
        }
    });

    peer.on('open', (id) => {
        console.log('Peer ID:', id);
    });

    peer.on('connection', (conn) => {
        handleIncomingConnection(conn);
    });

    peer.on('error', (err) => {
        console.error('Peer error:', err);
        showStatus('Connection error: ' + err.message, 'error');
    });
}

// Initialize on load
initPeer();

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
    if (!peer || !peer.id) {
        showStatus('Initializing connection...', 'info');
        setTimeout(() => sendBtn.click(), 1000);
        return;
    }

    sendBtn.disabled = true;
    showStatus('Preparing files...', 'info');

    try {
        const code = generateCode();
        
        // Store peer ID with code
        const peerId = peer.id;
        const payload = {
            peerId: peerId,
            fileCount: selectedFiles.length,
            files: selectedFiles.map(f => ({
                name: f.name,
                size: f.size,
                type: f.type
            })),
            timestamp: Date.now()
        };

        // Store in localStorage and also try to store online
        localStorage.setItem(`share_${code}`, JSON.stringify(payload));

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
        shareLink.innerHTML = `<small>Share this link:</small><br><a href="${shareUrl}" target="_blank">${shareUrl}</a><br><small style="color: #999; margin-top: 10px; display: block;">Keep this page open until transfer completes</small>`;
        resultDiv.appendChild(shareLink);
        
        showStatus('Ready to share! Waiting for receiver...', 'success');

        // Listen for incoming connections
        peer.on('connection', (conn) => {
            conn.on('open', () => {
                showStatus('Receiver connected! Sending files...', 'info');
                sendFilesToPeer(conn);
            });
        });

    } catch (error) {
        console.error('Setup error:', error);
        showStatus('Setup failed: ' + error.message, 'error');
        sendBtn.disabled = false;
    }
});

function sendFilesToPeer(conn) {
    let fileIndex = 0;

    function sendNextFile() {
        if (fileIndex >= selectedFiles.length) {
            conn.send({ type: 'complete' });
            showStatus('All files sent successfully!', 'success');
            return;
        }

        const file = selectedFiles[fileIndex];
        const reader = new FileReader();

        reader.onload = (e) => {
            conn.send({
                type: 'file',
                name: file.name,
                size: file.size,
                fileType: file.type,
                data: e.target.result,
                index: fileIndex,
                total: selectedFiles.length
            });
            fileIndex++;
            showStatus(`Sending ${fileIndex}/${selectedFiles.length} files...`, 'info');
            setTimeout(sendNextFile, 100);
        };

        reader.readAsArrayBuffer(file);
    }

    sendNextFile();
}

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
        setTimeout(() => receiveFiles(), 1000);
    }
});

let receivedFiles = [];

async function receiveFiles() {
    const code = codeInput.value.trim();
    
    if (code.length !== 6) {
        showStatus('Please enter a valid 6-digit code', 'error');
        return;
    }

    if (!peer || !peer.id) {
        showStatus('Initializing connection...', 'info');
        setTimeout(receiveFiles, 1000);
        return;
    }

    showStatus('Connecting to sender...', 'info');

    try {
        // Get sender's peer ID from localStorage
        const shareData = localStorage.getItem(`share_${code}`);
        
        if (!shareData) {
            showStatus('Code not found. Make sure sender is online.', 'error');
            return;
        }

        const payload = JSON.parse(shareData);
        const senderPeerId = payload.peerId;

        // Connect to sender
        const conn = peer.connect(senderPeerId, {
            reliable: true
        });

        conn.on('open', () => {
            showStatus('Connected! Receiving files...', 'success');
        });

        conn.on('data', (data) => {
            if (data.type === 'file') {
                const blob = new Blob([data.data], { type: data.fileType });
                receivedFiles.push({
                    name: data.name,
                    size: data.size,
                    blob: blob
                });
                showStatus(`Receiving ${data.index + 1}/${data.total} files...`, 'info');
            } else if (data.type === 'complete') {
                showStatus('All files received!', 'success');
                displayReceivedFiles();
            }
        });

        conn.on('error', (err) => {
            showStatus('Connection error: ' + err.message, 'error');
        });

    } catch (error) {
        console.error('Receive error:', error);
        showStatus('Failed to connect. Please check the code.', 'error');
    }
}

function displayReceivedFiles() {
    const downloadList = document.getElementById('downloadList');
    const receiveResult = document.getElementById('receiveResult');

    downloadList.innerHTML = `
        <h3 style="margin-bottom: 1rem;">Received Files (${receivedFiles.length})</h3>
        ${receivedFiles.map((file, index) => `
            <div class="download-item">
                <div class="file-info">
                    <div class="file-icon">📄</div>
                    <div class="file-details">
                        <h4>${file.name}</h4>
                        <span class="file-size">${formatFileSize(file.size)}</span>
                    </div>
                </div>
                <button class="download-btn" onclick="downloadReceivedFile(${index})">
                    Download
                </button>
            </div>
        `).join('')}
        <button class="primary-btn" onclick="downloadAllReceived()" style="margin-top: 1rem;">
            Download All Files
        </button>
    `;

    receiveResult.style.display = 'block';
}

function downloadReceivedFile(index) {
    const file = receivedFiles[index];
    const url = URL.createObjectURL(file.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
    showStatus(`Downloaded: ${file.name}`, 'success');
}

function downloadAllReceived() {
    receivedFiles.forEach((file, index) => {
        setTimeout(() => downloadReceivedFile(index), index * 500);
    });
}

function handleIncomingConnection(conn) {
    connections[conn.peer] = conn;
    
    conn.on('open', () => {
        console.log('Incoming connection from:', conn.peer);
    });
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
    downloadAllReceived();
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
