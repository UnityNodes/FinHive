"use client";

import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import Link from "next/link";

const links = [
  { href: "/#proof", label: "Vault" },
  { href: "/#how", label: "Workflow" },
  { href: "/#agent", label: "Agent" },
  { href: "https://github.com/UnityNodes/FinHive", label: "Source" },
  { href: "https://github.com/UnityNodes/FinHive#readme", label: "Docs" },
];

const ACCENT = "#7342E2";
const LOGIN_BG = "#F2F2EE";
const SHEET_BG = "#CFC8C5";
const INK = "#192837";

const ENTER_EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];
const EXIT_EASE = [0.55, 0, 1, 0.45] as [number, number, number, number];

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            style={{ position: "fixed", inset: 0, background: "rgba(25,40,55,0.35)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", zIndex: 60 }}
          />
          <motion.aside
            key="sheet"
            initial={{ x: "100%" }}
            animate={{ x: 0, transition: { duration: 0.45, ease: ENTER_EASE } }}
            exit={{ x: "100%", transition: { duration: 0.35, ease: EXIT_EASE } }}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              width: "min(88vw, 360px)",
              height: "100dvh",
              background: SHEET_BG,
              color: INK,
              boxShadow: "-12px 0 48px rgba(25,40,55,0.18)",
              zIndex: 70,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <img src="/icon.png" alt="" width={28} height={28} />
                <span style={{ fontFamily: "'Helvetica Now Display Bold', 'Inter', sans-serif", fontSize: 22, fontWeight: 900, letterSpacing: "-0.01em" }}>
                  <span style={{ color: ACCENT }}>Fin</span><span style={{ color: "#f5a623" }}>Hive</span>
                </span>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                aria-label="Close menu"
                style={{ width: 40, height: 40, borderRadius: 999, display: "grid", placeItems: "center", background: "rgba(25,40,55,0.1)", border: "none", cursor: "pointer", color: INK }}
              >
                <X size={20} />
              </motion.button>
            </div>
            <div style={{ height: 1, background: "rgba(25,40,55,0.12)", margin: "0 24px" }} />
            <nav style={{ display: "flex", flexDirection: "column", gap: 4, padding: "20px 16px", flex: 1 }}>
              {links.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ x: 24, opacity: 0 }}
                  animate={{ x: 0, opacity: 1, transition: { delay: 0.18 + i * 0.07, duration: 0.4 } }}
                  exit={{ opacity: 0 }}
                >
                  <Link
                    href={l.href}
                    onClick={onClose}
                    style={{
                      display: "block",
                      padding: "12px 16px",
                      borderRadius: 12,
                      fontSize: "1.1rem",
                      color: INK,
                      textDecoration: "none",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.06)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
            </nav>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 20px 28px" }}>
              <Link
                href="/vendor/invoices/new"
                onClick={onClose}
                style={{
                  display: "block",
                  textAlign: "center",
                  background: ACCENT,
                  color: "#ffffff",
                  padding: "14px 16px",
                  borderRadius: 999,
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  textDecoration: "none",
                }}
              >
                Start For Free
              </Link>
              <a
                href="https://github.com/UnityNodes/FinHive"
                target="_blank"
                rel="noreferrer"
                onClick={onClose}
                style={{
                  display: "block",
                  textAlign: "center",
                  background: LOGIN_BG,
                  color: INK,
                  padding: "14px 16px",
                  borderRadius: 999,
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  textDecoration: "none",
                }}
              >
                Sign In
              </a>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
