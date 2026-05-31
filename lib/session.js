const crypto = require('crypto');

const COOKIE_NAME = 'echosphere_session';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function parseCookies(header = '') {
    return header.split(';').reduce((cookies, part) => {
        const separator = part.indexOf('=');
        if (separator === -1) return cookies;
        const name = part.slice(0, separator).trim();
        const value = part.slice(separator + 1).trim();
        if (!name) return cookies;
        try {
            cookies[name] = decodeURIComponent(value);
        } catch {
            // Ignore malformed cookie values.
        }
        return cookies;
    }, {});
}

function signSessionId(sessionId, secret) {
    return crypto
        .createHmac('sha256', secret)
        .update(sessionId)
        .digest('base64url');
}

function createSignedSession(secret) {
    const sessionId = crypto.randomBytes(18).toString('base64url');
    return `${sessionId}.${signSessionId(sessionId, secret)}`;
}

function verifySignedSession(value, secret) {
    if (typeof value !== 'string') return null;
    const separator = value.lastIndexOf('.');
    if (separator === -1) return null;

    const sessionId = value.slice(0, separator);
    const signature = value.slice(separator + 1);
    const expected = signSessionId(sessionId, secret);

    if (!sessionId || signature.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    return sessionId;
}

function serializeSessionCookie(value, { secure = false } = {}) {
    return [
        `${COOKIE_NAME}=${encodeURIComponent(value)}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
        secure ? 'Secure' : ''
    ].filter(Boolean).join('; ');
}

function getOrCreateGuestSession(req, res, secret, { secure = false } = {}) {
    const cookies = parseCookies(req.headers.cookie);
    const existing = verifySignedSession(cookies[COOKIE_NAME], secret);
    if (existing) return existing;

    const signedSession = createSignedSession(secret);
    res.append('Set-Cookie', serializeSessionCookie(signedSession, { secure }));
    return verifySignedSession(signedSession, secret);
}

module.exports = {
    COOKIE_NAME,
    createSignedSession,
    getOrCreateGuestSession,
    parseCookies,
    serializeSessionCookie,
    verifySignedSession
};
