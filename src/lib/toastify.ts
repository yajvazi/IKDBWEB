"use client";

import Toastify from "toastify-js";

type ToastTone = "success" | "error" | "info" | "warning";

const tones: Record<ToastTone, { background: string; color: string; border: string }> = {
  success: { background: "#F0FDF4", color: "#166534", border: "#BBF7D0" },
  error: { background: "#FEF2F2", color: "#991B1B", border: "#FECACA" },
  info: { background: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" },
  warning: { background: "#FFFBEB", color: "#92400E", border: "#FDE68A" },
};

export function showToast(message: string, tone: ToastTone = "info") {
  const style = tones[tone];

  Toastify({
    text: message,
    duration: tone === "error" ? 6500 : 3600,
    close: true,
    className: "internetkudo-toast-popup",
    gravity: "top",
    position: "center",
    stopOnFocus: true,
    escapeMarkup: true,
    style: {
      background: style.background,
      color: style.color,
      border: `1px solid ${style.border}`,
      borderRadius: "8px",
      boxShadow: "0 16px 40px rgba(15, 23, 42, 0.16)",
      fontSize: "13px",
      fontWeight: "700",
      maxWidth: "420px",
      padding: "12px 14px",
    },
  }).showToast();
}
