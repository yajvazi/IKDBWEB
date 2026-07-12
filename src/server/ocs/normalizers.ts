import { remainingDataBytes } from "@/lib/bytes/format";
import type { NormalizedSubscriberPackage } from "@/server/ocs/types";
import type { z } from "zod";
import type { upstreamSubscriberPackageSchema } from "@/server/ocs/schemas";

type UpstreamSubscriberPackage = z.infer<typeof upstreamSubscriberPackageSchema>;

export function normalizeSubscriberPackage(pkg: UpstreamSubscriberPackage): NormalizedSubscriberPackage {
  const allocated = pkg.pckdatabyte ?? 0;
  const used = pkg.useddatabyte ?? 0;

  return {
    upstreamPackageId: pkg.subscriberprepaidpackageid,
    subscriberId: pkg.subscriberid,
    esimId: pkg.esimId ?? null,
    packageTemplateId: pkg.packageTemplate?.prepaidpackagetemplateid ?? pkg.templateId ?? null,
    packageTemplateName: pkg.packageTemplate?.prepaidpackagetemplatename ?? null,
    locationZoneId: pkg.rdbLocationZones?.locationzoneid ?? pkg.locationzoneid ?? null,
    locationZoneName: pkg.rdbLocationZones?.locationzonename ?? null,
    destinationZoneId: pkg.rdbDestinationZones?.destinationzoneid ?? pkg.destinationzoneid ?? null,
    destinationZoneName: pkg.rdbDestinationZones?.destinationzonename ?? null,
    allocatedDataBytes: allocated,
    usedDataBytes: used,
    remainingDataBytes: remainingDataBytes(allocated, used),
    assignedAt: pkg.tsassigned ?? null,
    activatedAt: pkg.tsactivationutc ?? null,
    expiresAt: pkg.tsexpirationutc ?? null,
    validityDays: pkg.perioddays ?? null,
    upstreamCost: pkg.cost ?? null,
    resellerCost: pkg.resellerCost ?? null,
    parentResellerCost: pkg.parentResellerCost ?? null,
    active: pkg.active,
    recurringPackageId: pkg.recurringPackage ?? null,
  };
}
