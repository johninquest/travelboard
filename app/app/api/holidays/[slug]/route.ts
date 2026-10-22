import type { NextRequest } from "next/server";
import { hubJson } from "../route";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {  const { slug } = await params;
  return hubJson(slug);
}
