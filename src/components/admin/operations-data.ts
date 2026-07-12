import type { StatusTone } from "@/types/admin";

export type AdminColumn = {
  key: string;
  label: string;
  kind?: "text" | "money" | "status" | "mono" | "number" | "date" | "masked";
  align?: "left" | "right";
};

export type AdminRecord = {
  id: string;
  title: string;
  subtitle: string;
  createdAt: string;
  amount?: string;
  status: string;
  statusTone: StatusTone;
  secondaryStatus?: string;
  secondaryTone?: StatusTone;
  category: string;
  fields: Record<string, string | number | null>;
  sensitiveFields?: Record<string, string>;
  timeline: string[];
  notes: string[];
};

export type AdminWorkspaceConfig = {
  title: string;
  description: string;
  primaryAction: string;
  searchPlaceholder: string;
  emptyState: string;
  columns: AdminColumn[];
  records: AdminRecord[];
  summary: Array<{ label: string; value: string; tone?: StatusTone }>;
  filters: Array<{ label: string; key: "status" | "category"; options: string[] }>;
  actions: string[];
  detailTitle: string;
  detailDescription: string;
  safeIdentifiers: string[];
  modeLabel?: string;
  operationsLogTitle?: string;
  operationsLogDescription?: string;
  pagination?: {
    label: string;
    note: string;
    nextHref?: string;
    resetHref?: string;
  };
};

const commonActions = ["View details", "Add internal note", "Mark for review", "Export row"];

