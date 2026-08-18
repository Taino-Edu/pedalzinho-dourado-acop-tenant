(function () {
  'use strict';

  let cars = [];
  let branding = {};
  const grid = document.getElementById('showroomGrid');
  const makeSelect = document.getElementById('finderMake');
  const modelSelect = document.getElementById('finderModel');
  const priceSelect = document.getElementById('finderPrice');
  const feedback = document.getElementById('finderFeedback');

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function normalizedPrice(value) {
    const price = Number(value) || 0;
    return price > 5000000 ? price / 100 : price;
  }

  function money(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(normalizedPrice(value));
  }

  function detailUrl(car) {
    return `pages/car-page.html?id=${encodeURIComponent(car.id)}`;
  }

  /* Vehicle photos reach us in three shapes: a bare file name shipped with the
     site, an absolute/remote URL, and a data: URI for photos uploaded through
     the dashboard. Only the first may be prefixed with the asset folder —
     prefixing the other two produces a broken <img>. */
  function imageUrl(source) {
    const value = String(source == null ? '' : source).trim();
    if (!value) return 'assets/web/car-placeholder.svg';
    if (/^(data:image\/|(https?:)?\/\/|\/)/i.test(value)) return value;
    return 'assets/web/' + value;
  }

  function render(list) {
    if (!list.length) {
      grid.innerHTML = '<p class="showroom-loading">Nenhum veículo encontrado com esses filtros.</p>';
      return;
    }
    grid.innerHTML = list.slice(0, 6).map((car) => `
      <article class="vehicle-card">
        <a class="vehicle-media" href="${detailUrl(car)}">
          <img src="${esc(imageUrl(car.image))}" alt="${esc(car.name)}" loading="lazy" onerror="this.onerror=null;this.src='assets/web/car-placeholder.svg'">
          <span class="vehicle-year">${esc(car.year)}</span>
        </a>
        <div class="vehicle-body">
          <h3>${esc(car.name)}</h3>
          <p class="vehicle-specs">${esc(car.engine)} · ${esc(car.mileage)} · ${esc(car.drivetrain)}</p>
          <strong class="vehicle-price">${money(car.price)}</strong>
          <div class="vehicle-actions">
            <a href="${detailUrl(car)}">Ver detalhes</a>
            <button type="button" data-car-whatsapp="${esc(car.name)}" aria-label="Falar sobre ${esc(car.name)}"><span class="material-symbols-rounded" aria-hidden="true">chat</span>WhatsApp</button>
          </div>
        </div>
      </article>`).join('');
  }

  function populateMakes() {
    [...new Set(cars.map((car) => car.brand))].sort().forEach((make) => {
      makeSelect.insertAdjacentHTML('beforeend', `<option value="${esc(make)}">${esc(make)}</option>`);
    });
  }

  function populateModels() {
    const selectedMake = makeSelect.value;
    const selectedModel = modelSelect.value;
    const models = [...new Set(cars.filter((car) => !selectedMake || car.brand === selectedMake).map((car) => car.name.replace(/^\d{4}\s+/, '')))].sort();
    modelSelect.innerHTML = '<option value="">Todos os modelos</option>' + models.map((model) => `<option value="${esc(model)}">${esc(model)}</option>`).join('');
    if (models.includes(selectedModel)) modelSelect.value = selectedModel;
  }

  function filterCars() {
    const maxPrice = Number(priceSelect.value) || Infinity;
    const list = cars.filter((car) => {
      const model = car.name.replace(/^\d{4}\s+/, '');
      return (!makeSelect.value || car.brand === makeSelect.value)
        && (!modelSelect.value || model === modelSelect.value)
        && normalizedPrice(car.price) <= maxPrice;
    });
    feedback.textContent = list.length === cars.length ? '' : `${list.length} veículo${list.length === 1 ? '' : 's'} encontrado${list.length === 1 ? '' : 's'}.`;
    render(list);
    document.getElementById('veiculos').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.getElementById('vehicleFinder').addEventListener('submit', (event) => { event.preventDefault(); filterCars(); });
  makeSelect.addEventListener('change', populateModels);

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-car-whatsapp]');
    if (!button) return;
    const number = String(branding.whatsapp || '').replace(/\D/g, '');
    if (number) {
      window.open(`https://wa.me/${number}?text=${encodeURIComponent(`Olá! Gostaria de saber mais sobre o ${button.dataset.carWhatsapp}.`)}`, '_blank', 'noopener');
    } else if (typeof window.openTestDriveModal === 'function') {
      window.openTestDriveModal(button.dataset.carWhatsapp);
    }
  });

  Promise.all([
    fetch('/api/catalog').then((response) => response.ok ? response.json() : Promise.reject(new Error('catalog'))),
    fetch('/api/branding').then((response) => response.ok ? response.json() : { branding: {} })
  ]).then(([catalogPayload, brandingPayload]) => {
    cars = catalogPayload.cars || [];
    branding = brandingPayload.branding || {};
    populateMakes();
    populateModels();
    render(cars);
    document.querySelectorAll('.footer-brand-name').forEach((node) => { node.textContent = branding.brandName || 'Sua Concessionária'; });
  }).catch(() => { grid.innerHTML = '<p class="showroom-loading">Não foi possível carregar o estoque agora.</p>'; });
})();
