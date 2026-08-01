/* search.js — 完全一致ではなく曖昧検索（部分一致 + 前方一致優先）でオートコンプリート候補を作る */

const Search = (() => {
  const MAX_SUGGESTIONS = 8;

  function suggest(query) {
    const q = query.trim().toUpperCase();
    if (!q) return [];

    const index = Products.getIndex();
    const seen = new Set();
    const matches = [];

    index.forEach(item => {
      const pos = item.key.indexOf(q);
      if (pos === -1) return;
      const dedupeKey = item.type + ':' + item.display;
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);
      matches.push({ ...item, pos });
    });

    // 前方一致を優先し、それ以外は出現位置が早い順
    matches.sort((a, b) => {
      const aPrefix = a.pos === 0 ? 0 : 1;
      const bPrefix = b.pos === 0 ? 0 : 1;
      if (aPrefix !== bPrefix) return aPrefix - bPrefix;
      if (a.pos !== b.pos) return a.pos - b.pos;
      return a.display.length - b.display.length;
    });

    return matches.slice(0, MAX_SUGGESTIONS);
  }

  function highlight(display, query) {
    const q = query.trim();
    if (!q) return display;
    const idx = display.toUpperCase().indexOf(q.toUpperCase());
    if (idx === -1) return display;
    return (
      display.slice(0, idx) +
      '<mark>' + display.slice(idx, idx + q.length) + '</mark>' +
      display.slice(idx + q.length)
    );
  }

  return { suggest, highlight };
})();