export const ordersConfig: AdminWorkspaceConfig = {
  title: "Orders",
  description: "Manage purchases, payment state, provisioning status, retries, refunds, notes, and masked activation details.",
  primaryAction: "Create mock order",
  searchPlaceholder: "Search order, customer, ICCID, activation code, or PaymentIntent...",
  emptyState: "No orders match the current filters.",
  summary: [
    { label: "Paid orders", value: "8,932", tone: "success" },
    { label: "Provisioning queue", value: "14", tone: "warning" },
    { label: "Manual review", value: "6", tone: "error" },
    { label: "Gross margin", value: "42.8%", tone: "info" },
  ],
  filters: [
    { label: "Payment status", key: "status", options: ["Paid", "Failed", "Pending", "Refunded"] },
    { label: "Country", key: "category", options: ["Turkey", "United States", "Germany", "France", "UAE"] },
  ],
  columns: [
    { key: "orderNumber", label: "Order", kind: "mono" },
    { key: "purchaseDate", label: "Purchase date", kind: "date" },
    { key: "customer", label: "Customer" },
    { key: "email", label: "Email" },
    { key: "country", label: "Country" },
    { key: "package", label: "Package" },
    { key: "salePrice", label: "Sale price", kind: "money", align: "right" },
    { key: "grossMargin", label: "Margin", align: "right" },
    { key: "paymentStatus", label: "Payment", kind: "status" },
    { key: "fulfillmentStatus", label: "Fulfillment", kind: "status" },
    { key: "paymentIntent", label: "PaymentIntent", kind: "mono" },
  ],
  records: [
    {
      id: "ord_10184",
      title: "#IKD-10184",
      subtitle: "Turkey 10 GB - 30 days for Ayla Demir",
      createdAt: "May 31, 2026 10:44",
      amount: "€18.99",
      status: "Paid",
      statusTone: "success",
      secondaryStatus: "Fulfilled",
      secondaryTone: "success",
      category: "Turkey",
      fields: {
        orderNumber: "#IKD-10184",
        purchaseDate: "May 31, 10:44",
        customer: "Ayla Demir",
        email: "ayla@example.com",
        country: "Turkey",
        package: "10 GB / 30 days",
        dataAllowance: "10 GB",
        validity: "30 days",
        quantity: 1,
        salePrice: "€18.99",
        resellerCost: "€9.10",
        stripeFee: "€0.84",
        grossMargin: "47.6%",
        paymentStatus: "Paid",
        fulfillmentStatus: "Fulfilled",
        esimStatus: "Activated",
        paymentIntent: "pi_3P0mockAyla",
        ocsRequest: "req_8fd01c",
      },
      sensitiveFields: {
        ICCID: "8931440400000001129",
        IMSI: "204046000001129",
        "Activation code": "LPA:1$internetkudo.mock$ACT-TR-10184",
      },
      timeline: ["PaymentIntent succeeded", "Provisioning job completed", "Activation email sent", "eSIM activated by customer"],
      notes: ["Customer used iOS installation link."],
    },
    {
      id: "ord_10183",
      title: "#IKD-10183",
      subtitle: "USA 20 GB - provisioning retry scheduled",
      createdAt: "May 31, 2026 10:16",
      amount: "€34.99",
      status: "Paid",
      statusTone: "success",
      secondaryStatus: "Queued",
      secondaryTone: "warning",
      category: "United States",
      fields: {
        orderNumber: "#IKD-10183",
        purchaseDate: "May 31, 10:16",
        customer: "John Carter",
        email: "john@example.com",
        country: "United States",
        package: "20 GB / 30 days",
        salePrice: "€34.99",
        resellerCost: "€18.20",
        stripeFee: "€1.31",
        grossMargin: "44.2%",
        paymentStatus: "Paid",
        fulfillmentStatus: "Queued",
        esimStatus: "Unactivated",
        paymentIntent: "pi_3P0mockJohn",
        ocsRequest: "req_6ad81a",
      },
      sensitiveFields: { ICCID: "8931440400000002456", "Activation code": "LPA:1$internetkudo.mock$ACT-US-10183" },
      timeline: ["PaymentIntent succeeded", "Provisioning job queued", "OCS mock latency injected"],
      notes: ["Retry automatically allowed because mock provisioning is idempotent."],
    },
    {
      id: "ord_10182",
      title: "#IKD-10182",
      subtitle: "Germany 10 GB - failed payment",
      createdAt: "May 31, 2026 09:58",
      amount: "€24.99",
      status: "Failed",
      statusTone: "error",
      secondaryStatus: "Manual review",
      secondaryTone: "warning",
      category: "Germany",
      fields: {
        orderNumber: "#IKD-10182",
        purchaseDate: "May 31, 09:58",
        customer: "Anna Weber",
        email: "anna@example.com",
        country: "Germany",
        package: "10 GB / 30 days",
        salePrice: "€24.99",
        resellerCost: "€12.00",
        stripeFee: "€0.00",
        grossMargin: "n/a",
        paymentStatus: "Failed",
        fulfillmentStatus: "Not started",
        esimStatus: "Not assigned",
        paymentIntent: "pi_3P0mockAnna",
        ocsRequest: "n/a",
      },
      timeline: ["PaymentIntent failed", "Checkout retry link generated", "Fraud signal below block threshold"],
      notes: ["Do not provision until Stripe webhook confirms success."],
    },
  ],
  actions: ["Retry provisioning", "View Stripe payment", "View OCS logs", "Resend installation email", "Issue refund", ...commonActions],
  detailTitle: "Order operations",
  detailDescription: "Stripe timeline, fulfillment state, masked activation details, costs, and audit actions.",
  safeIdentifiers: ["orderNumber", "paymentIntent", "ocsRequest"],
};

export const packagesConfig: AdminWorkspaceConfig = {
  title: "Packages",
  description: "Normalized InternetKudo catalogue mapped to OCS package templates and Stripe products.",
  primaryAction: "Create package",
  searchPlaceholder: "Search package, country, OCS template, Stripe product...",
  emptyState: "No packages match the current filters.",
  summary: [
    { label: "Active packages", value: "86", tone: "success" },
    { label: "Featured", value: "12", tone: "info" },
    { label: "Price drift", value: "3", tone: "warning" },
    { label: "Archived", value: "8", tone: "neutral" },
  ],
  filters: [
    { label: "State", key: "status", options: ["Active", "Disabled", "Archived"] },
    { label: "Country", key: "category", options: ["Turkey", "United States", "Europe", "Global", "UAE"] },
  ],
  columns: [
    { key: "packageId", label: "Package ID", kind: "mono" },
    { key: "templateId", label: "OCS template", kind: "mono" },
    { key: "displayName", label: "Display name" },
    { key: "country", label: "Country" },
    { key: "allowance", label: "Data" },
    { key: "validity", label: "Validity" },
    { key: "retail", label: "Retail", kind: "money", align: "right" },
    { key: "cost", label: "Cost", kind: "money", align: "right" },
    { key: "margin", label: "Margin", align: "right" },
    { key: "state", label: "State", kind: "status" },
  ],
  records: [
    makePackage("pkg_tr_10gb_30d", "tpl_43021", "Turkey 10 GB", "Turkey", "10 GB", "30 days", "€18.99", "€9.10", "52.1%", "Active", "success"),
    makePackage("pkg_us_20gb_30d", "tpl_43066", "USA 20 GB", "United States", "20 GB", "30 days", "€34.99", "€18.20", "48.0%", "Active", "success"),
    makePackage("pkg_global_5gb_30d", "tpl_43190", "Global Connect", "Global", "5 GB", "30 days", "€22.99", "€13.20", "42.6%", "Active", "success"),
    makePackage("pkg_uae_5gb_15d", "tpl_43088", "UAE 5 GB", "UAE", "5 GB", "15 days", "€19.99", "€12.60", "37.0%", "Disabled", "warning"),
  ],
  actions: ["Synchronize from upstream", "Link Stripe product", "Edit retail price", "Feature package", "Duplicate", "Archive", ...commonActions],
  detailTitle: "Package catalogue controls",
  detailDescription: "Retail pricing is separate from reseller cost snapshots and never overwrites completed orders.",
  safeIdentifiers: ["packageId", "templateId", "stripeProduct", "stripePrice"],
};

