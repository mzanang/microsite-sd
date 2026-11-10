"use client";

import { Accessibility, BookOpen, Circle, Minus, Moon, MousePointer2, Plus, RotateCcw, Sun, Type, Volume2, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type AccessibilityTheme = "light" | "dark";
type AccessibilityWidgetProps = { theme: AccessibilityTheme; onThemeChange: (theme: AccessibilityTheme) => void };
type ContrastMode = "normal" | "medium" | "high";
type SavedPreferences = { fontScale?: number; contrast?: ContrastMode; largeCursor?: boolean; readingGuide?: boolean; dyslexiaFont?: boolean; theme?: AccessibilityTheme };

const storageKey = "kb-public-accessibility";

export function AccessibilityWidget({ theme, onThemeChange }: AccessibilityWidgetProps) {
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [contrast, setContrast] = useState<ContrastMode>("normal");
  const [largeCursor, setLargeCursor] = useState(false);
  const [readingGuide, setReadingGuide] = useState(false);
  const [screenReader, setScreenReader] = useState(false);
  const [dyslexiaFont, setDyslexiaFont] = useState(false);
  const [guideY, setGuideY] = useState(0);
  const pointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "null") as SavedPreferences | null;
      if (saved?.fontScale) setFontScale(Math.min(1.3, Math.max(.85, saved.fontScale)));
      if (saved?.contrast === "medium" || saved?.contrast === "high") setContrast(saved.contrast);
      if (typeof saved?.largeCursor === "boolean") setLargeCursor(saved.largeCursor);
      if (typeof saved?.readingGuide === "boolean") setReadingGuide(saved.readingGuide);
      if (typeof saved?.dyslexiaFont === "boolean") setDyslexiaFont(saved.dyslexiaFont);
      if (saved?.theme === "light" || saved?.theme === "dark") onThemeChange(saved.theme);
    } catch {
      setContrast("normal");
    } finally {
      setHydrated(true);
    }
  }, [onThemeChange]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest(".kb-accessibility-widget")) pointerRef.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.style.fontSize = `${fontScale * 100}%`;
    document.documentElement.dataset.kbContrast = contrast;
    if (largeCursor) document.documentElement.dataset.kbLargeCursor = "true";
    else delete document.documentElement.dataset.kbLargeCursor;
    if (dyslexiaFont) document.documentElement.dataset.kbDyslexia = "true";
    else delete document.documentElement.dataset.kbDyslexia;
    window.localStorage.setItem(storageKey, JSON.stringify({ fontScale, contrast, largeCursor, readingGuide, dyslexiaFont, theme }));
    return () => { document.documentElement.style.fontSize = ""; };
  }, [fontScale, contrast, largeCursor, readingGuide, dyslexiaFont, theme, hydrated]);

  useEffect(() => {
    if (!readingGuide) return;
    const move = (event: PointerEvent) => setGuideY(event.clientY);
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [readingGuide]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function toggleScreenReader() {
    if (!("speechSynthesis" in window)) return;
    if (screenReader) {
      window.speechSynthesis.cancel();
      setScreenReader(false);
      return;
    }
    const selectedText = window.getSelection()?.toString().replace(/\s+/g, " ").trim();
    const hoveredElement = document.elementFromPoint(pointerRef.current.x, pointerRef.current.y);
    const readableBlock = hoveredElement?.closest("h1, h2, h3, h4, p, a, button, li, dt, dd") as HTMLElement | null;
    const text = (selectedText || readableBlock?.innerText || hoveredElement?.textContent || "").replace(/\s+/g, " ").replace(/\u2022|\u00b7/g, ". ").trim();
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(`${text}.`);
    utterance.lang = "id-ID";
    utterance.rate = .9;
    utterance.pitch = 1;
    const indonesianVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("id") || voice.name.toLowerCase().includes("indonesia"));
    if (indonesianVoice) utterance.voice = indonesianVoice;
    utterance.onend = () => setScreenReader(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setScreenReader(true);
  }

  function reset() {
    window.speechSynthesis?.cancel();
    setFontScale(1);
    setContrast("normal");
    setLargeCursor(false);
    setReadingGuide(false);
    setScreenReader(false);
    setDyslexiaFont(false);
    onThemeChange("light");
    window.localStorage.removeItem(storageKey);
  }

  const themeActionLabel = theme === "dark" ? "Tema Terang" : "Tema Gelap";
  const themeActionIcon = theme === "dark" ? <Sun size={25} aria-hidden="true" /> : <Moon size={25} aria-hidden="true" />;
  const accessibilityActive = open || theme === "dark" || fontScale !== 1 || contrast !== "normal" || largeCursor || readingGuide || screenReader || dyslexiaFont;
  const Option = ({ active, icon, label, onClick }: { active?: boolean; icon: ReactNode; label: string; onClick: () => void }) => <button type="button" aria-pressed={active} onClick={onClick} className={`kb-accessibility-option flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-center text-sm font-semibold transition ${active ? "border-[#1264c5] bg-[#edf4ff] text-[#1264c5]" : "border-[#cbd5e1] bg-white text-[#2f3540] hover:border-[#1264c5] hover:bg-[#f8fbff]"}`}>{icon}<span>{label}</span></button>;

  return <div className="kb-accessibility-widget">
    <button type="button" onClick={() => setOpen(true)} className={`kb-accessibility-trigger fixed bottom-5 left-5 z-[100] inline-flex min-h-12 items-center gap-2 rounded-full px-5 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(18,100,197,.28)] transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#8cc7ff] max-sm:h-12 max-sm:w-12 max-sm:justify-center max-sm:px-0 ${accessibilityActive ? "bg-[#16834a] hover:bg-[#116b3c]" : "bg-[#1264c5] hover:bg-[#0d4e9b]"}`} aria-label="Buka pengaturan aksesibilitas"><Accessibility size={21} aria-hidden="true" /><span className="hidden sm:inline">Aksesibilitas</span>{accessibilityActive && <span className="absolute right-1 top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-[#b7f7c8] ring-2 ring-[#16834a]" aria-hidden="true" />}</button>
    {readingGuide && <div className="kb-reading-guide" style={{ top: `${guideY}px` }} aria-hidden="true" />}
    {open && <div className="fixed inset-x-0 bottom-0 top-[9rem] z-[90] bg-black/25" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><aside className="fixed bottom-0 left-4 top-[9rem] h-[calc(100dvh-9rem)] w-[min(92vw,500px)] overflow-hidden rounded-t-2xl bg-[#f8f8f8] shadow-[0_24px_60px_rgba(15,23,42,.28)] max-sm:left-2 max-sm:top-[9rem] max-sm:h-[calc(100dvh-9rem)] max-sm:w-[calc(100vw-1rem)]" role="dialog" aria-modal="true" aria-labelledby="accessibility-title"><div className="flex items-center justify-between gap-4 rounded-t-2xl bg-[#1264c5] px-5 py-4 text-white"><div className="flex items-center gap-3"><h2 id="accessibility-title" className="text-lg font-extrabold text-white">Pengaturan Aksesibilitas</h2><span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#1264c5]">Aktif</span></div><button type="button" onClick={() => setOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" aria-label="Tutup pengaturan aksesibilitas"><X size={21} /></button></div><div className="space-y-4 p-5"><section><h3 className="text-sm font-extrabold text-[#2f3540]">Sesuaikan Ukuran</h3><div className="mt-3 rounded-2xl border border-[#cbd5e1] bg-white px-5 py-4 text-center"><div className="flex items-center justify-center gap-2 text-base font-semibold text-[#2f3540]"><Type size={22} aria-hidden="true" />Huruf</div><div className="mt-4 flex items-center justify-center gap-5"><button type="button" onClick={() => setFontScale((value) => Math.max(.85, Number((value - .05).toFixed(2))))} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#9ca3af] text-[#2f3540]" aria-label="Perkecil ukuran huruf"><Minus size={17} /></button><span className="min-w-14 text-sm font-bold text-[#2f3540]">{Math.round(fontScale * 100)}%</span><button type="button" onClick={() => setFontScale((value) => Math.min(1.3, Number((value + .05).toFixed(2))))} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#9ca3af] text-[#2f3540]" aria-label="Perbesar ukuran huruf"><Plus size={17} /></button></div></div></section><section className="border-t border-[#d6d9df] pt-4"><h3 className="text-sm font-extrabold text-[#2f3540]">Kontras Layar</h3><div className="mt-3 grid grid-cols-2 gap-3"><Option active={contrast === "normal"} icon={<Circle size={25} aria-hidden="true" />} label="Normal" onClick={() => setContrast("normal")} /><Option active={contrast === "medium"} icon={<Circle size={25} aria-hidden="true" />} label="Sedang" onClick={() => setContrast("medium")} /><Option active={contrast === "high"} icon={<Circle size={25} aria-hidden="true" />} label="Tinggi" onClick={() => setContrast("high")} /><Option icon={themeActionIcon} label={themeActionLabel} onClick={() => { onThemeChange(theme === "dark" ? "light" : "dark"); }} /></div></section><section className="border-t border-[#d6d9df] pt-4"><h3 className="text-sm font-extrabold text-[#2f3540]">Bantuan Visual</h3><div className="mt-3 grid grid-cols-2 gap-3"><Option active={largeCursor} icon={<MousePointer2 size={25} aria-hidden="true" />} label="Kursor Besar" onClick={() => setLargeCursor((value) => !value)} /><Option active={readingGuide} icon={<BookOpen size={25} aria-hidden="true" />} label="Panduan Membaca" onClick={() => setReadingGuide((value) => !value)} /></div></section><section className="border-t border-[#d6d9df] pt-4"><h3 className="text-sm font-extrabold text-[#2f3540]">Bantuan Membaca</h3><div className="mt-3 grid grid-cols-2 gap-3"><Option active={screenReader} icon={<Volume2 size={25} aria-hidden="true" />} label="Pembaca Layar" onClick={toggleScreenReader} /><Option active={dyslexiaFont} icon={<Type size={25} aria-hidden="true" />} label="Font Disleksia" onClick={() => setDyslexiaFont((value) => !value)} /></div></section><button type="button" onClick={reset} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#9b9b9b] px-4 text-sm font-bold text-white hover:bg-[#777] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1264c5]"><RotateCcw size={17} aria-hidden="true" />Atur Ulang</button></div></aside></div>}
  </div>;
}
