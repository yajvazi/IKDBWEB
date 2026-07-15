import type { OcsIdentifier } from "@/server/ocs/types";

export function listSubscriberPrepaidPackagesCommand(identifier: OcsIdentifier) {
  return {
    listSubscriberPrepaidPackages: identifier,
  };
}

export function ocsCommand<T>(command: string, payload: T) {
  return {
    [command]: payload,
  };
}

export function listResellerAccountCommand(input: { resellerId?: number } = {}) {
  return ocsCommand("listResellerAccount", input);
}

export function getResellerInfoCommand(input: { id?: number } = {}) {
  return ocsCommand("getResellerInfo", input);
}

export function esimStatusPerAccountCommand(input: { accountId?: number; resellerId?: number }) {
  return ocsCommand("esimStatusPerAccount", input);
}

export function listSponsorCommand(resellerId: number) {
  return ocsCommand("listSponsor", resellerId);
}

export function listSteeringListCommand(resellerId: number) {
  return ocsCommand("listSteeringList", resellerId);
}

export function listResellerTariffCommand(input: { resellerId?: number } = {}) {
  return ocsCommand("listResellerTariff", input);
}

export function listSubscriberTariffCommand(input: { resellerId?: number } = {}) {
  return ocsCommand("listSubscriberTariff", input);
}

export function listTariffRuleCommand(tariffId: number) {
  return ocsCommand("listTariffRule", tariffId);
}

export function getCustomerTariffCommand(resellerId: number) {
  return ocsCommand("getCustomerTariff", resellerId);
}

export function listNetworkProfileCommand(input: { resellerId?: number; sponsorId?: number } = {}) {
  return ocsCommand("listNetworkProfile", input);
}

export function listDetailedLocationZoneCommand(resellerId: number) {
  return ocsCommand("listDetailedLocationZone", resellerId);
}

export function listDetailedDestinationListCommand(resellerId: number) {
  return ocsCommand("listDetailedDestinationList", resellerId);
}

export function listPrepaidPackageTemplateCommand(input: {
  templateId?: number;
  resellerId?: number;
  sponsorId?: number;
  locationZoneId?: number;
  destinationListId?: number;
} = {}) {
  return ocsCommand("listPrepaidPackageTemplate", input);
}

export function createLocationZoneCommand(input: {
  networkProfileId: number;
  locationZoneName: string;
  tadigList: string[];
}) {
  return ocsCommand("createLocationZone", input);
}

export function createPrepaidPackageTemplateCommand(input: {
  prepaidpackagetemplatename: string;
  resellerid: number;
  locationzoneid: number;
  destinationzoneid?: number;
  databyte?: number;
  mocsecond?: number;
  mtcsecond?: number;
  mosmsnumber?: number;
  mtsmsnumber?: number;
  perioddays: number;
  cost?: number;
  throttlingActive: boolean;
  throttlingThreshold1Perc?: number;
  throttlingThreshold1Limit?: number;
  throttlingThreshold2Perc?: number;
  throttlingThreshold2Limit?: number;
  throttlingThreshold3Perc?: number;
  throttlingThreshold3Limit?: number;
  throttlingThreshold4Perc?: number;
  throttlingThreshold4Limit?: number;
  throttlingErrorAction?: number;
  recurring: boolean;
  nbOccurrence?: number;
  recurringPeriodicityType?: number;
  recurringPeriodicityFrequency?: number;
  reportUnitsPreviousPackage?: boolean;
}) {
  return ocsCommand("createPrepaidPackageTemplate", input);
}

export function affectPackageToSubscriberCommand(input: {
  packageTemplateId: number;
  accountForSubs?: number;
  subscriber?: {
    subscriberId?: number;
    imsi?: string;
    iccid?: string;
    msisdn?: string;
    multiImsi?: string;
    activationCode?: string;
  };
  validityPeriod?: number;
  activePeriod?: {
    start?: string;
    end?: string;
  };
}) {
  return ocsCommand("affectPackageToSubscriber", input);
}

export function modifyResellerBalanceCommand(input: {
  resellerId: number;
  type: string;
  amount: number;
  setBalance?: boolean;
  description?: string;
}) {
  return ocsCommand("modifyResellerBalance", input);
}

export function moveSubscriberRangeToAccountCommand(input: {
  rangeType: "IMSI" | "ICCID";
  rangeStart: string;
  rangeEnd: string;
  srcAccountId: number;
  destAccount: number;
  destNetworkProfileId?: number;
}) {
  return {
    moveSubscriberRangeToAccount: input,
  };
}