export const customersConfig: AdminWorkspaceConfig = {
  title: "Customers",
  description: "Customer revenue, risk flags, orders, eSIMs, Kudo Points, referrals, support history, and audit activity.",
  primaryAction: "Create support note",
  searchPlaceholder: "Search customer, email, order, support ticket...",
  emptyState: "No customers match the current filters.",
  summary: [
    { label: "Customers", value: "18,204", tone: "info" },
    { label: "Returning", value: "36.1%", tone: "success" },
    { label: "Risk flagged", value: "24", tone: "warning" },
    { label: "Refund rate", value: "1.48%", tone: "success" },
  ],
  filters: [
    { label: "Customer type", key: "status", options: ["Returning", "New", "Risk review"] },
    { label: "Country", key: "category", options: ["Turkey", "United States", "Germany", "France"] },
  ],
  columns: [
    { key: "name", label: "Customer" },
    { key: "email", label: "Email" },
    { key: "registrationDate", label: "Registered", kind: "date" },
    { key: "orders", label: "Orders", kind: "number", align: "right" },
    { key: "successfulOrders", label: "Successful", kind: "number", align: "right" },
    { key: "totalRevenue", label: "Revenue", kind: "money", align: "right" },
    { key: "aov", label: "AOV", kind: "money", align: "right" },
    { key: "activeEsims", label: "Active eSIMs", kind: "number", align: "right" },
    { key: "risk", label: "Risk", kind: "status" },
  ],
  records: [
    makeCustomer("cus_ayla", "Ayla Demir", "ayla@example.com", "Turkey", "Returning", "success", "€428.80", "Low"),
    makeCustomer("cus_john", "John Carter", "john@example.com", "United States", "Returning", "success", "€211.94", "Low"),
    makeCustomer("cus_anna", "Anna Weber", "anna@example.com", "Germany", "Risk review", "warning", "€86.91", "Medium"),
  ],
  actions: ["View orders", "View eSIMs", "Open support history", "Adjust Kudo Points", "Add internal note", ...commonActions],
  detailTitle: "Customer 360",
  detailDescription: "Orders, eSIMs, payments, failed payments, refunds, support history, referrals, and audit activity.",
  safeIdentifiers: ["customerId", "email", "lastOrder"],
};

