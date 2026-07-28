// Lightweight modal styled to match the game's overlay system (see .overlay
// / .overlay-btn in caro.css). `actions` is a list of buttons instead of a
// single confirm callback, since end-of-game needs both "play again" and
// "back to home".
function showModal({ icon, title, html, actions }) {
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.style.display = "block";

  const actionsHtml = actions
    .map(
      (action, i) =>
        `<button type="button" class="overlay-btn${
          action.ghost ? " overlay-btn--ghost" : ""
        }" data-action="${i}">${action.label}</button>`
    )
    .join("");

  overlay.innerHTML =
    '<div class="overlay__inner"><div class="modal-panel">' +
    (icon ? `<div class="modal-icon modal-icon--${icon}"></div>` : "") +
    `<p class="modal-title">${title}</p>` +
    (html ? `<div class="modal-body">${html}</div>` : "") +
    `<div class="modal-actions">${actionsHtml}</div></div></div>`;

  document.body.appendChild(overlay);

  actions.forEach((action, i) => {
    overlay
      .querySelector(`[data-action="${i}"]`)
      .addEventListener("click", () => {
        overlay.remove();
        if (action.onClick) action.onClick();
      });
  });
}

function AlertError(msg) {
  showModal({ icon: "error", title: "Oops...", html: msg, actions: [{ label: "OK" }] });
}
