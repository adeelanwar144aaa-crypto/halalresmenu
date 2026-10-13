import { NextResponse } from "next/server";
import fs from "fs";
import { draftPathForSlug } from "@/lib/about-draft";
import { isPreviewDraftsEnabled } from "@/lib/preview-drafts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!isPreviewDraftsEnabled()) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const { slug } = await context.params;
  const path = draftPathForSlug(slug);
  if (!fs.existsSync(path)) {
    return NextResponse.json({ error: "No draft" }, { status: 404 });
  }

  try {
    const raw = fs.readFileSync(path, "utf8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "Invalid draft" }, { status: 500 });
  }
}
