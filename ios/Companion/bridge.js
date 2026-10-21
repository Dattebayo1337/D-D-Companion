(() => {
  if (window.top !== window || window.__companionIOS) return;
  window.__companionIOS = true;
  window.CompanionOffline = {
    save: (card) =>
      window.webkit.messageHandlers.CompanionOffline.postMessage(card),
  };
  window.print = () =>
    window.webkit.messageHandlers.CompanionFiles.postMessage({
      action: "print",
    });
  async function save(url, name) {
    try {
      if (
        !(
          url.startsWith("blob:" + location.origin + "/") ||
          new URL(url).origin === location.origin
        )
      )
        throw Error("Другой сервер");
      const response = await fetch(url, { credentials: "same-origin" });
      if (
        !response.ok ||
        (response.redirected &&
          new URL(response.url).origin !== location.origin)
      )
        throw Error("Файл недоступен или перенаправлен на другой сервер");
      const blob = await response.blob();
      if (blob.size > 16 * 1024 * 1024) throw Error("Файл больше 16 МБ");
      const reader = new FileReader();
      reader.onload = () =>
        window.webkit.messageHandlers.CompanionFiles.postMessage({
          action: "file",
          name: name || "export",
          mime: blob.type,
          base64: String(reader.result).split(",")[1],
        });
      reader.readAsDataURL(blob);
    } catch (error) {
      alert("Не удалось сохранить файл: " + error.message);
    }
  }
  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.hasAttribute("download")) {
      save(this.href, this.download);
      return;
    }
    return click.call(this);
  };
  document.addEventListener(
    "click",
    (event) => {
      const a = event.target.closest && event.target.closest("a");
      if (a && a.hasAttribute("download")) {
        event.preventDefault();
        save(a.href, a.download);
      }
    },
    true,
  );
})();
