function AlertError(msg, footerMsg) {
    Swal.fire({
        icon: "error",
        title: "Oops...",
        text: msg,
        footer: footerMsg,
    });
}