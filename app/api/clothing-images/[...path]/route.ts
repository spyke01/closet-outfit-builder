import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const {
    data: { user },
    error,
  } = await (await createClient()).auth.getUser();
  if (error || !user) return new NextResponse(null, { status: 401 });
  const { path } = await context.params;
  if (
    path[0] !== user.id ||
    path.some((x) => !/^[\w.-]+$/.test(x) || x === "." || x === "..") ||
    path.length > 5
  )
    return new NextResponse(null, { status: 404 });
  const { data, error: readError } = await createAdminClient()
    .storage.from("wardrobe-private-images")
    .download(path.join("/"));
  if (
    readError ||
    !data ||
    !["image/png", "image/jpeg", "image/webp"].includes(data.type)
  )
    return new NextResponse(null, { status: 404 });
  return new NextResponse(data, {
    headers: {
      "Content-Type": data.type,
      "Cache-Control": "private, max-age=60",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}
