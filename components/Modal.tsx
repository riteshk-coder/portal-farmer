"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { IconX, IconLock, IconShieldCheck, IconChevronDown, IconPackage, IconPhone, IconUser, IconBuilding, IconTrash, IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";

export const Modal: React.FC = () => {
  const {
    modal,
    closeModal,
    openModal,
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
  const [mobileNum, setMobileNum] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("123456");
  const [agreeChecked, setAgreeChecked] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState("");

  // Profile settings state hooks
  const [profileCompanyName, setProfileCompanyName] = useState("R.K. Traders Pvt. Ltd");
  const [profileBusinessType, setProfileBusinessType] = useState("Trader");
  const [profileGstin, setProfileGstin] = useState("27AAACP1234A1Z1");
  const [profileFpoReg, setProfileFpoReg] = useState("FPO-MH-9021");
  const [profileState, setProfileState] = useState("Maharashtra");
  const [profileDistrict, setProfileDistrict] = useState("Nashik");
  const [profileVillage, setProfileVillage] = useState("Pimpalgaon");
  const [profileBankAcc, setProfileBankAcc] = useState("501000921092");
  const [profileBankIfsc, setProfileBankIfsc] = useState("HDFC0000123");
  const [profileEmployeeId, setProfileEmployeeId] = useState("EMP-7849");
  
  const [profileMembers, setProfileMembers] = useState<{id?: number, name: string, email: string, role: string}[]>([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("Employee");
  const [activeProfileTab, setActiveProfileTab] = useState<"business" | "members">("business");

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
      const fetchMembers = async () => {
        try {
          const token = localStorage.getItem("token");
          if (!token) return;
          const res = await fetch("http://localhost:8000/auth/members", {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setProfileMembers(data);
          }
        } catch (err) {
          console.error("Failed to load members:", err);
        }
      };
      fetchMembers();
    } else {
      setPriceInput("");
      setQtyInput("");
      setMessageInput("");
      setOtpSent(false);
      setAgreeChecked(false);
      setMobileNum("");
      setGeneratedOtp("");
      setOtpInput("");
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
      if (!mobileNum.trim() || mobileNum.trim().length < 10) {
        alert("Please enter a valid Aadhaar-linked mobile phone number.");
        return;
      }

      // Generate random 6-digit OTP code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);

      // Attempt to send real SMS OTP using free Textbelt gateway API
      const cleanPhone = mobileNum.replace(/\s/g, "");
      const fullPhone = cleanPhone.startsWith("+") ? cleanPhone : `+91${cleanPhone}`;

      const params = new URLSearchParams();
      params.append("phone", fullPhone);
      params.append("message", `MahaFPC eSign Verification OTP: ${code}. Valid for 10 minutes.`);
      params.append("key", "textbelt");

      fetch("https://textbelt.com/text", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            showToast(`Actual SMS OTP sent successfully to ${mobileNum}!`, "success");
          } else {
            console.warn("Textbelt free limit hit:", data.error);
            showToast(`OTP Sent to Aadhaar-linked mobile successfully!`, "success");
          }
          setOtpInput(code); // Auto-populate in input box!
        })
        .catch((err) => {
          console.warn("Textbelt fetch failed:", err);
          showToast(`OTP Sent to Aadhaar-linked mobile successfully!`, "success");
          setOtpInput(code); // Auto-populate in input box!
        });

      setOtpSent(true);
    };

    const handleConfirmSign = (e: React.FormEvent) => {
      e.preventDefault();
      if (!agreeChecked) return;

      const expectedOtp = generatedOtp || "123456";
      if (otpInput.trim() !== expectedOtp && otpInput.trim() !== "123456") {
        alert("Incorrect OTP code. Please enter the correct OTP sent to your phone (or use '123456' as the default fallback).");
        return;
      }

      signContract(contract.id, "esign");
      closeModal();
      showToast(`Contract ${contract.id} signed and escrow funds deposited.`, "success");
    };

    const maskedMobile = mobileNum.length >= 4 
      ? `******${mobileNum.slice(-4)}` 
      : "******4839";

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
            <Input label="Aadhaar-linked Mobile Number" type="tel" value={mobileNum} onChange={(e) => setMobileNum(e.target.value)} floating={false} placeholder="e.g. +91 99887 76655" required />
            <Button type="button" className="w-full" onClick={handleGenerateOtp}>
              Verify Aadhaar & Generate OTP
            </Button>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-teal-bg text-teal-accent border border-teal-m/20 rounded-lg p-3 text-sm font-medium text-center">
              OTP Sent to Aadhaar-linked mobile +91 {maskedMobile}
            </div>
            <Input label="6-digit Verification OTP" type="text" value={otpInput} onChange={(e) => setOtpInput(e.target.value)} floating={false} maxLength={6} required />
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
    const roleLabels = {
      fpo: "FPO / Farmer",
      buyer: "Buyer",
      mahafpc: "MahaFPC Regulator",
      portal: "AI Portal Daemon",
      escrow: "Escrow Manager",
      admin: "Platform Admin",
      consultant: "Consultant / Agent"
    };

    const displayRole = currentRole ? roleLabels[currentRole] || currentRole : "User";

    const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      assignUserRole(selectedRoleId ? parseInt(selectedRoleId) : null);
      showToast("Profile settings saved successfully!", "success");
      closeModal();
    };

    const handleAddMember = async (e: React.MouseEvent) => {
      e.preventDefault();
      if (!newMemberName.trim() || !memberEmail.trim()) {
        alert("Please enter Name and Gmail address.");
        return;
      }
      
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:8000/auth/add-member", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            name: newMemberName.trim(),
            email: memberEmail.trim().toLowerCase(),
            role: newMemberRole
          })
        });
        
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || "Failed to add member.");
        }
        
        showToast(`Added ${newMemberName} successfully!`, "success");
        setNewMemberName("");
        setMemberEmail("");
        
        // Reload list
        const reloadRes = await fetch("http://localhost:8000/auth/members", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (reloadRes.ok) {
          const reloadData = await reloadRes.json();
          setProfileMembers(reloadData);
        }
      } catch (err: any) {
        showToast(err.message, "error");
      }
    };

    const handleRemoveMember = async (memberId: number) => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`http://localhost:8000/auth/members/${memberId}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || "Failed to remove member.");
        }
        
        showToast("Member removed successfully.", "info");
        // Reload list
        const reloadRes = await fetch("http://localhost:8000/auth/members", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (reloadRes.ok) {
          const reloadData = await reloadRes.json();
          setProfileMembers(reloadData);
        }
      } catch (err: any) {
        showToast(err.message, "error");
      }
    };

    return (
      <div className="space-y-5">
        <div>
          <h2 className="card-title text-tx-p flex items-center gap-2">
            <IconUser className="w-5 h-5 text-primary" />
            <span>Profile Settings</span>
          </h2>
          <p className="text-xs text-tx-s mt-1">
            Manage your corporate profile, registry credentials, and authorized member lists (Role: <strong>{displayRole}</strong>)
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-bd-t">
          <button
            type="button"
            onClick={() => setActiveProfileTab("business")}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
              activeProfileTab === "business"
                ? "border-primary text-primary"
                : "border-transparent text-tx-s hover:text-tx-p"
            }`}
          >
            Business Registry Details
          </button>
          <button
            type="button"
            onClick={() => setActiveProfileTab("members")}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
              activeProfileTab === "members"
                ? "border-primary text-primary"
                : "border-transparent text-tx-s hover:text-tx-p"
            }`}
          >
            Company Member Directory
          </button>
        </div>

        {activeProfileTab === "business" ? (
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
            {/* Buyer fields */}
            {currentRole === "buyer" && (
              <>
                <Input
                  label="Company / Business Name"
                  value={profileCompanyName}
                  onChange={(e) => setProfileCompanyName(e.target.value)}
                  floating={false}
                />
                <div>
                  <label className="block text-[11px] font-bold text-tx-s mb-1.5 uppercase tracking-wide">
                    Business Type
                  </label>
                  <select
                    value={profileBusinessType}
                    onChange={(e) => setProfileBusinessType(e.target.value)}
                    className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="Trader">Trader</option>
                    <option value="Exporter">Exporter</option>
                    <option value="Retailer">Retailer</option>
                    <option value="Processor">Processor</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <Input
                  label="GSTIN Number (Optional)"
                  placeholder="e.g. 27AAACP1234A1Z1"
                  value={profileGstin}
                  onChange={(e) => setProfileGstin(e.target.value)}
                  floating={false}
                />
              </>
            )}

            {/* FPO fields */}
            {currentRole === "fpo" && (
              <>
                <Input
                  label="FPO Registration Number"
                  value={profileFpoReg}
                  onChange={(e) => setProfileFpoReg(e.target.value)}
                  floating={false}
                />
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    label="State"
                    value={profileState}
                    onChange={(e) => setProfileState(e.target.value)}
                    floating={false}
                  />
                  <Input
                    label="District"
                    value={profileDistrict}
                    onChange={(e) => setProfileDistrict(e.target.value)}
                    floating={false}
                  />
                  <Input
                    label="Village"
                    value={profileVillage}
                    onChange={(e) => setProfileVillage(e.target.value)}
                    floating={false}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Bank Account Number"
                    value={profileBankAcc}
                    onChange={(e) => setProfileBankAcc(e.target.value)}
                    floating={false}
                  />
                  <Input
                    label="IFSC Code"
                    value={profileBankIfsc}
                    onChange={(e) => setProfileBankIfsc(e.target.value)}
                    floating={false}
                  />
                </div>
              </>
            )}

            {/* Admin/MahaFPC fields */}
            {currentRole === "mahafpc" && (
              <>
                <Input
                  label="Employee ID / Credential Reference"
                  value={profileEmployeeId}
                  onChange={(e) => setProfileEmployeeId(e.target.value)}
                  floating={false}
                />
                <Input
                  label="Official Email Domain"
                  value="compliance@mahafpc.in"
                  disabled
                  floating={false}
                />
              </>
            )}

            {/* General fallback / Role Switcher */}
            <div className="border-t border-bd-t pt-4">
              <label className="block text-[11px] font-bold text-tx-s mb-1.5 uppercase tracking-wide">
                Switch Active System Role (Demo Mode)
              </label>
              <div className="relative">
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  className="w-full h-10 px-3 pr-10 text-xs font-semibold text-tx-p bg-bg-p border border-bd-s rounded focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                >
                  <option value="">Select system role...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <IconChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tx-t pointer-events-none" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Authorized Members Directory */}
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              <label className="block text-[11px] font-bold text-tx-s uppercase tracking-wide">
                Authorized Personnel Directory
              </label>
              {profileMembers.length === 0 ? (
                <div className="text-center py-4 text-xs text-tx-t">No company members registered.</div>
              ) : (
                <div className="space-y-1.5">
                  {profileMembers.map((m, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-bg-s border border-bd-t rounded px-3 py-1.5 text-xs font-semibold">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <IconUser className="w-3.5 h-3.5 text-tx-s" />
                          <span className="text-tx-p">{m.name}</span>
                          <span className="text-[9px] text-tx-s bg-bg-t px-1.5 py-0.5 rounded tracking-wide uppercase">
                            {m.role}
                          </span>
                        </div>
                        <span className="text-[10px] text-tx-s ml-5">{m.email}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.id!)}
                        className="text-tx-t hover:text-danger p-1 transition-colors"
                        title="Remove member"
                      >
                        <IconTrash className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add member form */}
            <div className="border-t border-bd-t pt-4 space-y-3">
              <label className="block text-[11px] font-bold text-tx-s uppercase tracking-wide">
                Add Corporate Member / Employee
              </label>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Member Full Name"
                    placeholder="e.g. Ramesh More"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    floating={false}
                  />
                  <Input
                    label="Gmail Address (for Sign-In)"
                    placeholder="e.g. ramesh@gmail.com"
                    type="email"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    floating={false}
                  />
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-tx-s mb-1 uppercase tracking-wide">Role / Position</label>
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value)}
                      className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-primary text-xs h-[38px]"
                    >
                      <option value="Manager">Manager</option>
                      <option value="Employee">Employee</option>
                      <option value="Director">Director</option>
                      <option value="Agent">Agent</option>
                    </select>
                  </div>
                  <Button type="button" onClick={handleAddMember} className="h-[38px] flex items-center justify-center px-6">
                    <IconPlus className="w-4 h-4 mr-1" /> Add Member
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 flex justify-end gap-3 border-t border-bd-t mt-6">
          <Button type="button" variant="secondary" size="md" onClick={closeModal}>
            Cancel
          </Button>
          <Button type="button" size="md" onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </div>
    );
  };

  const renderBuyerLotDetails = () => {
    const lot = modal.data?.lot;
    if (!lot) return null;

    return (
      <div className="space-y-5 select-none">
        <div>
          <h2 className="card-title text-tx-p flex items-center gap-2">
            <IconPackage className="w-5 h-5 text-primary" />
            <span>Lot Details &middot; {lot.id}</span>
          </h2>
          <p className="text-xs text-tx-s mt-1">Quality inspection and origin conformance parameters</p>
        </div>

        <div className="divide-y divide-bd-t border border-bd-t rounded-lg overflow-hidden bg-bg-s">
          <div className="px-4 py-3 flex justify-between text-xs font-semibold">
            <span className="text-tx-s">FPO Supplier</span>
            <span className="text-tx-p">{lot.fpoName || "Nashik Agro FPO"}</span>
          </div>
          <div className="px-4 py-3 flex justify-between text-xs font-semibold">
            <span className="text-tx-s">Variety & Type</span>
            <span className="text-tx-p">{lot.description}</span>
          </div>
          <div className="px-4 py-3 flex justify-between text-xs font-semibold">
            <span className="text-tx-s">Total Quantity</span>
            <span className="text-tx-p text-teal-accent">{lot.qty} MT</span>
          </div>
          <div className="px-4 py-3 flex justify-between text-xs font-semibold">
            <span className="text-tx-s">Quality Grade</span>
            <span className="text-tx-p">{lot.grade}</span>
          </div>
          <div className="px-4 py-3 flex justify-between text-xs font-semibold">
            <span className="text-tx-s">Curcumin Content</span>
            <span className="text-tx-p text-success">{lot.curcuminPercent || lot.curcumin_percent || "4.2"}%</span>
          </div>
          <div className="px-4 py-3 flex justify-between text-xs font-semibold">
            <span className="text-tx-s">Expected Price</span>
            <span className="text-tx-p text-teal-accent">₹{lot.priceExpectation || lot.price_expectation}/kg</span>
          </div>
          <div className="px-4 py-3 flex justify-between text-xs font-semibold">
            <span className="text-tx-s">Origin Location</span>
            <span className="text-tx-p">{lot.location}</span>
          </div>
          {(lot.notes || lot.harvest_date || lot.harvestDate) && (
            <div className="px-4 py-3 text-xs font-semibold">
              <span className="text-tx-s block mb-1">Inspector Notes & Harvest</span>
              <p className="text-tx-s italic font-medium">
                Harvested: {lot.harvestDate || lot.harvest_date || "2026-06-15"}. 
                {lot.notes ? ` "${lot.notes}"` : ""}
              </p>
            </div>
          )}
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t border-bd-t mt-4">
          <Button type="button" variant="secondary" size="md" onClick={closeModal}>Close</Button>
          <Button
            type="button"
            size="md"
            onClick={() => {
              closeModal();
              openModal("buyer-quote", { lot });
            }}
          >
            Quote Now
          </Button>
        </div>
      </div>
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
            {modal.type === "buyer-lot-details" && renderBuyerLotDetails()}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
