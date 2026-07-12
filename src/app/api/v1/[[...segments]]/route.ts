import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { esimsConfig, ordersConfig, packagesConfig } from "@/components/admin/operations-data";
import {
  affectPackageToSubscriberCommand,
  getResellerInfoCommand,
  listDetailedDestinationListCommand,
  listDetailedLocationZoneCommand,
  listNetworkProfileCommand,
  listPrepaidPackageTemplateCommand,
  listResellerAccountCommand,
} from "@/server/ocs/commands";
import { getEnv } from "@/server/ocs/config";
import { OcsApiError, ocsErrorDescriptions } from "@/server/ocs/errors";
import { getOcsClient } from "@/server/ocs/client";
import { getCurrentAdmin } from "@/server/auth/admin-auth";
import { getPublicPlans } from "@/server/supabase/packages";
import { ocsCommandCatalog } from "@/lib/ocs/catalog";
import { checkRateLimit } from "@/server/security/rate-limit";
import type { OcsIdentifier } from "@/server/ocs/types";

const checkoutSchema = z.object({
  planId: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  currency: z.string().length(3).default("EUR"),
});

const supportSchema = z.object({
  subject: z.string().min(3),
  message: z.string().min(10),
  orderId: z.string().optional(),
});

const ocsIdentifierSchema = z.object({
  subscriberId: z.number().int().positive().optional(),
  imsi: z.string().min(6).max(32).optional(),
  iccid: z.string().min(8).max(32).optional(),
  msisdn: z.string().min(6).max(24).optional(),
  multiImsi: z.string().min(6).max(32).optional(),
  activationCode: z.string().min(4).max(160).optional(),
}).refine((value) => Object.values(value).filter((item) => item !== undefined).length === 1, {
  message: "Provide exactly one subscriber identifier.",
}).transform((value) => value as OcsIdentifier);

const ocsPackageAssignmentSchema = z.object({
  packageTemplateId: z.number().int().positive(),
  accountId: z.number().int().positive(),
  validityPeriod: z.number().int().positive().optional(),
});

function ok(data: unknown, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: { requestId: randomUUID(), timestamp: new Date().toISOString() },
    },
    { status },
  );
}

