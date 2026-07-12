const fs = require('fs');

try {
  const html = fs.readFileSync('index.html', 'utf8');
  const css = fs.readFileSync('style.css', 'utf8');
  const audioJs = fs.readFileSync('audio.js', 'utf8');
  const gameJs = fs.readFileSync('game.js', 'utf8');

  const gasStoragePolyfill = `
const gasStorage = {
  _data: {},
  setItem: function(id, val) { return this._data[id] = String(val); },
  getItem: function(id) { return this._data.hasOwnProperty(id) ? this._data[id] : null; },
  removeItem: function(id) { return delete this._data[id]; },
  clear: function() { return this._data = {}; }
};
  `.trim();

  let modifiedAudioJs = audioJs.replace(/localStorage/g, 'gasStorage');
  let modifiedGameJs = gameJs.replace(/localStorage/g, 'gasStorage');

  let gasHtml = html
    .split('<link rel="stylesheet" href="style.css?v=6">').join(`<style>\n${css}\n</style>`)
    .split('<link rel="stylesheet" href="style.css">').join(`<style>\n${css}\n</style>`)
    .split('<script src="audio.js?v=6"></script>').join(`<script>\n${gasStoragePolyfill}\n</script>\n<script>\n${modifiedAudioJs}\n</script>`)
    .split('<script src="game.js?v=6"></script>').join(`<script>\n${modifiedGameJs}\n</script>`)
    .replace(/<link rel="manifest" href="manifest\.json">/, '')
    .replace(/<script>\s*if \('serviceWorker' in navigator\) \{[\s\S]*?<\/script>/, '');

  fs.writeFileSync('gas_index.html', gasHtml, 'utf8');
  console.log('✅ GAS用のファイル (gas_index.html) の生成が完了しました！');
} catch (err) {
  console.error('エラーが発生しました:', err);
}
