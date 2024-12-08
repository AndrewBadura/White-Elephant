// Function to get URL parameters
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}


function copyToClipboard(elementId) {
    const textarea = document.getElementById(elementId);
    textarea.select();
    document.execCommand('copy');
    
    // Create success message
    const msg = document.createElement('span');
    msg.textContent = 'Copied!';
    msg.className = 'copy-success';
    textarea.parentNode.appendChild(msg);
    
    // Remove message after animation
    setTimeout(() => msg.remove(), 2000);
}


// Password complexity requirements
function isPasswordComplex(password) {
    const minLength = 12;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);
    
    return password.length >= minLength && 
           hasUpperCase && 
           hasLowerCase && 
           hasNumbers && 
           hasSpecialChar;
}

// Rate limiting
const attempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

function checkRateLimit() {
    const now = Date.now();
    const clientIP = 'client'; // In a real implementation, you'd get the client's IP
    
    if (attempts.has(clientIP)) {
        const { count, timestamp } = attempts.get(clientIP);
        if (now - timestamp < LOCKOUT_TIME) {
            if (count >= MAX_ATTEMPTS) {
                return false;
            }
            attempts.set(clientIP, { count: count + 1, timestamp });
        } else {
            attempts.set(clientIP, { count: 1, timestamp: now });
        }
    } else {
        attempts.set(clientIP, { count: 1, timestamp: now });
    }
    return true;
}

function sanitizeInput(input) {
    return input.replace(/[<>]/g, ''); // Basic XSS prevention
}

function encryptPrivateKey() {
    if (!checkRateLimit()) {
        const status = document.getElementById("encryptStatus");
        status.textContent = "Too many attempts. Please try again later.";
        status.className = "status error";
        return;
    }

    const privateKey = sanitizeInput(document.getElementById("privateKey").value.trim());
    const password = document.getElementById("encryptPassword").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();
    const status = document.getElementById("encryptStatus");
    const output = document.getElementById("encryptedOutput");
    
    // Clear previous output
    output.value = '';
    const qrContainer = document.getElementById("qrcode");
    
    if (!privateKey || !password || !confirmPassword) {
        status.textContent = "Private key and both password fields are required.";
        status.className = "status error";
        return;
    }

    if (!isPasswordComplex(password)) {
        status.textContent = "Password must be at least 12 characters long and contain uppercase, lowercase, numbers, and special characters.";
        status.className = "status error";
        return;
    }

    if (password !== confirmPassword) {
        status.textContent = "Passwords do not match.";
        status.className = "status error";
        return;
    }
    try {
        const salt = CryptoJS.lib.WordArray.random(128 / 8);
        const iv = CryptoJS.lib.WordArray.random(128 / 8);
        const key = CryptoJS.PBKDF2(password, salt, { keySize: 256 / 32, iterations: 100000 });
        const encrypted = CryptoJS.AES.encrypt(privateKey, key, { iv: iv }).toString();
        const payload = JSON.stringify({
            ciphertext: encrypted,
            salt: salt.toString(CryptoJS.enc.Hex),
            iv: iv.toString(CryptoJS.enc.Hex)
        });
        output.value = payload;
        status.textContent = "Private key encrypted successfully!";
        status.className = "status";
        qrContainer.innerHTML = "";
        new QRCode(qrContainer, {
            text: payload,
            width: 128,
            height: 128,
        });

        // Update decrypt link with encrypted payload
        const goToDecryptLink = document.getElementById('goToDecrypt');
        if (goToDecryptLink) {
            goToDecryptLink.href = `decrypt.html?payload=${encodeURIComponent(payload)}`;
        }
    } catch (error) {
        status.textContent = "Error during encryption: " + error.message;
        status.className = "status error";
    }
}

function downloadQRCode() {
    const qrContainer = document.getElementById("qrcode").getElementsByTagName("img")[0];
    if (!qrContainer) {
        alert('Please generate a QR code first.');
        return;
    }
    const imgURL = qrContainer.src;
    const link = document.createElement('a');
    link.href = imgURL;
    link.download = 'encrypted_payload_qrcode.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function decryptPrivateKey() {
    if (!checkRateLimit()) {
        const status = document.getElementById("decryptStatus");
        status.textContent = "Too many attempts. Please try again later.";
        status.className = "status error";
        return;
    }

    const encryptedPayload = sanitizeInput(document.getElementById("encryptedPayload").value.trim());
    const password = document.getElementById("decryptPassword").value.trim();
    const status = document.getElementById("decryptStatus");
    const output = document.getElementById("decryptedOutput");
    
    // Clear previous output
    output.value = '';
    if (!encryptedPayload || !password) {
        status.textContent = "Encrypted payload and password are required.";
        status.className = "status error";
        return;
    }
    try {
        const { ciphertext, salt, iv } = JSON.parse(encryptedPayload);
        const saltWordArray = CryptoJS.enc.Hex.parse(salt);
        const ivWordArray = CryptoJS.enc.Hex.parse(iv);
        const key = CryptoJS.PBKDF2(password, saltWordArray, { keySize: 256 / 32, iterations: 100000 });
        const decrypted = CryptoJS.AES.decrypt(ciphertext, key, { iv: ivWordArray });
        const privateKey = decrypted.toString(CryptoJS.enc.Utf8);
        if (!privateKey) throw new Error("Invalid password or corrupted data.");
        output.value = privateKey;
        status.textContent = "Private key decrypted successfully!";
        status.className = "status";
    } catch (error) {
        status.textContent = "Error during decryption: " + error.message;
        status.className = "status error";
    }
}

function scanQRCode() {
    const reader = document.getElementById("reader");
    reader.innerHTML = '';
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        reader.innerHTML = '<p style="color: red;">Camera access is not available on this device. Please use a mobile device with a camera to scan QR codes.</p>';
        return;
    }

    const html5QrCode = new Html5Qrcode("reader");
    
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(() => {
            html5QrCode.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 }
                },
                qrCodeMessage => {
                    document.getElementById("encryptedPayload").value = qrCodeMessage;
                    html5QrCode.stop();
                    reader.innerHTML = '<p style="color: green;">QR code scanned successfully!</p>';
                },
                () => {}
            )
            .catch(err => {
                console.error("QR Code scanner error:", err);
                reader.innerHTML = '<p style="color: red;">Error starting QR code scanner. Please ensure camera permissions are granted.</p>';
            });
        })
        .catch(err => {
            console.error("Camera access error:", err);
            reader.innerHTML = '<p style="color: red;">Unable to access camera. Please ensure camera permissions are granted and you\'re using HTTPS or localhost.</p>';
        });
}


// Set up event listeners when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check for payload parameter
    const payload = getUrlParameter('payload');
    if (payload && document.getElementById('encryptedPayload')) {
        document.getElementById('encryptedPayload').value = payload;
    }
});
