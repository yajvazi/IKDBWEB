import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  affectPackageToSubscriberCommand,
  createLocationZoneCommand,
  createPrepaidPackageTemplateCommand,
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
import { getAdminAccessPolicy } from "@/server/db/subresellers";
import { redactOcsPayload } from "@/server/ocs/redaction";

export const dynamic = "force-dynamic";

const createLocationZoneSchema = z.object({
  action: z.literal("createLocationZone"),
  reason: z.string().min(8),
  confirmation: z.literal("CREATE LOCATION ZONE"),
  payload: z.object({
    networkProfileId: z.number().int().positive(),
    locationZoneName: z.string().min(3).max(120),
    tadigList: z.array(z.string().min(3).max(12)).min(1),
  }),
});

const createPackageTemplateSchema = z.object({
  action: z.literal("createPrepaidPackageTemplate"),
  reason: z.string().min(8),
  payload: z.object({
    prepaidpackagetemplatename: z.string().min(3).max(120),
    resellerid: z.number().int().positive(),
    locationzoneid: z.number().int().positive(),
    destinationzoneid: z.number().int().positive().optional(),
    databyte: z.number().int().positive().optional(),
    mocsecond: z.number().int().nonnegative().optional(),
    mtcsecond: z.number().int().nonnegative().optional(),
    mosmsnumber: z.number().int().nonnegative().optional(),
    mtsmsnumber: z.number().int().nonnegative().optional(),
    perioddays: z.number().int().positive(),
    cost: z.number().nonnegative().optional(),
    throttlingActive: z.boolean(),
    throttlingThreshold1Perc: z.number().int().positive().optional(),
    throttlingThreshold1Limit: z.number().int().positive().optional(),
    throttlingThreshold2Perc: z.number().int().positive().optional(),
    throttlingThreshold2Limit: z.number().int().positive().optional(),
    throttlingThreshold3Perc: z.number().int().positive().optional(),
    throttlingThreshold3Limit: z.number().int().positive().optional(),
    throttlingThreshold4Perc: z.number().int().positive().optional(),
    throttlingThreshold4Limit: z.number().int().positive().optional(),
    throttlingErrorAction: z.number().int().min(0).max(1).optional(),
    recurring: z.boolean(),
    nbOccurrence: z.number().int().positive().optional(),
    recurringPeriodicityType: z.number().int().min(0).max(2).optional(),
    recurringPeriodicityFrequency: z.number().int().positive().optional(),
    reportUnitsPreviousPackage: z.boolean().optional(),
  }),
});

const affectPackageToSubscriberSchema = z.object({
  action: z.literal("affectPackageToSubscriber"),
  reason: z.string().min(8),
  payload: z.object({
    packageTemplateId: z.number().int().positive(),
    accountForSubs: z.number().int().positive(),
    validityPeriod: z.number().int().positive().optional(),
  }),
});

const mutationSchema = z.discriminatedUnion("action", [createLocationZoneSchema, createPackageTemplateSchema, affectPackageToSubscriberSchema]);

function ok(data: unknown, requestId: string = randomUUID(), status = 200) {
  return NextResponse.json({
    success: true,
    data,
    meta: { requestId, timestamp: new Date().toISOString() },
  }, { status, headers: { "x-request-id": requestId } });
}

function fail(code: string, message: string, status = 400, requestId: string = randomUUID(), fieldErrors?: Record<string, string[]>) {
  return NextResponse.json({
    success: false,
    error: { code, message, requestId, fieldErrors },
  }, { status, headers: { "x-request-id": requestId } });
}

