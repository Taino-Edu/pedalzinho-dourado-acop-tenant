const crypto = require('crypto');
const { showcaseMode } = require('./showcase');

const COOKIE_NAME = 'platform_admin_session';

function credentials() {
  return {
    user: process.env.PLATFORM_ADMIN_USER || 'admin-geral',
    pass: process.env.PLATFORM_ADMIN_PASSWORD || 'change-this-platform-password',
  };
}

function equal(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function token() {
  const { user, pass } = credentials();
  const secret = process.env.PLATFORM_ADMIN_SESSION_SECRET || pass;
  return crypto.createHmac('sha256', secret).update(`platform:${user}:${pass}`).digest('hex');
}

function validBasic(req) {
  const [scheme, encoded] = String(req.headers.authorization || '').split(' ');
  if (scheme !== 'Basic' || !encoded) return false;
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  if (separator < 0) return false;
  const configured = credentials();
  return equal(decoded.slice(0, separator), configured.user) && equal(decoded.slice(separator + 1), configured.pass);
}

function validCookie(req) {
  const cookies = String(req.headers.cookie || '').split(';').map((part) => part.trim());
  const cookie = cookies.find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return Boolean(cookie && equal(decodeURIComponent(cookie.slice(COOKIE_NAME.length + 1)), token()));
}

// No modo vitrine o painel geral fica aberto para demonstracao.
function checkPlatformAuth(req) {
  if (showcaseMode()) return true;
  return validCookie(req) || validBasic(req);
}

function platformSessionCookie(req) {
  if (showcaseMode()) return null;
  if (!validBasic(req)) return null;
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  return `${COOKIE_NAME}=${encodeURIComponent(token())}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${secure}`;
}

function requirePlatformAuth(req, res) {
  if (showcaseMode()) return true;
  if (checkPlatformAuth(req)) {
    const cookie = platformSessionCookie(req);
    if (cookie) res.setHeader('Set-Cookie', cookie);
    return true;
  }
  res.setHeader('WWW-Authenticate', 'Basic realm="3esysten Administracao Geral"');
  res.status(401).json({ error: 'Acesso nao autorizado' });
  return false;
}

module.exports = { checkPlatformAuth, platformSessionCookie, requirePlatformAuth };
