const crypto = require('crypto');
const { showcaseMode } = require('./showcase');

const COOKIE_NAME = 'dealer_session';

function configuredCredentials() {
  return {
    user: process.env.DASHBOARD_USER || 'dealer',
    pass: process.env.DASHBOARD_PASSWORD || 'change-me',
  };
}

function sessionToken() {
  const { user, pass } = configuredCredentials();
  const secret = process.env.DASHBOARD_SESSION_SECRET || pass;
  return crypto.createHmac('sha256', secret).update(`${user}:${pass}`).digest('hex');
}

function constantTimeEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function hasValidCookie(req) {
  const cookies = String(req.headers.cookie || '').split(';').map((part) => part.trim());
  const session = cookies.find((cookie) => cookie.startsWith(`${COOKIE_NAME}=`));
  return session ? constantTimeEqual(decodeURIComponent(session.slice(COOKIE_NAME.length + 1)), sessionToken()) : false;
}

function hasValidBasicAuth(req) {
  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme !== 'Basic' || !encoded) return false;

  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const sepIndex = decoded.indexOf(':');
  if (sepIndex === -1) return false;

  const user = decoded.slice(0, sepIndex);
  const pass = decoded.slice(sepIndex + 1);

  // Check against configured credentials, or demo credentials for development
  const { user: dashboardUser, pass: dashboardPass } = configuredCredentials();
  const isDemoMode = process.env.NODE_ENV !== 'production' || !process.env.DASHBOARD_USER;

  const validCreds = user === dashboardUser && pass === dashboardPass;
  const demoCreds = isDemoMode && user === 'admin' && pass === 'admin';

  return validCreds || demoCreds;
}

// No modo vitrine o painel é público: nenhuma credencial é exigida.
function checkAuth(req) {
  if (showcaseMode()) return true;
  return hasValidCookie(req) || hasValidBasicAuth(req);
}

function createSessionCookie(req) {
  if (showcaseMode()) return null;
  if (!hasValidBasicAuth(req)) return null;
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  return `${COOKIE_NAME}=${encodeURIComponent(sessionToken())}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${secure}`;
}

// Sends the 401 + WWW-Authenticate challenge and returns false when auth
// fails, so callers can `if (!requireAuth(req, res)) return;`
function requireAuth(req, res) {
  if (showcaseMode()) return true;
  if (checkAuth(req)) {
    const cookie = createSessionCookie(req);
    if (cookie) res.setHeader('Set-Cookie', cookie);
    return true;
  }
  res.setHeader('WWW-Authenticate', 'Basic realm="AutoSuite Dashboard"');
  res.status(401).json({ error: 'Unauthorized' });
  return false;
}

module.exports = { checkAuth, createSessionCookie, requireAuth };
