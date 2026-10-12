import type { Metadata } from "next";
import { DM_Sans, Inter, Plus_Jakarta_Sans, Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700", "800"],
});
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter", weight: ["400", "500", "600", "700", "800"] });
const dmSans = DM_Sans({ subsets: ["latin"], display: "swap", variable: "--font-dm-sans", weight: ["400", "500", "600", "700", "800"] });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap", variable: "--font-plus-jakarta", weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "SD Negeri Dukuhwaru 01", template: "%s - SDN Dukuhwaru 01" },
  description: "Microsite resmi SD Negeri Dukuhwaru 01",
  icons: { icon: "/logo.png", shortcut: "/logo.png", apple: "/logo.png" },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "/",
    siteName: "SD Negeri Dukuhwaru 01",
    title: "SD Negeri Dukuhwaru 01",
    description: "Microsite resmi SD Negeri Dukuhwaru 01",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "SD Negeri Dukuhwaru 01" }],
  },
  twitter: { card: "summary_large_image", title: "SD Negeri Dukuhwaru 01", description: "Microsite resmi SD Negeri Dukuhwaru 01", images: ["/opengraph-image"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body className={`${poppins.variable} ${inter.variable} ${dmSans.variable} ${plusJakarta.variable}`}>{children}</body></html>;
}
