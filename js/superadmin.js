(() => {
  const state = { clients: [], services: [], deployments: [], config: { baseDomain: '3esysten.com.br' } };
  const money = (cents = 0) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const slugify = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  const labels = {
    lead: 'Lead', onboarding: 'Implantação', active: 'Ativo', suspended: 'Suspenso', cancelled: 'Cancelado',
    pending: 'Pendente', building: 'Publicando', healthy: 'Saudável', degraded: 'Instável', offline: 'Offline',
    dns_required: 'Aguardando DNS', verifying: 'Verificando', error: 'Com erro',
  };
  const toast = (message, error = false) => {
    const node = document.getElementById('saToast');
    node.textContent = message;
    node.className = `sa-toast show${error ? ' error' : ''}`;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { node.className = 'sa-toast'; }, 3200);
  };

  async function api(options = {}) {
    const response = await fetch('/api/platform-admin', { headers: { 'Content-Type': 'application/json' }, ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a operação.');
    return data;
  }

  function statusPill(status) {
    return `<span class="sa-status ${escapeHtml(status)}">${escapeHtml(labels[status] || status)}</span>`;
  }

  function render(data) {
    Object.assign(state, data);
    document.getElementById('mrr').textContent = money(data.metrics.mrrCents);
    document.getElementById('activeClients').textContent = data.metrics.activeClients;
    document.getElementById('totalClients').textContent = `${data.metrics.totalClients} na carteira`;
    document.getElementById('onboardingClients').textContent = data.metrics.onboardingClients;
    document.getElementById('healthyDeployments').textContent = data.metrics.healthyDeployments;
    document.getElementById('activeDomains').textContent = data.metrics.activeDomains;
    document.getElementById('clientsRows').innerHTML = data.clients.length ? data.clients.map((client) => `
      <tr>
        <td><strong>${escapeHtml(client.name)}</strong><span class="sa-domain">${escapeHtml(client.contactName || client.contactPhone || 'Sem contato')}</span></td>
        <td><strong class="sa-domain-primary">${escapeHtml(client.domain)}</strong><span class="sa-domain">${client.domainMode === 'custom' ? 'Domínio próprio' : '3esysten'}</span></td>
        <td>${statusPill(client.domainStatus)}</td>
        <td>${statusPill(client.status)}</td>
        <td>${money(client.monthlyFeeCents)}</td>
        <td><button class="sa-row-action" type="button" data-manage-client="${escapeHtml(client.id)}">Gerenciar</button></td>
      </tr>`).join('') : '<tr><td colspan="6" class="sa-empty">Nenhuma concessionária cadastrada.</td></tr>';
    document.getElementById('serviceList').innerHTML = data.services.length ? data.services.map((service) => `<article class="sa-service"><strong>${escapeHtml(service.name)}</strong><p>${escapeHtml(service.description || (service.billingType === 'monthly' ? 'Cobrança mensal' : 'Cobrança única'))}</p><b>${money(service.priceCents)}${service.billingType === 'monthly' ? '/mês' : ''}</b></article>`).join('') : '<p class="sa-empty">Nenhum serviço cadastrado.</p>';
    document.getElementById('deploymentList').innerHTML = data.deployments.length ? data.deployments.map((item) => `<article class="sa-deployment"><strong>${escapeHtml(item.client.name)}</strong><p>${escapeHtml(item.appContainer)}${item.appPort ? ` · porta ${item.appPort}` : ''}</p>${statusPill(item.status)}</article>`).join('') : '<p class="sa-empty">Nenhuma instalação preparada.</p>';
    document.getElementById('domainList').innerHTML = data.clients.length ? data.clients.map((client) => `<article class="sa-domain-item"><span><strong>${escapeHtml(client.domain)}</strong><small>${escapeHtml(client.name)}${client.customDomain ? ` · reserva ${escapeHtml(client.platformDomain)}` : ''}</small></span>${statusPill(client.domainStatus)}</article>`).join('') : '<p class="sa-empty">Nenhum domínio cadastrado.</p>';
    document.getElementById('deploymentClient').innerHTML = '<option value="">Selecione...</option>' + data.clients.map((client) => `<option value="${escapeHtml(client.id)}" data-domain="${escapeHtml(client.domain)}" data-platform-domain="${escapeHtml(client.platformDomain)}" data-slug="${escapeHtml(client.slug)}">${escapeHtml(client.name)}</option>`).join('');
    updateNewClientDomainPreview();
  }

  async function refresh() {
    try { render(await api()); } catch (error) { toast(error.message, true); }
  }

  function updateNewClientDomainPreview() {
    const form = document.querySelector('[data-form="client"]');
    const slug = slugify(form.elements.slug.value || form.elements.name.value) || 'loja';
    document.getElementById('platformDomainPreview').textContent = `${slug}.${state.config.baseDomain}`;
    const custom = form.elements.domainMode.value === 'custom';
    const field = document.getElementById('customDomainField');
    field.hidden = !custom;
    field.querySelector('input').required = custom;
  }

  function updateManagedDomainField() {
    const form = document.querySelector('[data-form="client-update"]');
    const custom = form.elements.domainMode.value === 'custom';
    const field = form.querySelector('[data-custom-domain]');
    field.hidden = !custom;
    field.querySelector('input').required = custom;
  }

  function openManageClient(id) {
    const client = state.clients.find((item) => item.id === id);
    if (!client) return;
    const form = document.querySelector('[data-form="client-update"]');
    form.elements.id.value = client.id;
    form.elements.status.value = client.status;
    form.elements.domainMode.value = client.domainMode;
    form.elements.customDomain.value = client.customDomain || '';
    form.elements.domainStatus.value = client.domainStatus;
    form.elements.monthlyFee.value = (client.monthlyFeeCents / 100).toFixed(2);
    form.elements.contactName.value = client.contactName || '';
    form.elements.contactEmail.value = client.contactEmail || '';
    form.elements.contactPhone.value = client.contactPhone || '';
    form.elements.notes.value = client.notes || '';
    document.getElementById('manageClientName').textContent = client.name;
    document.getElementById('manageClientPlatformDomain').textContent = client.platformDomain;
    updateManagedDomainField();
    document.getElementById('manageClientDialog').showModal();
  }

  document.querySelectorAll('[data-open]').forEach((button) => button.addEventListener('click', () => document.getElementById(button.dataset.open).showModal()));
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-manage-client]');
    if (button) openManageClient(button.dataset.manageClient);
  });

  document.querySelectorAll('dialog form').forEach((form) => form.addEventListener('submit', async (event) => {
    if (event.submitter?.value === 'cancel') return;
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    const action = form.dataset.form;
    let method = 'POST';
    if (action === 'client') {
      values.monthlyFeeCents = Math.round(Number(values.monthlyFee || 0) * 100);
      values.setupFeeCents = Math.round(Number(values.setupFee || 0) * 100);
      delete values.monthlyFee;
      delete values.setupFee;
    }
    if (action === 'client-update') {
      method = 'PATCH';
      values.type = 'client';
      values.monthlyFeeCents = Math.round(Number(values.monthlyFee || 0) * 100);
      delete values.monthlyFee;
    }
    if (action === 'service') values.priceCents = Math.round(Number(values.price || 0) * 100);
    try {
      await api({ method, body: JSON.stringify({ action, ...values }) });
      form.closest('dialog').close();
      if (action !== 'client-update') form.reset();
      toast(action === 'client-update' ? 'Concessionária atualizada.' : 'Registro salvo com sucesso.');
      await refresh();
    } catch (error) { toast(error.message, true); }
  }));

  const newClientForm = document.querySelector('[data-form="client"]');
  newClientForm.elements.name.addEventListener('input', () => {
    if (!newClientForm.elements.slug.dataset.edited) newClientForm.elements.slug.value = slugify(newClientForm.elements.name.value);
    updateNewClientDomainPreview();
  });
  newClientForm.elements.slug.addEventListener('input', () => { newClientForm.elements.slug.dataset.edited = 'true'; updateNewClientDomainPreview(); });
  newClientForm.querySelectorAll('[name="domainMode"]').forEach((radio) => radio.addEventListener('change', updateNewClientDomainPreview));
  document.querySelector('[data-form="client-update"]').elements.domainMode.addEventListener('change', updateManagedDomainField);

  function updateProvisionCommand() {
    const form = document.querySelector('[data-form="deployment"]');
    const option = form.elements.clientId.selectedOptions[0];
    const slug = option?.dataset.slug;
    if (!slug) { document.getElementById('provisionCommand').textContent = 'Selecione um cliente'; return; }
    const customDomain = form.elements.domain.value !== option.dataset.platformDomain ? ` ${form.elements.domain.value}` : '';
    document.getElementById('provisionCommand').textContent = `bash deploy/provision-client.sh ${slug} ${form.elements.appPort.value} ${form.elements.postgresPort.value}${customDomain}`;
  }

  document.getElementById('deploymentClient').addEventListener('change', (event) => {
    const option = event.target.selectedOptions[0];
    const form = event.target.form;
    if (!option?.dataset.slug) return;
    const index = Math.max(0, state.clients.findIndex((client) => client.id === option.value));
    form.elements.domain.value = option.dataset.domain;
    form.elements.projectName.value = option.dataset.slug;
    form.elements.appPort.value = 4101 + index;
    form.elements.postgresPort.value = 55101 + index;
    form.elements.installPath.value = `/opt/concessionarias/${option.dataset.slug}`;
    updateProvisionCommand();
  });
  document.querySelectorAll('[data-form="deployment"] input').forEach((input) => input.addEventListener('input', updateProvisionCommand));
  document.getElementById('copyProvisionCommand').addEventListener('click', async () => {
    const command = document.getElementById('provisionCommand').textContent;
    if (!command.startsWith('bash ')) return;
    await navigator.clipboard.writeText(command);
    toast('Comando copiado.');
  });
  document.getElementById('saMenu').addEventListener('click', () => document.getElementById('saShell').classList.toggle('menu-open'));
  document.querySelectorAll('.sa-sidebar a').forEach((link) => link.addEventListener('click', () => document.getElementById('saShell').classList.remove('menu-open')));
  document.querySelectorAll('.sa-collapse').forEach((button) => button.addEventListener('click', () => {
    const card = button.closest('.sa-card');
    card.classList.toggle('is-collapsed');
    button.textContent = card.classList.contains('is-collapsed') ? '+' : '−';
    saveLayout();
  }));

  const board = document.getElementById('saBoard');
  let dragged;
  board.querySelectorAll('.sa-card').forEach((card) => {
    card.draggable = true;
    card.addEventListener('dragstart', () => { dragged = card; card.classList.add('dragging'); });
    card.addEventListener('dragend', () => { card.classList.remove('dragging'); saveLayout(); });
    card.addEventListener('dragover', (event) => { event.preventDefault(); if (dragged && dragged !== card) board.insertBefore(dragged, card); });
  });
  function saveLayout() {
    localStorage.setItem('3esysten-control-layout', JSON.stringify({ order: [...board.children].map((card) => card.dataset.widget), collapsed: [...board.querySelectorAll('.is-collapsed')].map((card) => card.dataset.widget) }));
  }
  try {
    const saved = JSON.parse(localStorage.getItem('3esysten-control-layout') || '{}');
    (saved.order || []).forEach((name) => { const card = board.querySelector(`[data-widget="${name}"]`); if (card) board.appendChild(card); });
    (saved.collapsed || []).forEach((name) => { const card = board.querySelector(`[data-widget="${name}"]`); if (card) { card.classList.add('is-collapsed'); card.querySelector('.sa-collapse').textContent = '+'; } });
  } catch {}
  refresh();
})();
