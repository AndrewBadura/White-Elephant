/**
 * Common utility functions for the White Elephant application
 */

// Snowfall animation creator
function createSnowflake() {
    const snowflake = document.createElement('div');
    snowflake.classList.add('snowflake');
    snowflake.innerHTML = '❄';
    snowflake.style.left = Math.random() * 100 + 'vw';
    snowflake.style.animationDuration = Math.random() * 3 + 2 + 's';
    snowflake.style.opacity = Math.random() * 0.4 + 0.2;
    snowflake.style.animation = `snowfall ${Math.random() * 3 + 2}s linear forwards`;
    document.body.appendChild(snowflake);
    setTimeout(() => {
        snowflake.remove();
    }, 5000);
}

// Resource loader for external scripts
function loadExternalResources(libraries) {
    function loadScript(url) {
        return new Promise((resolve, reject) => {
            var script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    return Promise.all(libraries.map(loadScript))
        .then(() => console.log('All resources loaded'))
        .catch(error => console.error('Error loading resources:', error));
}

// Clipboard operations
function copyToClipboard(elementId) {
    const textarea = document.getElementById(elementId);
    textarea.select();
    document.execCommand('copy');
    
    const msg = document.createElement('span');
    msg.textContent = 'Copied!';
    msg.className = 'copy-success';
    textarea.parentNode.appendChild(msg);
    
    setTimeout(() => msg.remove(), 2000);
}

// QR Code operations
function generateQRCode(text, containerId, size = 128) {
    const qrContainer = document.getElementById(containerId);
    qrContainer.innerHTML = "";
    new QRCode(qrContainer, {
        text: text,
        width: size,
        height: size,
    });
}

function downloadQRCode(containerId = "qrcode") {
    const qrContainer = document.getElementById(containerId).getElementsByTagName("img")[0];
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
