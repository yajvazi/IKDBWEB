export type OcsAuthMode = "none" | "basic" | "bearer" | "custom-header";

export type OcsIdentifier =
  | { subscriberId: number }
  | { imsi: string }
  | { iccid: string }
  | { msisdn: string }
  | { multiImsi: string }
  | { activationCode: string };

export type NormalizedSubscriberPackage = {
  upstreamPackageId: number;
  subscriberId: number;
  esimId: number | null;
  packageTemplateId: number | null;
  packageTemplateName: string | null;
  locationZoneId: number | null;
  locationZoneName: string | null;
  destinationZoneId: number | null;
  destinationZoneName: string | null;
  allocatedDataBytes: number;
  usedDataBytes: number;
  remainingDataBytes: number;
  assignedAt: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  validityDays: number | null;
  upstreamCost: number | null;
  resellerCost: number | null;
  parentResellerCost: number | null;
  active: boolean;
  recurringPackageId: number | null;
};