export const esimsConfig: AdminWorkspaceConfig = {
  title: "eSIMs",
  description: "Search by subscriber ID, IMSI, ICCID, MSISDN, multi-IMSI, or activation code. Sensitive identifiers are masked by default.",
  primaryAction: "Search OCS",
  searchPlaceholder: "Search subscriber ID, IMSI, ICCID, MSISDN, multi-IMSI, activation code...",
  emptyState: "No eSIMs match the current filters.",
  summary: [
    { label: "Active eSIMs", value: "8,392", tone: "success" },
    { label: "Unactivated", value: "571", tone: "warning" },
    { label: "Usage sync due", value: "18", tone: "info" },
    { label: "Reveal audits", value: "42", tone: "neutral" },
  ],
  filters: [
    { label: "Provisioning", key: "status", options: ["Active", "Unactivated", "Expired", "Failed"] },
    { label: "Country", key: "category", options: ["Turkey", "United States", "Germany", "Global"] },
  ],
  columns: [
    { key: "esimId", label: "InternetKudo ID", kind: "mono" },
    { key: "subscriberId", label: "Subscriber", kind: "mono" },
    { key: "iccid", label: "ICCID", kind: "masked" },
    { key: "imsi", label: "IMSI", kind: "masked" },
    { key: "package", label: "Package" },
    { key: "assigned", label: "Assigned", kind: "date" },
    { key: "activated", label: "Activated", kind: "date" },
    { key: "remaining", label: "Remaining", align: "right" },
    { key: "state", label: "State", kind: "status" },
  ],
  records: [
    makeEsim("esim_102", "1000", "Turkey", "Turkey 10 GB", "Active", "success", "8.4 GB"),
    makeEsim("esim_103", "1001", "United States", "USA 20 GB", "Unactivated", "warning", "20 GB"),
    makeEsim("esim_104", "1002", "Germany", "Germany 10 GB", "Expired", "neutral", "0 GB"),
  ],
  actions: ["Refresh usage", "Reveal activation data", "Disable activation data", "View order", "Copy safe identifiers", ...commonActions],
  detailTitle: "eSIM subscriber package",
  detailDescription: "Normalized subscriber package data from listSubscriberPrepaidPackages with masked identifiers.",
  safeIdentifiers: ["esimId", "subscriberId", "orderId"],
};

export const paymentsConfig: AdminWorkspaceConfig = {
  title: "Payments",
  description: "Stripe PaymentIntents, refunds, webhook status, local reconciliation, fees, and dispute tracking.",
  primaryAction: "Run reconciliation",
  searchPlaceholder: "Search PaymentIntent, charge, customer, order...",
  emptyState: "No payments match the current filters.",
  summary: [
    { label: "Succeeded", value: "8,932", tone: "success" },
    { label: "Failed", value: "341", tone: "error" },
    { label: "Refunded", value: "€2,354.20", tone: "warning" },
    { label: "Unreconciled", value: "5", tone: "warning" },
  ],
  filters: [
    { label: "Payment status", key: "status", options: ["Succeeded", "Failed", "Refunded", "Disputed"] },
    { label: "Method", key: "category", options: ["Card", "Apple Pay", "Google Pay"] },
  ],
  columns: [
    { key: "paymentIntent", label: "PaymentIntent", kind: "mono" },
    { key: "order", label: "Order", kind: "mono" },
    { key: "customer", label: "Customer" },
    { key: "amount", label: "Amount", kind: "money", align: "right" },
    { key: "currency", label: "Currency" },
    { key: "method", label: "Method" },
    { key: "stripeFee", label: "Stripe fee", kind: "money", align: "right" },
    { key: "webhook", label: "Webhook", kind: "status" },
    { key: "reconciliation", label: "Reconciliation", kind: "status" },
  ],
  records: [
    makePayment("pi_3P0mockAyla", "#IKD-10184", "Ayla Demir", "€18.99", "Card", "Succeeded", "success", "Matched"),
    makePayment("pi_3P0mockJohn", "#IKD-10183", "John Carter", "€34.99", "Apple Pay", "Succeeded", "success", "Matched"),
    makePayment("pi_3P0mockAnna", "#IKD-10182", "Anna Weber", "€24.99", "Card", "Failed", "error", "Review"),
  ],
  actions: ["Issue refund", "Open Stripe dashboard", "Generate retry checkout link", "View webhook history", "Run reconciliation", ...commonActions],
  detailTitle: "Payment reconciliation",
  detailDescription: "Local order state, Stripe event history, fees, refund status, and reconciliation checks.",
  safeIdentifiers: ["paymentIntent", "order", "chargeId"],
};

