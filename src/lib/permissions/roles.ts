export const adminRoles = [
  "super_admin",
  "operations",
  "finance",
  "support",
  "analyst",
  "developer",
  "read_only",
] as const;

export type AdminRole = (typeof adminRoles)[number];

export const permissions: Record<string, AdminRole[]> = {
  revealActivationSecrets: ["super_admin"],
  retryProvisioning: ["super_admin", "operations"],
  issueRefund: ["super_admin", "finance"],
  viewProxyLogs: ["super_admin", "developer", "operations"],
  subscriberTransfer: ["super_admin"],
};

export function hasPermission(role: AdminRole, permission: keyof typeof permissions): boolean {
  return role === "super_admin" || permissions[permission].includes(role);
}
