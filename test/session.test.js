const assert = require('node:assert/strict');
const test = require('node:test');

const {
    COOKIE_NAME,
    createSignedSession,
    parseCookies,
    serializeSessionCookie,
    verifySignedSession
} = require('../lib/session');

const secret = 'test-secret';

test('creates and verifies a signed guest session', () => {
    const value = createSignedSession(secret);
    assert.ok(verifySignedSession(value, secret));
});

test('rejects a modified signed guest session', () => {
    const value = createSignedSession(secret);
    assert.equal(verifySignedSession(`${value}modified`, secret), null);
});

test('serializes an HTTP-only production cookie', () => {
    const cookie = serializeSessionCookie('signed-value', { secure: true });
    assert.match(cookie, new RegExp(`^${COOKIE_NAME}=`));
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    assert.match(cookie, /Secure/);
});

test('parses valid cookies and ignores malformed values', () => {
    assert.deepEqual(parseCookies('theme=dark; search=marketplace'), {
        theme: 'dark',
        search: 'marketplace'
    });
    assert.deepEqual(parseCookies('broken=%E0%A4%A'), {});
});