export const webhookConfig: AdminWorkspaceConfig = {
  title: "Webhook Logs",
  description: "Stripe event processing status, attempts, idempotency, related orders, payments, errors, and replay controls.",
  primaryAction: "Replay selected",
  searchPlaceholder: "Search event ID, PaymentIntent, order, type...",
  emptyState: "No webhook events match the current filters.",
  summary: [
    { label: "Processed", value: "12,881", tone: "success" },
    { label: "Pending replay", value: "2", tone: "warning" },
    { label: "Duplicate blocked", value: "118", tone: "info" },
    { label: "Failed", value: "1", tone: "error" },
  ],
  filters: [
    { label: "Processing status", key: "status", options: ["Processed", "Failed", "Pending", "Duplicate"] },
    { label: "Event type", key: "category", options: ["payment_intent", "charge", "dispute"] },
  ],
  columns: [
    { key: "eventId", label: "Stripe event", kind: "mono" },
    { key: "eventType", label: "Type" },
    { key: "received", label: "Received", kind: "date" },
    { key: "attempts", label: "Attempts", kind: "number", align: "right" },
    { key: "order", label: "Order", kind: "mono" },
    { key: "payment", label: "Payment", kind: "mono" },
    { key: "processing", label: "Status", kind: "status" },
  ],
  records: [
    makeWebhook("evt_mock_001", "payment_intent.succeeded", "#IKD-10184", "Processed", "success"),
    makeWebhook("evt_mock_002", "payment_intent.payment_failed", "#IKD-10182", "Processed", "success"),
    makeWebhook("evt_mock_003", "charge.refunded", "#IKD-10180", "Pending", "warning"),
  ],
  actions: ["Replay event", "Open related order", "Open related payment", "Copy sanitized payload", ...commonActions],
  detailTitle: "Webhook event inspector",
  detailDescription: "Signature verification, idempotency, state update, provisioning enqueue, and safe replay status.",
  safeIdentifiers: ["eventId", "payment", "order"],
};

export const apiLogsConfig: AdminWorkspaceConfig = {
  title: "API Logs",
  description: "Request IDs, users, IP hashes, response status, durations, error codes, and timestamps with secret redaction.",
  primaryAction: "Export logs",
  searchPlaceholder: "Search route, request ID, user, error code...",
  emptyState: "No API requests match the current filters.",
  summary: [
    { label: "Requests", value: "218k", tone: "info" },
    { label: "P95 latency", value: "244 ms", tone: "success" },
    { label: "4xx rate", value: "1.8%", tone: "warning" },
    { label: "5xx rate", value: "0.04%", tone: "success" },
  ],
  filters: [
    { label: "HTTP status", key: "status", options: ["200", "202", "400", "404", "429", "500"] },
    { label: "Route group", key: "category", options: ["auth", "orders", "esims", "checkout", "support"] },
  ],
  columns: [
    { key: "route", label: "Route" },
    { key: "requestId", label: "Request ID", kind: "mono" },
    { key: "user", label: "User" },
    { key: "ipHash", label: "IP hash", kind: "mono" },
    { key: "httpStatus", label: "Status", kind: "status" },
    { key: "duration", label: "Duration", align: "right" },
    { key: "errorCode", label: "Error" },
    { key: "timestamp", label: "Timestamp", kind: "date" },
  ],
  records: [
    makeApiLog("/api/v1/orders", "req_8fd01c", "ayla@example.com", "200", "orders"),
    makeApiLog("/api/v1/esims/esim_102/usage", "req_6ad81a", "john@example.com", "200", "esims"),
    makeApiLog("/api/v1/checkout/payment-intent", "req_6ac21d", "anna@example.com", "400", "checkout"),
  ],
  actions: ["Copy request ID", "Open related resource", "Create incident note", "Export row", ...commonActions],
  detailTitle: "API request log",
  detailDescription: "Redacted request metadata, ownership result, rate limit decision, and response envelope.",
  safeIdentifiers: ["requestId", "route", "ipHash"],
};

