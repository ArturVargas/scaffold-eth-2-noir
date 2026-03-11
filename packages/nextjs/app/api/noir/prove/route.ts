import { NextResponse } from "next/server";
import { proveOnServer } from "~~/lib/noir/provingServer";
import type { ProofRequest } from "~~/lib/noir/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ProofRequest;

    if (!payload?.circuitName || !payload?.inputs) {
      return NextResponse.json({ error: "Missing circuitName or inputs" }, { status: 400 });
    }

    const proof = await proveOnServer({ ...payload, mode: "server" });
    return NextResponse.json(proof);
  } catch (error) {
    console.error("Noir proof route failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown proof generation error" },
      { status: 500 },
    );
  }
}
