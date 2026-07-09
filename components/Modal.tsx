"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { IconX, IconLock, IconShieldCheck, IconChevronDown } from "@tabler/icons-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";

export const Modal: React.FC = () => {
  const {
    modal,
    closeModal,
    respondToQuote,
    submitBuyerQuote,
    submitBuyerCounter,
    signContract,
    roles,
    currentUserRoleId,
    assignUserRole,
    currentRole,
    showToast,
  } = useApp();

  const [priceInput, setPriceInput] = useState("");
  const [qtyInput, setQtyInput] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [fpoAction, setFpoAction] = useState<"accept" | "reject" | "counter">("accept");

  const [aadhaarNum, setAadhaarNum] = useState("4829 1029 3847");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("123456");
  const [agreeChecked, setAgreeChecked] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState("");

  useEffect(() => {
    if (modal.type === "quote-response" && modal.data?.quote) {
      setPriceInput(modal.data.quote.price.toString());
      setQtyInput(modal.data.quote.qty.toString());
      setFpoAction("accept");
    } else if (modal.type === "buyer-quote" && modal.data?.lot) {
      setPriceInput(modal.data.lot.priceExpectation.toString());
      setQtyInput(modal.data.lot.qty.toString());
      setMessageInput("");
    } else if (modal.type === "buyer-counter" && modal.data?.quote) {
      setPriceInput(modal.data.quote.price.toString());
      setQtyInput(modal.data.quote.qty.toString());
      setMessageInput("");
    } else if (modal.type === "user-profile") {
      setSelectedRoleId(currentUserRoleId ? currentUserRoleId.toString() : "");
    } else {
      setPriceInput("");
      setQtyInput("");
      setMessageInput("");
      setOtpSent(false);
      setAgreeChecked(false);
    }
  }, [modal.type, modal.data, currentUserRoleId]);

  if (!modal.type) return null;

  const renderFpoResponse = () => {
    const quote = modal.data?.quote;
    if (!quote) return null;

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (fpoAction === "counter") {
        const p = parseFloat(priceInput);
        if (isNaN(p) || p <= 0) return;
        respondToQuote(quote.id, "counter", p);
      } else {
        respondToQuote(quote.id, fpoAction);
      }
      closeModal();
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <h2 className="card-title">Respond to Quote · {quote.id}</h2>
          <p className="text-sm text-tx-s mt-1">
            {quote.lotId} · {quote.lotDescription}
          </p>
        </div>

        <div className="bg-bg-s border border-bd-t rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-tx-s font-medium">Buyer Bid:</span>
            <span className="text-tx-p font-bold text-teal-accent">₹{quote.price}/kg</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-tx-s font-medium">Quantity:</span>
            <span className="text-tx-p font-bold">{quote.qty} MT</span>
          </div>
          {quote.message && (
            <div className="text-xs text-tx-t italic pt-2 border-t border-bd-t mt-2">
              &ldquo;{quote.message}&rdquo;
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-tx-s uppercase tracking-wider block mb-2">Select Action</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "accept", label: "Accept Bid", bg: "bg-teal-bg text-teal-accent border-teal-m/30" },
              { id: "counter", label: "Counter Offer", bg: "bg-amb-bg text-amb border-amb-m/30" },
              { id: "reject", label: "Reject Bid", bg: "bg-cor-bg text-cor border-cor-m/30" },
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setFpoAction(btn.id as "accept" | "reject" | "counter")}
                className={`py-2.5 px-3 rounded-md text-xs font-semibold border transition-all text-center ${
                  fpoAction === btn.id ? btn.bg + " ring-2 ring-primary/20 shadow-sm" : "bg-bg-p text-tx-s border-bd-t hover:bg-bg-s"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {fpoAction === "counter" && (
          <Input
            label="Counter Price (₹/kg)"
            type="number"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            floating={false}
            required
          />
        )}

        <div className="pt-4 flex justify-end gap-3 border-t border-bd-t">
          <Button type="button" variant="secondary" size="md" onClick={closeModal}>
            Cancel
          </Button>
          <Button type="submit" size="md">
            Submit Response
          </Button>
        </div>
      </form>
    );
  };

  const renderBuyerQuote = () => {
    const lot = modal.data?.lot;
    if (!lot) return null;

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const price = parseFloat(priceInput);
      const qty = parseFloat(qtyInput);
      if (isNaN(price) || isNaN(qty) || price <= 0 || qty <= 0) return;
      submitBuyerQuote(lot.id, price, qty, messageInput);
      closeModal();
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <h2 className="card-title">Submit Quote Alert · {lot.id}</h2>
          <p className="text-sm text-tx-s mt-1">
            {lot.description} · Expectation: ₹{lot.priceExpectation}/kg
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Bid Price (₹/kg)" type="number" value={priceInput} onChange={(e) => setPriceInput(e.target.value)} floating={false} required />
          <Input label="Volume (MT)" type="number" step="0.1" value={qtyInput} onChange={(e) => setQtyInput(e.target.value)} floating={false} required />
        </div>

        <Textarea label="Message (Optional)" value={messageInput} onChange={(e) => setMessageInput(e.target.value)} rows={3} placeholder="Add comments, delivery requirements..." />

        <div className="pt-4 flex justify-end gap-3 border-t border-bd-t">
          <Button type="button" variant="secondary" size="md" onClick={closeModal}>Cancel</Button>
          <Button type="submit" size="md">Submit Bid Quote</Button>
        </div>
      </form>
    );
  };

  const renderBuyerCounter = () => {
    const quote = modal.data?.quote;
    if (!quote) return null;

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const p = parseFloat(priceInput);
      if (isNaN(p) || p <= 0) return;
      submitBuyerCounter(quote.id, p, messageInput);
      closeModal();
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <h2 className="card-title">Counter-Offer Request · {quote.id}</h2>
          <p className="text-sm text-tx-s mt-1">{quote.lotId} · {quote.lotDescription}</p>
        </div>

        <div className="bg-bg-s border border-bd-t rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-tx-s font-medium">FPO Counter:</span>
            <span className="text-tx-p font-bold text-cor">₹{quote.price}/kg</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-tx-s font-medium">Bid volume:</span>
            <span className="text-tx-p font-bold">{quote.qty} MT</span>
          </div>
        </div>

        <Input label="Your Counter Price (₹/kg)" type="number" value={priceInput} onChange={(e) => setPriceInput(e.target.value)} floating={false} required />
        <Textarea label="Message (Optional)" value={messageInput} onChange={(e) => setMessageInput(e.target.value)} rows={2} placeholder="Revised terms details..." />

        <div className="pt-4 flex justify-end gap-3 border-t border-bd-t">
          <Button type="button" variant="secondary" size="md" onClick={closeModal}>Cancel</Button>
          <Button type="submit" size="md">Submit Counter Offer</Button>
        </div>
      </form>
    );
  };

  const renderBuyerEsign = () => {
    const contract = modal.data?.contract;
    if (!contract) return null;

    const handleGenerateOtp = () => {
      if (!aadhaarNum.replace(/\s/g, "").match(/^\d{12}$/)) {
        alert("Please enter a valid 12-digit Aadhaar number.");
        return;
      }
      setOtpSent(true);
    };

    const handleConfirmSign = (e: React.FormEvent) => {
      e.preventDefault();
      if (!agreeChecked) return;
      signContract(contract.id, "esign");
      closeModal();
    };

    return (
      <form onSubmit={handleConfirmSign} className="space-y-5">
        <div className="flex items-center gap-3 border-b border-bd-t pb-4">
          <div className="p-2 rounded-lg bg-amb-bg text-amb shrink-0">
            <IconLock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="card-title">Aadhaar e-Sign Verification</h2>
            <p className="text-xs text-tx-s mt-1">Platform Contract Vault · {contract.id}</p>
          </div>
        </div>

        <div className="text-sm leading-relaxed text-tx-s space-y-1.5">
          <div><strong className="text-tx-p">FPO:</strong> {contract.fpoName}</div>
          <div><strong className="text-tx-p">Lot:</strong> {contract.lotDescription}</div>
          <div><strong className="text-tx-p">Escrow Amount:</strong> ₹{contract.amount.toFixed(2)}L (₹{contract.price}/kg)</div>
        </div>

        {!otpSent ? (
          <div className="space-y-4">
            <Input label="Enter 12-digit Aadhaar ID" type="text" value={aadhaarNum} onChange={(e) => setAadhaarNum(e.target.value)} floating={false} placeholder="XXXX XXXX XXXX" required />
            <Button type="button" className="w-full" onClick={handleGenerateOtp}>
              Verify Aadhaar & Generate OTP
            </Button>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-teal-bg text-teal-accent border border-teal-m/20 rounded-lg p-3 text-sm font-medium text-center">
              OTP Sent to Aadhaar-linked mobile +91 ******4839
            </div>
            <Input label="6-digit Verification OTP" type="text" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} floating={false} maxLength={6} required />
            <div className="flex items-start gap-3">
              <input type="checkbox" id="agree" checked={agreeChecked} onChange={(e) => setAgreeChecked(e.target.checked)} className="mt-1 rounded border-bd-s text-primary focus:ring-primary shrink-0" required />
              <label htmlFor="agree" className="text-xs text-tx-s leading-normal cursor-pointer">
                I authorize MahaFPC eSign Gateways to request OTP from UIDAI and attach my digital signature to contract <span className="font-bold">{contract.id}</span>.
              </label>
            </div>
            <div className="pt-4 flex justify-end gap-3 border-t border-bd-t">
              <Button type="button" variant="secondary" size="md" onClick={() => setOtpSent(false)}>Back</Button>
              <Button type="submit" size="md" disabled={!agreeChecked}>
                <IconShieldCheck className="w-4 h-4" />
                Confirm Sign & Escrow Deposit
              </Button>
            </div>
          </div>
        )}
      </form>
    );
  };

  const renderUserProfile = () => {
    const roleNames = {
      fpo: "Nashik Agro FPO",
      buyer: "R.K. Traders Pvt. Ltd",
      mahafpc: "Platform governance",
      portal: "AI Daemon",
      escrow: "Financial service layer",
    };
    const userName = currentRole ? roleNames[currentRole] : "User";

    const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      assignUserRole(selectedRoleId ? parseInt(selectedRoleId) : null);
      showToast("Role assigned successfully", "success");
      closeModal();
    };

    return (
      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <h2 className="card-title text-tx-p">User Profile</h2>
          <p className="text-xs text-tx-s mt-1">Manage user account settings and role assignment</p>
        </div>

        <div className="space-y-4">
          <Input label="Name" value={userName} disabled floating={false} />
          
          <div>
            <label className="block text-xs font-semibold text-tx-s uppercase tracking-wider mb-2">
              Role
            </label>
            <div className="relative">
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="w-full h-11 px-4 pr-10 text-sm font-medium text-tx-p appearance-none bg-bg-p border-2 border-bd-t rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select a role...</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <IconChevronDown
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tx-t pointer-events-none"
                aria-hidden
              />
            </div>
            
            {!selectedRoleId && (
              <p className="mt-2 text-xs font-semibold" style={{ color: "var(--cor)" }}>
                No role assigned — all access denied
              </p>
            )}
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t border-bd-t mt-6">
          <Button type="button" variant="secondary" size="md" onClick={closeModal}>
            Cancel
          </Button>
          <Button type="submit" size="md">
            Save
          </Button>
        </div>
      </form>
    );
  };

  return (
    <AnimatePresence>
      {modal.type && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-tx-p/50 backdrop-blur-sm"
            onClick={closeModal}
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            className="bg-bg-p border border-bd-t rounded-xl shadow-lg w-full max-w-md p-6 z-10 relative"
          >
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-tx-t hover:text-tx-p transition-colors p-1.5 rounded-md hover:bg-bg-t"
              aria-label="Close modal"
            >
              <IconX className="w-5 h-5" />
            </button>

            {modal.type === "quote-response" && renderFpoResponse()}
            {modal.type === "buyer-quote" && renderBuyerQuote()}
            {modal.type === "buyer-counter" && renderBuyerCounter()}
            {modal.type === "buyer-esign" && renderBuyerEsign()}
            {modal.type === "user-profile" && renderUserProfile()}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
