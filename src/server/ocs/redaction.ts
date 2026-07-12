const secretKeys = new Set([
  "authorization",
  "password",
  "token",
  "ocs_api_password",
  "ocs_api_token",
  "stripe_secret_key",
  "stripe_webhook_secret",
  "activationCode",
  "activation_code",
  "qrPayload",
  "qr_payload",
]);

export function maskIdentifier(value: string): string {
  if (value.length <= 6) return "***";
  return `${value.slice(0, 3)}${"*".repeat(Math.max(value.length - 6, 4))}${value.slice(-3)}`;
}

export function redactOcsPayload<T>(payload: T): T {
  if (Array.isArray(payload)) return payload.map((item) => redactOcsPayload(item)) as T;
  if (!payload || typeof payload !== "object") return payload;

  return Object.fromEntries(
    Object.entries(payload as Record<string, unknown>).map(([key, value]) => {
      if (secretKeys.has(key) || secretKeys.has(key.toLowerCase())) return [key, "[REDACTED]"];
      if (["imsi", "iccid", "msisdn", "multiImsi"].includes(key) && typeof value === "string") {
        return [key, maskIdentifier(value)];
      }
      return [key, redactOcsPayload(value)];
    }),
  ) as T;
}
