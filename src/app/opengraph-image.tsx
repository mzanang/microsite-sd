import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "SD Negeri Dukuhwaru 01";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ background: "#f6f3ec", color: "#19342b", display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", padding: "72px 84px", width: "100%" }}>
      <div style={{ alignItems: "center", display: "flex", gap: 22 }}>
        <div style={{ alignItems: "center", background: "#2f6b55", borderRadius: 22, color: "white", display: "flex", fontSize: 38, fontWeight: 800, height: 90, justifyContent: "center", width: 90 }}>01</div>
        <div style={{ color: "#2f6b55", fontSize: 25, fontWeight: 700 }}>MICROSITE RESMI SEKOLAH</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ color: "#a92f2f", fontSize: 30, fontWeight: 700 }}>SD NEGERI</div>
        <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -2 }}>DUKUHWARU 01</div>
        <div style={{ color: "#557067", fontSize: 27 }}>Informasi dan layanan digital sekolah</div>
      </div>
      <div style={{ alignItems: "center", display: "flex", fontSize: 24, gap: 12 }}>Jl. Hayam Wuruk No. 1, Dukuhwaru, Kabupaten Tegal</div>
    </div>,
    { ...size },
  );
}
