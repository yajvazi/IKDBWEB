import { describe, expect, it } from "vitest";
import { bytesToHuman, remainingDataBytes } from "@/lib/bytes/format";
import { mapOcsStatusToHttp, OcsApiError } from "@/server/ocs/errors";
import { normalizeSubscriberPackage } from "@/server/ocs/normalizers";
import { redactOcsPayload } from "@/server/ocs/redaction";

describe("OCS status mapping", () => {
  it("maps documented errors to safe HTTP responses", () => {
    expect(mapOcsStatusToHttp(0)).toMatchObject({ httpStatus: 200, retryable: false });
    expect(mapOcsStatusToHttp(2)).toMatchObject({ httpStatus: 400, retryable: false });
    expect(mapOcsStatusToHttp(6)).toMatchObject({ httpStatus: 404, retryable: false });
    expect(mapOcsStatusToHttp(9)).toMatchObject({ httpStatus: 502, retryable: false });
    expect(mapOcsStatusToHttp(18)).toMatchObject({ httpStatus: 504, retryable: true });
    expect(mapOcsStatusToHttp(100)).toMatchObject({ httpStatus: 429, retryable: true });
  });

  it("creates safe OcsApiError objects", () => {
    const error = new OcsApiError({ upstreamCode: 9, upstreamMessage: "SRC_IP_NOT_AUTHORISED 1.2.3.4", correlationId: "req_1" });
    expect(error.httpStatus).toBe(502);
    expect(error.safePublicMessage).not.toContain("1.2.3.4");
    expect(error.correlationId).toBe("req_1");
  });
});

describe("OCS data normalization", () => {
  it("normalizes subscriber prepaid packages and clamps remaining bytes", () => {
    const normalized = normalizeSubscriberPackage({
      subscriberprepaidpackageid: 1007,
      subscriberid: 4,
      locationzoneid: 27,
      pckdatabyte: 100,
      useddatabyte: 120,
      active: true,
      rdbLocationZones: { locationzoneid: 27, locationzonename: "Italy" },
      packageTemplate: { prepaidpackagetemplateid: 2214, prepaidpackagetemplatename: "Italy 1 GB" },
    });

    expect(normalized.upstreamPackageId).toBe(1007);
    expect(normalized.remainingDataBytes).toBe(0);
    expect(normalized.packageTemplateName).toBe("Italy 1 GB");
  });
});

describe("redaction", () => {
  it("redacts secrets and masks subscriber identifiers", () => {
    const redacted = redactOcsPayload({
      authorization: "Bearer secret",
      imsi: "12345678901234",
      nested: { activationCode: "ACTIVATION_CODE" },
    });

    expect(redacted.authorization).toBe("[REDACTED]");
    expect(redacted.imsi).toBe("123********234");
    expect(redacted.nested.activationCode).toBe("[REDACTED]");
  });
});

describe("byte helpers", () => {
  it("converts bytes and calculates remaining data", () => {
    expect(bytesToHuman(1073741824)).toBe("1 GB");
    expect(remainingDataBytes(100, 40)).toBe(60);
    expect(remainingDataBytes(100, 140)).toBe(0);
  });
});
