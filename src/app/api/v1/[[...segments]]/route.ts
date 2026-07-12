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

const cartQuoteSchema = z.object({
  planId: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  referralCode: z.string().optional(),
  kudoPointsToRedeem: z.number().int().nonnegative().default(0),
});

const supportSchema = z.object({
  subject: z.string().min(3),
  message: z.string().min(10),
  orderId: z.string().optional(),
});

const profileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z.string().max(32).optional(),
  marketingOptIn: z.boolean().optional(),
  preferredCurrency: z.string().length(3).optional(),
});

const contactSupportSchema = z.object({
  topic: z.string().min(2),
  message: z.string().min(10),
  email: z.string().email().optional(),
  orderId: z.string().optional(),
  esimId: z.string().optional(),
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

  if (path === "app/bootstrap") {
    return ok({
      minimumSupportedVersion: "1.0.0",
      latestVersion: "1.0.0",
      maintenanceMode: false,
      environment: getEnv().OCS_MOCK_MODE ? "development" : "production",
      features: {
        stripePaymentSheet: true,
        applePay: true,
        googlePay: true,
        kudoPoints: true,
        referrals: true,
        topups: true,
        esimQrInstall: true,
      },
      navigation: ["home", "search", "my-esims", "profile"],
      supportEmail: "support@internetkudo.com",
    });
  }

  if (path === "app/onboarding") {
    return ok({
      slides: [
        { id: "global", title: "Stay connected wherever you go", body: "Fast, reliable and affordable eSIM data plans in 200+ countries.", imageKey: "global-esim" },
        { id: "instant", title: "Install in minutes", body: "Buy a plan, scan the QR code, and activate your eSIM before you travel.", imageKey: "qr-install" },
        { id: "rewards", title: "Earn Kudo Points", body: "Earn rewards when you buy data or invite friends.", imageKey: "rewards" },
      ],
    });
  }

  if (path === "app/home") {
    const plans = await getMobilePlans();
    const countries = countriesFromPlans(plans);
    return ok({
      hero: { title: "Global Connection Made Simple", subtitle: "eSIM data in 200+ countries.", cta: "Browse plans" },
      popularCountries: countries.filter((country) => country.popular).slice(0, 8),
      topPicks: plans.slice(0, 6),
      activeEsimSummary: { count: 1, remainingDataLabel: "10 GB", nextExpiryLabel: "28 days" },
      kudoPoints: { balance: 150, earnLabel: "Earn 1% Kudo Points with this purchase" },
    });
  }

  if (path === "auth/me") {
    return ok(currentMobileUser());
  }

  if (path === "profile") {
    return ok({
      ...currentMobileUser(),
      phone: null,
      preferredCurrency: "EUR",
      marketingOptIn: true,
      stats: { orders: 3, activeEsims: 1, kudoPoints: 150, referrals: 2 },
    });
  }

  if (path === "countries") {
    const plans = await getMobilePlans();
    const query = request.nextUrl.searchParams.get("q")?.trim().toLowerCase();
    const popularOnly = request.nextUrl.searchParams.get("popular") === "true";
    return ok(countriesFromPlans(plans).filter((country) => {
      if (popularOnly && !country.popular) return false;
      return !query || country.name.toLowerCase().includes(query) || country.code.toLowerCase().includes(query);
    }));
  }

  if (segments[0] === "countries" && segments.length === 2) {
    const plans = await getMobilePlans();
    const country = countryByCodeOrName(plans, segments[1]);
    return country ? ok(country) : fail("COUNTRY_NOT_FOUND", "Country was not found.", 404);
  }

  if ((segments[0] === "countries" && segments[2] === "plans") || path === "plans") {
    const plans = await getMobilePlans();
    if (segments[0] === "countries") {
      const country = countryByCodeOrName(plans, segments[1]);
      return ok(plans.filter((plan) => sameCountry(plan.country, country?.name ?? segments[1])));
    }
    return ok(plans);
  }

  if (segments[0] === "plans" && segments[1]) {
    const plans = await getMobilePlans();
    const plan = plans.find((item) => item.id === segments[1]);
    return plan ? ok(planDetail(plan)) : fail("PLAN_NOT_FOUND", "Plan was not found.", 404);
  }

  if (path === "search") {
    const query = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
    const plans = await getMobilePlans();
    const countries = countriesFromPlans(plans);
    return ok({
      query,
      countries: query ? countries.filter((country) => country.name.toLowerCase().includes(query) || country.code.toLowerCase().includes(query)) : [],
      plans: query ? plans.filter((plan) => `${plan.displayName} ${plan.country} ${plan.dataAllowance}`.toLowerCase().includes(query)) : [],
    });
  }

  if (path === "cart/quote") {
    const planId = request.nextUrl.searchParams.get("planId") ?? "";
    const quantity = Number(request.nextUrl.searchParams.get("quantity") ?? "1");
    const parsed = cartQuoteSchema.safeParse({ planId, quantity });
    if (!parsed.success) return fail("VALIDATION_ERROR", "Cart quote request is invalid.", 400, z.flattenError(parsed.error).fieldErrors);
    const quote = await buildCartQuote(parsed.data);
    return quote ? ok(quote) : fail("PLAN_NOT_FOUND", "Plan was not found.", 404);
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
    if (segments[2] === "installation") return ok(esimInstallation(esim.id));
    return ok(esimFromRecord(esim));
  }

  if (path === "payment-methods") {
    return ok(paymentMethods());
  }

  if (path === "notifications") {
    return ok([
      { id: "note_1", type: "esim_ready", title: "Your eSIM for Turkey is now active", body: "Tap to install your eSIM.", read: false, createdAt: "2026-05-31T10:44:00Z", deepLink: "/esims/esim_102/installation" },
      { id: "note_2", type: "promotion", title: "Special offer for Europe", body: "Get 20% off on all plans.", read: true, createdAt: "2026-05-28T12:10:00Z", deepLink: "/countries/TR/plans" },
      { id: "note_3", type: "topup", title: "Don't forget to top up your eSIM", body: "Your package is running low.", read: false, createdAt: "2026-05-26T08:30:00Z", deepLink: "/esims/esim_102" },
    ]);
  }

  if (path === "wallet") return ok({ balanceMinor: 1250, currency: "EUR", points: 820 });
  if (path === "wallet/transactions") return ok([{ id: "pt_1", amountMinor: 500, type: "earned", description: "Order #IKD-10184" }]);
  if (path === "referrals") return ok({ code: "KUDO123", invited: 4, converted: 2, rewardMinor: 300, currency: "EUR", shareUrl: "https://internetkudo.com/ref/KUDO123", termsUrl: "https://internetkudo.com/referrals" });
  if (path === "help/topics") return ok(helpTopics());
  if (segments[0] === "help" && segments[1] === "topics" && segments[2]) {
    const topic = helpTopics().find((item) => item.id === segments[2]);
    return topic ? ok(topic) : fail("HELP_TOPIC_NOT_FOUND", "Help topic was not found.", 404);
  }
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
    const plans = await getMobilePlans();
    const plan = plans.find((record) => record.id === parsed.data.planId) ?? plans[0];
    if (!plan) return fail("PLAN_NOT_FOUND", "Plan was not found.", 404);
    const quote = await buildCartQuote({ planId: plan.id, quantity: parsed.data.quantity, kudoPointsToRedeem: 0 });
    if (!quote) return fail("PLAN_NOT_FOUND", "Plan was not found.", 404);
    return ok({
      plan,
      quote,
      orderId: "ord_mock_pending",
      paymentIntentId: "pi_mock_payment_sheet",
      clientSecret: "pi_mock_payment_sheet_secret_mock",
      ephemeralKey: "ephkey_mock_customer_session",
      customerId: "cus_mock_mobile",
      publishableKeyRequired: true,
      mode: "mock",
    }, path.endsWith("payment-intent") ? 201 : 200);
  }

  if (path === "cart/quote") {
    const parsed = cartQuoteSchema.safeParse(body);
    if (!parsed.success) return fail("VALIDATION_ERROR", "Cart quote payload is invalid.", 400, z.flattenError(parsed.error).fieldErrors);
    const quote = await buildCartQuote(parsed.data);
    return quote ? ok(quote) : fail("PLAN_NOT_FOUND", "Plan was not found.", 404);
  }

  if (path === "orders") {
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) return fail("VALIDATION_ERROR", "Order payload is invalid.", 400, z.flattenError(parsed.error).fieldErrors);
    const quote = await buildCartQuote({ planId: parsed.data.planId, quantity: parsed.data.quantity, kudoPointsToRedeem: 0 });
    if (!quote) return fail("PLAN_NOT_FOUND", "Plan was not found.", 404);
    return ok({ id: "ord_mock_pending", orderNumber: "#IKD-MOCK", orderStatus: "pending_payment", paymentStatus: "requires_payment", quote }, 201);
  }

  if (segments[0] === "esims" && segments[2] === "topups") {
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) return fail("VALIDATION_ERROR", "Top-up payload is invalid.", 400, z.flattenError(parsed.error).fieldErrors);
    const quote = await buildCartQuote({ planId: parsed.data.planId, quantity: parsed.data.quantity, kudoPointsToRedeem: 0 });
    if (!quote) return fail("PLAN_NOT_FOUND", "Plan was not found.", 404);
    return ok({ topupOrderId: "ord_mock_topup", esimId: segments[1], status: "pending_payment", quote }, 201);
  }

  if (path === "payment-methods/setup-intent") {
    return ok({
      customerId: "cus_mock_mobile",
      setupIntentId: "seti_mock_card_setup",
      clientSecret: "seti_mock_card_setup_secret_mock",
      publishableKeyRequired: true,
    }, 201);
  }

  if (path === "notifications/read-all") return ok({ updated: true });
  if (path === "referrals/apply") return ok({ applied: true, code: body.code ?? "MOCK" });

  if (path === "support/contact") {
    const parsed = contactSupportSchema.safeParse(body);
    if (!parsed.success) return fail("VALIDATION_ERROR", "Support contact payload is invalid.", 400, z.flattenError(parsed.error).fieldErrors);
    return ok({ id: "contact_mock", status: "received", ...parsed.data }, 201);
  }

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
  const body = await readJson(request);

  if (segments[0] === "notifications" && segments[2] === "read") {
    return ok({ notificationId: segments[1], read: true });
  }

  if (path === "profile") {
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) return fail("VALIDATION_ERROR", "Profile payload is invalid.", 400, z.flattenError(parsed.error).fieldErrors);
    return ok({ ...currentMobileUser(), ...parsed.data, updatedAt: new Date().toISOString() });
  }

  if (segments[0] === "payment-methods" && segments[2] === "default") {
    return ok({ paymentMethodId: segments[1], default: true });
  }

  return ok({ route: `/${path}`, updated: true, mode: "mock" });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ segments?: string[] }> }) {
  const { segments = [] } = await params;

  if (segments[0] === "payment-methods" && segments[1]) {
    return ok({ paymentMethodId: segments[1], deleted: true });
  }

  return fail("ROUTE_NOT_FOUND", "This delete route is not defined.", 404);
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

type MobilePlan = {
  id: string;
  displayName: string;
  country: string;
  countryCode: string;
  region: string;
  dataAllowance: string;
  validity: string;
  priceMinor: number;
  retailPrice: string;
  currency: string;
  templateId?: unknown;
  active: boolean;
  featured: boolean;
  popular: boolean;
  source: string;
};

async function getMobilePlans(): Promise<MobilePlan[]> {
  const livePlans = await getPublicPlans();
  const source = livePlans.length > 0 ? livePlans : packagesConfig.records.map(planFromRecord);

  return source.map((plan, index) => {
    const record = plan as Record<string, unknown>;
    const country = String(record.country ?? "Global");
    const retailPrice = String(record.retailPrice ?? "€0.00");
    return {
      id: String(record.id ?? `plan_${index + 1}`),
      displayName: String(record.displayName ?? `${country} data plan`),
      country,
      countryCode: countryCode(country),
      region: String(record.region ?? country),
      dataAllowance: String(record.dataAllowance ?? "Data"),
      validity: String(record.validity ?? "30 Days"),
      priceMinor: priceMinor(retailPrice),
      retailPrice,
      currency: String(record.currency ?? "EUR"),
      templateId: record.templateId,
      active: record.active !== false,
      featured: Boolean(record.featured) || index < 4,
      popular: index < 5,
      source: String(record.source ?? "local"),
    };
  }).filter((plan) => plan.active);
}

function planFromRecord(record: (typeof packagesConfig.records)[number]) {
  return {
    id: record.id,
    displayName: record.fields.displayName,
    country: record.fields.country,
    region: record.fields.locationZoneName ?? record.fields.country,
    dataAllowance: record.fields.allowance,
    validity: record.fields.validity,
    retailPrice: record.fields.retail,
    currency: "EUR",
    templateId: record.fields.templateId,
    active: record.status === "Active",
    featured: record.fields.featured === "Yes",
    source: "admin_records",
  };
}

function planDetail(plan: MobilePlan) {
  return {
    ...plan,
    title: `${plan.country} ${plan.dataAllowance}`,
    network: plan.region,
    coverage: plan.country,
    hotspotSupported: true,
    callsAndSmsIncluded: false,
    description: `Enjoy high-speed data in ${plan.country} with excellent coverage. Perfect for travel, work or vacation.`,
    installMethods: ["qr_code", "manual"],
    refundableUntilProvisioned: true,
  };
}

async function buildCartQuote(input: z.infer<typeof cartQuoteSchema>) {
  const plans = await getMobilePlans();
  const plan = plans.find((item) => item.id === input.planId);
  if (!plan) {
    return null;
  }

  const quantity = input.quantity;
  const subtotalMinor = plan.priceMinor * quantity;
  const pointsDiscountMinor = Math.min(input.kudoPointsToRedeem, subtotalMinor);
  const referralDiscountMinor = input.referralCode ? Math.min(300, subtotalMinor - pointsDiscountMinor) : 0;
  const totalMinor = Math.max(subtotalMinor - pointsDiscountMinor - referralDiscountMinor, 0);

  return {
    items: [{ planId: plan.id, displayName: plan.displayName, quantity, unitAmountMinor: plan.priceMinor, totalMinor: subtotalMinor }],
    subtotalMinor,
    discountMinor: pointsDiscountMinor + referralDiscountMinor,
    taxMinor: 0,
    totalMinor,
    currency: plan.currency,
    kudoPointsEarned: Math.floor(totalMinor / 100),
    requiresPayment: totalMinor > 0,
  };
}

function countriesFromPlans(plans: MobilePlan[]) {
  const grouped = new Map<string, { code: string; name: string; planCount: number; popular: boolean }>();

  for (const plan of plans) {
    const key = plan.countryCode;
    const current = grouped.get(key) ?? { code: key, name: plan.country, planCount: 0, popular: false };
    current.planCount += 1;
    current.popular = current.popular || plan.popular || ["TR", "US", "DE", "GB", "FR"].includes(key);
    grouped.set(key, current);
  }

  return Array.from(grouped.values()).sort((a, b) => Number(b.popular) - Number(a.popular) || a.name.localeCompare(b.name));
}

function countryByCodeOrName(plans: MobilePlan[], value?: string) {
  const normalized = (value ?? "").toLowerCase();
  return countriesFromPlans(plans).find((country) => country.code.toLowerCase() === normalized || country.name.toLowerCase() === normalized);
}

function sameCountry(left: string, right?: string) {
  const a = left.toLowerCase();
  const b = (right ?? "").toLowerCase();
  return a === b || countryCode(left).toLowerCase() === b;
}

function countryCode(country: string) {
  const map: Record<string, string> = {
    turkey: "TR",
    türkiye: "TR",
    "united states": "US",
    usa: "US",
    germany: "DE",
    "united kingdom": "GB",
    france: "FR",
    italy: "IT",
    spain: "ES",
    japan: "JP",
    global: "GL",
  };
  const fallback = country.trim().slice(0, 2).toUpperCase();
  return (map[country.trim().toLowerCase()] ?? fallback) || "GL";
}

function priceMinor(value: string) {
  const parsed = Number(value.replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function currentMobileUser() {
  return { id: "cus_mobile_mock", name: "Yil Alvazi", email: "yil@example.com", avatarInitials: "Y", mode: "development" };
}

function esimInstallation(esimId: string) {
  return {
    esimId,
    smdpServer: "smdp.io",
    activationCode: "K2-2NSYGO-1JIPWW9",
    qrPayload: "LPA:1$smdp.io$K2-2NSYGO-1JIPWW9",
    qrPayloadAvailable: true,
    iccid: "8948010000074618117",
    iccidMasked: "8948••••8117",
    manualCode: "LPA:1$smdp.io$K2-2NSYGO-1JIPWW9",
    steps: [
      { order: 1, title: "Go to Settings", body: "Open Settings on your iPhone." },
      { order: 2, title: "Mobile Data", body: "Tap Mobile Data." },
      { order: 3, title: "Add eSIM", body: "Tap Add eSIM." },
      { order: 4, title: "Use QR Code", body: "Scan the QR code or enter the manual code." },
    ],
  };
}

function paymentMethods() {
  return [
    { id: "pm_card_4242", brand: "visa", label: "Visa ending in 4242", last4: "4242", expMonth: 12, expYear: 2027, default: true },
    { id: "pm_card_8888", brand: "mastercard", label: "Mastercard ending in 8888", last4: "8888", expMonth: 11, expYear: 2028, default: false },
    { id: "pm_paypal_mock", brand: "paypal", label: "PayPal", email: "yil@example.com", default: false },
  ];
}

function helpTopics() {
  return [
    { id: "how-esim-works", title: "How does eSIM work?", body: "Buy a data plan, install the eSIM profile, then enable mobile data when you arrive." },
    { id: "install-esim", title: "How to install eSIM?", body: "Open your eSIM, tap installation, and scan the QR code from your device settings." },
    { id: "supported-devices", title: "Which devices support eSIM?", body: "Most recent iPhone, iPad, Samsung Galaxy, Google Pixel and many other devices support eSIM." },
    { id: "top-up", title: "How to top up eSIM?", body: "Open My eSIMs, select an active eSIM, then choose Top Up." },
    { id: "refund-policy", title: "Refund Policy", body: "Unused and unprovisioned plans can be reviewed for refund from support." },
  ];
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
