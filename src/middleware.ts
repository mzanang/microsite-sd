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
  const pathname = request.nextUrl.pathname;

  // Admin routes protection
  const protectedAdminPath = pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");
  if (protectedAdminPath) {
    if (!user) return NextResponse.redirect(new URL("/admin/login", request.url));
    const { data: profile } = await supabase.from("admin_profiles").select("id").eq("user_id", user.id).eq("is_active", true).maybeSingle();
    if (!profile) return NextResponse.redirect(new URL("/admin/login?error=forbidden", request.url));
  }

  // Internal Komunitas Belajar routes protection
  const isProtectedKbPath =
    pathname.startsWith("/komunitas-belajar/ketua") ||
    pathname.startsWith("/komunitas-belajar/sekretaris") ||
    pathname.startsWith("/komunitas-belajar/anggota") ||
    pathname.startsWith("/komunitas-belajar/ks") ||
    pathname.startsWith("/komunitas-belajar/pengawas") ||
    pathname.startsWith("/komunitas-belajar/ruang") ||
    pathname.startsWith("/komunitas-belajar/dashboard") ||
    pathname.startsWith("/komunitas-belajar/pengguna") ||
    pathname.startsWith("/komunitas-belajar/keamanan-akun") ||
    pathname.startsWith("/komunitas-belajar/ganti-password") ||
    pathname.startsWith("/komunitas-belajar/administrasi") ||
    pathname.startsWith("/komunitas-belajar/monitoring");

  const isPasswordChangePage = pathname.startsWith("/komunitas-belajar/ganti-password");

  if (isProtectedKbPath) {
    if (!user) {
      return NextResponse.redirect(new URL("/komunitas-belajar/login", request.url));
    }

    const { data: profile } = await supabase
      .from("kb_profiles")
      .select("id, must_change_password, is_active")
      .eq("auth_user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!profile) {
      return NextResponse.redirect(new URL("/komunitas-belajar/login?error=forbidden", request.url));
    }

    // Enforce mandatory password change: user CANNOT access any internal page until password is changed
    if (profile.must_change_password && !isPasswordChangePage) {
      return NextResponse.redirect(new URL("/komunitas-belajar/ganti-password", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/komunitas-belajar/ketua/:path*",
    "/komunitas-belajar/sekretaris/:path*",
    "/komunitas-belajar/anggota/:path*",
    "/komunitas-belajar/ks/:path*",
    "/komunitas-belajar/pengawas/:path*",
    "/komunitas-belajar/ruang/:path*",
    "/komunitas-belajar/dashboard/:path*",
    "/komunitas-belajar/pengguna/:path*",
    "/komunitas-belajar/keamanan-akun/:path*",
    "/komunitas-belajar/ganti-password/:path*",
    "/komunitas-belajar/administrasi/:path*",
    "/komunitas-belajar/monitoring/:path*",
  ],
};
