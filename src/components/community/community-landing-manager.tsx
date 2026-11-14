"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  School,
  Trash2,
} from "lucide-react";
import type {
  CommunityLandingConfig,
  FaqItem,
  SchoolProfileField,
} from "@/lib/community-landing-config";
import {
  defaultCommunityLandingConfig,
  defaultFaqItems,
  defaultSchoolProfileLeft,
  defaultSchoolProfileRight,
} from "@/lib/community-landing-config";

export function CommunityLandingManager() {
  const [activeTab, setActiveTab] = useState<"profile" | "faq">("profile");
  const [profileColumn, setProfileColumn] = useState<"left" | "right">("left");

  const [leftFields, setLeftFields] = useState<SchoolProfileField[]>(defaultSchoolProfileLeft);
  const [rightFields, setRightFields] = useState<SchoolProfileField[]>(defaultSchoolProfileRight);
  const [faqItems, setFaqItems] = useState<FaqItem[]>(defaultFaqItems);

  // FAQ editing & adding state
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [newFaqQuestion, setNewFaqQuestion] = useState("");
  const [newFaqAnswer, setNewFaqAnswer] = useState("");
  const [isAddingFaq, setIsAddingFaq] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadConfig() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/komunitas-belajar/landing-config", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (json.config) {
            if (json.config.schoolProfileLeft) setLeftFields(json.config.schoolProfileLeft);
            if (json.config.schoolProfileRight) setRightFields(json.config.schoolProfileRight);
            if (json.config.faqItems) setFaqItems(json.config.faqItems);
          }
        }
      } catch (err) {
        console.warn("Failed to load landing config:", err);
      } finally {
        setLoading(false);
      }
    }
    void loadConfig();
  }, []);

  function notify(msg: string) {
    setMessage(msg);
    setError("");
    window.setTimeout(() => setMessage(""), 3500);
  }

  // Profil helpers
  const currentFields = profileColumn === "left" ? leftFields : rightFields;
  const setCurrentFields = profileColumn === "left" ? setLeftFields : setRightFields;

  function updateField(index: number, key: "label" | "value", value: string) {
    const next = [...currentFields];
    next[index] = { ...next[index], [key]: value };
    setCurrentFields(next);
  }

  function addField() {
    setCurrentFields([...currentFields, { label: "", value: "" }]);
  }

  function removeField(index: number) {
    setCurrentFields(currentFields.filter((_, i) => i !== index));
  }

  function resetProfileColumn() {
    if (window.confirm("Kembalikan kolom ini ke data bawaan sekolah?")) {
      if (profileColumn === "left") setLeftFields([...defaultSchoolProfileLeft]);
      else setRightFields([...defaultSchoolProfileRight]);
    }
  }

  // FAQ helpers
  function handleAddFaq(e: React.FormEvent) {
    e.preventDefault();
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) {
      setError("Pertanyaan dan Jawaban wajib diisi.");
      return;
    }
    const item: FaqItem = {
      id: `faq-${Date.now()}`,
      question: newFaqQuestion.trim(),
      answer: newFaqAnswer.trim(),
    };
    setFaqItems([...faqItems, item]);
    setNewFaqQuestion("");
    setNewFaqAnswer("");
    setIsAddingFaq(false);
    setError("");
  }

  function handleUpdateFaq(id: string, question: string, answer: string) {
    setFaqItems(
      faqItems.map((item) => (item.id === id ? { ...item, question, answer } : item))
    );
    setEditingFaqId(null);
  }

  function handleDeleteFaq(id: string) {
    if (window.confirm("Hapus pertanyaan ini dari daftar FAQ?")) {
      setFaqItems(faqItems.filter((item) => item.id !== id));
    }
  }

  function moveFaq(index: number, dir: "up" | "down") {
    if (dir === "up" && index === 0) return;
    if (dir === "down" && index === faqItems.length - 1) return;
    const next = [...faqItems];
    const target = dir === "up" ? index - 1 : index + 1;
    [next[index], next[target]] = [next[target], next[index]];
    setFaqItems(next);
  }

  function resetAllFaq() {
    if (window.confirm("Kembalikan seluruh daftar FAQ ke pengaturan awal?")) {
      setFaqItems([...defaultFaqItems]);
    }
  }

  // Save all changes to server
  async function saveAll() {
    setError("");
    setMessage("");

    // Validate profile labels
    const hasEmptyLeft = leftFields.some((f) => !f.label.trim());
    const hasEmptyRight = rightFields.some((f) => !f.label.trim());
    if (hasEmptyLeft || hasEmptyRight) {
      setError("Setiap baris profil sekolah harus memiliki Label.");
      return;
    }

    if (faqItems.length === 0) {
      setError("Daftar FAQ minimal harus memiliki 1 pertanyaan.");
      return;
    }

    setSaving(true);
    try {
      const payload: CommunityLandingConfig = {
        schoolProfileLeft: leftFields,
        schoolProfileRight: rightFields,
        faqItems,
      };

      const res = await fetch("/api/admin/komunitas-belajar/landing-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Gagal menyimpan konfigurasi.");
      }

      notify("Pengaturan Profil Sekolah & FAQ berhasil disimpan!");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-ink/10 bg-white p-12 text-center text-sm text-ink/50">
        Memuat konfigurasi Profil Sekolah dan FAQ...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="section-kicker text-[#6048e8]/75">Landing Page Komunitas Belajar</p>
          <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
            Kelola Profil Sekolah & FAQ
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/55">
            Ubah data tabel Profil Sekolah (#profil-sekolah) dan daftar Tanya Jawab (#faq) yang ditampilkan pada portal publik Komunitas Belajar Guru.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/komunitas-belajar#profil-sekolah"
            target="_blank"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-ink/15 bg-white px-4 text-xs font-bold text-ink hover:border-[#6048e8] hover:text-[#6048e8] transition"
          >
            Lihat di Portal <ExternalLink size={15} />
          </Link>
          <button
            type="button"
            disabled={saving}
            onClick={saveAll}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#6048e8] px-5 text-xs font-bold text-white shadow-sm hover:bg-[#5039d1] disabled:opacity-50 transition"
          >
            <Save size={16} /> {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-800">
          <AlertCircle size={18} className="text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Tab Controls */}
      <div className="flex gap-2 border-b border-ink/10 pb-px">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`inline-flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition ${
            activeTab === "profile"
              ? "border-[#6048e8] text-[#6048e8]"
              : "border-transparent text-ink/55 hover:text-ink"
          }`}
        >
          <School size={18} /> Profil Sekolah ({leftFields.length + rightFields.length} Data)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("faq")}
          className={`inline-flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition ${
            activeTab === "faq"
              ? "border-[#6048e8] text-[#6048e8]"
              : "border-transparent text-ink/55 hover:text-ink"
          }`}
        >
          <HelpCircle size={18} /> FAQ / Bantuan ({faqItems.length} Pertanyaan)
        </button>
      </div>

      {/* TAB 1: PROFIL SEKOLAH */}
      {activeTab === "profile" && (
        <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink/10 pb-5">
            <div>
              <h2 className="font-display text-xl">Data Tabel Profil Sekolah</h2>
              <p className="mt-1 text-xs text-ink/50">
                Data ini ditampilkan pada bagian Profil Sekolah (#profil-sekolah) di landing page komunitas.
              </p>
            </div>
            {/* Sub Tabs for Columns */}
            <div className="inline-flex rounded-xl bg-ink/5 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setProfileColumn("left")}
                className={`rounded-lg px-4 py-2 transition ${
                  profileColumn === "left" ? "bg-white text-[#6048e8] shadow-sm" : "text-ink/60 hover:text-ink"
                }`}
              >
                Kolom Kiri ({leftFields.length})
              </button>
              <button
                type="button"
                onClick={() => setProfileColumn("right")}
                className={`rounded-lg px-4 py-2 transition ${
                  profileColumn === "right" ? "bg-white text-[#6048e8] shadow-sm" : "text-ink/60 hover:text-ink"
                }`}
              >
                Kolom Kanan ({rightFields.length})
              </button>
            </div>
          </div>

          {/* List of fields */}
          <div className="mt-6 space-y-3">
            {currentFields.map((field, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 rounded-xl border border-ink/10 bg-white p-3 hover:border-[#6048e8]/30 transition"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-ink/5 text-[11px] font-bold text-ink/50">
                  {idx + 1}
                </span>
                <div className="w-1/3">
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => updateField(idx, "label", e.target.value)}
                    placeholder="Nama Label (mis: NPSN)"
                    className="w-full rounded-lg border border-ink/15 px-3 py-2 text-xs font-bold text-ink outline-none focus:border-[#6048e8]"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => updateField(idx, "value", e.target.value)}
                    placeholder="Nilai (mis: 20326022)"
                    className="w-full rounded-lg border border-ink/15 px-3 py-2 text-xs text-ink/80 outline-none focus:border-[#6048e8]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeField(idx)}
                  className="rounded-lg p-2 text-ink/35 hover:bg-red-50 hover:text-red-600 transition"
                  title="Hapus baris"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-5">
            <button
              type="button"
              onClick={addField}
              className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[#6048e8]/40 bg-[#6048e8]/5 px-4 py-2 text-xs font-bold text-[#6048e8] hover:bg-[#6048e8]/10 transition"
            >
              <Plus size={15} /> Tambah Baris Baru
            </button>
            <button
              type="button"
              onClick={resetProfileColumn}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/40 hover:text-ink/70 transition"
            >
              <RotateCcw size={14} /> Reset Kolom ke Bawaan
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: FAQ */}
      {activeTab === "faq" && (
        <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink/10 pb-5">
            <div>
              <h2 className="font-display text-xl">Daftar Tanya Jawab (FAQ)</h2>
              <p className="mt-1 text-xs text-ink/50">
                Pertanyaan yang sering diajukan pada bagian Bantuan (#faq) di landing page komunitas.
              </p>
            </div>
            {!isAddingFaq && (
              <button
                type="button"
                onClick={() => setIsAddingFaq(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#6048e8] px-4 py-2 text-xs font-bold text-white hover:bg-[#5039d1] transition"
              >
                <Plus size={16} /> Tambah Pertanyaan Baru
              </button>
            )}
          </div>

          {/* Form to add FAQ */}
          {isAddingFaq && (
            <form onSubmit={handleAddFaq} className="mt-5 rounded-xl border border-[#6048e8]/30 bg-[#6048e8]/[0.03] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#6048e8]">Formulir Tambah Pertanyaan</h3>
                <button
                  type="button"
                  onClick={() => setIsAddingFaq(false)}
                  className="text-xs text-ink/45 hover:text-ink"
                >
                  Batal
                </button>
              </div>
              <div>
                <label className="block text-xs font-bold text-ink/70 mb-1.5">Pertanyaan</label>
                <input
                  type="text"
                  value={newFaqQuestion}
                  onChange={(e) => setNewFaqQuestion(e.target.value)}
                  placeholder="Contoh: Bagaimana cara mengakses materi kombel?"
                  className="w-full rounded-xl border border-ink/15 px-3.5 py-2 text-xs font-semibold outline-none focus:border-[#6048e8]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink/70 mb-1.5">Jawaban</label>
                <textarea
                  rows={3}
                  value={newFaqAnswer}
                  onChange={(e) => setNewFaqAnswer(e.target.value)}
                  placeholder="Jawaban penjelasan yang mudah dimengerti guru..."
                  className="w-full rounded-xl border border-ink/15 px-3.5 py-2 text-xs text-ink/80 outline-none focus:border-[#6048e8]"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingFaq(false)}
                  className="rounded-xl border border-ink/15 px-4 py-2 text-xs font-semibold text-ink/65 hover:bg-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#6048e8] px-5 py-2 text-xs font-bold text-white hover:bg-[#5039d1]"
                >
                  Simpan ke Daftar FAQ
                </button>
              </div>
            </form>
          )}

          {/* List of FAQs */}
          <div className="mt-6 space-y-3">
            {faqItems.map((item, index) => (
              <div
                key={item.id}
                className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm hover:border-ink/20 transition"
              >
                {editingFaqId === item.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      defaultValue={item.question}
                      id={`admin-edit-q-${item.id}`}
                      className="w-full rounded-lg border border-ink/15 px-3 py-2 text-xs font-bold text-ink outline-none focus:border-[#6048e8]"
                    />
                    <textarea
                      rows={3}
                      defaultValue={item.answer}
                      id={`admin-edit-a-${item.id}`}
                      className="w-full rounded-lg border border-ink/15 px-3 py-2 text-xs text-ink/80 outline-none focus:border-[#6048e8]"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingFaqId(null)}
                        className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink/60"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const q = (document.getElementById(`admin-edit-q-${item.id}`) as HTMLInputElement)?.value;
                          const a = (document.getElementById(`admin-edit-a-${item.id}`) as HTMLTextAreaElement)?.value;
                          if (q && a) handleUpdateFaq(item.id, q, a);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#6048e8] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#5039d1]"
                      >
                        <Check size={14} /> Simpan Perubahan Item
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-ink/5 text-[11px] font-bold text-ink/50">
                        {index + 1}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-[#173f70]">{item.question}</h4>
                        <p className="mt-1 text-xs leading-relaxed text-ink/65">{item.answer}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveFaq(index, "up")}
                        disabled={index === 0}
                        className="rounded-lg p-1.5 text-ink/35 hover:bg-ink/5 hover:text-ink disabled:opacity-30"
                        title="Geser ke atas"
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveFaq(index, "down")}
                        disabled={index === faqItems.length - 1}
                        className="rounded-lg p-1.5 text-ink/35 hover:bg-ink/5 hover:text-ink disabled:opacity-30"
                        title="Geser ke bawah"
                      >
                        <ArrowDown size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingFaqId(item.id)}
                        className="rounded-lg p-1.5 text-ink/35 hover:bg-ink/5 hover:text-[#6048e8]"
                        title="Edit Pertanyaan"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFaq(item.id)}
                        className="rounded-lg p-1.5 text-ink/35 hover:bg-red-50 hover:text-red-600"
                        title="Hapus Pertanyaan"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-end border-t border-ink/10 pt-5">
            <button
              type="button"
              onClick={resetAllFaq}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/40 hover:text-ink/70 transition"
            >
              <RotateCcw size={14} /> Kembalikan Semua FAQ ke Bawaan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

