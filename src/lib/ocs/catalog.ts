export type OcsCommandSafety = "read" | "write" | "high-risk";

export type OcsCommandCatalogItem = {
  group: string;
  command: string;
  version: "v1" | "v2";
  safety: OcsCommandSafety;
  description: string;
};

export const ocsCommandCatalog: OcsCommandCatalogItem[] = [
  { group: "Reseller", command: "listResellerAccount", version: "v1", safety: "read", description: "List reseller account records." },
  { group: "Reseller", command: "modifyAccountBalance", version: "v1", safety: "write", description: "Adjust an account balance." },
  { group: "Reseller", command: "modifyResellerBalance", version: "v1", safety: "write", description: "Adjust a reseller balance." },
  { group: "Reseller", command: "getResellerInfo", version: "v1", safety: "read", description: "Read reseller information." },
  { group: "Reseller", command: "esimStatusPerAccount", version: "v1", safety: "read", description: "Read eSIM status by account." },
  { group: "Reseller", command: "listSponsor", version: "v1", safety: "read", description: "List available sponsors." },
  { group: "Reseller", command: "listSteeringList", version: "v1", safety: "read", description: "List steering lists." },
  { group: "Subscriber", command: "getSingleSubscriber", version: "v1", safety: "read", description: "Read a single subscriber." },
  { group: "Subscriber", command: "listSubscriber", version: "v1", safety: "read", description: "List subscribers." },
  { group: "Subscriber", command: "affectSubscriberRealPhoneNumber", version: "v1", safety: "write", description: "Assign a real phone number." },
  { group: "Subscriber", command: "affectSubscriberFakePhoneNumber", version: "v1", safety: "write", description: "Assign a fake phone number." },
  { group: "Subscriber", command: "getSimProviderStatus", version: "v1", safety: "read", description: "Read eSIM provider status history." },
  { group: "Subscriber", command: "modifySubscriberBalance", version: "v1", safety: "write", description: "Adjust or set subscriber balance." },
  { group: "Subscriber", command: "hlrSetBitrate", version: "v1", safety: "write", description: "Set HLR bitrate." },
  { group: "Subscriber", command: "hlrGetBitrate", version: "v1", safety: "read", description: "Read HLR bitrate." },
  { group: "Subscriber", command: "moveSubscriberRangeToAccount", version: "v2", safety: "high-risk", description: "Move an IMSI or ICCID range between accounts." },
  { group: "Subscriber", command: "modifySubscriberContactInfo", version: "v1", safety: "write", description: "Modify subscriber contact information." },
  { group: "Subscriber", command: "modifySubscriberStatus", version: "v1", safety: "write", description: "Modify subscriber status." },
  { group: "Subscriber", command: "setSubscriberTrafficRestrictions", version: "v1", safety: "write", description: "Set subscriber traffic restrictions." },
  { group: "Subscriber", command: "modifySubscriberSteeringList", version: "v1", safety: "write", description: "Modify subscriber steering list." },
  { group: "Subscriber", command: "pushSteeringToSubs", version: "v1", safety: "write", description: "Push steering to subscribers." },
  { group: "Subscriber", command: "cleanSubscriberAllPackages", version: "v1", safety: "high-risk", description: "Remove all subscriber packages." },
  { group: "Subscriber", command: "resetSubsGzCounter", version: "v1", safety: "write", description: "Reset subscriber Gz counter." },
  { group: "Subscriber", command: "getSubscriberLocation", version: "v1", safety: "read", description: "Read subscriber location." },
  { group: "Subscriber", command: "getSubscriberLocationByCellId", version: "v1", safety: "read", description: "Read subscriber location by cell ID." },
  { group: "Subscriber", command: "changeSimStatus", version: "v1", safety: "write", description: "Change SIM status." },
  { group: "Packages", command: "affectPackageToSubscriber", version: "v1", safety: "write", description: "Assign a prepaid package to a subscriber." },
  { group: "Packages", command: "affectRecurringPackageToSubscriber", version: "v1", safety: "write", description: "Assign a recurring package to a subscriber." },
  { group: "Packages", command: "listSubscriberPrepaidPackages", version: "v2", safety: "read", description: "List subscriber prepaid packages." },
  { group: "Packages", command: "modifySubscriberPrepaidPackageLimits", version: "v1", safety: "write", description: "Modify package counters or limits." },
  { group: "Packages", command: "modifySubscriberPrepaidPackageExpDate", version: "v1", safety: "write", description: "Modify package expiration date." },
  { group: "Packages", command: "modifySubscriberPrepaidPackageStatus", version: "v1", safety: "write", description: "Modify package active status." },
  { group: "Packages", command: "stopResumeSubsRecurringPackage", version: "v1", safety: "write", description: "Stop or resume a recurring package." },
  { group: "Packages", command: "deleteSubscriberPackage", version: "v1", safety: "high-risk", description: "Delete a subscriber package." },
  { group: "Packages", command: "modifySubscriberPrepaidPackageActivePeriod", version: "v1", safety: "write", description: "Modify package active period." },
  { group: "Packages", command: "modifySubscriberMobilePlan", version: "v1", safety: "write", description: "Modify subscriber mobile plan." },
  { group: "Packages", command: "modifySubscriberVoipPlan", version: "v1", safety: "write", description: "Modify subscriber VoIP plan." },
  { group: "Templates", command: "listPrepaidPackageTemplate", version: "v1", safety: "read", description: "List prepaid package templates." },
  { group: "Templates", command: "listLocationZoneElement", version: "v1", safety: "read", description: "List operators in a location zone." },
  { group: "Templates", command: "listDestinationListPrefix", version: "v1", safety: "read", description: "List prefixes in a destination list." },
  { group: "Templates", command: "listDetailedLocationZone", version: "v1", safety: "read", description: "Read detailed location zone information." },
  { group: "Templates", command: "listDetailedDestinationList", version: "v1", safety: "read", description: "Read detailed destination list information." },
  { group: "Templates", command: "createPrepaidPackageTemplate", version: "v1", safety: "write", description: "Create a prepaid package template." },
  { group: "Templates", command: "modifyPPTCore", version: "v1", safety: "write", description: "Modify core prepaid package template fields." },
  { group: "Templates", command: "modifyPPTRecurring", version: "v1", safety: "write", description: "Modify package template recurring settings." },
  { group: "Templates", command: "modifyPPTThrottling", version: "v1", safety: "write", description: "Modify package template throttling settings." },
  { group: "Tariffs", command: "listResellerTariff", version: "v1", safety: "read", description: "List reseller tariff." },
  { group: "Tariffs", command: "listSubscriberTariff", version: "v1", safety: "read", description: "List subscriber tariff." },
  { group: "Tariffs", command: "listTariffRule", version: "v1", safety: "read", description: "List tariff rules." },
  { group: "Tariffs", command: "getCustomerTariff", version: "v1", safety: "read", description: "Read customer tariff." },
  { group: "Tariffs", command: "listSubscriberVoipTariff", version: "v1", safety: "read", description: "List subscriber VoIP tariff." },
  { group: "Tariffs", command: "listVoipTariffRule", version: "v1", safety: "read", description: "List VoIP tariff rules." },
  { group: "Usage", command: "getSubscriberActivePeriod", version: "v1", safety: "read", description: "Read subscriber active period." },
  { group: "Usage", command: "subscriberUsageOverPeriod", version: "v1", safety: "read", description: "Read subscriber usage over a period." },
  { group: "Usage", command: "subscriberNetworkEventsOverPeriod", version: "v1", safety: "read", description: "Read network events over a period." },
  { group: "SMS", command: "sendMtSms", version: "v1", safety: "write", description: "Send an MT SMS to a subscriber." },
  { group: "Network Profiles", command: "listNetworkProfile", version: "v1", safety: "read", description: "List network profiles." },
  { group: "Network Profiles", command: "createLocationZone", version: "v1", safety: "write", description: "Create a location zone from TADIG operators." },
];

export const ocsCommandGroups = Array.from(new Set(ocsCommandCatalog.map((item) => item.group)));

export function buildOcsCommand<T extends Record<string, unknown>>(command: string, payload: T) {
  return { [command]: payload };
}
