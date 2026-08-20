/**
 * AutoSuite — vehicle comparison
 * Two responsibilities, both guarded so this file is safe to include
 * everywhere: (1) on the listing page, track which cars are checked for
 * comparison (localStorage, max 3) and show a floating "Compare" bar;
 * (2) on the compare page itself, render the side-by-side spec table.
 */

(function () {
  const STORAGE_KEY = 'autosuite_compare';
  const MAX_COMPARE = 3;

  function getCompareIds() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch (err) {
      return [];
    }
  }

  function setCompareIds(ids) {
    const normalized = [...new Set(ids.map(String))].slice(0, MAX_COMPARE);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    document.dispatchEvent(new CustomEvent('autosuite:compare-changed', { detail: { ids: normalized } }));
  }

  function comparisonUrl(ids) {
    return ids.length >= 2 ? `compare.html?ids=${ids.map(encodeURIComponent).join(',')}` : 'compare.html';
  }

  function updateNavigationLinks(ids) {
    document.querySelectorAll('a[aria-label="Comparar"]').forEach((link) => {
      link.href = comparisonUrl(ids);
    });
  }

  // Nav-badge access, same pattern as window.AutoSuiteFavorites.
  window.AutoSuiteCompare = {
    getIds: getCompareIds,
    count: () => getCompareIds().length,
  };

  /* ---------- Listing page: checkbox selection + floating bar ---------- */
  function initListingCompare() {
    const grid = document.getElementById('carsGrid');
    if (!grid) return;

    let bar = document.getElementById('compareBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'compareBar';
      bar.className = 'compare-bar';
      bar.setAttribute('role', 'region');
      bar.setAttribute('aria-label', 'Veículos selecionados para comparação');
      bar.innerHTML = `
        <span id="compareBarCount"></span>
        <div class="compare-bar-actions">
          <button type="button" class="btn outline small" id="compareBarClear">Limpar</button>
          <a class="btn small" id="compareBarGo" href="compare.html">Comparar</a>
        </div>
      `;
      document.body.appendChild(bar);
      document.getElementById('compareBarClear').addEventListener('click', () => {
        setCompareIds([]);
        syncCheckboxes();
        updateBar();
      });
    }

    function updateBar() {
      const ids = getCompareIds();
      const count = document.getElementById('compareBarCount');
      const go = document.getElementById('compareBarGo');
      updateNavigationLinks(ids);
      if (ids.length >= 2) {
        bar.classList.add('visible');
        count.textContent = `${ids.length} veículos selecionados`;
        go.href = comparisonUrl(ids);
      } else {
        bar.classList.remove('visible');
      }
    }

    function syncCheckboxes() {
      const ids = getCompareIds();
      grid.querySelectorAll('.compare-toggle').forEach((box) => {
        box.checked = ids.includes(box.dataset.id);
      });
    }

    grid.addEventListener('change', (event) => {
      const box = event.target.closest('.compare-toggle');
      if (!box) return;

      let ids = getCompareIds();
      if (box.checked) {
        if (ids.length >= MAX_COMPARE) {
          box.checked = false;
          alert(`Você pode comparar no máximo ${MAX_COMPARE} veículos por vez.`);
          return;
        }
        ids.push(box.dataset.id);
      } else {
        ids = ids.filter((id) => id !== box.dataset.id);
      }
      setCompareIds(ids);
      updateBar();
    });

    window.addEventListener('autosuite:cards-rendered', () => {
      syncCheckboxes();
      updateBar();
    });

    syncCheckboxes();
    updateBar();
  }

  /* ---------- Compare page: side-by-side table ---------- */
  async function initComparePage() {
    const container = document.getElementById('compareTable');
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const queryIds = (params.get('ids') || '').split(',').map((id) => decodeURIComponent(id)).filter(Boolean);
    const ids = queryIds.length >= 2 ? queryIds : getCompareIds();

    if (ids.length < 2) {
      container.innerHTML = `<p class="empty-state">Selecione de 2 a 3 veículos no <a href="cars.html">estoque</a> para comparar.</p>`;
      return;
    }

    try {
      const cars = await fetchCars();
      const selected = ids.map((id) => cars.find((c) => String(c.id) === String(id))).filter(Boolean);

      if (selected.length < 2) {
        container.innerHTML = `<p class="empty-state">Os veículos selecionados não estão mais disponíveis. <a href="cars.html">Escolha outros no estoque</a>.</p>`;
        return;
      }

      const rows = [
        ['Preço', (c) => formatPrice(c.price)],
        ['Ano', (c) => c.year],
        ['Motor', (c) => c.engine || 'Não informado'],
        ['Potência', (c) => c.horsepower && c.horsepower !== '—' ? `${c.horsepower} cv` : 'Não informada'],
        ['Tração', (c) => c.drivetrain || 'Não informada'],
        ['Quilometragem', (c) => c.mileage],
      ];

      container.innerHTML = `
        <table class="compare-table">
          <thead>
            <tr>
              <th scope="col"></th>
              ${selected.map((c) => `<th scope="col"><img src="${imageUrl(c.image)}" alt="${c.name}"><div>${c.name}</div></th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                ([label, fn]) => `
              <tr>
                <th scope="row">${label}</th>
                ${selected.map((c) => `<td>${fn(c)}</td>`).join('')}
              </tr>`
              )
              .join('')}
            <tr>
              <th scope="row"></th>
              ${selected.map((c) => `<td><a class="btn small" href="${carDetailUrl(c)}">Ver detalhes</a></td>`).join('')}
            </tr>
          </tbody>
        </table>
      `;
    } catch (err) {
      console.error(err);
      container.innerHTML = `<p class="empty-state">O estoque está temporariamente indisponível. Tente novamente em instantes.</p>`;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initListingCompare();
    initComparePage();
  });
})();
