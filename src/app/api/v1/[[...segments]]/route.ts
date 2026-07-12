import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { esimsConfig, ordersConfig, packagesConfig } from "@/components/admin/operations-data";
import { getPublicPlans } from "@/server/supabase/packages";

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
