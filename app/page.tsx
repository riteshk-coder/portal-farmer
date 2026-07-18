"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconArrowRight,
  IconSearch,
  IconShoppingCart,
  IconChartBar,
  IconShield,
  IconX,
  IconCheck,
  IconArrowRightCircle,
  IconLeaf,
  IconUser,
  IconPhone
} from "@tabler/icons-react";
import { Button } from "@/components/ui/Button";

export default function BuyerPortalIntroPage() {
  const router = useRouter();
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", company: "", phone: "" });

  const featuresSectionRef = useRef<HTMLDivElement>(null);

  const handleExplore = () => {
    featuresSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:8000/auth/contact-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (!res.ok) {
        throw new Error("Failed to submit inquiry.");
      }
      setDemoSubmitted(true);
      setTimeout(() => {
        setIsDemoModalOpen(false);
        setDemoSubmitted(false);
        setFormData({ name: "", email: "", company: "", phone: "" });
      }, 2500);
    } catch (err) {
      alert("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#030e0d] text-slate-100 flex flex-col font-sans relative overflow-x-hidden selection:bg-emerald-500/20">
      {/* Decorative background glow blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden>
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute bottom-[20%] left-[-20%] w-[500px] h-[500px] rounded-full bg-teal-500/5 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#030e0d]/90 backdrop-blur-md border-b border-emerald-950/60 transition-all select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer animate-fade-in" onClick={() => router.push("/")}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-950/40 border border-emerald-500/25">
              <IconLeaf className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="flex items-center text-xl font-bold tracking-tight">
              <span className="text-white">Buyer</span>
              <span className="text-emerald-500">Portal</span>
            </div>
          </div>

          {/* Empty center space to match the reference photo */}
          <div className="hidden md:block" />

          {/* CTA Login/Registration Button - Enlarged & Styled Premium */}
          <button
            onClick={() => router.push("/auth")}
            className="flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-extrabold bg-[#22C55E] hover:bg-emerald-600 text-white rounded-lg transition-all shadow-md shadow-emerald-950/30 active:scale-95 duration-200"
          >
            <IconUser className="w-4.5 h-4.5" />
            <span>Login/Registration</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 md:py-16 relative z-10 flex flex-col gap-20">
        <section className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column Text */}
          <div className="md:col-span-7 space-y-6 text-left">
            <div className="space-y-3">
              <span className="text-slate-300 text-xl md:text-2xl font-semibold tracking-wide block">Welcome to</span>
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-none">
                <span className="text-white">Buyer</span>
                <span className="text-[#22C55E]">Portal</span>
              </h1>
            </div>

            <p className="text-lg sm:text-xl font-medium text-slate-300 leading-relaxed max-w-xl">
              Empowering buyers and farmers through transparent trade, smart matching, and secure transactions.
            </p>

            {/* Horizontal Aligned Buttons */}
            <div className="flex flex-row items-center gap-4 pt-2">
              <button
                onClick={() => router.push("/auth")}
                className="px-6 py-3.5 text-xs sm:text-sm font-extrabold flex items-center gap-2 bg-[#22C55E] hover:bg-emerald-600 text-white rounded-lg transition-all shadow-md active:scale-95 shrink-0"
              >
                <span>Get Started</span>
                <IconArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsDemoModalOpen(true)}
                className="px-6 py-3.5 text-xs sm:text-sm font-extrabold flex items-center gap-2 border border-slate-800 hover:bg-slate-900/60 text-slate-300 rounded-lg transition-colors shrink-0"
              >
                <IconPhone className="w-4 h-4" />
                <span>Contact Inquiry</span>
              </button>
            </div>
          </div>

          {/* Right Column Agricultural Supply Chain Image */}
          <div className="md:col-span-5 flex items-center justify-center relative w-full">
            {/* Soft background glow behind image */}
            <div className="absolute inset-0 bg-emerald-500/15 rounded-3xl filter blur-3xl z-0 pointer-events-none" />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="relative z-10 w-full rounded-2xl overflow-hidden border border-emerald-500/20 shadow-[0_0_60px_rgba(16,185,129,0.15)] bg-transparent"
            >
              <img
                src="/hero_agri.jpg"
                alt="Agri-tech supply chain with drone, truck, mobile app and turmeric products"
                className="w-full h-auto object-cover aspect-[4/3]"
                style={{ mixBlendMode: "normal" }}
              />
            </motion.div>
          </div>
        </section>

        {/* Key Benefits Grid Section */}
        <section ref={featuresSectionRef} className="pt-8 border-t border-emerald-950/60">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Key Benefits for Buyers</h2>
            <p className="text-xs text-slate-400 mt-1.5 font-semibold">Transforming traditional agri-supply chains with digitized transaction systems</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-[#020a09] border border-emerald-950/40 rounded-xl p-6 hover:shadow-md hover:border-emerald-500/20 transition-all text-left space-y-4 group">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                <IconSearch className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Product Discovery</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                Browse extensive catalogs from verified suppliers. Access grade details, certification sheets, and local logistics parameters before making counteroffers.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-[#020a09] border border-emerald-950/40 rounded-xl p-6 hover:shadow-md hover:border-emerald-500/20 transition-all text-left space-y-4 group">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                <IconShoppingCart className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Streamlined Ordering</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                Easily place, track, and manage purchase orders. Setup custom escrow deposits, trigger match updates instantly, and handle disputes via decentralized mediation.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-[#020a09] border border-emerald-950/40 rounded-xl p-6 hover:shadow-md hover:border-emerald-500/20 transition-all text-left space-y-4 group">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                <IconChartBar className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Analytics & Reporting</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                Gain insights into spending and supplier performance. Run predictive dashboards mapping turmeric, maize, and soy lot prices against weekly seasonal variations.
              </p>
            </div>
          </div>
        </section>

        {/* Security & Verification Banner */}
        <section className="bg-gradient-to-r from-emerald-950 to-[#031d1a] border border-emerald-900/40 text-white rounded-2xl p-6 sm:p-10 shadow-lg text-left select-none relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="space-y-2 relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 text-emerald-300 text-[9px] font-bold tracking-wider uppercase">
              <IconShield className="w-3 h-3" /> Secure Escrow Active
            </div>
            <h3 className="text-lg sm:text-xl font-bold tracking-tight">Enterprise Procurement Trust Protocol</h3>
            <p className="text-xs text-slate-300 leading-relaxed font-semibold">
              All agreements are legally backed by digital sign-off and locked inside an immutable escrow framework. Payments are disbursed directly to growers post-GRN validation.
            </p>
          </div>
          <button
            onClick={() => router.push("/auth")}
            className="relative z-10 text-xs font-bold bg-white text-emerald-950 hover:bg-slate-100 px-6 py-2.5 rounded-lg flex items-center gap-1.5 shrink-0 transition-all active:scale-95"
          >
            <span>Enter Auth Portal</span>
            <IconArrowRightCircle className="w-4 h-4" />
          </button>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#010706] border-t border-emerald-950/60 py-6 select-none mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            &copy; 2026 BuyerPortal Technologies. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs text-slate-400 font-semibold">
            <button onClick={() => setIsDemoModalOpen(true)} className="hover:text-emerald-400 transition-colors">About Us</button>
            <button onClick={() => setIsDemoModalOpen(true)} className="hover:text-emerald-400 transition-colors">Support</button>
            <button onClick={() => setIsDemoModalOpen(true)} className="hover:text-emerald-400 transition-colors">Terms of Service</button>
          </div>
        </div>
      </footer>

      {/* Contact Inquiry Modal */}
      <AnimatePresence>
        {isDemoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDemoModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#030e0d] border border-emerald-950 rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-lg relative z-10 text-left overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setIsDemoModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-900 transition-all"
              >
                <IconX className="w-4 h-4" />
              </button>

              {demoSubmitted ? (
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="text-center py-6 space-y-4"
                >
                  <div className="w-12 h-12 bg-emerald-950 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <IconCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-lg">Inquiry Received</h3>
                    <p className="text-xs text-slate-400 mt-2 font-semibold leading-relaxed">
                      Thank you for contacting us! A BuyerPortal supply analyst will contact you at <strong>{formData.email}</strong> shortly.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <form onSubmit={handleDemoSubmit} className="space-y-4">
                  <div>
                    <h3 className="font-extrabold text-white text-lg">Contact Inquiry</h3>
                    <p className="text-xs text-slate-400 mt-1 font-semibold">Enter your details to request custom platform features.</p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Ramesh Kumar"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-[#020a09] border border-emerald-950/60 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Work Email</label>
                      <input
                        type="email"
                        required
                        placeholder="ramesh@organicturmeric.in"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-[#020a09] border border-emerald-950/60 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Organization Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Nashik Farmer Producer Corp"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="w-full bg-[#020a09] border border-emerald-950/60 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phone Number</label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98344 61015"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-[#020a09] border border-emerald-950/60 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-4 flex items-center justify-center gap-1.5 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg transition-all active:scale-95"
                  >
                    <span>Submit Inquiry</span>
                    <IconArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
