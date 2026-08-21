const DOMAIN_MODES = new Set(['platform', 'custom']);
const DOMAIN_STATUSES = new Set(['pending', 'dns_required', 'verifying', 'active', 'error']);

function text(value, max = 253) {
  return String(value || '').trim().slice(0, max);
}

function slugify(value) {
  return text(value, 60)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeDomain(value) {
  const raw = text(value).toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '').replace(/\.$/, '');
  if (!raw || /[\s/@?#]/.test(raw) || raw.includes(':')) return '';
  const labels = raw.split('.');
  if (labels.length < 2 || labels.some((label) => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) return '';
  return raw;
}

function platformDomainFor(clientSlug, baseDomain = process.env.PLATFORM_BASE_DOMAIN || '3esysten.com.br') {
  const normalizedBase = normalizeDomain(baseDomain);
  const normalizedSlug = slugify(clientSlug);
  if (!normalizedBase || !normalizedSlug) return '';
  return `${normalizedSlug}.${normalizedBase}`;
}

function resolveDomains(input = {}, baseDomain) {
  const clientSlug = slugify(input.slug || input.name);
  const platformDomain = platformDomainFor(clientSlug, baseDomain);
  const domainMode = DOMAIN_MODES.has(input.domainMode) ? input.domainMode : (input.customDomain ? 'custom' : 'platform');
  const customDomain = normalizeDomain(input.customDomain || (domainMode === 'custom' ? input.domain : '')) || null;
  if (!clientSlug || !platformDomain) throw new Error('Nome, slug e domínio base válidos são obrigatórios.');
  if (domainMode === 'custom' && !customDomain) throw new Error('Informe um domínio próprio válido.');
  return {
    slug: clientSlug,
    platformDomain,
    customDomain,
    domainMode,
    domain: domainMode === 'custom' ? customDomain : platformDomain,
    domainStatus: domainMode === 'custom' ? 'dns_required' : 'pending',
  };
}

module.exports = { DOMAIN_MODES, DOMAIN_STATUSES, normalizeDomain, platformDomainFor, resolveDomains, slugify };
