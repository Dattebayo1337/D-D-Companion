(function () {
  if (window.__companionDownloads) return;
  window.__companionDownloads = true;
  window.print = function () { if (window.CompanionFiles) window.CompanionFiles.postMessage("print"); else alert("Обновите Android System WebView для печати"); };
  window.__companionSaveBlob = async function (url, name) {
    try {
      if (!url.startsWith('blob:' + location.origin + '/')) throw new Error('Неподдерживаемая ссылка');
      const blob = await (await fetch(url)).blob();
      if (blob.size > 16 * 1024 * 1024) throw new Error('Файл больше 16 МБ');
      if (!window.CompanionFiles) throw new Error('Обновите Android System WebView для сохранения файлов');
      const reader = new FileReader();
      reader.onload = () => window.CompanionFiles.postMessage(JSON.stringify({name: name || 'export', mime: blob.type, base64: String(reader.result).split(',')[1]}));
      reader.readAsDataURL(blob);
    } catch (error) { alert('Не удалось сохранить файл: ' + error.message); }
  };
  document.addEventListener('click', event => {
    const anchor = event.target.closest && event.target.closest('a[download]');
    if (anchor && anchor.href.startsWith('blob:')) {
      event.preventDefault();
      window.__companionSaveBlob(anchor.href, anchor.download);
    }
  }, true);
  // Existing exports click detached anchors, so document listeners alone cannot see them.
  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.hasAttribute('download') && this.href.startsWith('blob:')) {
      window.__companionSaveBlob(this.href, this.download);
      return;
    }
    return click.call(this);
  };
})();
