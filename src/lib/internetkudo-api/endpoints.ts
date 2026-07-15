export type InternetKudoApiMethod = "GET" | "POST" | "PATCH" | "DELETE";

export type InternetKudoApiEndpoint = {
  method: InternetKudoApiMethod;
  path: string;
  tag: string;
  operationId: string;
  summary: string;
};

export const internetKudoApiEndpoints: InternetKudoApiEndpoint[] = [
  ["GET", "/api", "App", "AppController_getHello", "Root API status"],
  ["GET", "/api/health", "App", "AppController_health", "Health check"],
  ["POST", "/api/users", "Users", "UsersController_register", "Register user"],
  ["GET", "/api/users/user-info", "Users", "UsersController_getUserByToken", "Get user by token"],
  ["GET", "/api/users/email/{email}", "Users", "UsersController_getUserByEmail", "Get user by email"],
  ["GET", "/api/users/all", "Users", "UsersController_getAllUsers", "List users"],
  ["PATCH", "/api/users/update/{id}", "Users", "UsersController_updateUser", "Update user"],
  ["GET", "/api/users/{id}", "Users", "UsersController_getUserById", "Get user by id"],
  ["PATCH", "/api/users/status/{id}", "Users", "UsersController_changeAccountStatus", "Change account status"],
  ["GET", "/api/users/user-companies/{user_id}", "Users", "UsersController_getUserCompanies", "Get user companies"],
  ["POST", "/api/auth/sign-up", "Authentication", "AuthController_signUp", "Sign up"],
  ["PATCH", "/api/auth/verify/{user_id}", "Authentication", "AuthController_verifyUser", "Verify user"],
  ["POST", "/api/auth/resend-code", "Authentication", "AuthController_resendUserCode", "Resend verification code"],
  ["POST", "/api/auth/login", "Authentication", "AuthController_login", "Login"],
  ["POST", "/api/auth/forgot-password", "Authentication", "AuthController_forgotPassword", "Forgot password"],
  ["POST", "/api/auth/reset-password/{user_id}", "Authentication", "AuthController_resetPassword", "Reset password"],
  ["POST", "/api/auth/change-password/{user_id}", "Authentication", "AuthController_changePassword", "Change password"],
  ["POST", "/api/auth/refresh-token", "Authentication", "AuthController_refreshToken", "Refresh token"],
  ["GET", "/api/auth/google/login", "Authentication", "AuthController_googleLogin", "Google login"],
  ["GET", "/api/auth/google/callback", "Authentication", "AuthController_googleLoginCallback", "Google callback"],
  ["POST", "/api/auth/google/token", "Authentication", "AuthController_googleTokenLogin", "Google token login"],
  ["POST", "/api/auth/apple/token", "Authentication", "AuthController_appleLogin", "Apple token login"],
  ["DELETE", "/api/auth/account", "Authentication", "AuthController_deleteAccount", "Delete account"],
  ["POST", "/api/auth/logout", "Authentication", "AuthController_logout", "Logout"],
  ["POST", "/api/notifications", "Notifications", "NotificationsController_pushNotification", "Push notification"],
  ["GET", "/api/notifications/{user_id}", "Notifications", "NotificationsController_getNotificationsForUser", "Get user notifications"],
  ["GET", "/api/notifications/unread/{user_id}", "Notifications", "NotificationsController_getTotalUnread", "Get unread count"],
  ["PATCH", "/api/notifications/read/{id}", "Notifications", "NotificationsController_markNotificationAsRead", "Mark notification read"],
  ["PATCH", "/api/notifications/read-all/{user_id}", "Notifications", "NotificationsController_markAllNotificationsAsRead", "Mark all notifications read"],
  ["DELETE", "/api/notifications/{id}", "Notifications", "NotificationsController_deleteNotification", "Delete notification"],
  ["GET", "/api/ocs/list", "Ocs", "OcsController_list", "List OCS entries"],
  ["GET", "/api/esims/sync", "Esims", "EsimsController_syncNow", "Sync eSIMs"],
  ["POST", "/api/zones/sync", "LocationZone", "LocationZoneController_sync", "Sync zones"],
  ["POST", "/api/zones/detailed", "LocationZone", "LocationZoneController_listDetailedLocationZone", "List detailed location zones"],
  ["GET", "/api/zones/detailed/by-iso2", "LocationZone", "LocationZoneController_listDetailedLocationZoneByIso2", "List zones by ISO2"],
  ["GET", "/api/zones/detailed/by-package-template", "LocationZone", "LocationZoneController_listDetailedLocationZoneByPackageTemplate", "List zones by package template"],
  ["POST", "/api/packages/sync", "PackageTemplates", "PackageTemplatesController_sync", "Sync package templates"],
  ["GET", "/api/packages/details", "PackageTemplates", "PackageTemplatesController_getPackageTemplateDetails", "Get package template details"],
  ["PATCH", "/api/packages/{id}", "PackageTemplates", "PackageTemplatesController_updatePackage", "Update package template"],
  ["GET", "/api/esim/destinations", "Destinations", "DestinationsController_lokale", "List destinations"],
  ["GET", "/api/esim/destinations/country/{iso2}/packages", "Destinations", "DestinationsController_byCountry", "List country packages"],
  ["GET", "/api/esim/destinations/region/{zoneId}/packages", "Destinations", "DestinationsController_byRegion", "List region packages"],
  ["POST", "/api/orders", "Orders", "OrdersController_create", "Create order"],
  ["GET", "/api/orders", "Orders", "OrdersController_findAll", "List orders"],
  ["POST", "/api/orders/simple", "Orders", "OrdersController_createSimpleOrder", "Create simple order"],
  ["GET", "/api/orders/my-orders", "Orders", "OrdersController_getMyOrders", "Get my orders"],
  ["GET", "/api/orders/{id}", "Orders", "OrdersController_findOne", "Get order"],
  ["PATCH", "/api/orders/{id}", "Orders", "OrdersController_update", "Update order"],
  ["POST", "/api/orders/{id}/cancel", "Orders", "OrdersController_cancel", "Cancel order"],
  ["POST", "/api/orders/{id}/process", "Orders", "OrdersController_processOrder", "Process order"],
  ["POST", "/api/orders/test-ocs", "Orders", "OrdersController_testOcsConnection", "Test OCS connection"],
  ["POST", "/api/orders/topup", "Orders", "OrdersController_createTopup", "Create top-up"],
  ["POST", "/api/orders/{id}/topup-process", "Orders", "OrdersController_processTopup", "Process top-up"],
  ["POST", "/api/orders/email/logo", "Orders", "OrdersController_setEmailLogo", "Set email logo"],
  ["POST", "/api/orders/email/test-qr", "Orders", "OrdersController_testQrCode", "Test QR email"],
  ["GET", "/api/orders/email/debug-qr", "Orders", "OrdersController_debugQrCode", "Debug QR email"],
  ["GET", "/api/orders/email/test-html", "Orders", "OrdersController_testHtml", "Test email HTML"],
  ["POST", "/api/orders/email/upload-logo", "Orders", "OrdersController_uploadLogo", "Upload email logo"],
  ["POST", "/api/orders/{orderId}/set-reward", "Orders", "OrdersController_setReward", "Set order reward"],
  ["POST", "/api/orders/{orderId}/apply-credits", "Orders", "OrdersController_applyCredits", "Apply credits"],
  ["POST", "/api/orders/{orderId}/complete-with-credits", "Orders", "OrdersController_completeWithCredits", "Complete with credits"],
  ["POST", "/api/promo-codes/validate", "Promo Codes", "PromoCodesController_simpleValidate", "Validate promo code"],
  ["POST", "/api/promo-codes/validate-for-order", "Promo Codes", "PromoCodesController_validate", "Validate promo for order"],
  ["POST", "/api/orders/{orderId}/apply-promo-code", "Promo Codes", "PromoCodesController_applyPromoCode", "Apply promo code"],
  ["POST", "/api/orders/{orderId}/remove-promo-code", "Promo Codes", "PromoCodesController_removePromoCode", "Remove promo code"],
  ["GET", "/api/orders/{orderId}/pricing", "Promo Codes", "PromoCodesController_getOrderPricing", "Get order pricing"],
  ["POST", "/api/admin/promo-codes", "Admin - Promo Codes", "PromoCodesAdminController_create", "Create promo code"],
  ["GET", "/api/admin/promo-codes", "Admin - Promo Codes", "PromoCodesAdminController_findAll", "List promo codes"],
  ["PATCH", "/api/admin/promo-codes/{id}", "Admin - Promo Codes", "PromoCodesAdminController_update", "Update promo code"],
  ["GET", "/api/admin/promo-codes/{id}", "Admin - Promo Codes", "PromoCodesAdminController_findOne", "Get promo code"],
  ["GET", "/api/credits/balance", "Credits", "CreditsController_getBalance", "Get credits balance"],
  ["GET", "/api/credits/ledger", "Credits", "CreditsController_getLedger", "Get credits ledger"],
  ["GET", "/api/credits/reservations", "Credits", "CreditsController_getReservations", "Get credit reservations"],
  ["POST", "/api/credits/reservations", "Credits", "CreditsController_createReservation", "Create credit reservation"],
  ["POST", "/api/credits/reservations/{reservationId}/confirm", "Credits", "CreditsController_confirmReservation", "Confirm credit reservation"],
  ["POST", "/api/credits/reservations/{reservationId}/cancel", "Credits", "CreditsController_cancelReservation", "Cancel credit reservation"],
  ["POST", "/api/credits/refunds", "Credits", "CreditsController_createRefund", "Create credit refund"],
  ["GET", "/api/credits/admin/ledger/{userId}", "Credits", "CreditsController_getAdminLedger", "Get admin credits ledger"],
  ["GET", "/api/credits/admin/balance/{userId}", "Credits", "CreditsController_getAdminBalance", "Get admin credits balance"],
  ["GET", "/api/credits/admin/reservations/{userId}", "Credits", "CreditsController_getAdminReservations", "Get admin credit reservations"],
  ["POST", "/api/credits/admin/add-credits", "Credits", "CreditsController_addCreditsAdmin", "Add admin credits"],
  ["POST", "/api/credits/admin/refund", "Credits", "CreditsController_adminRefund", "Admin credit refund"],
  ["POST", "/api/cart/price-preview", "Cart", "CartController_pricePreview", "Cart price preview"],
  ["GET", "/api/usage/my-usage", "Usage", "UsageController_getMyUsage", "Get my usage"],
  ["GET", "/api/usage/order/{orderId}", "Usage", "UsageController_getUsageByOrderId", "Get usage by order"],
  ["POST", "/api/usage/{usageId}/sync", "Usage", "UsageController_syncUsage", "Sync usage"],
  ["GET", "/api/usage/consolidated", "Usage", "UsageController_getConsolidatedUsage", "Get consolidated usage"],
  ["GET", "/api/usage/summary", "Usage", "UsageController_getUsageSummary", "Get usage summary"],
  ["POST", "/api/usage/order/{orderId}/create", "Usage", "UsageController_createUsageRecord", "Create usage record"],
  ["POST", "/api/usage/sync-all", "Usage", "UsageController_syncAllUsage", "Sync all usage"],
  ["POST", "/api/payments/create-intent", "Payments", "PaymentsController_createPaymentIntent", "Create payment intent"],
  ["POST", "/api/payments/confirm", "Payments", "PaymentsController_confirmPayment", "Confirm payment"],
  ["POST", "/api/payments/webhook", "Payments", "PaymentsController_handleStripeWebhook", "Stripe webhook"],
  ["GET", "/api/profile/{userId}", "Profile", "ProfileController_getProfile", "Get profile"],
  ["GET", "/api/profile/{userId}/esim-stats", "Profile", "ProfileController_getEsimStats", "Get profile eSIM stats"],
  ["GET", "/api/profile/{userId}/billing-details", "Profile", "ProfileController_getBillingDetails", "Get billing details"],
  ["GET", "/api/profile/{userId}/purchases", "Profile", "ProfileController_getPurchases", "Get purchases"],
  ["GET", "/api/profile/{userId}/payments", "Profile", "ProfileController_getPayments", "Get profile payments"],
  ["GET", "/api/api/stats/dashboard", "Stats", "StatsController_getDashboardStats", "Get dashboard stats"],
  ["GET", "/api/api/stats/money-flow", "Stats", "StatsController_getMoneyFlow", "Get money flow stats"],
  ["GET", "/api/api/stats/used-countries", "Stats", "StatsController_getUsedCountries", "Get used countries stats"],
  ["GET", "/api/api/stats/top-esims", "Stats", "StatsController_getTopEsims", "Get top eSIM stats"],
  ["GET", "/api/api/stats/coupons", "Stats", "StatsController_getCouponStats", "Get coupon stats"],
  ["GET", "/api/api/stats/esims", "Stats", "StatsController_getEsimStats", "Get eSIM stats"],
  ["GET", "/api/api/stats/orders", "Stats", "StatsController_getOrderStats", "Get order stats"],
  ["GET", "/api/api/stats/users", "Stats", "StatsController_getUserStats", "Get user stats"],
  ["GET", "/api/admin/resellers", "Admin - Resellers", "AdminResellersController_list", "List resellers"],
  ["POST", "/api/admin/resellers", "Admin - Resellers", "AdminResellersController_create", "Create reseller"],
  ["PATCH", "/api/admin/resellers/{id}", "Admin - Resellers", "AdminResellersController_update", "Update reseller"],
  ["POST", "/api/admin/resellers/{id}/balance", "Admin - Resellers", "AdminResellersController_adjustBalance", "Adjust reseller balance"],
  ["POST", "/api/admin/resellers/{id}/internal-ledger", "Admin - Resellers", "AdminResellersController_internalLedger", "Create internal ledger entry"],
  ["GET", "/api/admin/resellers/{id}/retail-overrides", "Admin - Resellers", "AdminResellersController_listOverrides", "List retail overrides"],
  ["POST", "/api/admin/resellers/{id}/retail-overrides", "Admin - Resellers", "AdminResellersController_upsertOverride", "Upsert retail override"],
  ["DELETE", "/api/admin/resellers/{id}/retail-overrides/{overrideId}", "Admin - Resellers", "AdminResellersController_deleteOverride", "Delete retail override"],
  ["GET", "/api/admin/resellers/{id}/tariff", "Admin - Resellers", "AdminResellersController_getTariff", "Get reseller tariff"],
  ["POST", "/api/admin/resellers/with-user", "Admin - Resellers", "AdminResellersController_createWithUser", "Create reseller with user"],
  ["POST", "/api/admin/resellers/{id}/topup", "Admin - Resellers", "AdminResellersController_topup", "Top up reseller"],
  ["POST", "/api/admin/resellers/{id}/adjust", "Admin - Resellers", "AdminResellersController_adjust", "Adjust reseller"],
  ["GET", "/api/admin/resellers/{id}/transactions", "Admin - Resellers", "AdminResellersController_getTransactions", "Get reseller transactions"],
  ["GET", "/api/me", "Reseller - My Account", "ResellerMeController_getMyProfile", "Get reseller profile"],
  ["GET", "/api/me/transactions", "Reseller - My Account", "ResellerMeController_getMyTransactions", "Get reseller transactions"],
  ["POST", "/api/reseller-orders", "Reseller Orders", "ResellerOrdersController_createOrder", "Create reseller order"],
  ["GET", "/api/reseller-orders", "Reseller Orders", "ResellerOrdersController_listOrders", "List reseller orders"],
  ["GET", "/api/reseller-orders/{id}", "Reseller Orders", "ResellerOrdersController_getOrder", "Get reseller order"],
  ["GET", "/api/reseller-orders/{id}/pdf", "Reseller Orders", "ResellerOrdersController_getOrderPdf", "Get reseller order PDF"],
  ["POST", "/api/reseller-orders/{id}/refund", "Reseller Orders", "ResellerOrdersController_refundOrder", "Refund reseller order"],
  ["GET", "/api/packages", "Packages", "ResellerPackagesController_listPackages", "List reseller packages"],
  ["PATCH", "/api/packages/{templateId}/visibility", "Packages", "ResellerPackagesController_setVisibility", "Set package visibility"],
].map(([method, path, tag, operationId, summary]) => ({ method, path, tag, operationId, summary })) as InternetKudoApiEndpoint[];

