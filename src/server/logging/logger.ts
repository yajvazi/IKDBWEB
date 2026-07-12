import pino from "pino";
import { redactOcsPayload } from "@/server/ocs/redaction";

let logger: pino.Logger | null = null;

export function getLogger() {
  logger ??= pino({
    level: process.env.LOG_LEVEL ?? "info",
    redact: {
      paths: [
        "req.headers.authorization",
        "authorization",
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "OCS_API_PASSWORD",
        "OCS_API_TOKEN",
        "*.activationCode",
        "*.qrPayload",
      ],
      censor: "[REDACTED]",
    },
  });
  return logger;
}

export function safeLogPayload(payload: unknown) {
  return redactOcsPayload(payload);
}
