/* app.js — アプリ全体の初期化とイベント配線 */

document.addEventListener('DOMContentLoaded', async () => {
  await Products.load();

  const input = document.getElementById('search-input');
  const form = document.getElementById('search-form');
  const autocompleteEl = document.getElementById('autocomplete');
  const resultArea = document.getElementById('result-area');
  const recentSection = document.getElementById('recent-section');
  const recentRow = document.getElementById('recent-row');

  let activeIndex = -1;
  let currentSuggestions = [];

  UI.renderRecent(recentRow, recentSection, executeSearch);

  input.addEventListener('input', () => {
    currentSuggestions = Search.suggest(input.value);
    activeIndex = -1;
    renderAutocomplete();
  });

  input.addEventListener('keydown', (e) => {
    if (!currentSuggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, currentSuggestions.length - 1);
      renderAutocomplete();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      renderAutocomplete();
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      pickSuggestion(currentSuggestions[activeIndex]);
    }
  });

  document.addEventListener('click', (e) => {
    if (!autocompleteEl.contains(e.target) && e.target !== input) {
      closeAutocomplete();
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (activeIndex >= 0 && currentSuggestions[activeIndex]) {
      pickSuggestion(currentSuggestions[activeIndex]);
    } else if (currentSuggestions.length) {
      pickSuggestion(currentSuggestions[0]);
    } else if (input.value.trim()) {
      executeSearch(input.value.trim());
    }
  });

  document.querySelectorAll('[data-example]').forEach(chip => {
    chip.addEventListener('click', () => {
      input.value = chip.dataset.example;
      executeSearch(chip.dataset.example);
    });
  });

  function renderAutocomplete() {
    if (!currentSuggestions.length) {
      closeAutocomplete();
      return;
    }
    autocompleteEl.innerHTML = currentSuggestions.map((s, i) =>
      '<button type="button" class="autocomplete-item' + (i === activeIndex ? ' is-active' : '') + '" data-idx="' + i + '">' +
        '<span>' + Search.highlight(s.display, input.value) + '</span>' +
        '<span class="tag">' + (s.type === 'printer' ? 'プリンター' : 'インク') + '</span>' +
      '</button>'
    ).join('');
    autocompleteEl.classList.add('is-open');
    autocompleteEl.querySelectorAll('.autocomplete-item').forEach(btn => {
      btn.addEventListener('click', () => pickSuggestion(currentSuggestions[Number(btn.dataset.idx)]));
    });
  }

  function closeAutocomplete() {
    autocompleteEl.classList.remove('is-open');
    autocompleteEl.innerHTML = '';
  }

  function pickSuggestion(suggestion) {
    input.value = suggestion.display;
    closeAutocomplete();
    executeSearch(suggestion.display, suggestion.inkCode);
  }

  function executeSearch(term, knownInkCode) {
    let inkCode = knownInkCode;
    if (!inkCode) {
      const best = Search.suggest(term)[0];
      inkCode = best ? best.inkCode : null;
    }
    const ink = inkCode ? Products.getInkByCode(inkCode) : null;

    UI.renderResult(resultArea, term, ink);
    resultArea.classList.add('is-open');
    resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });

    UI.addRecent(term);
    UI.renderRecent(recentRow, recentSection, executeSearch);
  }
});
