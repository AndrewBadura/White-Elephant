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


function encryptPrivateKey() {
    if (!rateLimiter.checkLimit('encrypt')) {
        alert('Too many encryption attempts. Please try again later.');
        return;
    }

    const privateKey = sanitizeInput(document.getElementById("privateKey").value.trim());
    const password = document.getElementById("encryptPassword").value.trim();
    const confirmPassword = document.getElementById("confirmEncryptPassword").value.trim();
    const status = document.getElementById("encryptStatus");
    const output = document.getElementById("encryptedOutput");

    if (!validatePassword(password)) {
        status.textContent = "Password must be at least 8 characters long";
        status.className = "status error";
        return;
    }
    
    // Clear previous output
    output.value = '';
    const qrContainer = document.getElementById("qrcode");
    if (!privateKey || !password || !confirmPassword) {
        status.textContent = "Private key and both password fields are required.";
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
        
        // Generate QR code with encrypted payload
        generateQRCode(payload);

        // Update decrypt link with encrypted payload
        const goToDecryptLink = document.getElementById('goToDecrypt');
        if (goToDecryptLink) {
            const encodedPayload = encodeURIComponent(payload).replace(/'/g, '%27');
            goToDecryptLink.href = `decrypt.html?payload=${encodedPayload}`;
        }
    } catch (error) {
        status.textContent = "Error during encryption: " + error.message;
        status.className = "status error";
    }
}


function generateQRCode(text) {
    const qrContainer = document.getElementById("qrcode");
    qrContainer.innerHTML = "";
    new QRCode(qrContainer, {
        text: text,
        width: 128,
        height: 128,
    });
}

function handleDecryptRecoveryKeyChange() {
    const checkbox = document.getElementById('decryptRecoveryKeyCheckbox');
    const output = document.getElementById('decryptedOutput');
    const decryptedText = output.value;
    
    if (checkbox.checked) {
        // Format as bitcoin wallet recovery string
        const walletString = `bitcoin-wallet:?seed=${decryptedText.replace(/\s+/g, '+')}&passphrase`;
        const qrContainer = document.getElementById("decryptQrcode");
        qrContainer.innerHTML = "";
        new QRCode(qrContainer, {
            text: walletString,
            width: 128,
            height: 128,
        });
    } else {
        // Revert to original decrypted text
        const qrContainer = document.getElementById("decryptQrcode");
        qrContainer.innerHTML = "";
        new QRCode(qrContainer, {
            text: decryptedText,
            width: 128,
            height: 128,
        });
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
    const encryptedPayload = document.getElementById("encryptedPayload").value.trim();
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
        
        // Show recovery key checkbox after successful decryption
        document.getElementById('decryptRecoveryKeyOption').style.display = 'block';
        
        // Generate initial QR code with decrypted output
        const qrContainer = document.getElementById("decryptQrcode");
        qrContainer.innerHTML = "";
        new QRCode(qrContainer, {
            text: privateKey,
            width: 128,
            height: 128,
        });
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
    const encryptedPayloadTextarea = document.getElementById('encryptedPayload');
    const decryptForm = document.getElementById('decryptForm');
    
    if (encryptedPayloadTextarea) {
        if (payload) {
            // If we have a payload, hide the textarea and set its value
            encryptedPayloadTextarea.value = decodeURIComponent(payload);
            encryptedPayloadTextarea.style.display = 'none';
            if (decryptForm) {
                decryptForm.style.marginTop = '20px';
            }
        } else {
            // No payload, show the textarea
            encryptedPayloadTextarea.style.display = 'block';
            if (decryptForm) {
                decryptForm.style.marginTop = '0';
            }
        }
    }
});
