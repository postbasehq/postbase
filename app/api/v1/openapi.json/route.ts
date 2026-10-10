import { NextResponse } from "next/server";
import spec from "@/docs/openapi.json";

/** The REST API's OpenAPI description (built by scripts/build-openapi.py), for SDK generators and tools. */
export function GET() {
  return NextResponse.json(spec, {
    headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600" },
  });
}