export function toInternetKudoPath(apiPath: string) {
  return apiPath.replace(/^\/api\/?/, "/");
}

export function internetKudoDocsPath(apiPath: string) {
  return `/api/v1${toInternetKudoPath(apiPath)}`;
}

export function internetKudoTryPath(apiPath: string) {
  return internetKudoDocsPath(apiPath)
    .replace("{iso2}", "TR")
    .replace("{zoneId}", "Turkey")
    .replace("{id}", "demo")
    .replace("{templateId}", "553")
    .replace("{orderId}", "ord_demo")
    .replace("{userId}", "cus_demo");
}

const liveInternetKudoApiPaths = new Set([
  "/api",
  "/api/health",
  "/api/ocs/list",
  "/api/zones/detailed",
  "/api/zones/detailed/by-iso2",
  "/api/zones/detailed/by-package-template",
  "/api/packages/sync",
  "/api/packages/details",
  "/api/esim/destinations",
  "/api/esim/destinations/country/{iso2}/packages",
  "/api/esim/destinations/region/{zoneId}/packages",
  "/api/orders/test-ocs",
  "/api/payments/create-intent",
  "/api/api/stats/dashboard",
  "/api/api/stats/money-flow",
  "/api/api/stats/used-countries",
  "/api/api/stats/top-esims",
  "/api/api/stats/esims",
  "/api/api/stats/orders",
  "/api/api/stats/users",
]);

