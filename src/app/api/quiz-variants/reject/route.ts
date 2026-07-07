import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { rejectProposal } from "@/lib/quiz-variant-store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { proposalId?: string };
    if (!body.proposalId) {
      return NextResponse.json({ error: "proposalId required" }, { status: 400 });
    }
    const ok = await rejectProposal(body.proposalId);
    if (!ok) {
      return NextResponse.json({ error: "Proposal not found or not pending" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse("reject", "Failed to reject proposal", error);
  }
}