export const auditLogsConfig: AdminWorkspaceConfig = {
  title: "Audit Logs",
  description: "Administrator actions, resources, before and after values, reasons, IP hashes, timestamps, and reveal events.",
  primaryAction: "Export audit trail",
  searchPlaceholder: "Search administrator, action, resource, reason...",
  emptyState: "No audit events match the current filters.",
  summary: [
    { label: "Audit events", value: "4,182", tone: "info" },
    { label: "Secret reveals", value: "42", tone: "warning" },
    { label: "Refund actions", value: "18", tone: "neutral" },
    { label: "Blocked", value: "7", tone: "error" },
  ],
  filters: [
    { label: "Action", key: "status", options: ["Reveal", "Refund", "Retry", "Update", "Blocked"] },
    { label: "Resource", key: "category", options: ["orders", "esims", "payments", "packages", "users"] },
  ],
  columns: [
    { key: "administrator", label: "Administrator" },
    { key: "action", label: "Action", kind: "status" },
    { key: "resource", label: "Resource" },
    { key: "resourceId", label: "Resource ID", kind: "mono" },
    { key: "reason", label: "Reason" },
    { key: "ipHash", label: "IP hash", kind: "mono" },
    { key: "timestamp", label: "Timestamp", kind: "date" },
  ],
  records: [
    makeAudit("audit_001", "admin@internetkudo.mock", "Reveal", "esims", "esim_102", "Customer support verification", "warning"),
    makeAudit("audit_002", "ops@internetkudo.mock", "Retry", "orders", "ord_10183", "Provisioning timeout", "info"),
    makeAudit("audit_003", "finance@internetkudo.mock", "Refund", "payments", "pi_3P0mockAyla", "Duplicate purchase", "neutral"),
  ],
  actions: ["Copy audit event", "Open resource", "Export evidence", ...commonActions],
  detailTitle: "Audit event",
  detailDescription: "Before and after values are redacted for personal, credential, and activation fields.",
  safeIdentifiers: ["resourceId", "ipHash"],
};

