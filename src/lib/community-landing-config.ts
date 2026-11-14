export type SchoolProfileField = {
  label: string;
  value: string;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type CommunityLandingConfig = {
  schoolProfileLeft: SchoolProfileField[];
  schoolProfileRight: SchoolProfileField[];
  faqItems: FaqItem[];
};

export const defaultSchoolProfileLeft: SchoolProfileField[] = [
  { label: "NPSN", value: "20326022" },
  { label: "Nama Sekolah", value: "SD Negeri Dukuhwaru 01" },
  { label: "Naungan", value: "Kementerian Pendidikan Dasar dan Menengah" },
  { label: "Tanggal Berdiri", value: "–" },
  { label: "No. SK Pendirian", value: "–" },
  { label: "Tanggal Operasional", value: "–" },
  { label: "No. SK Operasional", value: "–" },
  { label: "Jenjang Pendidikan", value: "Sekolah Dasar" },
  { label: "Status Sekolah", value: "Negeri" },
  { label: "Akreditasi", value: "A" },
  { label: "Tanggal Akreditasi", value: "2019-05-27" },
  { label: "No. SK Akreditasi", value: "489/BAN-SM/SK/2019" },
];

export const defaultSchoolProfileRight: SchoolProfileField[] = [
  { label: "Sertifikasi", value: "Belum" },
  { label: "Alamat", value: "Jl. Hayam Wuruk No.1" },
  { label: "Desa / Kelurahan", value: "Dukuhwaru" },
  { label: "Kecamatan / Kota(LN)", value: "Dukuhwaru" },
  { label: "Kab. / Kota / Negara (LN)", value: "Tegal" },
  { label: "Provinsi / LN", value: "Jawa Tengah" },
  { label: "No Telepon", value: "–" },
  { label: "Fax", value: "–" },
  { label: "Email", value: "sdndukuhwaru1@gmail.com" },
  { label: "Website", value: "–" },
  { label: "Kepala Sekolah", value: "Karnadi, S.Pd.SD" },
  { label: "Operator", value: "Anang Yunarko" },
];

export const defaultFaqItems: FaqItem[] = [
  {
    id: "faq-1",
    question: "Bagaimana cara membuka materi dan dokumen komunitas?",
    answer: "Pilih ruang yang tersedia pada halaman ini. Konten publik dapat dibuka tanpa login jika sudah ditambahkan oleh pengelola.",
  },
  {
    id: "faq-2",
    question: "Bagaimana cara mengunggah tugas kombel?",
    answer: "Buka ruang Tugas Kombel, pilih tugas yang diberikan Ketua, lalu kirim dokumen atau tautan melalui ruang pengumpulan.",
  },
  {
    id: "faq-3",
    question: "Siapa yang dapat masuk ke portal?",
    answer: "Akun operasional dibuat oleh Super Admin untuk Kepala Sekolah, Pengawas Dabin, dan Guru. Tidak tersedia pendaftaran mandiri.",
  },
  {
    id: "faq-4",
    question: "Apa yang dilakukan jika belum memiliki akun?",
    answer: "Hubungi pengelola sekolah untuk dibuatkan akun. Jangan membagikan kata sandi kepada orang lain.",
  },
];

export const defaultCommunityLandingConfig: CommunityLandingConfig = {
  schoolProfileLeft: defaultSchoolProfileLeft,
  schoolProfileRight: defaultSchoolProfileRight,
  faqItems: defaultFaqItems,
};

