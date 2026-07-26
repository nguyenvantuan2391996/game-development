function AlertError(msg, footerMsg) {
    Swal.fire({
        icon: "error",
        title: "Oops...",
        text: msg,
        footer: footerMsg,
    });
}

function formatTime(totalSeconds) {
    if (!isFinite(totalSeconds) || totalSeconds < 0) {
        return "0:00";
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return minutes + ":" + String(seconds).padStart(2, "0");
}

function decodeHtmlEntities(text) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = text;
    return textarea.value;
}