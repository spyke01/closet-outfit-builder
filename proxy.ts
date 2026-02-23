import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";
import { ADMIN_IMPERSONATION_COOKIE, parseImpersonationToken } from "./lib/services/admin/impersonation";

export async function proxy(request: NextRequest) {
  const rawImpersonationToken = request.cookies.get(ADMIN_IMPERSONATION_COOKIE)?.value;
  const impersonation = parseImpersonationToken(rawImpersonationToken);
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method.toUpperCase());
  const isStopRoute = request.nextUrl.pathname === '/api/admin/impersonation/stop';
  const isAuthSignOut = request.nextUrl.pathname.startsWith('/auth');

  if (impersonation && isMutating && !isStopRoute && !isAuthSignOut) {
    return NextResponse.json(
      {
        error: 'Read-only impersonation blocks mutating requests',
        code: 'ADMIN_IMPERSONATION_READ_ONLY',
      },
      { status: 403 }
    );
  }

  const response = await updateSession(request);
  if (rawImpersonationToken && !impersonation) {
    response.cookies.set(ADMIN_IMPERSONATION_COOKIE, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: new Date(0),
    });
  }
  if (impersonation) {
    response.headers.set('x-admin-impersonation', 'read_only');
    response.headers.set('x-admin-impersonation-target', impersonation.targetUserId);
    response.headers.set('x-admin-impersonation-session', impersonation.sessionId);
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
