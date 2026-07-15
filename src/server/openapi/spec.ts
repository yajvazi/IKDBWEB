import { ocsCommandCatalog } from "@/lib/ocs/catalog";
import { ringCompatEndpoints, toInternetKudoPath } from "@/lib/ring-compat/endpoints";

export function getOpenApiSpec() {
  const ringTags = Array.from(new Set(ringCompatEndpoints.map((endpoint) => `Ring - ${endpoint.tag}`)));

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
      "Mobile App",
      "Website",
      "Authentication",
      "Profile",
      "Countries",
      "Plans",
      "Search",
      "Cart",
      "Checkout",
      "Orders",
      "eSIMs",
      "Top-ups",
      "Payment Methods",
      "Notifications",
      "Wallet",
      "Referrals",
      "Support",
      "Help Center",
      "Webhooks",
      "Admin",
      "OCS Gateway",
      "OCS Admin",
      ...ringTags,
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
        CartQuoteRequest: {
          type: "object",
          required: ["planId"],
          properties: {
            planId: { type: "string" },
            quantity: { type: "integer", minimum: 1, default: 1 },
            referralCode: { type: "string" },
            kudoPointsToRedeem: { type: "integer", minimum: 0, default: 0 },
          },
        },
        ProfileUpdateRequest: {
          type: "object",
          properties: {
            name: { type: "string" },
            phone: { type: "string" },
            marketingOptIn: { type: "boolean" },
            preferredCurrency: { type: "string", minLength: 3, maxLength: 3 },
          },
        },
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
      "/app/bootstrap": get("Mobile App", "Load app configuration, feature flags, and navigation"),
      "/app/onboarding": get("Mobile App", "Load onboarding slides"),
      "/app/home": get("Mobile App", "Load home screen content"),
      "/health": get("Website", "Gateway health check"),
      "/system-status": get("Website", "Website system status"),
      "/public-packages": get("Website", "Website public package catalog compatibility route"),
      "/packages/list": get("Website", "Website package list compatibility route"),
      "/categories": get("Website", "Website category list compatibility route"),
      "/categories/{id}": get("Website", "Website category detail compatibility route"),
      "/byop/operators": get("Website", "Website BYOP operator tree compatibility route"),
      "/byop/quote": post("Website", "Website BYOP quote compatibility route"),
      "/create-payment-intent": post("Website", "Website Stripe payment intent compatibility route"),
      "/orders/complete": post("Website", "Website order completion and OCS provisioning compatibility route"),
      "/orders/cod": post("Website", "Website cash-on-delivery order compatibility route"),
      "/iccid/check": post("Website", "Website ICCID balance check compatibility route"),
      "/iccid/topup": post("Website", "Website ICCID top-up compatibility route"),
      "/newsletter": post("Website", "Website newsletter subscribe compatibility route"),
      "/newsletter/unsubscribe": post("Website", "Website newsletter unsubscribe compatibility route"),
      "/support/ticket": post("Website", "Website support ticket compatibility route"),
      "/webhooks/esim-activated": post("Website", "Website eSIM activated webhook compatibility route"),
      "/webhooks/package-usage": post("Website", "Website package usage webhook compatibility route"),
      "/auth/register": post("Authentication", "Register a customer"),
      "/auth/login": post("Authentication", "Login a customer"),
      "/auth/logout": post("Authentication", "Logout a customer"),
      "/auth/refresh": post("Authentication", "Refresh a session"),
      "/auth/forgot-password": post("Authentication", "Start password reset"),
      "/auth/me": get("Authentication", "Current customer"),
      "/profile": { ...get("Profile", "Get customer profile"), ...patchWithBody("Profile", "Update customer profile", "#/components/schemas/ProfileUpdateRequest") },
      "/countries": get("Countries", "List supported countries"),
      "/countries/{countryCode}": get("Countries", "Get country details"),
      "/countries/{countryCode}/plans": get("Countries", "List country plans"),
      "/plans": get("Plans", "List sellable plans"),
      "/plans/{planId}": get("Plans", "Get plan details"),
      "/search": get("Search", "Search countries and plans"),
      "/cart/quote": { ...get("Cart", "Quote cart from query params"), ...postWithBody("Cart", "Quote cart", "#/components/schemas/CartQuoteRequest") },
      "/checkout/payment-intent": post("Checkout", "Create a Stripe PaymentIntent"),
      "/checkout/validate": post("Checkout", "Validate checkout state"),
      "/orders": { ...post("Orders", "Create an order"), ...get("Orders", "List customer orders") },
      "/orders/{orderId}": get("Orders", "Get order details"),
      "/esims": get("eSIMs", "List customer eSIMs"),
      "/esims/{esimId}": get("eSIMs", "Get eSIM details"),
      "/esims/{esimId}/usage": get("eSIMs", "Get usage"),
      "/esims/{esimId}/installation": get("eSIMs", "Get masked installation details"),
      "/esims/{esimId}/topups": post("Top-ups", "Create a top-up order"),
      "/payment-methods": get("Payment Methods", "List saved payment methods"),
      "/payment-methods/setup-intent": post("Payment Methods", "Create a Stripe SetupIntent for adding a card"),
      "/payment-methods/{paymentMethodId}": deleteOperation("Payment Methods", "Delete payment method"),
      "/payment-methods/{paymentMethodId}/default": patch("Payment Methods", "Set default payment method"),
      "/notifications": get("Notifications", "List notifications"),
      "/notifications/{notificationId}/read": patch("Notifications", "Mark notification read"),
      "/notifications/read-all": post("Notifications", "Mark all notifications read"),
      "/wallet": get("Wallet", "Get wallet"),
      "/wallet/transactions": get("Wallet", "List wallet transactions"),
      "/referrals": get("Referrals", "List referral activity"),
      "/referrals/apply": post("Referrals", "Apply a referral code"),
      "/help/topics": get("Help Center", "List help topics"),
      "/help/topics/{topicId}": get("Help Center", "Get help topic"),
      "/support/contact": post("Support", "Contact support"),
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
      ...ringOpenApiPaths(),
    },
  };
}