export function isInternetKudoApiEndpointLive(endpoint: InternetKudoApiEndpoint) {
  return liveInternetKudoApiPaths.has(endpoint.path);
}

export function isInternetKudoApiEndpointSafeToTry(endpoint: InternetKudoApiEndpoint) {
  if (!isInternetKudoApiEndpointLive(endpoint)) return false;
  return !endpoint.path.includes("/process")
    && !endpoint.path.includes("/topup")
    && !endpoint.path.includes("/adjust")
    && !endpoint.path.includes("/refund")
    && !endpoint.path.includes("/webhook");
}

export function matchInternetKudoApiEndpoint(method: string, pathWithoutApiV1: string) {
  const normalizedPath = `/${pathWithoutApiV1}`.replace(/\/+$/, "") || "/";
  return internetKudoApiEndpoints.find((endpoint) => {
    if (endpoint.method !== method.toUpperCase()) return false;
    const template = toInternetKudoPath(endpoint.path).replace(/\/+$/, "") || "/";
    const templateParts = template.split("/").filter(Boolean);
    const pathParts = normalizedPath.split("/").filter(Boolean);
    if (templateParts.length !== pathParts.length) return false;
    return templateParts.every((part, index) => part.startsWith("{") && part.endsWith("}") ? pathParts[index].length > 0 : part === pathParts[index]);
  });
}

