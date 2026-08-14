(() => {
  const state = { clients: [], services: [], deployments: [] };
  const money = (cents = 0) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const labels = { lead: 'Lead', onboarding: 'Implantação', active: 'Ativo', suspended: 'Suspenso', cancelled: 'Cancelado', pending: 'Pendente', building: 'Publicando', healthy: 'Saudável', degraded: 'Instável', offline: 'Offline' };
  const toast = (message, error = false) => { const node = document.getElementById('saToast'); node.textContent = message; node.className = `sa-toast show${error ? ' error' : ''}`; clearTimeout(toast.timer); toast.timer = setTimeout(() => { node.className = 'sa-toast'; }, 3200); };

  async function api(options = {}) {
    const response = await fetch('/api/platform-admin', { headers: { 'Content-Type': 'application/json' }, ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a operação');
    return data;
  }

  function render(data) {
    Object.assign(state, data);
    document.getElementById('mrr').textContent = money(data.metrics.mrrCents);
    document.getElementById('activeClients').textContent = data.metrics.activeClients;
    document.getElementById('totalClients').textContent = `${data.metrics.totalClients} na carteira`;
    document.getElementById('onboardingClients').textContent = data.metrics.onboardingClients;
    document.getElementById('healthyDeployments').textContent = data.metrics.healthyDeployments;
    document.getElementById('clientsRows').innerHTML = data.clients.length ? data.clients.map((client) => `<tr><td><strong>${escapeHtml(client.name)}</strong><span class="sa-domain">${escapeHtml(client.contactName || client.contactPhone || 'Sem contato')}</span></td><td>${escapeHtml(client.domain)}</td><td><span class="sa-status ${escapeHtml(client.status)}">${labels[client.status] || client.status}</span></td><td>${money(client.monthlyFeeCents)}</td><td>${client.subscriptions.filter((item) => item.status === 'active').length}</td></tr>`).join('') : '<tr><td colspan="5" class="sa-empty">Nenhum cliente cadastrado ainda.</td></tr>';
    document.getElementById('serviceList').innerHTML = data.services.length ? data.services.map((service) => `<article class="sa-service"><strong>${escapeHtml(service.name)}</strong><p>${escapeHtml(service.description || (service.billingType === 'monthly' ? 'Cobrança mensal' : 'Cobrança única'))}</p><b>${money(service.priceCents)}${service.billingType === 'monthly' ? '/mês' : ''}</b></article>`).join('') : '<p class="sa-empty">Cadastre os serviços que você quer oferecer.</p>';
    document.getElementById('deploymentList').innerHTML = data.deployments.length ? data.deployments.map((item) => `<article class="sa-deployment"><strong>${escapeHtml(item.client.name)}</strong><p>${escapeHtml(item.domain)} · ${escapeHtml(item.appContainer)}</p><span class="sa-status ${escapeHtml(item.status)}">${labels[item.status] || item.status}</span></article>`).join('') : '<p class="sa-empty">Nenhuma instalação preparada.</p>';
    document.getElementById('deploymentClient').innerHTML = '<option value="">Selecione...</option>' + data.clients.map((client) => `<option value="${escapeHtml(client.id)}" data-domain="${escapeHtml(client.domain)}" data-slug="${escapeHtml(client.slug)}">${escapeHtml(client.name)}</option>`).join('');
  }

  async function refresh() { try { render(await api()); } catch (error) { toast(error.message, true); } }

  document.querySelectorAll('[data-open]').forEach((button) => button.addEventListener('click', () => document.getElementById(button.dataset.open).showModal()));
  document.querySelectorAll('dialog form').forEach((form) => form.addEventListener('submit', async (event) => {
    if (event.submitter?.value === 'cancel') return;
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    const action = form.dataset.form;
    if (action === 'client') { values.monthlyFeeCents = Math.round(Number(values.monthlyFee || 0) * 100); values.setupFeeCents = Math.round(Number(values.setupFee || 0) * 100); }
    if (action === 'service') values.priceCents = Math.round(Number(values.price || 0) * 100);
    try { await api({ method: 'POST', body: JSON.stringify({ action, ...values }) }); form.closest('dialog').close(); form.reset(); toast('Registro salvo com sucesso.'); await refresh(); } catch (error) { toast(error.message, true); }
  }));

  document.getElementById('deploymentClient').addEventListener('change', (event) => { const option = event.target.selectedOptions[0]; const form = event.target.form; if (option?.dataset.domain) form.domain.value = option.dataset.domain; if (option?.dataset.slug) form.projectName.value = option.dataset.slug; });
  document.getElementById('saMenu').addEventListener('click', () => document.getElementById('saShell').classList.toggle('menu-open'));
  document.querySelectorAll('.sa-sidebar a').forEach((link) => link.addEventListener('click', () => document.getElementById('saShell').classList.remove('menu-open')));
  document.querySelectorAll('.sa-collapse').forEach((button) => button.addEventListener('click', () => { const card = button.closest('.sa-card'); card.classList.toggle('is-collapsed'); button.textContent = card.classList.contains('is-collapsed') ? '+' : '−'; saveLayout(); }));

  const board = document.getElementById('saBoard'); let dragged;
  board.querySelectorAll('.sa-card').forEach((card) => { card.draggable = true; card.addEventListener('dragstart', () => { dragged = card; card.classList.add('dragging'); }); card.addEventListener('dragend', () => { card.classList.remove('dragging'); saveLayout(); }); card.addEventListener('dragover', (event) => { event.preventDefault(); if (dragged && dragged !== card) board.insertBefore(dragged, card); }); });
  function saveLayout() { localStorage.setItem('3esysten-control-layout', JSON.stringify({ order: [...board.children].map((card) => card.dataset.widget), collapsed: [...board.querySelectorAll('.is-collapsed')].map((card) => card.dataset.widget) })); }
  try { const saved = JSON.parse(localStorage.getItem('3esysten-control-layout') || '{}'); (saved.order || []).forEach((name) => { const card = board.querySelector(`[data-widget="${name}"]`); if (card) board.appendChild(card); }); (saved.collapsed || []).forEach((name) => { const card = board.querySelector(`[data-widget="${name}"]`); if (card) { card.classList.add('is-collapsed'); card.querySelector('.sa-collapse').textContent = '+'; } }); } catch {}
  refresh();
})();
