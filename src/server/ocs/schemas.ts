import { z } from "zod";

export const ocsStatusSchema = z.object({
  code: z.number(),
  msg: z.string(),
});

export const ocsGenericResponseSchema = z.object({
  status: ocsStatusSchema,
}).passthrough();

export const upstreamSubscriberPackageSchema = z.object({
  subscriberprepaidpackageid: z.number(),
  subscriberid: z.number(),
  locationzoneid: z.number().nullable().optional(),
  destinationzoneid: z.number().nullable().optional(),
  pckdatabyte: z.number().nullable().optional().default(0),
  useddatabyte: z.number().nullable().optional().default(0),
  tsassigned: z.string().nullable().optional(),
  tsactivationutc: z.string().nullable().optional(),
  tsexpirationutc: z.string().nullable().optional(),
  perioddays: z.number().nullable().optional(),
  cost: z.number().nullable().optional(),
  templateId: z.number().nullable().optional(),
  esimId: z.number().nullable().optional(),
  active: z.boolean().default(false),
  resellerCost: z.number().nullable().optional(),
  parentResellerCost: z.number().nullable().optional(),
  recurringPackage: z.number().nullable().optional(),
  rdbLocationZones: z
    .object({
      locationzoneid: z.number().nullable().optional(),
      locationzonename: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  rdbDestinationZones: z
    .object({
      destinationzoneid: z.number().nullable().optional(),
      destinationzonename: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  packageTemplate: z
    .object({
      prepaidpackagetemplateid: z.number().nullable().optional(),
      prepaidpackagetemplatename: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

export const listSubscriberPrepaidPackagesResponseSchema = z.object({
  status: ocsStatusSchema,
  listSubscriberPrepaidPackages: z.object({
    callUseSingleCounter: z.boolean().optional(),
    packages: z.array(upstreamSubscriberPackageSchema).default([]),
    recurring: z.array(z.unknown()).default([]),
  }),
});