export function sampleBodyForInternetKudoEndpoint(endpoint: InternetKudoApiEndpoint) {
  if (endpoint.method === "GET" || endpoint.method === "DELETE") return undefined;
  const tenant = { resellerId: 567, accountId: 3926, stripeProfileId: "internetkudo-platform" };
  if (endpoint.path.includes("auth/login")) return { email: "customer@example.com", password: "Password123!" };
  if (endpoint.path.includes("payments/create-intent")) return { ...tenant, packageId: "pkg_1657099", price: "14.99", currency: "EUR" };
  if (endpoint.path.includes("zones/detailed")) return { ...tenant };
  if (endpoint.path.includes("packages/sync")) return { ...tenant };
  if (endpoint.path.includes("orders/test-ocs")) return { ...tenant };
  if (endpoint.path.includes("orders/topup")) return { ...tenant, iccid: "8948010000074618117", packageTemplateId: 553 };
  if (endpoint.path.includes("orders")) return { ...tenant, packageTemplateId: 553, quantity: 1, currency: "EUR" };
  if (endpoint.path.includes("promo-codes")) return { ...tenant, code: "KUDO123", orderId: "ord_demo" };
  if (endpoint.path.includes("credits")) return { ...tenant, amount: 100, currency: "EUR", reason: "Demo" };
  if (endpoint.path.includes("cart")) return { ...tenant, packageTemplateId: 553, quantity: 1, promoCode: "KUDO123" };
  if (endpoint.path.includes("notifications")) return { ...tenant, title: "InternetKudo", body: "Your eSIM is ready." };
  if (endpoint.path.includes("resellers")) return { ...tenant, amount: 100 };
  return { ...tenant, example: true };
}
