"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  Edit2,
  HelpCircle,
  Plus,
  RotateCcw,
  School,
  Trash2,
  X,
} from "lucide-react";
import type {
  FaqItem,
  SchoolProfileField,
} from "@/lib/community-landing-config";
import {
  defaultFaqItems,
  defaultSchoolProfileLeft,
  defaultSchoolProfileRight,
} from "@/lib/community-landing-config";

// ==========================================
// PROFIL SEKOLAH MODAL
// ==========================================
export function SchoolProfileModal({
  isOpen,
  onClose,
  initialLeft,
  initialRight,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialLeft: SchoolProfileField[];
  initialRight: SchoolProfileField[];
  onSave: (left: SchoolProfileField[], right: SchoolProfileField[]) => Promise<void>;
}) {
  const [left, setLeft] = useState<SchoolProfileField[]>(initialLeft);
  const [right, setRight] = useState<SchoolProfileField[]>(initialRight);
  const [activeTab, setActiveTab] = useState<"left" | "right">("left");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const currentList = activeTab === "left" ? left : right;
  const setList = activeTab === "left" ? setLeft : setRight;

  function updateField(index: number, key: "label" | "value", val: string) {
    const next = [...currentList];
    next[index] = { ...next[index], [key]: val };
    setList(next);
  }

  function addField() {
    setList([...currentList, { label: "", value: "" }]);
  }

  function removeField(index: number) {
    setList(currentList.filter((_, i) => i !== index));
  }

  function resetToDefault() {
    if (window.confirm("Kembalikan data profil ke pengaturan awal bawaan?")) {
      if (activeTab === "left") setLeft([...defaultSchoolProfileLeft]);
      else setRight([...defaultSchoolProfileRight]);
    }
  }

  async function handleSave() {
    setError("");
    // Basic validation
    const emptyLeft = left.some((f) => !f.label.trim());
    const emptyRight = right.some((f) => !f.label.trim());
    if (emptyLeft || emptyRight) {
      setError("Setiap kolom profil harus memiliki Label.");
      return;
    }

    setSaving(true);
    try {
      await onSave(left, right);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan perubahan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-[#f8fbff]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#005bbf]/10 text-[#005bbf]">
              <School size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#173f70]">Edit Profil Sekolah</h3>
              <p className="text-xs text-slate-500">Sesuaikan tabel data profil sekolah di halaman komunitas.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-6 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab("left")}
            className={`border-b-2 px-4 py-2.5 text-sm font-bold transition ${
              activeTab === "left"
                ? "border-[#005bbf] text-[#005bbf]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Kolom Kiri ({left.length} Data)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("right")}
            className={`border-b-2 px-4 py-2.5 text-sm font-bold transition ${
              activeTab === "right"
                ? "border-[#005bbf] text-[#005bbf]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Kolom Kanan ({right.length} Data)
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2.5">
            {currentList.map((field, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm hover:border-[#005bbf]/40 transition"
              >
                <div className="w-1/3">
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => updateField(idx, "label", e.target.value)}
                    placeholder="Nama Label"
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-[#005bbf]"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => updateField(idx, "value", e.target.value)}
                    placeholder="Nilai data"
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 outline-none focus:border-[#005bbf]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeField(idx)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                  title="Hapus baris"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={addField}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[#005bbf]/40 bg-[#005bbf]/5 px-3 py-2 text-xs font-bold text-[#005bbf] hover:bg-[#005bbf]/10 transition"
            >
              <Plus size={15} /> Tambah Baris
            </button>
            <button
              type="button"
              onClick={resetToDefault}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 transition"
            >
              <RotateCcw size={14} /> Reset ke Bawaan
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-white transition"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-xl bg-[#005bbf] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#004a9e] disabled:opacity-50 transition"
          >
            {saving ? "Menyimpan..." : "Simpan Profil Sekolah"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// FAQ CRUD MODAL
// ==========================================
export function FaqCrudModal({
  isOpen,
  onClose,
  initialItems,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialItems: FaqItem[];
  onSave: (items: FaqItem[]) => Promise<void>;
}) {
  const [items, setItems] = useState<FaqItem[]>(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  function handleAddFaq(e: React.FormEvent) {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) {
      setError("Pertanyaan dan Jawaban wajib diisi.");
      return;
    }
    const newItem: FaqItem = {
      id: `faq-${Date.now()}`,
      question: newQuestion.trim(),
      answer: newAnswer.trim(),
    };
    setItems([...items, newItem]);
    setNewQuestion("");
    setNewAnswer("");
    setShowAddForm(false);
    setError("");
  }

  function handleUpdateItem(id: string, question: string, answer: string) {
    setItems(
      items.map((item) => (item.id === id ? { ...item, question, answer } : item))
    );
    setEditingId(null);
  }

  function handleDeleteItem(id: string) {
    if (window.confirm("Hapus pertanyaan ini dari FAQ?")) {
      setItems(items.filter((item) => item.id !== id));
    }
  }

  function moveItem(index: number, direction: "up" | "down") {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === items.length - 1) return;
    const next = [...items];
    const target = direction === "up" ? index - 1 : index + 1;
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
  }

  function resetToDefault() {
    if (window.confirm("Kembalikan semua daftar FAQ ke bawaan sekolah?")) {
      setItems([...defaultFaqItems]);
    }
  }

  async function handleSave() {
    setError("");
    if (items.length === 0) {
      setError("Minimal sediakan 1 pertanyaan pada FAQ.");
      return;
    }
    setSaving(true);
    try {
      await onSave(items);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan FAQ.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-[#f8fbff]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#005bbf]/10 text-[#005bbf]">
              <HelpCircle size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#173f70]">Kelola FAQ (Tanya Jawab)</h3>
              <p className="text-xs text-slate-500">Tambah, ubah, urutkan, atau hapus pertanyaan bantuan.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Add New Section */}
          {showAddForm ? (
            <form onSubmit={handleAddFaq} className="rounded-xl border border-[#005bbf]/30 bg-[#f8fbff] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#005bbf]">Tambah Pertanyaan Baru</span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Batal
                </button>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Pertanyaan</label>
                <input
                  type="text"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Contoh: Bagaimana cara mengakses ruang kombel?"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#005bbf]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Jawaban</label>
                <textarea
                  rows={3}
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  placeholder="Jawaban penjelasan..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-[#005bbf]"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#005bbf] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#004a9e]"
                >
                  Tambahkan ke FAQ
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#005bbf]/40 bg-[#005bbf]/5 py-3 text-xs font-bold text-[#005bbf] hover:bg-[#005bbf]/10 transition"
            >
              <Plus size={16} /> Tambah Pertanyaan FAQ Baru
            </button>
          )}

          {/* List of FAQ items */}
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 transition"
              >
                {editingId === item.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      defaultValue={item.question}
                      id={`edit-q-${item.id}`}
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-[#005bbf]"
                    />
                    <textarea
                      rows={3}
                      defaultValue={item.answer}
                      id={`edit-a-${item.id}`}
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-[#005bbf]"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const q = (document.getElementById(`edit-q-${item.id}`) as HTMLInputElement)?.value;
                          const a = (document.getElementById(`edit-a-${item.id}`) as HTMLTextAreaElement)?.value;
                          if (q && a) handleUpdateItem(item.id, q, a);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#005bbf] px-3 py-1 text-xs font-bold text-white hover:bg-[#004a9e]"
                      >
                        <Check size={14} /> Simpan Item
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">
                          {index + 1}
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-[#173f70]">{item.question}</h4>
                          <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.answer}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveItem(index, "up")}
                          disabled={index === 0}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                          title="Geser ke atas"
                        >
                          <ArrowUp size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(index, "down")}
                          disabled={index === items.length - 1}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                          title="Geser ke bawah"
                        >
                          <ArrowDown size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(item.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#005bbf]"
                          title="Edit"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          title="Hapus"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={resetToDefault}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 transition"
            >
              <RotateCcw size={14} /> Reset Semua FAQ ke Bawaan
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-white transition"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-xl bg-[#005bbf] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#004a9e] disabled:opacity-50 transition"
          >
            {saving ? "Menyimpan..." : "Simpan FAQ"}
          </button>
        </div>
      </div>
    </div>
  );
}

