"use client";

import Toastify from "toastify-js";

type ToastTone = "success" | "error" | "info" | "warning";

export function showToast(message: string, tone: ToastTone = "info") {
  Toastify({
    text: message,
    duration: tone === "error" ? 5200 : 3200,
    close: false,
    className: `internetkudo-toast internetkudo-toast-${tone}`,
    gravity: "top",
    position: "center",
    stopOnFocus: true,
    escapeMarkup: true,
    style: {
      background: "transparent",
      boxShadow: "none",
    },
  }).showToast();
}
