// Input validation
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input.replace(/<[^>]*>/g, '');
}

// Rate limiting implementation
const rateLimiter = {
    attempts: {},
    maxAttempts: 5,
    timeWindow: 300000, // 5 minutes in milliseconds

    checkLimit: function(operation) {
        const now = Date.now();
        if (!this.attempts[operation]) {
            this.attempts[operation] = { count: 1, timestamp: now };
            return true;
        }

        const attempt = this.attempts[operation];
        if (now - attempt.timestamp > this.timeWindow) {
            attempt.count = 1;
            attempt.timestamp = now;
            return true;
        }

        if (attempt.count >= this.maxAttempts) {
            return false;
        }

        attempt.count++;
        return true;
    },

    resetLimit: function(operation) {
        delete this.attempts[operation];
    }
};

// Password strength validation
function validatePassword(password) {
    return password.length >= 8;
}

// Secure random string generation
function generateSecureRandom(length) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