export async function GET(request: NextRequest) {
  const requestId = randomUUID();
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return fail("ADMIN_SESSION_REQUIRED", "Admin session required.", 401, requestId);
    const scope = await getOcsCreationScope(admin);
    if (scope.error) return fail("OCS_SCOPE_REQUIRED", scope.error, 403, requestId);

    const env = getEnv();
    const resource = request.nextUrl.searchParams.get("resource") ?? "overview";
    const requestedResellerId = Number(request.nextUrl.searchParams.get("resellerId") ?? env.OCS_RESELLER_ID);
    const resellerId = scope.policy ? scope.policy.ocsResellerId : requestedResellerId;
    const client = getOcsClient();

    if (resource === "reseller-accounts") {
      const response = filterResellerAccounts(
        await addResellerInfoBalances(await client.executeCommand(listResellerAccountCommand()), client),
        scope.policy,
      );
      return ok({ resource, response }, requestId);
    }

    if (resource === "reseller-info") {
      const response = await client.executeCommand(getResellerInfoCommand(Number.isFinite(resellerId) && resellerId > 0 ? { id: resellerId } : {}));
      return ok({ resource, response }, requestId);
    }

    if (!Number.isFinite(resellerId) || resellerId <= 0) {
      return fail("INVALID_RESELLER_ID", "A valid reseller ID is required.", 400, requestId);
    }

    if (resource === "network-profiles") {
      const response = await client.executeCommand(listNetworkProfileCommand({ resellerId }));
      return ok({ resource, response }, requestId);
    }

    if (resource === "location-zones") {
      const response = await client.executeCommand(listDetailedLocationZoneCommand(resellerId));
      return ok({ resource, response }, requestId);
    }

    if (resource === "destination-lists") {
      const response = await client.executeCommand(listDetailedDestinationListCommand(resellerId));
      return ok({ resource, response }, requestId);
    }

    if (resource === "package-templates") {
      const response = await client.executeCommand(listPrepaidPackageTemplateCommand({ resellerId }));
      return ok({ resource, response }, requestId);
    }

    const [rawResellerAccounts, resellerInfo, networkProfiles, locationZones, destinationLists, packageTemplates] = await Promise.all([
      client.executeCommand(listResellerAccountCommand()),
      client.executeCommand(getResellerInfoCommand({ id: resellerId })).catch((error) => ({ status: { code: -1, msg: error instanceof Error ? error.message : "Unavailable" } })),
      client.executeCommand(listNetworkProfileCommand({ resellerId })),
      client.executeCommand(listDetailedLocationZoneCommand(resellerId)),
      client.executeCommand(listDetailedDestinationListCommand(resellerId)),
      client.executeCommand(listPrepaidPackageTemplateCommand({ resellerId })),
    ]);
    const resellerAccounts = filterResellerAccounts(await addResellerInfoBalances(rawResellerAccounts, client), scope.policy);

    return ok({
      mode: env.OCS_MOCK_MODE ? "mock" : "live",
      resellerId,
      resellerAccounts,
      resellerInfo,
      networkProfiles,
      locationZones,
      destinationLists,
      packageTemplates,
    }, requestId);
  } catch (error) {
    return handleError(error, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();

  try {
    const admin = await getCurrentAdmin();
    if (!admin) return fail("ADMIN_SESSION_REQUIRED", "Admin session required.", 401, requestId);
    const scope = await getOcsCreationScope(admin);
    if (scope.error) return fail("OCS_SCOPE_REQUIRED", scope.error, 403, requestId);

    const originError = assertSameOrigin(request);
    if (originError) return fail("FORBIDDEN_ORIGIN", originError, 403, requestId);

    const parsed = mutationSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", "The OCS creation request is invalid.", 400, requestId, z.flattenError(parsed.error).fieldErrors);
    }

    const client = getOcsClient();
    let command: Record<string, unknown>;
    if (parsed.data.action === "createLocationZone") {
      command = createLocationZoneCommand(parsed.data.payload);
    } else if (parsed.data.action === "createPrepaidPackageTemplate") {
      const scopeError = validateScopedPackageTemplate(parsed.data.payload.resellerid, scope.policy);
      if (scopeError) return fail("OCS_SCOPE_FORBIDDEN", scopeError, 403, requestId);
      const duplicate = await packageTemplateNameExists(client, parsed.data.payload.resellerid, parsed.data.payload.prepaidpackagetemplatename);
      if (duplicate) {
        return fail("DUPLICATE_PACKAGE_TEMPLATE_NAME", "A package template with this name already exists in OCS. Use a unique package template name.", 409, requestId);
      }
      command = createPrepaidPackageTemplateCommand(parsed.data.payload);
    } else {
      const scopeError = validateScopedPackageAssignment(parsed.data.payload.accountForSubs, scope.policy);
      if (scopeError) return fail("OCS_SCOPE_FORBIDDEN", scopeError, 403, requestId);
      command = affectPackageToSubscriberCommand(parsed.data.payload);
    }

    const response = await client.executeCommand(command);

    console.info("OCS admin creation executed", {
      requestId,
      action: parsed.data.action,
      reason: parsed.data.reason,
      confirmation: "confirmation" in parsed.data ? parsed.data.confirmation : undefined,
    });

    return ok({ action: parsed.data.action, response }, requestId, 201);
  } catch (error) {
    return handleError(error, requestId);
  }
}

