(function () {
  'use strict';
  const STAGES = [
    { id: 'NEW', label: 'Novo', color: '#1768e5' },
    { id: 'CONTACTED', statuses: ['CONTACTED', 'QUALIFIED'], label: 'Em contato', color: '#1768e5' },
    { id: 'APPT_SCHEDULED', label: 'Visita marcada', color: '#f28a16' },
    { id: 'NEGOTIATING', label: 'Negociação', color: '#e65b3d' }
  ];
  let leads = [];
  let vehicles = [];
  let appointments = [];

  const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const initials = (name) => String(name || '?').split(/\s+/).slice(0,2).map((part) => part[0]).join('').toUpperCase();
  const normalizedPrice = (value) => Number(value) > 5000000 ? Number(value) / 100 : Number(value) || 0;
  const money = (value) => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL', maximumFractionDigits:0 }).format(normalizedPrice(value));
  const phoneLink = (phone) => `https://wa.me/${String(phone || '').replace(/\D/g,'')}`;
  const roleLabel = (role) => ({ owner:'Proprietário', manager:'Gerente', sales:'Vendedor', bdc:'Pré-vendas' }[role] || 'Admin');
  const imageSource = (value) => {
    const source = String(value || '').trim();
    if (!source) return '../assets/web/car-placeholder.svg';
    if (/^(data:image\/|https?:\/\/|\/)/i.test(source)) return source;
    return `../assets/web/${source.replace(/^\.\.\/assets\/web\//, '')}`;
  };

  function toast(message) {
    const live = document.getElementById('adminLive');
    live.textContent = message; live.classList.add('show');
    clearTimeout(toast.timer); toast.timer = setTimeout(() => live.classList.remove('show'), 2200);
  }

  function stageLeads(stage) {
    const statuses = stage.statuses || [stage.id];
    return leads.filter((lead) => statuses.includes(lead.status));
  }

  function renderKpis() {
    const weekAgo = Date.now() - 7 * 86400000;
    document.getElementById('kpiLeads').textContent = leads.filter((lead) => new Date(lead.createdAt).getTime() >= weekAgo).length;
    document.getElementById('kpiRevenue').textContent = money(vehicles.filter((car) => ['active','featured'].includes(car.status)).reduce((sum, car) => sum + car.price, 0));
    const now = new Date();
    document.getElementById('kpiSales').textContent = leads.filter((lead) => lead.status === 'SOLD' && new Date(lead.updatedAt).getMonth() === now.getMonth()).length;
    document.getElementById('kpiStock').textContent = vehicles.filter((car) => ['active','featured'].includes(car.status)).length;
    document.getElementById('kpiFeatured').textContent = `${vehicles.filter((car) => car.status === 'featured').length} em destaque`;
  }

  function renderPipeline() {
    const board = document.getElementById('pipelineBoard');
    board.innerHTML = STAGES.map((stage) => {
      const items = stageLeads(stage);
      return `<section class="pipeline-column" data-stage="${stage.id}" style="--stage-color:${stage.color}">
        <div class="pipeline-title"><i></i><span>${stage.label}</span><small>${items.length}</small><span>${items.length ? money(items.length * 48750) : ''}</span></div>
        <div class="pipeline-cards">${items.length ? items.slice(0,4).map((lead) => `
          <article class="lead-card" draggable="true" data-lead-id="${lead.id}">
            <strong>${esc(lead.name)}</strong><p>${esc(lead.carName)}</p><small>${esc(lead.phone)}</small>
            <div class="lead-actions"><a class="whatsapp" href="${phoneLink(lead.phone)}" target="_blank" rel="noopener" aria-label="WhatsApp de ${esc(lead.name)}"><span class="material-symbols-rounded">chat</span></a><a href="tel:${esc(lead.phone)}" aria-label="Ligar para ${esc(lead.name)}"><span class="material-symbols-rounded">call</span></a></div>
          </article>`).join('') : '<p class="pipeline-empty">Nenhum atendimento nesta etapa.</p>'}</div>
      </section>`;
    }).join('');
    wireLeadDrag();
  }

  async function moveLead(id, status) {
    const lead = leads.find((item) => item.id === id);
    if (!lead || lead.status === status) return;
    const response = await fetch(`/api/leads/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ status }) });
    if (!response.ok) throw new Error('update');
    lead.status = status;
    renderPipeline(); renderKpis(); toast('Etapa do atendimento atualizada.');
  }

  function wireLeadDrag() {
    let leadId = '';
    document.querySelectorAll('.lead-card').forEach((card) => card.addEventListener('dragstart', () => { leadId = card.dataset.leadId; }));
    document.querySelectorAll('.pipeline-column').forEach((column) => {
      column.addEventListener('dragover', (event) => { event.preventDefault(); column.classList.add('is-over'); });
      column.addEventListener('dragleave', () => column.classList.remove('is-over'));
      column.addEventListener('drop', async (event) => { event.preventDefault(); column.classList.remove('is-over'); try { await moveLead(leadId, column.dataset.stage); } catch { toast('Não foi possível atualizar agora.'); } });
    });
  }

  function renderInventory() {
    document.getElementById('inventoryRows').innerHTML = vehicles.slice(0,5).map((car) => {
      let images = []; try { images = JSON.parse(car.images || '[]'); } catch {}
      const image = imageSource(images[0]);
      return `<tr><td><span class="vehicle-cell"><img src="${esc(image)}" alt="${esc(`${car.make} ${car.model}`)}" onerror="this.onerror=null;this.src='../assets/web/car-placeholder.svg'"><span><strong>${esc(car.make)} ${esc(car.model)}</strong><small>${esc(car.color)} · ${esc(car.transmission)}</small></span></span></td><td>${car.year}</td><td>${Number(car.mileage).toLocaleString('pt-BR')} km</td><td><strong>${money(car.price)}</strong></td><td><span class="status-active">${car.status === 'featured' ? 'Destaque' : 'Disponível'}</span></td><td><span class="row-actions"><a href="inventory.html?edit=${encodeURIComponent(car.id)}" aria-label="Editar veículo"><span class="material-symbols-rounded">edit</span></a><a href="../pages/car-page.html?id=${car.id}" target="_blank" aria-label="Ver no site"><span class="material-symbols-rounded">open_in_new</span></a></span></td></tr>`;
    }).join('') || '<tr><td colspan="6">Nenhum veículo cadastrado.</td></tr>';
  }

  function renderAgenda() {
    const today = new Date();
    const upcoming = appointments.filter((item) => item.status === 'scheduled').sort((a,b) => new Date(a.dateTime)-new Date(b.dateTime)).slice(0,5);
    document.getElementById('agendaList').innerHTML = upcoming.map((item) => {
      const date = new Date(item.dateTime);
      return `<div class="agenda-row"><time>${date.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</time><div><strong>${esc(item.lead?.name || 'Cliente')}</strong><span>${esc(item.vehicle ? `${item.vehicle.make} ${item.vehicle.model}` : item.type === 'test-drive' ? 'Test-drive' : 'Atendimento')}</span></div><span class="contact-avatar">${initials(item.lead?.name)}</span></div>`;
    }).join('') || `<p class="loading-row">Nenhum compromisso agendado para ${today.toLocaleDateString('pt-BR')}.</p>`;
  }

  function renderContacts() {
    document.getElementById('whatsappList').innerHTML = leads.slice(0,6).map((lead) => `<div class="contact-row"><span class="contact-avatar">${initials(lead.name)}</span><div><strong>${esc(lead.name)}</strong><span>${esc(lead.carName)} · ${esc(STAGES.find((s)=>(s.statuses||[s.id]).includes(lead.status))?.label || 'Acompanhar')}</span></div><a href="${phoneLink(lead.phone)}" target="_blank" rel="noopener" aria-label="Abrir WhatsApp de ${esc(lead.name)}"><span class="material-symbols-rounded">chat</span></a></div>`).join('') || '<p class="loading-row">Nenhum contato recente.</p>';
  }

  function wireCollapse() {
    document.querySelectorAll('.collapse-module').forEach((button) => button.addEventListener('click', () => {
      const module = button.closest('.admin-module'); const collapsed = module.classList.toggle('is-collapsed');
      button.setAttribute('aria-expanded', String(!collapsed));
      button.setAttribute('aria-label', `${collapsed ? 'Expandir' : 'Recolher'} ${module.dataset.module === 'pipeline' ? 'pipeline' : module.dataset.module === 'inventory' ? 'estoque' : 'desempenho'}`);
      button.querySelector('span').textContent = collapsed ? 'expand_more' : 'expand_less'; saveLayout();
    }));
    document.querySelectorAll('.drawer-collapse').forEach((button) => button.addEventListener('click', () => {
      const section = button.closest('.drawer-section'); const collapsed = section.classList.toggle('is-collapsed');
      button.setAttribute('aria-expanded', String(!collapsed)); button.querySelector('span').textContent = collapsed ? 'expand_more' : 'expand_less';
    }));
  }

  function saveLayout() {
    const order = [...document.querySelectorAll('#dashboardModules > [data-module]')].map((node) => node.dataset.module);
    const collapsed = [...document.querySelectorAll('#dashboardModules > .is-collapsed')].map((node) => node.dataset.module);
    localStorage.setItem('dealer-dashboard-layout', JSON.stringify({ order, collapsed }));
  }

  function restoreLayout() {
    try {
      const saved = JSON.parse(localStorage.getItem('dealer-dashboard-layout') || '{}'); const host = document.getElementById('dashboardModules');
      (saved.order || []).forEach((id) => { const node = host.querySelector(`[data-module="${id}"]`); if (node) host.appendChild(node); });
      if (saved.collapsed) host.querySelectorAll('[data-module]').forEach((node) => node.classList.toggle('is-collapsed', saved.collapsed.includes(node.dataset.module)));
    } catch {}
  }

  function syncCollapseButtons() {
    document.querySelectorAll('.admin-module').forEach((module) => {
      const button = module.querySelector('.collapse-module');
      if (!button) return;
      const expanded = !module.classList.contains('is-collapsed');
      button.setAttribute('aria-expanded', String(expanded));
      button.setAttribute('aria-label', `${expanded ? 'Recolher' : 'Expandir'} ${module.dataset.module === 'pipeline' ? 'pipeline' : module.dataset.module === 'inventory' ? 'estoque' : 'desempenho'}`);
      button.querySelector('span').textContent = expanded ? 'expand_less' : 'expand_more';
    });
  }

  function wireModuleDrag() {
    let dragged = null; const host = document.getElementById('dashboardModules');
    host.querySelectorAll('[data-module]').forEach((module) => {
      const handle = module.querySelector('.drag-handle');
      module.draggable = false;
      handle.addEventListener('pointerdown', () => { module.draggable = true; });
      handle.addEventListener('pointerup', () => { module.draggable = false; });
      module.addEventListener('dragstart', () => { dragged = module; module.classList.add('dragging'); });
      module.addEventListener('dragend', () => { module.classList.remove('dragging'); host.querySelectorAll('.drag-target').forEach((node) => node.classList.remove('drag-target')); saveLayout(); });
      module.addEventListener('dragover', (event) => { event.preventDefault(); if (module !== dragged) module.classList.add('drag-target'); });
      module.addEventListener('dragleave', () => module.classList.remove('drag-target'));
      module.addEventListener('drop', (event) => { event.preventDefault(); module.classList.remove('drag-target'); if (dragged && module !== dragged) host.insertBefore(dragged, module); });
    });
  }

  function wireShell() {
    const shell = document.getElementById('adminShell');
    document.getElementById('sidebarToggle').addEventListener('click', () => { const collapsed = shell.classList.toggle('sidebar-collapsed'); localStorage.setItem('dealer-sidebar-collapsed', String(collapsed)); });
    if (localStorage.getItem('dealer-sidebar-collapsed') === 'true') shell.classList.add('sidebar-collapsed');
    document.getElementById('mobileMenu').addEventListener('click', () => shell.classList.toggle('mobile-nav-open'));
    document.getElementById('resetLayout').addEventListener('click', () => { localStorage.removeItem('dealer-dashboard-layout'); location.reload(); });
    const search = document.getElementById('dashboardSearch');
    document.addEventListener('keydown', (event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); search.focus(); } });
    search.addEventListener('keydown', (event) => { if (event.key === 'Enter' && search.value.trim()) location.href = `crm.html?q=${encodeURIComponent(search.value.trim())}`; });
    const profileButton = document.getElementById('profileMenuButton');
    const profileMenu = document.getElementById('profileMenu');
    profileButton.addEventListener('click', (event) => {
      event.stopPropagation();
      const opening = profileMenu.hidden;
      profileMenu.hidden = !opening;
      profileButton.setAttribute('aria-expanded', String(opening));
      profileButton.querySelector('.material-symbols-rounded:last-child').textContent = opening ? 'expand_less' : 'expand_more';
    });
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.profile-menu-wrap')) {
        profileMenu.hidden = true;
        profileButton.setAttribute('aria-expanded', 'false');
        profileButton.querySelector('.material-symbols-rounded:last-child').textContent = 'expand_more';
      }
    });
  }

  async function load() {
    const bootstrap = window.DEALER_BOOTSTRAP || {};
    let branding = {};
    let operator = {};
    if (Array.isArray(bootstrap.leads) && Array.isArray(bootstrap.vehicles) && Array.isArray(bootstrap.appointments)) {
      leads = bootstrap.leads; vehicles = bootstrap.vehicles; appointments = bootstrap.appointments;
      branding = bootstrap.branding || {};
      operator = bootstrap.operator || {};
    } else {
      const [leadResponse, vehicleResponse, appointmentResponse, brandResponse] = await Promise.all([fetch('/api/leads'), fetch('/api/vehicles'), fetch('/api/appointments'), fetch('/api/branding')]);
      if (![leadResponse,vehicleResponse,appointmentResponse].every((response) => response.ok)) throw new Error('Dados indisponíveis');
      leads = (await leadResponse.json()).leads || []; vehicles = (await vehicleResponse.json()).vehicles || []; appointments = (await appointmentResponse.json()).appointments || [];
      const brandPayload = brandResponse.ok ? await brandResponse.json() : { branding:{} };
      branding = brandPayload.branding || {};
    }
    document.querySelector('.admin-brand-name').textContent = branding.brandName || 'Sua Concessionária';
    document.querySelector('.admin-brand-location').textContent = branding.address || 'Localização da loja';
    const operatorName = operator.name || 'Administrador da loja';
    document.querySelector('[data-operator-name]').textContent = operatorName;
    document.querySelector('[data-operator-role]').textContent = roleLabel(operator.role);
    document.querySelector('[data-operator-initials]').textContent = initials(operatorName);
    document.getElementById('dashboardGreeting').textContent = `Bom dia, ${operatorName.split(/\s+/)[0]}`;
    renderKpis(); renderPipeline(); renderInventory(); renderAgenda(); renderContacts();
  }

  const date = new Date();
  document.getElementById('todayLabel').textContent = date.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).replace(/^./,(c)=>c.toUpperCase());
  restoreLayout(); syncCollapseButtons(); wireCollapse(); wireModuleDrag(); wireShell();
  load().catch(() => toast('Não foi possível carregar os dados do painel.'));
})();
