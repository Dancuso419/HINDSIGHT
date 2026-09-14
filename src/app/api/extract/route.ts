import { NextResponse } from "next/server";
import { z } from "zod";
import { extractTrades, toReviewRow } from "@/lib/extract";

export const runtime = "nodejs";
export const maxDuration = 60;

const MIME = ["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"] as const;

// Screenshots are downscaled in the browser before upload; Vercel rejects bodies over 4.5 MB.
const RequestSchema = z.object({
  images: z
    .array(
      z.object({
        mime_type: z.enum(MIME),
        data: z.string().min(100).max(1_900_000), // base64 of ~1.4 MB
      }),
    )
    .min(1)
    .max(4),
});

/** Read trade rows from order-history screenshots for the trader to review. Nothing is stored. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Send between 1 and 4 screenshots (PNG, JPEG, WebP or HEIC), each under about 1.4 MB." },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY is not set on the server." }, { status: 500 });

  const result = await extractTrades({ apiKey, images: parsed.data.images, deadlineMs: (maxDuration - 6) * 1000 });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  const rows = result.extraction.rows.map(toReviewRow);
  if (!rows.length) {
    return NextResponse.json(
      { error: "No orders were found in those screenshots. Make sure the order history list is visible." },
      { status: 422 },
    );
  }
  return NextResponse.json({ rows, notes: result.extraction.notes, model: result.model });
}