async function getOcsCreationScope(admin: NonNullable<Awaited<ReturnType<typeof getCurrentAdmin>>>) {
  if (admin.role === "super_admin") return { policy: null, error: null };

  const policy = await getAdminAccessPolicy(admin.email);
  if (!policy) {
    return {
      policy: null,
      error: "This admin account is not linked to an OCS reseller profile.",
    };
  }

  return { policy, error: null };
}

function validateScopedPackageTemplate(resellerId: number, policy: Awaited<ReturnType<typeof getAdminAccessPolicy>>) {
  if (!policy) return null;
  if (resellerId !== policy.ocsResellerId) {
    return `This account can only create package templates for OCS reseller ${policy.ocsResellerId}.`;
  }
  return null;
}

function validateScopedPackageAssignment(accountForSubs: number, policy: Awaited<ReturnType<typeof getAdminAccessPolicy>>) {
  if (!policy || !policy.ocsAccountId) return null;
  if (accountForSubs !== policy.ocsAccountId) {
    return `This account can only assign packages to OCS account ${policy.ocsAccountId}.`;
  }
  return null;
}

function filterResellerAccounts(response: Record<string, unknown>, policy: Awaited<ReturnType<typeof getAdminAccessPolicy>>) {
  if (!policy) return response;

  const list = response.listResellerAccount;
  if (!list || typeof list !== "object") return response;
  const resellers = (list as { reseller?: unknown }).reseller;
  if (!Array.isArray(resellers)) return response;

  const scopedResellers = resellers.flatMap((reseller) => {
    if (!reseller || typeof reseller !== "object") return [];
    const resellerRecord = reseller as Record<string, unknown>;
    if (Number(resellerRecord.id) !== policy.ocsResellerId) return [];

    const accounts = Array.isArray(resellerRecord.account) ? resellerRecord.account : [];
    const scopedAccounts = policy.ocsAccountId
      ? accounts.filter((account) => account && typeof account === "object" && Number((account as Record<string, unknown>).id) === policy.ocsAccountId)
      : accounts;

    return [{ ...resellerRecord, account: scopedAccounts }];
  });

  return {
    ...response,
    listResellerAccount: {
      ...(list as Record<string, unknown>),
      reseller: scopedResellers,
    },
  };
}

function assertSameOrigin(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return null;

  const expected = new URL(appUrl).origin;
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (origin && origin !== expected) return "Request origin does not match the configured admin app URL.";
  if (referer && new URL(referer).origin !== expected) return "Request referer does not match the configured admin app URL.";
  return null;
}

