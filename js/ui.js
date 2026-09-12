/* ui.js — 検索結果カードの描画、最近検索した型番の表示（一覧画面は使わない） */

const UI = (() => {
  const RECENT_KEY = 'inkkakakuou_recent_v1';
  const MAX_RECENT = 6;

  function starString(rating) {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

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
            '<div class="stars">' + starString(ink.rating) + '</div>' +
            (compat ? '<div class="compat-list">' + escapeHtml(compat) + '</div>' : '') +
          '</div>' +
        '</div>' +
        '<div class="variant-grid">' + variantHtml + '</div>' +
        '<button class="buy-btn" type="button">購入する</button>' +
      '</div>';

    const card = container.querySelector('.result-card');
    const variants = card.querySelectorAll('.variant');

    variants.forEach(v => {
      v.addEventListener('click', () => {
        variants.forEach(x => x.classList.remove('is-selected'));
        v.classList.add('is-selected');
      });
    });

    // Stripe Checkoutへ移動
    card.querySelector('.buy-btn').addEventListener('click', async () => {
      const selected = card.querySelector('.variant.is-selected');

      if (!selected) {
        alert('商品を選択してください。');
        return;
      }

      const variantId = selected.dataset.variantId;
      const buyButton = card.querySelector('.buy-btn');

      try {
        buyButton.disabled = true;
        buyButton.textContent = '決済ページへ移動中…';

        const response = await fetch('https://homepage.tenten001173.workers.dev/api/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            variantId: variantId
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
