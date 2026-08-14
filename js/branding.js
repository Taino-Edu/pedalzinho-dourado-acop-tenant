(function () {
  'use strict';

  const defaults = {
    brandName: 'Sua Concession\u00e1ria',
    tagline: 'Seu pr\u00f3ximo carro come\u00e7a aqui.',
    logoUrl: '',
    primaryColor: '#2457d6',
    accentColor: '#e58a1f',
    whatsapp: '',
    locale: 'pt-BR',
    currency: 'BRL'
  };

  function replaceBrandText(root, brandName) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      if (node.parentElement && ['SCRIPT', 'STYLE'].includes(node.parentElement.tagName)) return;
      if (node.nodeValue.includes('AutoSuite')) {
        node.nodeValue = node.nodeValue.replaceAll('AutoSuite', brandName);
      }
    });
  }

  function installLogo(config) {
    if (!config.logoUrl) {
      document.querySelectorAll('.logo-wordmark, .dos-brand-text').forEach((label) => {
        label.textContent = config.brandName;
      });
      return;
    }
    document.querySelectorAll('.logo, .dos-brand').forEach((host) => {
      if (host.querySelector('[data-runtime-logo]')) return;
      const img = document.createElement('img');
      img.src = config.logoUrl;
      img.alt = config.brandName;
      img.dataset.runtimeLogo = 'true';
      img.style.cssText = 'max-width:160px;max-height:42px;object-fit:contain;display:block;';
      host.querySelectorAll('.logo-mark,.logo-wordmark,.dos-brand-mark').forEach((el) => {
        el.style.display = 'none';
      });
      host.prepend(img);
    });
  }

  function installWhatsApp(config) {
    if (document.body.matches('.dos-body, .admin-body, .settings-body') || /\/(dashboard|crm|inventory|appointments|customers|analytics|staff-activity|settings|superadmin)(\.html)?$/i.test(location.pathname)) return;
    const digits = String(config.whatsapp || '').replace(/\D/g, '');
    if (!digits || document.querySelector('[data-runtime-whatsapp]')) return;
    const link = document.createElement('a');
    link.dataset.runtimeWhatsapp = 'true';
    link.href = `https://wa.me/${digits}?text=${encodeURIComponent('Ol\u00e1! Vi um ve\u00edculo no site e gostaria de mais informa\u00e7\u00f5es.')}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', 'Falar com a concession\u00e1ria pelo WhatsApp');
    link.textContent = 'WhatsApp';
    link.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:9999;padding:12px 18px;border-radius:999px;background:#16864b;color:#fff;font:700 14px system-ui;text-decoration:none;box-shadow:0 8px 24px rgba(0,0,0,.22);';
    document.body.appendChild(link);
  }

  function localizeCurrency(root, config) {
    if (config.currency !== 'BRL') return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      if (node.parentElement && ['SCRIPT', 'STYLE'].includes(node.parentElement.tagName)) return;
      let value = node.nodeValue;
      if (!value.includes('₦')) return;
      value = value.replace(/₦\s*([\d,.]+)\s*([MK])?/g, (_, amount, suffix) => {
        const normalized = Number(amount.replace(/,/g, '')) * (suffix === 'M' ? 1000000 : suffix === 'K' ? 1000 : 1);
        const brlValue = normalized / 100;
        return new Intl.NumberFormat(config.locale, {
          style: 'currency',
          currency: 'BRL',
          notation: suffix ? 'compact' : 'standard',
          maximumFractionDigits: suffix ? 1 : 0
        }).format(brlValue);
      });
      node.nodeValue = value.replaceAll('₦', 'R$');
    });
  }

  function apply(config) {
    const root = document.documentElement;
    root.style.setProperty('--brand-blue', config.primaryColor);
    root.style.setProperty('--brand-blue-deep', `color-mix(in oklch, ${config.primaryColor} 72%, black)`);
    root.style.setProperty('--brand-blue-light', `color-mix(in oklch, ${config.primaryColor} 48%, white)`);
    root.style.setProperty('--brand-accent', config.accentColor);
    root.style.setProperty('--brand-accent-deep', `color-mix(in oklch, ${config.accentColor} 72%, black)`);
    root.style.setProperty('--gradient-brand', config.primaryColor);
    root.lang = config.locale || 'pt-BR';
    replaceBrandText(document.body, config.brandName);
    localizeCurrency(document.body, config);
    document.title = document.title.replaceAll('AutoSuite', config.brandName);
    installLogo(config);
    installWhatsApp(config);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) localizeCurrency(node.parentNode || document.body, config);
          if (node.nodeType === Node.ELEMENT_NODE) localizeCurrency(node, config);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.dispatchEvent(new CustomEvent('autosuite:branding-ready', { detail: config }));
  }

  window.AutoBrand = {
    config: defaults,
    formatCurrency(value) {
      return new Intl.NumberFormat(this.config.locale, {
        style: 'currency',
        currency: this.config.currency,
        maximumFractionDigits: 0
      }).format(Number(value) || 0);
    }
  };

  window.AutoBrand.ready = fetch('/api/branding')
    .then((response) => response.ok ? response.json() : Promise.reject(new Error('branding unavailable')))
    .then((payload) => ({ ...defaults, ...(payload.branding || {}) }))
    .catch(() => defaults)
    .then((config) => {
      window.AutoBrand.config = config;
      apply(config);
      return config;
    });
})();
