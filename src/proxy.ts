import { NextRequest, NextResponse } from "next/server";
import { isPublicRequest } from "./services/lobby/access";
import { identity } from "./services/accounts/service";
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  let response: NextResponse;
  if (isPublicRequest(path, request.method) || (await identity(request)))
    response = NextResponse.next();
  else if (path.startsWith("/api/"))
    response = NextResponse.json(
      { error: "Войдите в свой аккаунт." },
      { status: 401 },
    );
  else response = NextResponse.redirect(new URL("/login", request.url));
  if (!path.startsWith("/_next/static/"))
    response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  return response;
}
export const config = { matcher: ["/((?!_next/static).*)"] };
