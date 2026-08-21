import { describe, expect, it } from 'vitest';
import platformDomains from '../api/_lib/platformDomains.js';

const { normalizeDomain, platformDomainFor, resolveDomains, slugify } = platformDomains;

describe('platform domains', () => {
  it('creates a stable slug and platform subdomain', () => {
    expect(slugify('Auto São José')).toBe('auto-sao-jose');
    expect(platformDomainFor('Auto São José', '3esysten.com.br')).toBe('auto-sao-jose.3esysten.com.br');
  });

  it('normalizes a custom domain without protocol', () => {
    expect(normalizeDomain('https://ESTOQUE.Exemplo.com.br/')).toBe('estoque.exemplo.com.br');
    expect(normalizeDomain('ESTOQUE.Exemplo.com.br')).toBe('estoque.exemplo.com.br');
  });

  it('uses the platform domain by default', () => {
    expect(resolveDomains({ name: 'Loja Centro' }, '3esysten.com.br')).toMatchObject({
      slug: 'loja-centro',
      domain: 'loja-centro.3esysten.com.br',
      domainMode: 'platform',
      domainStatus: 'pending',
    });
  });

  it('keeps both addresses when a custom domain is selected', () => {
    expect(resolveDomains({ name: 'Loja Centro', domainMode: 'custom', customDomain: 'carros.lojacentro.com.br' }, '3esysten.com.br')).toMatchObject({
      platformDomain: 'loja-centro.3esysten.com.br',
      customDomain: 'carros.lojacentro.com.br',
      domain: 'carros.lojacentro.com.br',
      domainStatus: 'dns_required',
    });
  });

  it('rejects an invalid custom domain', () => {
    expect(() => resolveDomains({ name: 'Loja Centro', domainMode: 'custom', customDomain: 'localhost' }, '3esysten.com.br')).toThrow(/domínio próprio válido/i);
  });
});