function fail(code: string, message: string, status = 400, fieldErrors?: Record<string, string[]>) {
  const requestId = randomUUID();
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        requestId,
        fieldErrors,
      },
    },
    { status, headers: { "x-request-id": requestId } },
  );
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ segments?: string[] }> }) {
  const { segments = [] } = await params;
  const path = segments.join("/");

  if (segments[0] === "ocs") {
    return handleOcsGet(request, segments.slice(1));
  }

  if (path === "auth/me") {
    return ok({ id: "cus_ayla", name: "Ayla Demir", email: "ayla@example.com", mode: "mock" });
  }

  if (path === "countries") {
    return ok([
      { code: "TR", name: "Turkey", flag: "TR", planCount: 8, popular: true },
      { code: "US", name: "United States", flag: "US", planCount: 12, popular: true },
      { code: "DE", name: "Germany", flag: "DE", planCount: 7, popular: false },
      { code: "AE", name: "United Arab Emirates", flag: "AE", planCount: 5, popular: false },
    ]);
  }

  if (segments[0] === "countries" && segments.length === 2) {
    return ok({ code: segments[1]?.toUpperCase(), name: countryName(segments[1]), planCount: 6, mode: "mock" });
  }

  if ((segments[0] === "countries" && segments[2] === "plans") || path === "plans") {
    return ok(await getPublicPlans());
  }

  if (segments[0] === "plans" && segments[1]) {
    const plans = await getPublicPlans();
    const plan = plans.find((item) => item.id === segments[1]) ?? plans[0];
    return plan ? ok(plan) : fail("PLAN_NOT_FOUND", "Plan was not found.", 404);
  }

  if (path === "orders") {
    return ok(ordersConfig.records.map(orderFromRecord));
  }

  if (segments[0] === "orders" && segments[1]) {
    const order = ordersConfig.records.find((record) => record.id === segments[1]);
    return order ? ok(orderFromRecord(order)) : fail("ORDER_NOT_FOUND", "Order was not found for the current customer.", 404);
  }

  if (path === "esims") {
    return ok(esimsConfig.records.map(esimFromRecord));
  }

  if (segments[0] === "esims" && segments[1]) {
    const esim = esimsConfig.records.find((record) => record.id === segments[1]);
    if (!esim) return fail("ESIM_NOT_FOUND", "eSIM was not found for the current customer.", 404);
    if (segments[2] === "usage") return ok({ esimId: esim.id, allocatedDataBytes: 10_737_418_240, usedDataBytes: 1_717_986_918, remainingDataBytes: 9_019_431_322, source: "mock" });
    if (segments[2] === "installation") return ok({ esimId: esim.id, activationCodeMasked: "LPA:••••••••", qrPayloadAvailable: true, iccidMasked: "8931••••1129" });
    return ok(esimFromRecord(esim));
  }

  if (path === "notifications") {
    return ok([
      { id: "note_1", title: "Your Turkey eSIM is ready", read: false, createdAt: "2026-05-31T10:44:00Z" },
      { id: "note_2", title: "Kudo Points added", read: true, createdAt: "2026-05-28T12:10:00Z" },
    ]);
  }

  if (path === "wallet") return ok({ balanceMinor: 1250, currency: "EUR", points: 820 });
  if (path === "wallet/transactions") return ok([{ id: "pt_1", amountMinor: 500, type: "earned", description: "Order #IKD-10184" }]);
  if (path === "referrals") return ok({ code: "AYLAKUDO", invited: 4, converted: 2, rewardMinor: 1000 });
  if (path === "support/tickets") return ok([{ id: "ticket_1", subject: "Install help", status: "open", lastUpdated: "2026-05-31T10:44:00Z" }]);

  return ok({ route: `/${path}`, mode: "mock", message: "InternetKudo API Gateway mock endpoint. Live adapter is intentionally not enabled." });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ segments?: string[] }> }) {
  const { segments = [] } = await params;
  const path = segments.join("/");
  const body = await readJson(request);

  if (segments[0] === "ocs") {
    return handleOcsPost(request, segments.slice(1), body);
  }

  if (path === "auth/register" || path === "auth/login") {
    return ok({ accessToken: "mock.jwt.token", refreshToken: "mock.refresh.token", user: { id: "cus_mock", email: body.email ?? "customer@example.com" } });
  }

  if (path === "auth/logout") return ok({ loggedOut: true });
  if (path === "auth/refresh") return ok({ accessToken: "mock.jwt.refreshed" });
  if (path === "auth/forgot-password") return ok({ emailSent: true });

  if (path === "checkout/validate" || path === "checkout/payment-intent") {
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) return fail("VALIDATION_ERROR", "Checkout payload is invalid.", 400, z.flattenError(parsed.error).fieldErrors);
    const plan = packagesConfig.records.find((record) => record.id === parsed.data.planId) ?? packagesConfig.records[0];
    return ok({
      plan: planFromRecord(plan),
      orderId: "ord_mock_pending",
      paymentIntentId: "pi_mock_payment_sheet",
      clientSecret: "pi_mock_payment_sheet_secret_mock",
      publishableKeyRequired: true,
      mode: "mock",
    }, path.endsWith("payment-intent") ? 201 : 200);
  }

  if (path === "orders") {
    return ok({ id: "ord_mock_pending", orderNumber: "#IKD-MOCK", orderStatus: "pending_payment", paymentStatus: "requires_payment" }, 201);
  }

  if (segments[0] === "esims" && segments[2] === "topups") {
    return ok({ topupOrderId: "ord_mock_topup", esimId: segments[1], status: "pending_payment" }, 201);
  }

  if (path === "notifications/read-all") return ok({ updated: true });
  if (path === "referrals/apply") return ok({ applied: true, code: body.code ?? "MOCK" });

  if (path === "support/tickets") {
    const parsed = supportSchema.safeParse(body);
    if (!parsed.success) return fail("VALIDATION_ERROR", "Support ticket payload is invalid.", 400, z.flattenError(parsed.error).fieldErrors);
    return ok({ id: "ticket_mock", status: "open", ...parsed.data }, 201);
  }

  return ok({ route: `/${path}`, accepted: true, mode: "mock" }, 202);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ segments?: string[] }> }) {
  const { segments = [] } = await params;
  const path = segments.join("/");

  if (segments[0] === "notifications" && segments[2] === "read") {
    return ok({ notificationId: segments[1], read: true });
  }

  return ok({ route: `/${path}`, updated: true, mode: "mock" });
}

function readJson(request: NextRequest) {
  return request.json().catch(() => ({}));
}