export const adminUsersConfig: AdminWorkspaceConfig = {
  title: "Admin Users",
  description: "Role assignments for super admin, operations, finance, support, analyst, developer, and read-only access.",
  primaryAction: "Invite admin",
  searchPlaceholder: "Search admin, email, role, permission...",
  emptyState: "No admin users match the current filters.",
  summary: [
    { label: "Admins", value: "14", tone: "info" },
    { label: "MFA ready", value: "100%", tone: "success" },
    { label: "Pending invites", value: "2", tone: "warning" },
    { label: "Read only", value: "3", tone: "neutral" },
  ],
  filters: [
    { label: "Role", key: "status", options: ["super_admin", "operations", "finance", "support", "developer", "read_only"] },
    { label: "Team", key: "category", options: ["Platform", "Operations", "Finance", "Support"] },
  ],
  columns: [
    { key: "name", label: "Admin" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role", kind: "status" },
    { key: "team", label: "Team" },
    { key: "lastActive", label: "Last active", kind: "date" },
    { key: "mfa", label: "MFA", kind: "status" },
    { key: "permissions", label: "Permissions" },
  ],
  records: [
    makeAdminUser("admin_001", "InternetKudo Admin", "admin@internetkudo.mock", "super_admin", "Platform", "success"),
    makeAdminUser("admin_002", "Ops Lead", "ops@internetkudo.mock", "operations", "Operations", "info"),
    makeAdminUser("admin_003", "Finance Lead", "finance@internetkudo.mock", "finance", "Finance", "info"),
  ],
  actions: ["Change role", "Require password reset", "Disable admin", "View audit activity", ...commonActions],
  detailTitle: "Admin permissions",
  detailDescription: "Permissions are enforced server-side; hidden UI is not treated as authorization.",
  safeIdentifiers: ["email", "role", "team"],
};

export const settingsConfig: AdminWorkspaceConfig = {
  title: "Settings",
  description: "Environment, OCS authentication strategy, Stripe webhook health, security headers, and feature flags.",
  primaryAction: "Save settings",
  searchPlaceholder: "Search setting, environment variable, feature flag...",
  emptyState: "No settings match the current filters.",
  summary: [
    { label: "Environment", value: "LIVE", tone: "success" },
    { label: "OCS mode", value: "Live", tone: "success" },
    { label: "Try it out", value: "Enabled", tone: "success" },
    { label: "Transfer flag", value: "Disabled", tone: "success" },
  ],
  filters: [
    { label: "Setting group", key: "status", options: ["Enabled", "Disabled", "Live", "Required"] },
    { label: "Area", key: "category", options: ["OCS", "Stripe", "Security", "Swagger", "Jobs"] },
  ],
  columns: [
    { key: "setting", label: "Setting" },
    { key: "area", label: "Area" },
    { key: "value", label: "Value", kind: "masked" },
    { key: "state", label: "State", kind: "status" },
    { key: "lastUpdated", label: "Last updated", kind: "date" },
    { key: "owner", label: "Owner" },
  ],
  records: [
    makeSetting("set_ocs_mode", "OCS_MOCK_MODE", "OCS", "false", "Live", "success"),
    makeSetting("set_swagger_try", "ENABLE_SWAGGER_TRY_IT_OUT", "Swagger", "true", "Enabled", "success"),
    makeSetting("set_transfer", "ENABLE_OCS_SUBSCRIBER_TRANSFER", "OCS", "false", "Disabled", "success"),
    makeSetting("set_stripe", "STRIPE_WEBHOOK_SECRET", "Stripe", "configured", "Required", "info"),
  ],
  actions: ["Validate startup config", "Rotate secret", "Toggle feature flag", "View config docs", ...commonActions],
  detailTitle: "System setting",
  detailDescription: "Secret values are never exposed to client JavaScript; persisted settings are displayed with redaction.",
  safeIdentifiers: ["setting", "area", "state"],
};

function makePackage(id: string, templateId: string, name: string, country: string, allowance: string, validity: string, retail: string, cost: string, margin: string, state: string, tone: StatusTone): AdminRecord {
  return {
    id,
    title: name,
    subtitle: `${country} package mapped to ${templateId}`,
    createdAt: "May 31, 2026 08:00",
    amount: retail,
    status: state,
    statusTone: tone,
    category: country,
    fields: { packageId: id, templateId, displayName: name, country, allowance, validity, retail, cost, margin, state, stripeProduct: `prod_${id.slice(4)}`, stripePrice: `price_${id.slice(4)}` },
    timeline: ["Last synchronized from mock OCS catalogue", "Cost snapshot stored", "Stripe price checked"],
    notes: ["Retail price remains separate from reseller cost."],
  };
}

function makeCustomer(id: string, name: string, email: string, country: string, status: string, tone: StatusTone, revenue: string, risk: string): AdminRecord {
  return {
    id,
    title: name,
    subtitle: `${email} - ${country}`,
    createdAt: "Apr 12, 2026",
    amount: revenue,
    status,
    statusTone: tone,
    category: country,
    fields: { customerId: id, name, email, registrationDate: "Apr 12, 2026", orders: 12, successfulOrders: 11, failedOrders: 1, totalRevenue: revenue, aov: "€22.44", activeEsims: 3, lastPurchase: "May 31, 2026", risk, lastOrder: "#IKD-10184" },
    timeline: ["Registered account", "Completed first checkout", "Earned Kudo Points", "Opened support conversation"],
    notes: ["Support can view status without revealing full activation payload."],
  };
}

function makeEsim(id: string, subscriberId: string, country: string, pkg: string, state: string, tone: StatusTone, remaining: string): AdminRecord {
  return {
    id,
    title: id,
    subtitle: `${pkg} assigned to subscriber ${subscriberId}`,
    createdAt: "May 31, 2026",
    status: state,
    statusTone: tone,
    category: country,
    fields: { esimId: id, subscriberId, ocsEsimId: Number(subscriberId) + 5000, iccid: "8931440400000001129", imsi: "204046000001129", msisdn: "+15551234567", package: pkg, assigned: "May 31, 2026", activated: state === "Unactivated" ? "Not activated" : "May 31, 2026", expires: "Jun 30, 2026", allocated: "10 GB", used: state === "Expired" ? "10 GB" : "1.6 GB", remaining, state, orderId: "#IKD-10184" },
    sensitiveFields: { ICCID: "8931440400000001129", IMSI: "204046000001129", MSISDN: "+15551234567", "QR payload": "LPA:1$internetkudo.mock$ACT-SECRET-PAYLOAD" },
    timeline: ["Subscriber assigned", "Package normalized", "Usage snapshot calculated", "Identifier reveal audit ready"],
    notes: ["Prefer subscriber ID internally when known."],
  };
}

function makePayment(paymentIntent: string, order: string, customer: string, amount: string, method: string, status: string, tone: StatusTone, reconciliation: string): AdminRecord {
  return {
    id: paymentIntent,
    title: paymentIntent,
    subtitle: `${order} - ${customer}`,
    createdAt: "May 31, 2026",
    amount,
    status,
    statusTone: tone,
    category: method,
    fields: { paymentIntent, chargeId: `ch_${paymentIntent.slice(-6)}`, order, customer, amount, currency: "EUR", method, stripeFee: status === "Failed" ? "€0.00" : "€0.84", refundAmount: "€0.00", webhook: status === "Failed" ? "Processed" : "Processed", reconciliation },
    timeline: ["PaymentIntent created with idempotency key", "Webhook received", "Local payment state updated", "Provisioning enqueue checked"],
    notes: ["Never provision from a mobile client payment-success claim."],
  };
}

function makeWebhook(eventId: string, eventType: string, order: string, status: string, tone: StatusTone): AdminRecord {
  return {
    id: eventId,
    title: eventId,
    subtitle: eventType,
    createdAt: "May 31, 2026",
    status,
    statusTone: tone,
    category: eventType.split(".")[0],
    fields: { eventId, eventType, received: "May 31, 2026 10:44", attempts: status === "Pending" ? 2 : 1, order, payment: "pi_3P0mockAyla", processing: status, lastError: status === "Pending" ? "Mock queue retry scheduled" : "none" },
    timeline: ["Signature verified", "Event ID checked idempotently", "State transition applied", "Provisioning job handled outside webhook request"],
    notes: ["Replay uses the stored sanitized payload in mock mode."],
  };
}

function makeApiLog(route: string, requestId: string, user: string, httpStatus: string, group: string): AdminRecord {
  const tone: StatusTone = httpStatus.startsWith("2") ? "success" : httpStatus.startsWith("4") ? "warning" : "error";
  return {
    id: requestId,
    title: requestId,
    subtitle: route,
    createdAt: "May 31, 2026",
    status: httpStatus,
    statusTone: tone,
    category: group,
    fields: { route, requestId, user, ipHash: "iphash_91c2a4", httpStatus, duration: httpStatus === "400" ? "44 ms" : "132 ms", errorCode: httpStatus === "400" ? "VALIDATION_ERROR" : "none", timestamp: "May 31, 2026 10:44" },
    timeline: ["Request ID generated", "Rate limit checked", "Zod validation completed", "Response envelope returned"],
    notes: ["Authorization headers and secrets are redacted before logging."],
  };
}

function makeAudit(id: string, administrator: string, action: string, resource: string, resourceId: string, reason: string, tone: StatusTone): AdminRecord {
  return {
    id,
    title: `${action} ${resourceId}`,
    subtitle: `${administrator} - ${reason}`,
    createdAt: "May 31, 2026",
    status: action,
    statusTone: tone,
    category: resource,
    fields: { administrator, action, resource, resourceId, reason, ipHash: "iphash_admin_44f2", timestamp: "May 31, 2026 10:44", before: "redacted", after: "redacted" },
    timeline: ["Role permission checked", "Reason captured", "Mutation or reveal performed", "Audit event persisted"],
    notes: ["Personal and activation fields are redacted in audit summaries."],
  };
}

function makeAdminUser(id: string, name: string, email: string, role: string, team: string, tone: StatusTone): AdminRecord {
  return {
    id,
    title: name,
    subtitle: `${email} - ${role}`,
    createdAt: "Mar 1, 2026",
    status: role,
    statusTone: tone,
    category: team,
    fields: { name, email, role, team, lastActive: "May 31, 2026", mfa: "Ready", permissions: role === "super_admin" ? "Full access" : "Scoped", sessionExpiry: "8 hours" },
    timeline: ["Invite accepted", "Role assigned", "MFA readiness checked", "Session policy applied"],
    notes: ["Mock mode assumes a super-admin session for UI development."],
  };
}

function makeSetting(id: string, setting: string, area: string, value: string, state: string, tone: StatusTone): AdminRecord {
  return {
    id,
    title: setting,
    subtitle: `${area} configuration`,
    createdAt: "May 31, 2026",
    status: state,
    statusTone: tone,
    category: area,
    fields: { setting, area, value, state, lastUpdated: "May 31, 2026", owner: "Platform", productionRequired: area === "Stripe" || setting.includes("OCS") ? "Yes" : "No" },
    sensitiveFields: value === "configured" ? { "Resolved value": "whsec_mock_secret_redacted" } : undefined,
    timeline: ["Loaded from environment", "Validated with Zod", "Redacted for client display", "Ready for live integration mapping"],
    notes: ["Production startup validation fails fast when required values are missing."],
  };
}
