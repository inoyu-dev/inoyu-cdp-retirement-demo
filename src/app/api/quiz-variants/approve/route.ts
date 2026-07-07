import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { approveProposal } from "@/lib/quiz-variant-store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { proposalId?: string };
    if (!body.proposalId) {
      return NextResponse.json({ error: "proposalId required" }, { status: 400 });
    }
    const result = await approveProposal(body.proposalId);
    if (!result) {
      return NextResponse.json({ error: "Proposal not found or not pending" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse("approve", "Failed to approve proposal", error);
  }
}