async function handleOcsGet(request: NextRequest, segments: string[]) {
  const accessError = await requireOcsProxyAccess(request);
  if (accessError) return accessError;

  const rateLimit = checkRateLimit(`ocs:${clientIp(request)}:${segments.join("/")}`, 45, 60_000);
  if (!rateLimit.allowed) return fail("RATE_LIMITED", "Too many OCS proxy requests. Try again shortly.", 429);

  const env = getEnv();
  const client = getOcsClient();
  const resource = segments.join("/");
  const resellerId = queryNumber(request, "resellerId") ?? positiveNumber(env.OCS_RESELLER_ID);

  try {
    if (resource === "health") {
      return ok({
        status: "healthy",
        mode: env.OCS_MOCK_MODE ? "mock" : "live",
        upstreamConfigured: Boolean(env.OCS_API_BASE_URL),
        proxy: "InternetKudo OCS Gateway",
      });
    }

    if (resource === "catalog") {
      return ok({
        proxyRoutes: internetKudoOcsProxyCatalog(),
        upstreamCommands: ocsCommandCatalog.map((item) => ({
          group: item.group,
          command: item.command,
          safety: item.safety,
          version: item.version,
          description: item.description,
        })),
      });
    }

    if (resource === "reseller-accounts") {
      return ok(await client.executeCommand(listResellerAccountCommand()));
    }

    if (resource === "reseller-info") {
      const id = queryNumber(request, "id") ?? resellerId;
      return ok(await client.executeCommand(getResellerInfoCommand(id ? { id } : {})));
    }

    if (!resellerId) {
      return fail("INVALID_RESELLER_ID", "A reseller ID is required for this OCS proxy route.", 400);
    }

    if (resource === "network-profiles") {
      return ok(await client.executeCommand(listNetworkProfileCommand({ resellerId })));
    }

    if (resource === "location-zones") {
      return ok(await client.executeCommand(listDetailedLocationZoneCommand(resellerId)));
    }

    if (resource === "destination-lists") {
      return ok(await client.executeCommand(listDetailedDestinationListCommand(resellerId)));
    }

    if (resource === "package-templates") {
      return ok(await client.executeCommand(listPrepaidPackageTemplateCommand({ resellerId })));
    }

    return fail("OCS_PROXY_ROUTE_NOT_FOUND", "This InternetKudo OCS proxy route is not defined.", 404);
  } catch (error) {
    return handleOcsProxyError(error);
  }
}

async function handleOcsPost(request: NextRequest, segments: string[], body: unknown) {
  const accessError = await requireOcsProxyAccess(request);
  if (accessError) return accessError;

  const rateLimit = checkRateLimit(`ocs:${clientIp(request)}:${segments.join("/")}`, 20, 60_000);
  if (!rateLimit.allowed) return fail("RATE_LIMITED", "Too many OCS proxy requests. Try again shortly.", 429);

  const client = getOcsClient();
  const resource = segments.join("/");

  try {
    if (resource === "subscriber-packages/search") {
      const parsed = ocsIdentifierSchema.safeParse(body);
      if (!parsed.success) {
        return fail("VALIDATION_ERROR", "Provide exactly one supported subscriber identifier.", 400, z.flattenError(parsed.error).fieldErrors);
      }

      const packages = await client.listSubscriberPrepaidPackages(parsed.data);
      return ok({ packages, identifierType: Object.keys(parsed.data)[0] });
    }

    if (resource === "package-assignments") {
      const originError = assertSameOrigin(request);
      if (originError) return fail("FORBIDDEN_ORIGIN", originError, 403);

      const parsed = ocsPackageAssignmentSchema.safeParse(body);
      if (!parsed.success) {
        return fail("VALIDATION_ERROR", "Package assignment payload is invalid.", 400, z.flattenError(parsed.error).fieldErrors);
      }

      const command = affectPackageToSubscriberCommand({
        packageTemplateId: parsed.data.packageTemplateId,
        accountForSubs: parsed.data.accountId,
        validityPeriod: parsed.data.validityPeriod,
      });
      const response = await client.executeCommand(command);
      return ok({
        assignment: extractPackageAssignmentDetails(response),
        upstreamStatus: response.status,
        response,
      }, 201);
    }

    return fail("OCS_PROXY_ROUTE_NOT_FOUND", "This InternetKudo OCS proxy route is not defined.", 404);
  } catch (error) {
    return handleOcsProxyError(error);
  }
}

async function requireOcsProxyAccess(request: NextRequest) {
  const admin = await getCurrentAdmin().catch(() => null);
  if (admin) return null;

  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const configuredToken = process.env.INTERNETKUDO_API_GATEWAY_TOKEN;
  if (bearer && configuredToken && bearer === configuredToken) return null;

  return fail("AUTHENTICATION_REQUIRED", "OCS proxy routes require an authenticated InternetKudo gateway session.", 401);
}

