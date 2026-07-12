import { ocsCommandCatalog } from "@/lib/ocs/catalog";

export function getOpenApiSpec() {
  return {
    openapi: "3.1.0",
    info: {
      title: "InternetKudo API Gateway",
      version: "0.1.0",
      description: "Normalized REST API for InternetKudo mobile apps and website. OCS credentials and raw upstream commands are never exposed.",
    },
    servers: [
      { url: "/api/v1", description: "Development sandbox" },
      { url: "/", description: "Admin gateway routes" },
    ],
    tags: [
      "Authentication",
      "Countries",
      "Plans",
      "Checkout",
      "Orders",
      "eSIMs",
      "Top-ups",
      "Notifications",
      "Wallet",
      "Referrals",
      "Support",
      "Webhooks",
      "Admin",
      "OCS Gateway",
      "OCS Admin",
    ].map((name) => ({ name })),
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        ApiResponse: {
          type: "object",
          required: ["success", "data"],
          properties: {
            success: { const: true },
            data: {},
            meta: { $ref: "#/components/schemas/Meta" },
          },
        },
        ApiError: {
          type: "object",
          required: ["success", "error"],
          properties: {
            success: { const: false },
            error: {
              type: "object",
              required: ["code", "message", "requestId"],
              properties: {
                code: { type: "string" },
                message: { type: "string" },
                requestId: { type: "string" },
                fieldErrors: { type: "object", additionalProperties: { type: "array", items: { type: "string" } } },
              },
            },
          },
        },
        Meta: {
          type: "object",
          properties: { requestId: { type: "string" }, timestamp: { type: "string", format: "date-time" } },
        },
        Country: { type: "object", properties: { code: { type: "string" }, name: { type: "string" }, flag: { type: "string" } } },
        Plan: { type: "object", properties: { id: { type: "string" }, countryCode: { type: "string" }, dataAllowanceBytes: { type: "integer" }, validityDays: { type: "integer" }, priceMinor: { type: "integer" }, currency: { type: "string" } } },
        Order: { type: "object", properties: { id: { type: "string" }, orderNumber: { type: "string" }, paymentStatus: { type: "string" }, provisioningStatus: { type: "string" }, totalMinor: { type: "integer" } } },
        Payment: { type: "object", properties: { paymentIntentId: { type: "string" }, status: { type: "string" }, amountMinor: { type: "integer" } } },
        Esim: { type: "object", properties: { id: { type: "string" }, status: { type: "string" }, iccidMasked: { type: "string" } } },
        EsimUsage: { type: "object", properties: { allocatedDataBytes: { type: "integer" }, usedDataBytes: { type: "integer" }, remainingDataBytes: { type: "integer" } } },
        InstallationDetails: { type: "object", properties: { activationCodeMasked: { type: "string" }, qrPayloadAvailable: { type: "boolean" } } },
        Notification: { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, read: { type: "boolean" } } },
        Wallet: { type: "object", properties: { balanceMinor: { type: "integer" }, currency: { type: "string" } } },
        Referral: { type: "object", properties: { code: { type: "string" }, status: { type: "string" } } },
        SupportTicket: { type: "object", properties: { id: { type: "string" }, subject: { type: "string" }, status: { type: "string" } } },
        Pagination: { type: "object", properties: { page: { type: "integer" }, pageSize: { type: "integer" }, total: { type: "integer" } } },
        OcsCommandName: {
          type: "string",
          enum: ocsCommandCatalog.map((item) => item.command),
          description: "Documented Telco-vision OCS command names tracked by InternetKudo. Raw OCS command execution is not exposed to mobile clients.",
        },
        OcsSubscriberIdentifier: {
          oneOf: [
            { type: "object", required: ["subscriberId"], properties: { subscriberId: { type: "integer", minimum: 1 } } },
            { type: "object", required: ["imsi"], properties: { imsi: { type: "string", minLength: 6 } } },
            { type: "object", required: ["iccid"], properties: { iccid: { type: "string", minLength: 8 } } },
            { type: "object", required: ["msisdn"], properties: { msisdn: { type: "string", minLength: 6 } } },
            { type: "object", required: ["multiImsi"], properties: { multiImsi: { type: "string", minLength: 6 } } },
            { type: "object", required: ["activationCode"], properties: { activationCode: { type: "string", minLength: 4 } } },
          ],
        },
        OcsPackageAssignmentRequest: {
          type: "object",
          required: ["packageTemplateId", "accountId"],
          properties: {
            packageTemplateId: { type: "integer", minimum: 1 },
            accountId: { type: "integer", minimum: 1, description: "OCS accountForSubs value." },
            validityPeriod: { type: "integer", minimum: 1 },
          },
          examples: [{ packageTemplateId: 553, accountId: 40, validityPeriod: 30 }],
        },
        OcsPackageAssignment: {
          type: "object",
          properties: {
            iccid: { type: ["string", "null"] },
            smdpServer: { type: ["string", "null"] },
            activationCode: { type: ["string", "null"] },
            urlQrCode: { type: ["string", "null"], description: "LPA QR payload used by the mobile app QR renderer." },
            subscriberId: { type: ["integer", "null"] },
            esimId: { type: ["integer", "null"] },
            subsPackageId: { type: ["integer", "null"] },
            userSimName: { type: ["string", "null"] },
          },
        },
        OcsCreateLocationZoneRequest: {
          type: "object",
          required: ["action", "reason", "confirmation", "payload"],
          properties: {
            action: { const: "createLocationZone" },
            reason: { type: "string", minLength: 8 },
            confirmation: { const: "CREATE LOCATION ZONE" },
            payload: {
              type: "object",
              required: ["networkProfileId", "locationZoneName", "tadigList"],
              properties: {
                networkProfileId: { type: "integer", minimum: 1 },
                locationZoneName: { type: "string" },
                tadigList: { type: "array", items: { type: "string" } },
              },
            },
          },
        },
        OcsCreatePackageTemplateRequest: {
          type: "object",
          required: ["action", "reason", "payload"],
          properties: {
            action: { const: "createPrepaidPackageTemplate" },
            reason: { type: "string", minLength: 8 },
            payload: {
              type: "object",
              required: ["prepaidpackagetemplatename", "resellerid", "locationzoneid", "perioddays", "throttlingActive", "recurring"],
              properties: {
                prepaidpackagetemplatename: { type: "string" },
                resellerid: { type: "integer", minimum: 1 },
                locationzoneid: { type: "integer", minimum: 1 },
                destinationzoneid: { type: "integer", minimum: 1 },
                databyte: { type: "integer", minimum: 1 },
                perioddays: { type: "integer", minimum: 1 },
                cost: { type: "number", minimum: 0 },
                throttlingActive: { type: "boolean" },
                recurring: { type: "boolean" },
              },
            },
          },
        },
        OcsAffectPackageToSubscriberRequest: {
          type: "object",
          required: ["action", "reason", "payload"],
          properties: {
            action: { const: "affectPackageToSubscriber" },
            reason: { type: "string", minLength: 8 },
            payload: {
              type: "object",
              required: ["packageTemplateId", "accountForSubs"],
              properties: {
                packageTemplateId: { type: "integer", minimum: 1 },
                accountForSubs: { type: "integer", minimum: 1 },
                validityPeriod: { type: "integer", minimum: 1 },
              },
            },
          },
        },
      },
    },
    paths: {
      "/auth/register": post("Authentication", "Register a customer"),
      "/auth/login": post("Authentication", "Login a customer"),
      "/auth/logout": post("Authentication", "Logout a customer"),
      "/auth/refresh": post("Authentication", "Refresh a session"),
      "/auth/forgot-password": post("Authentication", "Start password reset"),
      "/auth/me": get("Authentication", "Current customer"),
      "/countries": get("Countries", "List supported countries"),
      "/countries/{countryCode}": get("Countries", "Get country details"),
      "/countries/{countryCode}/plans": get("Countries", "List country plans"),
      "/plans": get("Plans", "List sellable plans"),
      "/plans/{planId}": get("Plans", "Get plan details"),
      "/checkout/payment-intent": post("Checkout", "Create a Stripe PaymentIntent"),
      "/checkout/validate": post("Checkout", "Validate checkout state"),
      "/orders": { ...post("Orders", "Create an order"), ...get("Orders", "List customer orders") },
      "/orders/{orderId}": get("Orders", "Get order details"),
      "/esims": get("eSIMs", "List customer eSIMs"),
      "/esims/{esimId}": get("eSIMs", "Get eSIM details"),
      "/esims/{esimId}/usage": get("eSIMs", "Get usage"),
      "/esims/{esimId}/installation": get("eSIMs", "Get masked installation details"),
      "/esims/{esimId}/topups": post("Top-ups", "Create a top-up order"),
      "/notifications": get("Notifications", "List notifications"),
      "/notifications/{notificationId}/read": patch("Notifications", "Mark notification read"),
      "/notifications/read-all": post("Notifications", "Mark all notifications read"),
      "/wallet": get("Wallet", "Get wallet"),
      "/wallet/transactions": get("Wallet", "List wallet transactions"),
      "/referrals": get("Referrals", "List referral activity"),
      "/referrals/apply": post("Referrals", "Apply a referral code"),
      "/support/tickets": { ...post("Support", "Create support ticket"), ...get("Support", "List support tickets") },
      "/support/tickets/{ticketId}": get("Support", "Get support ticket"),
      "/ocs/health": get("OCS Gateway", "Check InternetKudo OCS proxy health"),
      "/ocs/catalog": get("OCS Gateway", "List supported OCS proxy routes and documented upstream commands"),
      "/ocs/reseller-accounts": get("OCS Gateway", "List reseller accounts through the secure gateway"),
      "/ocs/reseller-info": {
        get: {
          tags: ["OCS Gateway"],
          summary: "Read reseller info and balance",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "query", required: false, schema: { type: "integer" } }],
          responses: openApiResponses(),
        },
      },
      "/ocs/network-profiles": ocsResellerScopedGet("List OCS network profiles"),
      "/ocs/location-zones": ocsResellerScopedGet("List OCS location zones"),
      "/ocs/destination-lists": ocsResellerScopedGet("List OCS destination lists"),
      "/ocs/package-templates": ocsResellerScopedGet("List OCS package templates and upstream prices"),
      "/ocs/subscriber-packages/search": {
        post: {
          tags: ["OCS Gateway"],
          summary: "Search subscriber prepaid packages",
          description: "InternetKudo wrapper for listSubscriberPrepaidPackages. Accepts exactly one supported identifier and returns normalized package usage data.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/OcsSubscriberIdentifier" }, examples: { subscriberId: { value: { subscriberId: 34705265 } }, iccid: { value: { iccid: "8948010000074618117" } } } } },
          },
          responses: openApiResponses(),
        },
      },
      "/ocs/package-assignments": {
        post: {
          tags: ["OCS Gateway"],
          summary: "Assign an OCS package template to an account",
          description: "InternetKudo wrapper for affectPackageToSubscriber. In production this must be called only after Stripe payment confirmation and ownership checks.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/OcsPackageAssignmentRequest" } } },
          },
          responses: {
            "201": {
              description: "Package assignment created",
              content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/ApiResponse" }] } } },
            },
            ...openApiResponses(),
          },
        },
      },
      "/api/admin/ocs/creation": {
        get: {
          tags: ["OCS Admin"],
          summary: "Pull live OCS inventory for the creation panel",
          description: "Returns server-side live OCS network profiles, location zones, destination lists, and package templates. OCS credentials are never returned.",
          parameters: [
            {
              name: "resource",
              in: "query",
              required: false,
              schema: { type: "string", enum: ["overview", "reseller-accounts", "reseller-info", "network-profiles", "location-zones", "destination-lists", "package-templates"] },
            },
            { name: "resellerId", in: "query", required: false, schema: { type: "integer" } },
          ],
          responses: openApiResponses(),
        },
        post: {
          tags: ["OCS Admin"],
          summary: "Run documented OCS creation commands",
          description: "Server-side admin route for documented OCS creation commands, including account-based affectPackageToSubscriber package creation. Package templates require reason and validated fields. Location-zone creation also requires exact typed confirmation.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    { $ref: "#/components/schemas/OcsCreateLocationZoneRequest" },
                    { $ref: "#/components/schemas/OcsCreatePackageTemplateRequest" },
                    { $ref: "#/components/schemas/OcsAffectPackageToSubscriberRequest" },
                  ],
                },
              },
            },
          },
          responses: openApiResponses(),
        },
      },
      "/api/admin/ocs/commands": {
        get: {
          tags: ["OCS Admin"],
          summary: "Documented OCS command catalog",
          description: "Swagger catalog of OCS command names from the Telco-vision public API docs. This is documentation only, not a raw OCS proxy.",
          responses: openApiResponses(),
        },
      },
    },
  };
}

function get(tag: string, summary: string) {
  return operation("get", tag, summary);
}

function post(tag: string, summary: string) {
  return operation("post", tag, summary);
}

function patch(tag: string, summary: string) {
  return operation("patch", tag, summary);
}

function ocsResellerScopedGet(summary: string) {
  return {
    get: {
      tags: ["OCS Gateway"],
      summary,
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "resellerId", in: "query", required: false, schema: { type: "integer" } }],
      responses: openApiResponses(),
    },
  };
}

function operation(method: "get" | "post" | "patch", tag: string, summary: string) {
  return {
    [method]: {
      tags: [tag],
      summary,
      security: [{ bearerAuth: [] }],
      responses: openApiResponses(),
    },
  };
}

function openApiResponses() {
  return {
    "200": {
      description: "Successful response",
      content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } },
    },
    "400": {
      description: "Validation error",
      content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } },
    },
  };
}
