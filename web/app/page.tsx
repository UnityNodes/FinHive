"use client";

import { motion } from "motion/react";
import { ArrowRightCircle, Zap, LockKeyhole, Fingerprint, Menu } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { MobileMenu } from "@/components/landing/mobile-menu";

const NAV_LINKS = [
  { href: "#proof", label: "Vault" },
  { href: "#how", label: "Workflow" },
  { href: "#agent", label: "Agent" },
  { href: "https://github.com/UnityNodes/FinHive", label: "Source" },
  { href: "https://github.com/UnityNodes/FinHive#readme", label: "Docs" },
];

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: EASE },
  }),
};

const HEADING_FONT = "'Helvetica Now Display Bold', 'Inter', 'Helvetica Neue', Helvetica, sans-serif";
const TEXT = "#ECE9F6";
const ACCENT = "#7342E2";
const LOGIN_BG = "#F2F2EE";
const LOGIN_TEXT = "#192837";

const iconStyle: React.CSSProperties = {
  display: "inline",
  verticalAlign: "middle",
  position: "relative",
  top: -2,
  margin: "0 4px",
  color: TEXT,
};

export default function Landing() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative", minHeight: "100vh", color: TEXT, fontFamily: "var(--font-body), Inter, sans-serif" }}>
      <header
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: 1280,
          margin: "0 auto",
          padding: "20px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link href="/" aria-label="FinHive" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <img src="/icon.png" alt="" width={32} height={32} />
          <span style={{ fontFamily: HEADING_FONT, fontSize: 22, fontWeight: 900, letterSpacing: "-0.01em" }}>
            <span style={{ color: ACCENT }}>Fin</span>
            <span style={{ color: "#f5a623" }}>Hive</span>
          </span>
        </Link>

        <nav className="hidden md:flex" style={{ alignItems: "center", gap: 32 }}>
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              style={{ fontSize: 14, fontWeight: 500, color: TEXT, opacity: 0.85, transition: "opacity 0.2s", textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.85")}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex" style={{ alignItems: "center", gap: 12 }}>
          <motion.div whileHover={{ boxShadow: "0 8px 28px rgba(115,66,226,0.5)" }} whileTap={{ scale: 0.95 }} style={{ borderRadius: 999 }}>
            <Link
              href="/vendor/invoices/new"
              style={{
                display: "inline-block",
                background: ACCENT,
                color: "#ffffff",
                fontSize: 14,
                fontWeight: 600,
                padding: "10px 20px",
                borderRadius: 999,
                textDecoration: "none",
              }}
            >
              Start For Free
            </Link>
          </motion.div>
          <motion.div whileTap={{ scale: 0.95 }} style={{ borderRadius: 999 }}>
            <a
              href="https://github.com/UnityNodes/FinHive"
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                background: LOGIN_BG,
                color: LOGIN_TEXT,
                fontSize: 14,
                fontWeight: 600,
                padding: "10px 20px",
                borderRadius: 999,
                textDecoration: "none",
              }}
            >
              Sign In
            </a>
          </motion.div>
        </div>

        <button
          className="md:hidden"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          style={{ background: "transparent", border: "none", color: TEXT, cursor: "pointer", padding: 4 }}
        >
          <Menu size={24} />
        </button>
      </header>

      <MobileMenu open={open} onClose={() => setOpen(false)} />

      <section
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: 1280,
          margin: "0 auto",
          paddingTop: "clamp(40px, 8vw, 72px)",
          paddingBottom: 48,
          paddingLeft: 20,
          paddingRight: 20,
        }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            style={{
              fontFamily: HEADING_FONT,
              fontSize: "clamp(1.65rem, 5vw, 3rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.01em",
              color: TEXT,
              fontWeight: 900,
              margin: 0,
              marginBottom: 24,
            }}
          >
            <Zap size={24} style={{ ...iconStyle, marginLeft: 0 }} /> Lock Down Your <LockKeyhole size={24} style={iconStyle} /> Passwords with Ironclad Security <Fingerprint size={24} style={{ ...iconStyle, margin: 0, marginLeft: 6 }} />
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            style={{
              fontFamily: "var(--font-body), Inter, sans-serif",
              fontSize: "clamp(0.9rem, 2.5vw, 1.1rem)",
              color: TEXT,
              opacity: 0.8,
              maxWidth: 560,
              margin: "0 auto",
              lineHeight: 1.65,
            }}
          >
            Zero stress, total control. FinHive keeps your team covered with cryptographic privacy, one-click approvals, and pro-grade tools for your non-stop business.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            style={{ marginTop: 36, display: "flex", justifyContent: "center" }}
          >
            <motion.div whileHover={{ scale: 1.04, filter: "brightness(1.1)" }} whileTap={{ scale: 0.96 }} style={{ display: "inline-block" }}>
              <Link
                href="/vendor/invoices/new"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 32,
                  background: ACCENT,
                  color: "#ffffff",
                  fontFamily: "var(--font-body), Inter, sans-serif",
                  fontSize: "clamp(0.9rem, 2vw, 1rem)",
                  fontWeight: 600,
                  padding: "17px 24px",
                  borderRadius: 50,
                  minWidth: 210,
                  boxShadow: "0 4px 24px rgba(115,66,226,0.28)",
                  textDecoration: "none",
                }}
              >
                Get It Free
                <ArrowRightCircle size={20} />
              </Link>
            </motion.div>
          </motion.div>

          <p
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: 12,
              color: TEXT,
              opacity: 0.55,
              marginTop: 28,
            }}
          >
            <span style={{ color: "#5ee6a0" }}>●</span> live on Canton 3.5.1 · finhive.unitynodes.com
          </p>
        </div>
      </section>
    </div>
  );
}
