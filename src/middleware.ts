import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const protectedAdminPath = request.nextUrl.pathname.startsWith("/admin") && !request.nextUrl.pathname.startsWith("/admin/login");
  const protectedKbPath = request.nextUrl.pathname.startsWith("/komunitas-belajar/dashboard") || request.nextUrl.pathname.startsWith("/komunitas-belajar/pengguna") || request.nextUrl.pathname.startsWith("/komunitas-belajar/ganti-password") || request.nextUrl.pathname.startsWith("/komunitas-belajar/administrasi") || request.nextUrl.pathname.startsWith("/komunitas-belajar/monitoring");
  const passwordChangePath = request.nextUrl.pathname.startsWith("/komunitas-belajar/ganti-password");

  if (protectedAdminPath && !user) return NextResponse.redirect(new URL("/admin/login", request.url));
  if (protectedAdminPath && user) {
    const { data: profile } = await supabase.from("admin_profiles").select("id").eq("user_id", user.id).eq("is_active", true).maybeSingle();
    if (!profile) return NextResponse.redirect(new URL("/admin/login?error=forbidden", request.url));
  }

  if (protectedKbPath && !user) return NextResponse.redirect(new URL("/komunitas-belajar/login", request.url));
  if (protectedKbPath && user) {
    const { data: profile } = await supabase.from("kb_profiles").select("id, must_change_password").eq("auth_user_id", user.id).eq("is_active", true).maybeSingle();
    if (!profile) return NextResponse.redirect(new URL("/komunitas-belajar/login?error=forbidden", request.url));
    if (profile.must_change_password && !passwordChangePath) return NextResponse.redirect(new URL("/komunitas-belajar/ganti-password", request.url));
  }

  return response;
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*", "/komunitas-belajar/dashboard/:path*", "/komunitas-belajar/pengguna/:path*", "/komunitas-belajar/ganti-password/:path*", "/komunitas-belajar/administrasi/:path*", "/komunitas-belajar/monitoring/:path*"] };
