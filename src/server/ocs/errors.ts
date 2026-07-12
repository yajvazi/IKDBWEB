export const ocsErrorDescriptions = {
  0: "OK",
  1: "UNKNOWN_REQUEST",
  2: "INVALID_REQUEST",
  3: "UNEXPECTED_ERROR",
  4: "DB_DUPLICATE_ENTRY",
  5: "DB_DATA_INCONSISTENCY",
  6: "DB_NOT_FOUND",
  7: "DB_ERROR",
  8: "NO_API_ACCOUNT_FOR_RESELLER",
  9: "SRC_IP_NOT_AUTHORISED",
  10: "INVALID_RESELLER",
  11: "RESOURCE_NOT_VISIBLE",
  12: "RESOURCE_READ_ONLY",
  13: "SMS_API_ERROR",
  14: "OPERATION_IMPOSSIBLE",
  15: "HLR_API_ERROR",
  16: "STEERING_API_ERROR",
  17: "SUBS_END_OF_LIFE",
  18: "TIMEOUT",
  100: "TRAFFIC_CONTROL_LIMIT_EXCEEDED",
  10001: "UNKNOWN_TADIG",
  10002: "DUPLICATE_LOCATION_ZONE_OPERATORS",
  10003: "OPERATORS_NOT_ALLOWED_IN_RESELLER_TARIFF",
  10004: "OPERATORS_UNAVAILABLE_OR_TOO_EXPENSIVE",
} as const;

export type OcsStatusCode = keyof typeof ocsErrorDescriptions;

export function mapOcsStatusToHttp(code: number): { httpStatus: number; retryable: boolean; publicMessage: string } {
  switch (code) {
    case 0:
      return { httpStatus: 200, retryable: false, publicMessage: "OK" };
    case 2:
      return { httpStatus: 400, retryable: false, publicMessage: "The upstream request was invalid." };
    case 4:
      return { httpStatus: 409, retryable: false, publicMessage: "The upstream record already exists." };
    case 6:
      return { httpStatus: 404, retryable: false, publicMessage: "The requested upstream resource was not found." };
    case 9:
    case 10:
      return { httpStatus: 502, retryable: false, publicMessage: "The upstream reseller configuration is not available." };
    case 11:
      return { httpStatus: 404, retryable: false, publicMessage: "The upstream resource is not visible." };
    case 12:
    case 14:
      return { httpStatus: 409, retryable: false, publicMessage: "The upstream operation cannot be completed in the current state." };
    case 17:
      return { httpStatus: 410, retryable: false, publicMessage: "The subscriber has reached end of life." };
    case 18:
      return { httpStatus: 504, retryable: true, publicMessage: "The upstream request timed out." };
    case 100:
      return { httpStatus: 429, retryable: true, publicMessage: "The upstream traffic limit was exceeded." };
    case 10001:
      return { httpStatus: 400, retryable: false, publicMessage: "One or more TADIG operators are unknown to OCS." };
    case 10002:
      return { httpStatus: 409, retryable: false, publicMessage: "A location zone with the same operator set already exists." };
    case 10003:
      return { httpStatus: 409, retryable: false, publicMessage: "One or more operators are not allowed by the reseller tariff." };
    case 10004:
      return { httpStatus: 409, retryable: false, publicMessage: "One or more operators are unavailable or too expensive for this location zone." };
    case 1:
    case 3:
    case 5:
    case 7:
    case 8:
    case 13:
    case 15:
    case 16:
      return { httpStatus: 502, retryable: true, publicMessage: "The upstream service returned an error." };
    default:
      return { httpStatus: 502, retryable: true, publicMessage: "The upstream service returned an unknown error." };
  }
}

export class OcsApiError extends Error {
  upstreamCode: number;
  upstreamMessage: string;
  safePublicMessage: string;
  httpStatus: number;
  retryable: boolean;
  correlationId: string;
  originalCause?: unknown;

  constructor(input: {
    upstreamCode: number;
    upstreamMessage: string;
    correlationId: string;
    cause?: unknown;
  }) {
    const mapped = mapOcsStatusToHttp(input.upstreamCode);
    super(mapped.publicMessage);
    this.name = "OcsApiError";
    this.upstreamCode = input.upstreamCode;
    this.upstreamMessage = input.upstreamMessage;
    this.safePublicMessage = mapped.publicMessage;
    this.httpStatus = mapped.httpStatus;
    this.retryable = mapped.retryable;
    this.correlationId = input.correlationId;
    this.originalCause = input.cause;
  }
}
