(() => {
  'use strict';

  const state = { dealership: null, settings: {}, vehicleCount: 0 };
  const $ = (id) => document.getElementById(id);
  const safe = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const initials = (name) => String(name || '?').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const money = (cents) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(cents || 0) / 100);
  const roleLabel = (role) => ({ owner: 'Proprietário', manager: 'Gerente', sales: 'Vendedor', bdc: 'Pré-vendas' }[role] || role);

  function toast(message, type) {
    if (window.DosShell?.toast) window.DosShell.toast(message, type);
  }

  function selectTab(name) {
    document.querySelectorAll('.settings-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === name));
    document.querySelectorAll('.settings-panel').forEach((panel) => {
      const active = panel.dataset.panel === name;
      panel.classList.toggle('active', active);
      panel.hidden = !active;
    });
    history.replaceState(null, '', `#${name}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  window.addEventListener('hashchange', () => {
    selectTab(window.location.hash.slice(1) || 'start');
  });

  function updatePreview() {
    const name = $('fieldBrandName').value.trim() || 'Minha Concessionária';
    const tagline = $('fieldTagline').value.trim() || 'Seu próximo carro começa aqui.';
    const primary = $('fieldPrimaryColor').value || '#2169f3';
    const accent = $('fieldAccentColor').value || '#3ed5c5';
    const heroBackground = $('fieldHeroBackgroundColor').value || '#08101d';
    const logo = $('fieldLogoUrl').value;
    const heroImage = $('fieldHeroImageUrl').value;
    $('brandingPreviewName').textContent = name;
    $('brandingPreviewTagline').textContent = tagline;
    $('primaryColorValue').textContent = primary.toUpperCase();
    $('accentColorValue').textContent = accent.toUpperCase();
    $('heroBackgroundColorValue').textContent = heroBackground.toUpperCase();
    $('brandingPreview').style.setProperty('--preview-primary', primary);
    $('brandingPreview').style.setProperty('--preview-accent', accent);
    $('brandingPreview').style.background = `linear-gradient(180deg, color-mix(in srgb, ${heroBackground} 40%, transparent), ${heroBackground}), ${primary}`;
    $('brandingPreviewLogo').innerHTML = logo ? `<img src="${safe(logo)}" alt="Prévia do logotipo">` : '';
    $('logoPreview').innerHTML = logo ? `<img src="${safe(logo)}" alt="Logotipo selecionado">` : '<span class="material-symbols-rounded">image</span><small>Nenhum logo enviado</small>';
    $('heroImagePreview').innerHTML = heroImage ? `<img src="${safe(heroImage)}" alt="Foto de capa selecionada">` : '<span class="material-symbols-rounded">image</span><small>Usando foto padrão</small>';
  }

  function profileReady() {
    const d = state.dealership || {};
    return Boolean(d.name && d.email && d.phone && d.address);
  }

  function brandingReady() {
    return Boolean(state.settings.brandName && state.settings.logoUrl && state.settings.primaryColor);
  }

  function updateProgress() {
    const checks = { profile: profileReady(), branding: brandingReady(), inventory: state.vehicleCount > 0 };
    document.querySelectorAll('[data-check]').forEach((item) => item.dataset.complete = String(Boolean(checks[item.dataset.check])));
    const complete = Object.values(checks).filter(Boolean).length;
    const progress = Math.round((complete / 3) * 100);
    $('setupProgress').textContent = `${progress}%`;
    $('setupProgressBar').style.width = `${progress}%`;
  }

  async function api(url, options = {}) {
    const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
    const payload = response.status === 204 ? {} : await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Não foi possível concluir a operação.');
    return payload;
  }

  function fillFields() {
    const d = state.dealership;
    const s = state.settings;
    const displayedName = s.brandName || d.name || 'Sua Concessionária';
    const brand = document.querySelector('.settings-brand');
    brand.querySelector('strong').textContent = displayedName;
    brand.setAttribute('aria-label', `${displayedName} — visão geral`);
    const brandLocation = brand.querySelector('.settings-brand-location');
    if (brandLocation) brandLocation.textContent = d.address || 'Localização da loja';
    $('fieldName').value = d.name || '';
    $('fieldEmail').value = d.email || '';
    $('fieldPhone').value = d.phone || '';
    $('fieldAddress').value = d.address || '';
    $('fieldGoogleMapsUrl').value = s.googleMapsUrl || '';
    $('fieldBrandName').value = s.brandName || d.name || '';
    $('fieldTagline').value = s.tagline || '';
    $('fieldLogoUrl').value = s.logoUrl || '';
    $('fieldHeroImageUrl').value = s.heroImageUrl || '';
    $('fieldHeroKicker').value = s.heroKicker || 'Seu novo carro está aqui';
    $('fieldHeroTitle').value = s.heroTitle || 'Seu próximo carro';
    $('fieldHeroHighlight').value = s.heroHighlight || 'começa aqui';
    $('fieldHeroDescription').value = s.heroDescription || 'Veículos selecionados, procedência e um atendimento que acompanha você do primeiro clique até a entrega.';
    $('fieldHeroBackgroundColor').value = s.heroBackgroundColor || '#08101d';
    $('fieldHeroImagePosition').value = s.heroImagePosition || '63% 55%';
    $('fieldHeroOverlay').value = s.heroOverlay || 'balanced';
    $('fieldHomepageIntroTitle').value = s.homepageIntroTitle || 'Veículos em destaque';
    $('fieldHomepageIntroText').value = s.homepageIntroText || 'Carros e motos selecionados para quem quer comprar com procedência, atendimento claro e fotos bem apresentadas.';
    $('fieldHomepageCtaText').value = s.homepageCtaText || 'Ver detalhes';
    $('fieldHomepageCtaUrl').value = s.homepageCtaUrl || 'pages/cars.html';
    $('fieldCardImageFit').value = s.cardImageFit || 'cover';
    $('fieldWhatsapp').value = s.whatsapp || '';
    $('fieldInstagram').value = s.instagram || '';
    $('fieldPrimaryColor').value = s.primaryColor || '#2169f3';
    $('fieldAccentColor').value = s.accentColor || '#3ed5c5';
    updatePreview();
    updateProgress();
  }

  async function loadData() {
    try {
      const [dealershipPayload, vehiclesPayload] = await Promise.all([api('/api/dealership'), api('/api/vehicles')]);
      state.dealership = dealershipPayload.dealership;
      state.settings = state.dealership.settings || {};
      state.vehicleCount = (vehiclesPayload.vehicles || []).length;
      fillFields();
    } catch (error) {
      toast(`Não foi possível carregar as configurações: ${error.message}`, 'error');
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    const body = {
      name: $('fieldName').value.trim(),
      email: $('fieldEmail').value.trim(),
      phone: $('fieldPhone').value.trim(),
      address: $('fieldAddress').value.trim(),
      settings: { googleMapsUrl: $('fieldGoogleMapsUrl').value.trim() }
    };
    try {
      const payload = await api('/api/dealership', { method: 'PATCH', body: JSON.stringify(body) });
      state.dealership = payload.dealership;
      state.settings = state.dealership.settings || {};
      fillFields();
      toast('Dados da loja salvos.');
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  function brandingPayload() {
    return {
      brandName: $('fieldBrandName').value.trim(),
      tagline: $('fieldTagline').value.trim(),
      logoUrl: $('fieldLogoUrl').value,
      heroImageUrl: $('fieldHeroImageUrl').value,
      heroKicker: $('fieldHeroKicker').value.trim(),
      heroTitle: $('fieldHeroTitle').value.trim(),
      heroHighlight: $('fieldHeroHighlight').value.trim(),
      heroDescription: $('fieldHeroDescription').value.trim(),
      heroBackgroundColor: $('fieldHeroBackgroundColor').value,
      heroImagePosition: $('fieldHeroImagePosition').value.trim(),
      heroOverlay: $('fieldHeroOverlay').value,
      homepageIntroTitle: $('fieldHomepageIntroTitle').value.trim(),
      homepageIntroText: $('fieldHomepageIntroText').value.trim(),
      homepageCtaText: $('fieldHomepageCtaText').value.trim(),
      homepageCtaUrl: $('fieldHomepageCtaUrl').value.trim(),
      cardImageFit: $('fieldCardImageFit').value,
      googleMapsUrl: $('fieldGoogleMapsUrl').value.trim(),
      whatsapp: $('fieldWhatsapp').value.replace(/\D/g, ''),
      instagram: $('fieldInstagram').value.trim(),
      primaryColor: $('fieldPrimaryColor').value,
      accentColor: $('fieldAccentColor').value,
      locale: 'pt-BR',
      currency: 'BRL'
    };
  }

  async function saveBranding(event) {
    event.preventDefault();
    const settings = brandingPayload();
    try {
      const payload = await api('/api/dealership', { method: 'PATCH', body: JSON.stringify({ name: settings.brandName, settings }) });
      state.dealership = payload.dealership;
      state.settings = state.dealership.settings || {};
      fillFields();
      toast('Marca publicada no site.');
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  function readImage(file, options = {}) {
    const { label = 'imagem', maxWidth = 800, maxHeight = 240, maxOutput = 1_500_000, preservePng = true } = options;
    return new Promise((resolve, reject) => {
      if (!file || !/^image\/(png|jpeg|webp)$/i.test(file.type)) return reject(new Error('Escolha uma imagem PNG, JPG ou WebP.'));
      if (file.size > 4 * 1024 * 1024) return reject(new Error(`A ${label} deve ter no máximo 4 MB.`));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error('O arquivo de imagem está inválido.'));
        image.onload = () => {
          const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
          const outputType = preservePng && file.type === 'image/png' ? 'image/png' : (file.type === 'image/webp' ? 'image/webp' : 'image/jpeg');
          const output = canvas.toDataURL(outputType, .86);
          if (output.length > maxOutput) return reject(new Error(`A ${label} continua muito pesada. Use uma imagem mais simples.`));
          resolve(output);
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function chooseLogo(event) {
    try {
      $('fieldLogoUrl').value = await readImage(event.target.files?.[0], { label: 'logo' });
      updatePreview();
      toast('Logo preparado. Clique em “Salvar e publicar”.');
    } catch (error) {
      toast(error.message, 'error');
      event.target.value = '';
    }
  }

  async function chooseHeroImage(event) {
    try {
      $('fieldHeroImageUrl').value = await readImage(event.target.files?.[0], { label: 'foto de capa', maxWidth: 1920, maxHeight: 1080, maxOutput: 2_500_000, preservePng: false });
      updatePreview();
      toast('Foto de capa preparada. Clique em “Salvar e publicar”.');
    } catch (error) {
      toast(error.message, 'error');
      event.target.value = '';
    }
  }

  function exportConfiguration() {
    const content = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), profile: { name: $('fieldName').value, email: $('fieldEmail').value, phone: $('fieldPhone').value, address: $('fieldAddress').value, googleMapsUrl: $('fieldGoogleMapsUrl').value }, branding: brandingPayload() }, null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `configuracao-${($('fieldBrandName').value || 'concessionaria').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Configuração exportada.');
  }

  async function importConfiguration(event) {
    try {
      const file = event.target.files?.[0];
      if (!file || file.size > 2 * 1024 * 1024) throw new Error('Escolha um arquivo JSON de até 2 MB.');
      const data = JSON.parse(await file.text());
      if (!data.branding || typeof data.branding !== 'object') throw new Error('Arquivo de configuração inválido.');
      const b = data.branding;
      $('fieldBrandName').value = b.brandName || '';
      $('fieldTagline').value = b.tagline || '';
      $('fieldLogoUrl').value = b.logoUrl || '';
      $('fieldHeroImageUrl').value = b.heroImageUrl || '';
      $('fieldHeroKicker').value = b.heroKicker || '';
      $('fieldHeroTitle').value = b.heroTitle || '';
      $('fieldHeroHighlight').value = b.heroHighlight || '';
      $('fieldHeroDescription').value = b.heroDescription || '';
      if (/^#[0-9a-f]{6}$/i.test(b.heroBackgroundColor || '')) $('fieldHeroBackgroundColor').value = b.heroBackgroundColor;
      $('fieldHeroImagePosition').value = b.heroImagePosition || '';
      $('fieldHeroOverlay').value = b.heroOverlay || 'balanced';
      $('fieldHomepageIntroTitle').value = b.homepageIntroTitle || '';
      $('fieldHomepageIntroText').value = b.homepageIntroText || '';
      $('fieldHomepageCtaText').value = b.homepageCtaText || '';
      $('fieldHomepageCtaUrl').value = b.homepageCtaUrl || '';
      $('fieldCardImageFit').value = b.cardImageFit || 'cover';
      $('fieldGoogleMapsUrl').value = b.googleMapsUrl || data.profile?.googleMapsUrl || '';
      $('fieldWhatsapp').value = b.whatsapp || '';
      $('fieldInstagram').value = b.instagram || '';
      if (/^#[0-9a-f]{6}$/i.test(b.primaryColor || '')) $('fieldPrimaryColor').value = b.primaryColor;
      if (/^#[0-9a-f]{6}$/i.test(b.accentColor || '')) $('fieldAccentColor').value = b.accentColor;
      updatePreview();
      toast('Configuração importada. Revise e publique.');
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      event.target.value = '';
    }
  }

  async function loadTeam() {
    const roster = $('teamRoster');
    try {
      const { team = [] } = await api('/api/team');
      state.team = team;
      const operator = team.find((member) => member.active && ['owner', 'manager'].includes(member.role)) || team.find((member) => member.active);
      if (operator) {
        const user = document.querySelector('.settings-user');
        user.querySelector('strong').textContent = operator.name;
        user.querySelector('small').textContent = roleLabel(operator.role);
      }
      $('teamActiveCount').textContent = team.filter((member) => member.active).length;
      $('teamOpenLeads').textContent = team.reduce((total, member) => total + member.openCount, 0);
      $('teamSoldCount').textContent = team.reduce((total, member) => total + member.soldCount, 0);
      $('teamCommissionTotal').textContent = money(team.reduce((total, member) => total + member.commissionCents, 0));
      roster.innerHTML = team.length ? team.map((member) => `<div class="team-member" data-member-id="${safe(member.id)}">
        <span class="team-avatar">${safe(initials(member.name))}</span>
        <span class="team-person"><strong>${safe(member.name)}</strong><small>${safe(member.email)} · ${safe(roleLabel(member.role))}</small></span>
        <span class="team-metric"><small>Leads abertos</small><strong>${member.openCount}</strong></span>
        <span class="team-metric"><small>Vendas</small><strong>${member.soldCount}</strong></span>
        <span class="team-metric"><small>Comissão</small><strong>${Number(member.commissionRate).toFixed(2).replace('.', ',')}% · ${money(member.commissionCents)}</strong></span>
        <span class="team-status ${member.active ? '' : 'inactive'}">${member.active ? 'Ativo' : 'Inativo'}</span>
        <button class="team-edit" type="button" data-edit-member="${safe(member.id)}">Editar</button>
      </div>`).join('') : '<div class="team-empty"><strong>Nenhum funcionário cadastrado</strong><p>Adicione quem recebe leads e informe a regra de comissão.</p></div>';
    } catch {
      roster.innerHTML = '<p>Não foi possível carregar a equipe.</p>';
    }
  }

  async function openTeamMember(member = null) {
    const result = await window.DosShell.openModal({
      title: member ? `Editar ${member.name}` : 'Adicionar funcionário',
      confirmLabel: member ? 'Salvar funcionário' : 'Adicionar à equipe',
      cancelLabel: 'Cancelar',
      focusSelector: '#memberName',
      bodyHtml: `
        <label for="memberName" class="dos-field-label">Nome completo</label><input id="memberName" class="dos-field-input" value="${safe(member?.name || '')}" placeholder="Ex.: Ana Souza">
        <label for="memberEmail" class="dos-field-label" style="margin-top:12px">E-mail de trabalho</label><input id="memberEmail" type="email" class="dos-field-input" value="${safe(member?.email || '')}" placeholder="ana@concessionaria.com.br">
        <label for="memberRole" class="dos-field-label" style="margin-top:12px">Função</label><select id="memberRole" class="dos-field-input">
          ${[['sales','Vendedor'],['manager','Gerente'],['bdc','Pré-vendas'],['owner','Proprietário']].map(([value,label]) => `<option value="${value}" ${member?.role === value ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
        <label for="memberCommission" class="dos-field-label" style="margin-top:12px">Comissão sobre o valor vendido (%)</label><input id="memberCommission" type="number" min="0" max="20" step="0.1" class="dos-field-input" value="${Number(member?.commissionRate ?? 1.5)}">
        <small style="display:block;margin-top:6px;color:#64748b">Exemplo: veículo de R$ 100.000 com 1,5% gera R$ 1.500 de comissão estimada.</small>
        ${member ? `<label style="display:flex;align-items:center;gap:8px;margin-top:14px"><input id="memberActive" type="checkbox" ${member.active ? 'checked' : ''}> Funcionário ativo e apto a receber leads</label>` : ''}
      `,
      onConfirm: async (overlay) => {
        const payload = {
          name: overlay.querySelector('#memberName').value.trim(),
          email: overlay.querySelector('#memberEmail').value.trim(),
          role: overlay.querySelector('#memberRole').value,
          commissionRate: Number(overlay.querySelector('#memberCommission').value),
        };
        if (!payload.name || !payload.email) throw new Error('Informe nome e e-mail.');
        if (member) payload.active = overlay.querySelector('#memberActive').checked;
        await api(member ? `/api/team?id=${encodeURIComponent(member.id)}` : '/api/team', { method: member ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
        return true;
      },
    });
    if (!result) return;
    toast(member ? 'Funcionário atualizado.' : 'Funcionário adicionado à equipe.');
    await loadTeam();
  }

  document.querySelectorAll('.settings-tab').forEach((tab) => tab.addEventListener('click', () => selectTab(tab.dataset.tab)));
  document.querySelectorAll('[data-go-tab]').forEach((button) => button.addEventListener('click', () => selectTab(button.dataset.goTab)));
  $('settingsMenu').addEventListener('click', () => {
    const open = document.querySelector('.settings-shell').classList.toggle('menu-open');
    $('settingsMenu').setAttribute('aria-expanded', String(open));
  });
  $('settingsScrim').addEventListener('click', () => {
    document.querySelector('.settings-shell').classList.remove('menu-open');
    $('settingsMenu').setAttribute('aria-expanded', 'false');
  });
  $('settingsCollapse').addEventListener('click', () => {
    const collapsed = document.querySelector('.settings-shell').classList.toggle('sidebar-collapsed');
    $('settingsCollapse').setAttribute('aria-expanded', String(!collapsed));
    $('settingsCollapse').setAttribute('aria-label', collapsed ? 'Expandir menu' : 'Recolher menu');
  });
  $('addTeamMember').addEventListener('click', () => openTeamMember());
  $('teamRoster').addEventListener('click', (event) => {
    const button = event.target.closest('[data-edit-member]');
    if (!button) return;
    const member = (state.team || []).find((item) => item.id === button.dataset.editMember);
    if (member) openTeamMember(member);
  });
  $('profileForm').addEventListener('submit', saveProfile);
  $('brandingForm').addEventListener('submit', saveBranding);
  $('fieldLogoFile').addEventListener('change', chooseLogo);
  $('removeLogo').addEventListener('click', () => { $('fieldLogoUrl').value = ''; $('fieldLogoFile').value = ''; updatePreview(); });
  $('fieldHeroImageFile').addEventListener('change', chooseHeroImage);
  $('removeHeroImage').addEventListener('click', () => { $('fieldHeroImageUrl').value = ''; $('fieldHeroImageFile').value = ''; updatePreview(); });
  $('exportBranding').addEventListener('click', exportConfiguration);
  $('importBranding').addEventListener('change', importConfiguration);
  ['fieldBrandName', 'fieldTagline', 'fieldPrimaryColor', 'fieldAccentColor', 'fieldHeroBackgroundColor', 'fieldHeroKicker', 'fieldHeroTitle', 'fieldHeroHighlight', 'fieldHeroDescription', 'fieldHeroImagePosition', 'fieldHeroOverlay', 'fieldHomepageIntroTitle', 'fieldHomepageIntroText', 'fieldHomepageCtaText', 'fieldHomepageCtaUrl', 'fieldCardImageFit'].forEach((id) => $(id).addEventListener('input', updatePreview));
  selectTab(location.hash.slice(1) || 'start');
  loadData();
  loadTeam();
})();
