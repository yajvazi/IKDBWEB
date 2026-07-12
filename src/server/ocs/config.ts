import { z } from "zod";

const envBoolean = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  OCS_API_BASE_URL: z.string().url().optional(),
  OCS_API_VERSION: z.string().default("v2"),
  OCS_AUTH_MODE: z.enum(["none", "basic", "bearer", "custom-header", "query-token"]).default("none"),
  OCS_API_USERNAME: z.string().optional(),
  OCS_API_PASSWORD: z.string().optional(),
  OCS_API_TOKEN: z.string().optional(),
  OCS_AUTH_HEADER_NAME: z.string().optional(),
  OCS_AUTH_HEADER_VALUE: z.string().optional(),
  OCS_API_ACCOUNT_ID: z.string().optional(),
  OCS_RESELLER_ID: z.string().optional(),
  OCS_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  OCS_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
  OCS_ALLOWED_OUTBOUND_IP: z.string().optional(),
  OCS_MOCK_MODE: envBoolean.default(true),
  DATA_ENCRYPTION_KEY: z.string().optional(),
  API_RATE_LIMIT_SECRET: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  ENABLE_OCS_SUBSCRIBER_TRANSFER: envBoolean.default(false),
  ENABLE_SWAGGER_TRY_IT_OUT: envBoolean.default(true),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.parse(process.env);

  if (parsed.NODE_ENV === "production") {
    const required: (keyof AppEnv)[] = [
      "NEXT_PUBLIC_APP_URL",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "DATABASE_URL",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "DATA_ENCRYPTION_KEY",
      "API_RATE_LIMIT_SECRET",
    ];
    const missing: string[] = required.filter((key) => !parsed[key]);

    if (parsed.OCS_MOCK_MODE) missing.push("OCS_MOCK_MODE=false");
    if (!parsed.OCS_API_BASE_URL) missing.push("OCS_API_BASE_URL" as never);
    if (missing.length > 0) {
      throw new Error(`Missing production environment configuration: ${missing.join(", ")}`);
    }
  }

  cachedEnv = parsed;
  return parsed;
}
