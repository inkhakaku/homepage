/* ui.js — 検索結果カードの描画、色選択UI、最近検索した型番の表示 */

const UI = (() => {
  const RECENT_KEY = 'inkkakakuou_recent_v1';
  const MAX_RECENT = 6;

  function renderResult(container, queryDisplay, ink) {
    if (!ink) {
      container.innerHTML =
        '<p class="result-lead">「<span class="q">' + escapeHtml(queryDisplay) + '</span>」の検索結果</p>' +
        '<p class="no-result">対応するインクが見つかりませんでした。型番をご確認のうえ、もう一度お試しください。</p>';
      return;
    }

    const variantHtml = ink.variants.map((v, i) =>
      '<div class="variant' + (i === 0 ? ' is-selected' : '') + '" data-variant-id="' + v.id + '" data-price="' + v.price + '">' +
        '<div class="label">' + escapeHtml(v.label) + '</div>' +
        '<div class="price">¥' + v.price.toLocaleString() + '</div>' +
        '<div class="stock">' + escapeHtml(v.stock) + '</div>' +
      '</div>'
    ).join('');

    const compat = ink.compatiblePrinters && ink.compatiblePrinters.length
      ? '対応プリンター: ' + ink.compatiblePrinters.join(' / ')
      : '';

    const imageSrc = ink.image || 'images/products/placeholder.svg';

    container.innerHTML =
      '<p class="result-lead">「<span class="q">' + escapeHtml(queryDisplay) + '</span>」の検索結果</p>' +
      '<div class="result-card">' +
        '<div class="result-card-top">' +
          '<img class="product-thumb" src="' + escapeHtml(imageSrc) + '" alt="' + escapeHtml(ink.name) + '">' +
          '<div class="result-card-heading">' +
            '<h3>' + escapeHtml(ink.name) + '</h3>' +
            (compat ? '<div class="compat-list">' + escapeHtml(compat) + '</div>' : '') +
          '</div>' +
        '</div>' +
        '<div class="variant-grid">' + variantHtml + '</div>' +
        '<div class="color-picker" style="display:none;"></div>' +
        '<button class="buy-btn" type="button">購入する</button>' +
      '</div>';

    const card = container.querySelector('.result-card');
    const variants = card.querySelectorAll('.variant');
    const colorPickerEl = card.querySelector('.color-picker');
    const buyButton = card.querySelector('.buy-btn');

    let selectedColors = [];

    function getVariant(id) {
      return ink.variants.find(v => v.id === id);
    }

    function updateBuyState() {
      const selected = card.querySelector('.variant.is-selected');
      const variant = selected ? getVariant(selected.dataset.variantId) : null;

      if (variant && variant.colorPick) {
        const needed = variant.colorPick.count;
        buyButton.disabled = selectedColors.length !== needed;
        if (buyButton.disabled) {
          buyButton.textContent = '色を選んでください（' + selectedColors.length + '/' + needed + '）';
        } else {
          buyButton.textContent = '購入する';
        }
      } else {
        buyButton.disabled = false;
        buyButton.textContent = '購入する';
      }
    }

    function renderColorPicker(variant) {
      selectedColors = [];

      if (!variant || !variant.colorPick || !ink.colorOptions || !ink.colorOptions.length) {
        colorPickerEl.style.display = 'none';
        colorPickerEl.innerHTML = '';
        updateBuyState();
        return;
      }

      const needed = variant.colorPick.count;
      const scope = variant.colorPick.scope;
      const options = scope === 'colorOnly'
        ? ink.colorOptions.filter(c => c.id !== 'black')
        : ink.colorOptions;

      colorPickerEl.style.display = 'block';
      colorPickerEl.innerHTML =
        '<div class="color-picker-lead">色を' + needed + '個選んでください（同じ色を複数回選べます）</div>' +
        '<div class="color-chip-row">' +
          options.map(c =>
            '<button type="button" class="color-chip" data-color-id="' + escapeHtml(c.id) + '" data-color-label="' + escapeHtml(c.label) + '">' +
              '<span class="color-chip-label">' + escapeHtml(c.label) + '</span>' +
              '<span class="color-chip-count" style="display:none;"></span>' +
            '</button>'
          ).join('') +
        '</div>' +
        '<div class="color-selected-row"></div>';

      const selectedRow = colorPickerEl.querySelector('.color-selected-row');

      function renderSelectedRow() {
        selectedRow.innerHTML = selectedColors.map((c, i) =>
          '<span class="color-selected-tag">' + escapeHtml(c.label) +
            '<button type="button" class="color-remove-btn" data-index="' + i + '" aria-label="削除">×</button>' +
          '</span>'
        ).join('');

        selectedRow.querySelectorAll('.color-remove-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const i = Number(btn.dataset.index);
            selectedColors.splice(i, 1);
            refreshChipCounts();
            renderSelectedRow();
            updateBuyState();
          });
        });
      }

      function refreshChipCounts() {
        colorPickerEl.querySelectorAll('.color-chip').forEach(chip => {
          const id = chip.dataset.colorId;
          const count = selectedColors.filter(c => c.id === id).length;
          const countEl = chip.querySelector('.color-chip-count');
          if (count > 0) {
            countEl.style.display = 'inline';
            countEl.textContent = '×' + count;
            chip.classList.add('is-selected');
          } else {
            countEl.style.display = 'none';
            chip.classList.remove('is-selected');
          }
        });
      }

      colorPickerEl.querySelectorAll('.color-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          if (selectedColors.length >= needed) return;
          const id = chip.dataset.colorId;
          const label = chip.dataset.colorLabel;
          selectedColors.push({ id, label });
          refreshChipCounts();
          renderSelectedRow();
          updateBuyState();
        });
      });

      updateBuyState();
    }

    variants.forEach(v => {
      v.addEventListener('click', () => {
        variants.forEach(x => x.classList.remove('is-selected'));
        v.classList.add('is-selected');
        renderColorPicker(getVariant(v.dataset.variantId));
      });
    });

    // 初期表示（1件目のバリエーション）
    renderColorPicker(getVariant(variants[0].dataset.variantId));

    // Stripe Checkoutへ移動
    buyButton.addEventListener('click', async () => {
      const selected = card.querySelector('.variant.is-selected');

      if (!selected) {
        alert('商品を選択してください。');
        return;
      }

      const variant = getVariant(selected.dataset.variantId);

      if (variant.colorPick && selectedColors.length !== variant.colorPick.count) {
        alert('色を' + variant.colorPick.count + '個選んでください。');
        return;
      }

      const variantId = selected.dataset.variantId;
      const colorLabels = selectedColors.map(c => c.label);

      try {
        buyButton.disabled = true;
        buyButton.textContent = '決済ページへ移動中…';

        const response = await fetch('https://homepage.tenten001173.workers.dev/api/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            variantId: variantId,
            colors: colorLabels
          })
        });

        const data = await response.json();

        if (!response.ok || !data.url) {
          throw new Error(data.error || '決済ページの作成に失敗しました。');
        }

        window.location.href = data.url;

      } catch (error) {
        console.error(error);
        alert(error.message || '決済ページへの移動に失敗しました。');

        buyButton.disabled = false;
        buyButton.textContent = '購入する';
      }
    });
  }

  function addRecent(term) {
    const list = getRecent().filter(t => t.toUpperCase() !== term.toUpperCase());
    list.unshift(term);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  }

  function getRecent() {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function renderRecent(container, sectionEl, onPick) {
    const list = getRecent();

    if (!list.length) {
      sectionEl.classList.remove('has-items');
      return;
    }

    sectionEl.classList.add('has-items');

    container.innerHTML = list.map(term =>
      '<button type="button" class="chip" data-term="' + escapeHtml(term) + '">' + escapeHtml(term) + '</button>'
    ).join('');

    container.querySelectorAll('.chip').forEach(btn => {
      btn.addEventListener('click', () => onPick(btn.dataset.term));
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[s]));
  }

  return { renderResult, addRecent, renderRecent };
})();
