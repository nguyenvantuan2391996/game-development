const SAVE_KEY = "aDarkRoomSave";

document.addEventListener("DOMContentLoaded", () => {
    const statusEl = document.getElementById("save-status");
    const btnPlay = document.getElementById("btn-play");
    const raw = localStorage.getItem(SAVE_KEY);

    if (!raw) return;

    try {
        const save = JSON.parse(raw);
        const pop = save.population || 0;
        const wood = Math.floor(save.wood || 0);
        statusEl.textContent = `A fire still glows. Population ${pop}, wood ${wood}.`;
        btnPlay.textContent = "Continue";
    } catch (e) {
        // ignore corrupted save, treat as fresh
    }
});