function ringOpenApiPaths() {
  return ringCompatEndpoints.reduce<Record<string, Record<string, unknown>>>((paths, endpoint) => {
    const path = toInternetKudoPath(endpoint.path);
    paths[path] ??= {};
    paths[path][endpoint.method.toLowerCase()] = {
      tags: [`Ring - ${endpoint.tag}`],
      operationId: endpoint.operationId,
      summary: endpoint.summary,
      description: "Ring eSIM Swagger-compatible InternetKudo API Gateway route. The route is served under /api/v1 and normalized by InternetKudo; raw OCS credentials are never exposed.",
      security: [{ bearerAuth: [] }],
      parameters: pathParameters(path),
      ...(endpoint.method === "POST" || endpoint.method === "PATCH" ? {
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", additionalProperties: true },
            },
          },
        },
      } : {}),
      responses: openApiResponses(),
    };
    return paths;
  }, {});
}

function pathParameters(path: string) {
  return [...path.matchAll(/\{([^}]+)\}/g)].map((match) => ({
    name: match[1],
    in: "path",
    required: true,
    schema: { type: "string" },
  }));
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

function deleteOperation(tag: string, summary: string) {
  return operation("delete", tag, summary);
}

function postWithBody(tag: string, summary: string, schemaRef: string) {
  return operationWithBody("post", tag, summary, schemaRef);
}

function patchWithBody(tag: string, summary: string, schemaRef: string) {
  return operationWithBody("patch", tag, summary, schemaRef);
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

function operation(method: "get" | "post" | "patch" | "delete", tag: string, summary: string) {
  return {
    [method]: {
      tags: [tag],
      summary,
      security: [{ bearerAuth: [] }],
      responses: openApiResponses(),
    },
  };
}

function operationWithBody(method: "post" | "patch", tag: string, summary: string, schemaRef: string) {
  return {
    [method]: {
      tags: [tag],
      summary,
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: { "application/json": { schema: { $ref: schemaRef } } },
      },
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
