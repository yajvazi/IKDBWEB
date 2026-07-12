import { NextResponse } from "next/server";
import { getOpenApiSpec } from "@/server/openapi/spec";

export function GET() {
  return NextResponse.json(getOpenApiSpec());
}