function assertSameOrigin(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return null;

  const expected = new URL(appUrl).origin;
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (origin && origin !== expected) return "Request origin does not match the configured app URL.";
  if (referer && new URL(referer).origin !== expected) return "Request referer does not match the configured app URL.";
  return null;
}

function queryNumber(request: NextRequest, key: string) {
  const value = request.nextUrl.searchParams.get(key);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function clientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

function handleOcsProxyError(error: unknown) {
  if (error instanceof OcsApiError) {
    const upstreamName = ocsErrorDescriptions[error.upstreamCode as keyof typeof ocsErrorDescriptions] ?? "UNKNOWN_OCS_ERROR";
    return fail("OCS_UPSTREAM_ERROR", `OCS ${error.upstreamCode} ${upstreamName}: ${error.safePublicMessage}`, error.httpStatus);
  }

  if (error instanceof Error) {
    return fail("OCS_PROXY_FAILED", error.message, 500);
  }

  return fail("OCS_PROXY_FAILED", "Unknown OCS proxy failure.", 500);
}

function extractPackageAssignmentDetails(response: Record<string, unknown>) {
  const nested = response.affectPackageToSubscriber;
  const source = nested && typeof nested === "object" ? nested as Record<string, unknown> : response;

  return {
    iccid: stringOrNull(source.iccid),
    smdpServer: stringOrNull(source.smdpServer),
    activationCode: stringOrNull(source.activationCode),
    urlQrCode: stringOrNull(source.urlQrCode),
    subscriberId: numberOrNull(source.subscriberId),
    esimId: numberOrNull(source.esimId),
    subsPackageId: numberOrNull(source.subsPackageId),
    userSimName: stringOrNull(source.userSimName),
  };
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberOrNull(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function positiveNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function internetKudoOcsProxyCatalog() {
  return [
    { method: "GET", path: "/api/v1/ocs/health", description: "Check InternetKudo OCS proxy health." },
    { method: "GET", path: "/api/v1/ocs/catalog", description: "List supported InternetKudo OCS proxy routes and documented upstream commands." },
    { method: "GET", path: "/api/v1/ocs/reseller-accounts", description: "List reseller accounts through the secure gateway." },
    { method: "GET", path: "/api/v1/ocs/reseller-info?id=567", description: "Read reseller details and balance." },
    { method: "GET", path: "/api/v1/ocs/network-profiles?resellerId=567", description: "List OCS network profiles." },
    { method: "GET", path: "/api/v1/ocs/location-zones?resellerId=567", description: "List OCS location zones." },
    { method: "GET", path: "/api/v1/ocs/destination-lists?resellerId=567", description: "List OCS destination lists." },
    { method: "GET", path: "/api/v1/ocs/package-templates?resellerId=567", description: "List OCS package templates and upstream costs." },
    { method: "POST", path: "/api/v1/ocs/subscriber-packages/search", description: "Search subscriber prepaid packages by subscriberId, IMSI, ICCID, MSISDN, multiImsi, or activationCode." },
    { method: "POST", path: "/api/v1/ocs/package-assignments", description: "Assign a package template to an account with affectPackageToSubscriber." },
  ];
}

function countryName(code?: string) {
  const map: Record<string, string> = { tr: "Turkey", us: "United States", de: "Germany", ae: "United Arab Emirates", fr: "France" };
  return map[(code ?? "").toLowerCase()] ?? "Mock destination";
}

function planFromRecord(record: (typeof packagesConfig.records)[number]) {
  return {
    id: record.id,
    displayName: record.fields.displayName,
    country: record.fields.country,
    dataAllowance: record.fields.allowance,
    validity: record.fields.validity,
    retailPrice: record.fields.retail,
    currency: "EUR",
    active: record.status === "Active",
    mode: "mock",
  };
}

function orderFromRecord(record: (typeof ordersConfig.records)[number]) {
  return {
    id: record.id,
    orderNumber: record.fields.orderNumber,
    customer: record.fields.customer,
    package: record.fields.package,
    total: record.fields.salePrice,
    paymentStatus: record.fields.paymentStatus,
    provisioningStatus: record.fields.fulfillmentStatus,
    orderStatus: record.status === "Paid" ? "paid" : "failed",
    installationDataMasked: Boolean(record.sensitiveFields),
  };
}

function esimFromRecord(record: (typeof esimsConfig.records)[number]) {
  return {
    id: record.id,
    subscriberId: record.fields.subscriberId,
    package: record.fields.package,
    status: record.fields.state,
    iccidMasked: "8931••••1129",
    remainingData: record.fields.remaining,
    activatedAt: record.fields.activated,
  };
}
