/* products.js — printers.json / inks.json を読み込み、検索用インデックスを作る */

const Products = (() => {
  let printers = [];
  let inks = [];
  let index = []; // { key, display, type, inkCode }

  async function load() {
    const [pRes, iRes] = await Promise.all([
      fetch('data/printers.json'),
      fetch('data/inks.json'),
    ]);
    printers = await pRes.json();
    inks = await iRes.json();
    buildIndex();
  }

  function buildIndex() {
    index = [];

    printers.forEach(p => {
      index.push({
        key: p.model.toUpperCase(),
        display: p.model,
        type: 'printer',
        inkCode: p.inkCode,
      });
    });

    inks.forEach(ink => {
      index.push({
        key: ink.code.toUpperCase(),
        display: ink.code,
        type: 'ink',
        inkCode: ink.code,
      });
      (ink.aliases || []).forEach(alias => {
        index.push({
          key: alias.toUpperCase(),
          display: alias,
          type: 'ink',
          inkCode: ink.code,
        });
      });
    });
  }

  function getInkByCode(code) {
    return inks.find(i => i.code === code);
  }

  function getIndex() {
    return index;
  }

  return { load, getIndex, getInkByCode };
})();
