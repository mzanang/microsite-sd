"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const titleLetters = [
  { character: "P", x: 48 },
  { character: "O", x: 130 },
  { character: "R", x: 212 },
  { character: "T", x: 294 },
  { character: "A", x: 376 },
  { character: "L", x: 458 },
  { character: "S", x: 552 },
  { character: "E", x: 622 },
  { character: "K", x: 690 },
  { character: "O", x: 758 },
  { character: "L", x: 826 },
  { character: "A", x: 894 },
  { character: "H", x: 962 },
];

export function PublicSplash() {
  const [pageReady, setPageReady] = useState(false);
  const [titleReady, setTitleReady] = useState(false);
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const markPageReady = () => setPageReady(true);

    if (document.readyState === "complete") markPageReady();
    else window.addEventListener("load", markPageReady, { once: true });

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTitleReady(true);
    }

    return () => window.removeEventListener("load", markPageReady);
  }, []);

  useEffect(() => {
    if (!pageReady || !titleReady) return;

    const exitTimer = window.setTimeout(() => setLeaving(true), 2200);
    const removeTimer = window.setTimeout(() => setVisible(false), 2760);
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);
    };
  }, [pageReady, titleReady]);

  if (!visible) return null;

  return (
    <div className={`public-splash${leaving ? " is-leaving" : ""}`} role="status" aria-label="Menyiapkan portal sekolah">
      <svg className="splash-top-wave" viewBox="0 0 1440 260" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 0h1440v92c-186 74-358 82-540 18C683 41 466 24 300 106 177 166 86 164 0 122V0Z" />
      </svg>

      <div className="splash-bubbles" aria-hidden="true">
        <span className="splash-bubble bubble-left-1" />
        <span className="splash-bubble bubble-left-2" />
        <span className="splash-bubble bubble-right-1" />
        <span className="splash-bubble bubble-right-2" />
      </div>

      <div className="splash-particles" aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => <span className={`splash-particle particle-${index + 1}`} key={index} />)}
      </div>

      <div className="bottom-waves" aria-hidden="true">
        <svg className="wave wave-1" viewBox="0 0 1440 320" preserveAspectRatio="xMidYMid slice"><path d="M0 150c172 132 318 137 506 66 223-84 395-136 610-78 135 36 228 17 324-52v234H0V150Z" /></svg>
        <svg className="wave wave-2" viewBox="0 0 1440 320" preserveAspectRatio="xMidYMid slice"><path d="M0 190c168 88 318 114 494 59 211-66 378-160 598-102 139 36 240 26 348-55v228H0V190Z" /></svg>
        <svg className="wave wave-3" viewBox="0 0 1440 320" preserveAspectRatio="xMidYMid slice"><path d="M0 224c160 65 295 84 456 42 226-59 413-172 614-102 160 55 250 30 370-64v220H0V224Z" /></svg>
        <svg className="wave wave-4" viewBox="0 0 1440 320" preserveAspectRatio="xMidYMid slice">
          <defs><linearGradient id="splashWaveFrontGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#245f9e" /><stop offset="55%" stopColor="#1d5794" /><stop offset="100%" stopColor="#15477d" /></linearGradient></defs>
          <path d="M0 266c142 42 277 48 422 6 248-71 425-177 618-111 160 54 260 27 400-74v233H0V266Z" />
          <path className="wave-highlight" d="M0 266c142 42 277 48 422 6 248-71 425-177 618-111 160 54 260 27 400-74" />
          <path className="wave-accent" d="M0 287c142 42 277 48 422 6 248-71 425-177 618-111 160 54 260 27 400-74" />
        </svg>
      </div>

      <span className="splash-center-glow" aria-hidden="true" />

      <div className="splash-content">
        <div className="splash-logo-stage">
          <span className="splash-logo-glow" aria-hidden="true" />
          <svg className="splash-loader" viewBox="0 0 360 360" aria-hidden="true">
            <circle className="splash-loader-ring splash-loader-dash" cx="180" cy="180" r="168" pathLength="360" />
            <circle className="splash-loader-ring splash-loader-spin" cx="180" cy="180" r="148" pathLength="360" />
          </svg>
          <Image className="splash-logo" src="/logo.png" alt="" priority width={96} height={96} sizes="96px" />
        </div>
        <p className="splash-school-name">SD NEGERI DUKUHWARU 01</p>
        <p className="splash-subtitle">Administrasi Kunjungan Sekolah</p>

        <svg className="guestbook-title-svg portal-title-svg" viewBox="0 0 1010 120" role="img" aria-label="PORTAL SEKOLAH">
          <defs><linearGradient id="portalTitleGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#48B8FF" /><stop offset="40%" stopColor="#FFFFFF" /><stop offset="75%" stopColor="#81D8FF" /><stop offset="100%" stopColor="#4CA9FF" /></linearGradient></defs>
          {titleLetters.map((letter, index) => (
            <text className={`guestbook-letter letter-${index + 1}`} key={`${letter.character}-${index}`} x={letter.x} y="86" textAnchor="middle" fill="none" stroke="url(#portalTitleGradient)" pathLength="360" onAnimationEnd={index === titleLetters.length - 1 ? (event) => { if (event.animationName === "guestbook-draw") setTitleReady(true); } : undefined}>{letter.character}</text>
          ))}
          <path className="guestbook-red-highlight highlight-left" d="M16 44v35" />
          <path className="guestbook-red-highlight highlight-right" d="M994 42v35" />
        </svg>
        <div className="title-light-line" aria-hidden="true" />
        <p className="splash-status">Menghubungkan ke server...</p>
        <div className="splash-dots" aria-hidden="true"><span /><span /><span /></div>
      </div>
    </div>
  );
}
