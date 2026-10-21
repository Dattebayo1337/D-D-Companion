"use strict";
let cards = [],
  db;
const element = (tag, text) => {
  const e = document.createElement(tag);
  e.textContent = text;
  return e;
};
const status = document.getElementById("status"),
  detail = document.getElementById("detail");
function render() {
  const list = document.getElementById("cards");
  list.replaceChildren();
  const query = document
    .getElementById("search")
    .value.trim()
    .toLocaleLowerCase("ru");
  const edition = document.getElementById("edition").value;
  const filtered = cards.filter(
    (c) =>
      c.edition === edition &&
      `${c.name} ${c.blocks.map((b) => b.text).join(" ")}`
        .toLocaleLowerCase("ru")
        .includes(query),
  );
  status.textContent = `Сохранено ${cards.length} / 200 · найдено ${filtered.length}`;
  for (const c of filtered) {
    const button = element("button", c.name);
    button.onclick = () => show(c);
    list.append(button);
  }
}
function show(c) {
  detail.replaceChildren(
    element("h2", c.name),
    element(
      "p",
      `Редакция ${c.edition === "5e_2014" ? "2014" : "2024"} · версия ${c.version} · сохранено ${new Date(c.savedAt).toLocaleString("ru-RU")}`,
    ),
  );
  const print = element("button", "Печать карточки");
  print.onclick = () => window.print();
  detail.append(print);
  const remove = element("button", "Удалить сохранённую копию");
  remove.onclick = () => {
    if (
      !confirm(
        "Удалить только эту автономную копию? При подключении карточку можно сохранить заново.",
      )
    )
      return;
    const tx = db.transaction("cards", "readwrite");
    tx.objectStore("cards").delete(c.id);
    tx.oncomplete = () => {
      cards = cards.filter((v) => v.id !== c.id);
      detail.replaceChildren(element("p", "Копия удалена."));
      render();
    };
    tx.onerror = () => {
      status.textContent = "Удаление не удалось.";
    };
  };
  detail.append(remove);
  for (const block of c.blocks) {
    detail.append(element("h3", block.title), element("p", block.text));
  }
  detail.append(
    element("h3", "Источник и лицензия"),
    element("p", c.source),
    element("p", c.license),
  );
}
function load() {
  const tx = db.transaction("cards", "readonly"),
    request = tx.objectStore("cards").getAll();
  request.onsuccess = () => {
    cards = request.result;
    render();
  };
  request.onerror = () => {
    status.textContent = "Не удалось прочитать копии.";
  };
}
const open = indexedDB.open("companion-offline", 1);
open.onupgradeneeded = () =>
  open.result.createObjectStore("cards", { keyPath: "id" });
open.onsuccess = () => {
  db = open.result;
  load();
};
open.onerror = () => {
  status.textContent = "Браузер не разрешил открыть локальное хранилище.";
};
document.getElementById("search").oninput = render;
document.getElementById("edition").onchange = () => {
  detail.replaceChildren(element("p", "Выберите карточку этой редакции."));
  render();
};
document.getElementById("refresh").onclick = () => {
  if (db) load();
};
