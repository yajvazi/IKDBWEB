import { randomUUID } from "node:crypto";
import { getEnv } from "@/server/ocs/config";
import { OcsApiError } from "@/server/ocs/errors";
import { listSubscriberPrepaidPackagesCommand } from "@/server/ocs/commands";
import { listSubscriberPrepaidPackagesResponseSchema, ocsGenericResponseSchema } from "@/server/ocs/schemas";
import { normalizeSubscriberPackage } from "@/server/ocs/normalizers";
import type { NormalizedSubscriberPackage, OcsIdentifier } from "@/server/ocs/types";

export class OcsClient {
  async executeCommand<T extends Record<string, unknown>>(command: T): Promise<Record<string, unknown>> {
    const env = getEnv();
    const correlationId = randomUUID();

    if (env.OCS_MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 80));
      return mockCommandResponse(command);
    }

    const response = await this.post(command, correlationId);
    const parsed = ocsGenericResponseSchema.parse(response);

    if (parsed.status.code !== 0) {
      throw new OcsApiError({
        upstreamCode: parsed.status.code,
        upstreamMessage: parsed.status.msg,
        correlationId,
      });
    }

    return parsed;
  }

  async listSubscriberPrepaidPackages(identifier: OcsIdentifier): Promise<NormalizedSubscriberPackage[]> {
    const env = getEnv();
    const correlationId = randomUUID();

    if (env.OCS_MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 60));
      return mockSubscriberPackages();
    }

    const command = listSubscriberPrepaidPackagesCommand(identifier);
    const response = await this.post(command, correlationId);
    const parsed = listSubscriberPrepaidPackagesResponseSchema.parse(response);

    if (parsed.status.code !== 0) {
      throw new OcsApiError({
        upstreamCode: parsed.status.code,
        upstreamMessage: parsed.status.msg,
        correlationId,
      });
    }

    return parsed.listSubscriberPrepaidPackages.packages.map(normalizeSubscriberPackage);
  }

  private async post(command: unknown, correlationId: string): Promise<unknown> {
    const env = getEnv();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.OCS_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(this.url(), {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(command),
        signal: controller.signal,
      });

      return await response.json();
    } catch (cause) {
      throw new OcsApiError({
        upstreamCode: 18,
        upstreamMessage: "Request failed or timed out",
        correlationId,
        cause,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private headers(): HeadersInit {
    const env = getEnv();
    const headers: Record<string, string> = {
      "content-type": "application/json",
      accept: "application/json",
    };

    if (env.OCS_AUTH_MODE === "basic" && env.OCS_API_USERNAME && env.OCS_API_PASSWORD) {
      headers.authorization = `Basic ${Buffer.from(`${env.OCS_API_USERNAME}:${env.OCS_API_PASSWORD}`).toString("base64")}`;
    }
    if (env.OCS_AUTH_MODE === "bearer" && env.OCS_API_TOKEN) {
      headers.authorization = `Bearer ${env.OCS_API_TOKEN}`;
    }
    if (env.OCS_AUTH_MODE === "custom-header" && env.OCS_AUTH_HEADER_NAME && env.OCS_AUTH_HEADER_VALUE) {
      headers[env.OCS_AUTH_HEADER_NAME] = env.OCS_AUTH_HEADER_VALUE;
    }

    return headers;
  }

  private url() {
    const env = getEnv();
    const url = new URL(env.OCS_API_BASE_URL!);

    if (env.OCS_AUTH_MODE === "query-token" && env.OCS_API_TOKEN) {
      url.searchParams.set("token", env.OCS_API_TOKEN);
    }

    return url;
  }
}

let client: OcsClient | null = null;

export function getOcsClient() {
  client ??= new OcsClient();
  return client;
}

function mockSubscriberPackages(): NormalizedSubscriberPackage[] {
  return [
    {
      upstreamPackageId: 1007,
      subscriberId: 4,
      esimId: 64612,
      packageTemplateId: 2214,
      packageTemplateName: "InternetKudo Italy 1 GB",
      locationZoneId: 27,
      locationZoneName: "Italy",
      destinationZoneId: 5,
      destinationZoneName: "Europe",
      allocatedDataBytes: 1073741824,
      usedDataBytes: 402653184,
      remainingDataBytes: 671088640,
      assignedAt: "2026-05-01T13:25:08Z",
      activatedAt: "2026-05-02T14:49:47Z",
      expiresAt: "2026-06-01T14:49:47Z",
      validityDays: 30,
      upstreamCost: 9.99,
      resellerCost: 0.13,
      parentResellerCost: 0.13,
      active: true,
      recurringPackageId: null,
    },
  ];
}

function mockCommandResponse(command: Record<string, unknown>): Record<string, unknown> {
  const commandName = Object.keys(command)[0];

  if (commandName === "listNetworkProfile") {
    return {
      status: { code: 0, msg: "OK" },
      listNetworkProfile: [
        { id: 79, name: "InternetKudo Mock eSIM", sponsorId: 108, sponsorName: "Mock Sponsor", resellerId: 567, resellerName: "InternetKudo", allowedListId: 162 },
      ],
    };
  }

  if (commandName === "listResellerAccount") {
    return {
      status: { code: 0, msg: "OK" },
      listResellerAccount: {
        reseller: [
          {
            id: 567,
            name: "InternetKudo",
            account: [
              { id: 3926, name: "InternetKudo Main Account", balance: 1000, packageOnly: false },
              { id: 3927, name: "InternetKudo Package Account", balance: 250, packageOnly: true },
            ],
          },
        ],
      },
    };
  }

  if (commandName === "getResellerInfo") {
    return {
      status: { code: 0, msg: "OK" },
      getResellerInfo: {
        id: 567,
        name: "InternetKudo",
        parentId: -1,
        balance: "1000.00",
      },
    };
  }

  if (commandName === "esimStatusPerAccount") {
    return {
      status: { code: 0, msg: "OK" },
      esimStatusPerAccount: {
        account: [
          {
            id: 3926,
            name: "InternetKudo Main Account",
            sponsor: [
              {
                id: 101,
                name: "InternetKudo Sponsor",
                esim: {
                  status: [
                    { statusNum: 0, statusStr: "Free", count: 120 },
                    { statusNum: 2, statusStr: "Affected", count: 38 },
                  ],
                },
              },
            ],
          },
        ],
      },
    };
  }

  if (commandName === "listSponsor") {
    return {
      status: { code: 0, msg: "OK" },
      listSponsor: {
        sponsor: [
          { id: 101, prefix: 24801, name: "InternetKudo Sponsor" },
          { id: 102, prefix: 24802, name: "InternetKudo Backup Sponsor" },
        ],
      },
    };
  }

  if (commandName === "listSteeringList") {
    return {
      status: { code: 0, msg: "OK" },
      listSteeringList: [
        { id: 1, resellerId: 567, name: "InternetKudo Default Steering" },
        { id: 2, resellerId: 567, name: "InternetKudo EU Steering" },
      ],
    };
  }

  if (commandName === "listResellerTariff" || commandName === "listSubscriberTariff") {
    const tariffType = commandName === "listResellerTariff" ? "RESELLER" : "SUBSCRIBER";
    return {
      status: { code: 0, msg: "OK" },
      [commandName]: {
        tariff: [
          {
            resellers: { resellerid: 567, resellername: "InternetKudo" },
            roamingplanid: tariffType === "RESELLER" ? 1 : 4,
            roamingplanname: `InternetKudo ${tariffType === "RESELLER" ? "Reseller" : "Subscriber"} Tariff`,
            defaultoutgoingvoice: 0,
            defaultterminatedvoice: 0,
            defaulttext: 0,
            defaultdata: tariffType === "RESELLER" ? 0.004 : 0.006,
            resellerid: 567,
            defaultmtsms: 0,
            currencyid: 1,
            isusedefaultprices: false,
            tariffType,
          },
        ],
      },
    };
  }

  if (commandName === "listTariffRule" || commandName === "getCustomerTariff") {
    return {
      status: { code: 0, msg: "OK" },
      listTariffRule: {
        rule: [
          {
            operator: { networkId: 79, continent: "Europe", countryName: "Belgium", countryIso2: "be", operatorName: "Proximus PLC" },
            roamingplanruleid: 7198,
            roamingplanid: 1,
            active: true,
            datarate: 0.004,
            currencyid: 1,
            hidden: false,
            dailyCap: false,
          },
          {
            operator: { networkId: 477, continent: "Europe", countryName: "Italy", countryIso2: "it", operatorName: "H3G" },
            roamingplanruleid: 4,
            roamingplanid: 1,
            active: true,
            datarate: 0.005,
            currencyid: 1,
            hidden: false,
            dailyCap: false,
          },
        ],
      },
    };
  }

  if (commandName === "listDetailedLocationZone") {
    return {
      status: { code: 0, msg: "OK" },
      listDetailedLocationZone: [
        {
          zoneId: 27,
          zoneName: "InternetKudo Europe",
          reseller: { id: 567, name: "InternetKudo" },
          operators: [
            { networkId: 79, continent: "Europe", countryCode: 32, countryName: "Belgium", countryIso2: "be", operatorName: "Proximus PLC", tadigs: ["BELTB"] },
            { networkId: 477, continent: "Europe", countryCode: 39, countryName: "Italy", countryIso2: "it", operatorName: "H3G", tadigs: ["ITAH3"] },
          ],
        },
      ],
    };
  }

  if (commandName === "listDetailedDestinationList") {
    return {
      status: { code: 0, msg: "OK" },
      listDetailedDestinationList: [{ listId: 5, listName: "InternetKudo Voice", reseller: { id: 567, name: "InternetKudo" }, prefixes: ["32", "39"] }],
    };
  }

  if (commandName === "listPrepaidPackageTemplate") {
    return {
      status: { code: 0, msg: "OK" },
      listPrepaidPackageTemplate: {
        template: [
          {
            prepaidpackagetemplateid: 2214,
            prepaidpackagetemplatename: "InternetKudo Europe 10GB",
            resellerid: 567,
            locationzoneid: 27,
            databyte: 10_737_418_240,
            perioddays: 30,
            deleted: false,
            cost: 9.99,
            uiVisible: false,
            userUiName: "InternetKudo Europe 10GB",
          },
        ],
      },
    };
  }

  if (commandName === "createLocationZone") {
    return {
      status: { code: 0, msg: "OK" },
      createLocationZone: { newLZ: { Id: 1924, name: "InternetKudo Mock Zone" } },
    };
  }

  if (commandName === "createPrepaidPackageTemplate") {
    const payload = command.createPrepaidPackageTemplate as Record<string, unknown>;
    return {
      status: { code: 0, msg: "OK" },
      createPrepaidPackageTemplate: {
        prepaidpackagetemplateid: 9359,
        ...payload,
        deleted: false,
        uiVisible: false,
      },
    };
  }

  if (commandName === "affectPackageToSubscriber") {
    return {
      status: { code: 0, msg: "OK" },
      affectPackageToSubscriber: {
        iccid: "8948010000074618117",
        smdpServer: "smdp.io",
        activationCode: "K2-2NSYGO-1JIPWW9",
        urlQrCode: "LPA:1$smdp.io$K2-2NSYGO-1JIPWW9",
        subscriberId: 34705265,
        esimId: 34724498,
        subsPackageId: 181296622,
        userSimName: "InternetKudo_34705265",
      },
    };
  }

  return { status: { code: 0, msg: "OK" }, [commandName ?? "unknown"]: {} };
}