async function addResellerInfoBalances(response: Record<string, unknown>, client: ReturnType<typeof getOcsClient>) {
  const list = response.listResellerAccount;
  if (!list || typeof list !== "object") return response;

  const resellers = (list as { reseller?: unknown }).reseller;
  if (!Array.isArray(resellers)) return response;

  const enriched = await Promise.all(resellers.map(async (reseller) => {
    if (!reseller || typeof reseller !== "object") return reseller;

    const resellerRecord = reseller as Record<string, unknown>;
    const id = Number(resellerRecord.id);
    if (!Number.isFinite(id) || id <= 0) return reseller;

    try {
      const infoResponse = await client.executeCommand(getResellerInfoCommand({ id }));
      const info = infoResponse.getResellerInfo;
      const infoRecord = info && typeof info === "object" ? info as Record<string, unknown> : null;
      return {
        ...resellerRecord,
        resellerBalance: infoRecord?.balance ?? resellerRecord.balance,
        resellerInfo: infoRecord,
      };
    } catch {
      return reseller;
    }
  }));

  return {
    ...response,
    listResellerAccount: {
      ...(list as Record<string, unknown>),
      reseller: enriched,
    },
  };
}

async function packageTemplateNameExists(client: ReturnType<typeof getOcsClient>, resellerId: number, templateName: string) {
  try {
    const response = await client.executeCommand(listPrepaidPackageTemplateCommand({ resellerId }));
    const templatesRoot = response.listPrepaidPackageTemplate;
    const templates = Array.isArray(templatesRoot)
      ? templatesRoot
      : templatesRoot && typeof templatesRoot === "object" && Array.isArray((templatesRoot as { template?: unknown }).template)
        ? (templatesRoot as { template: unknown[] }).template
        : [];
    const normalizedName = normalizePackageTemplateName(templateName);

    return templates.some((template) => {
      if (!template || typeof template !== "object") return false;
      const templateRecord = template as Record<string, unknown>;
      const existingName = String(templateRecord.prepaidpackagetemplatename ?? templateRecord.userUiName ?? "");
      return normalizePackageTemplateName(existingName) === normalizedName;
    });
  } catch (error) {
    console.warn("OCS duplicate package-template preflight failed; continuing with upstream create", {
      message: error instanceof Error ? error.message : "Unknown preflight error",
    });
    return false;
  }
}

function handleError(error: unknown, requestId: string) {
  if (error instanceof OcsApiError) {
    const upstreamName = ocsErrorDescriptions[error.upstreamCode as keyof typeof ocsErrorDescriptions] ?? "UNKNOWN_OCS_ERROR";
    const upstreamMessage = safeUpstreamMessage(error.upstreamMessage);
    const duplicatePackageTemplateName = isDuplicatePackageTemplateNameError(upstreamMessage);

    console.warn("OCS creation upstream error", {
      requestId,
      upstreamCode: error.upstreamCode,
      upstreamName,
      upstreamMessage,
      retryable: error.retryable,
      correlationId: error.correlationId,
    });

    return fail(
      "OCS_UPSTREAM_ERROR",
      duplicatePackageTemplateName
        ? "A package template with this name already exists in OCS. Use a unique package template name."
        : `OCS ${error.upstreamCode} ${upstreamName}: ${upstreamMessage}`,
      duplicatePackageTemplateName ? 409 : error.httpStatus,
      requestId,
    );
  }

  if (error instanceof Error) {
    console.error("OCS creation API failed", { requestId, message: error.message });
    return fail("OCS_ADMIN_API_FAILED", error.message, 500, requestId);
  }

  return fail("OCS_ADMIN_API_FAILED", "Unknown OCS admin API failure.", 500, requestId);
}

function safeUpstreamMessage(message: string) {
  const redacted = redactOcsPayload({ message }).message;
  if (typeof redacted !== "string" || redacted.trim().length === 0) return "The upstream service did not provide details.";
  return redacted.trim().slice(0, 240);
}

function isDuplicatePackageTemplateNameError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("pre_paid_package_template_name_unique")
    || (normalized.includes("duplicate entry") && normalized.includes("package"));
}

function normalizePackageTemplateName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}
