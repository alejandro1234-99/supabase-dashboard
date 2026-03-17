import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// El middleware solo deja pasar todo — la protección real está en el layout del dashboard
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
