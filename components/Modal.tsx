"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { IconX, IconLock, IconShieldCheck, IconChevronDown, IconPackage, IconPhone, IconUser, IconBuilding, IconTrash, IconPlus, IconBook } from "@tabler/icons-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { ProductPreferenceSelector } from "@/components/ProductPreferenceSelector";
const getInitials = (name: string, email: string): string => {
  const str = (name || email || "M").trim();
  const words = str.split(/\s+/);
  if (words.length >= 2) {
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  }
  return str.substring(0, 2).toUpperCase();
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "Active":
      return <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-950 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Active</span>;
    case "Rejected":
      return <span className="text-[9px] bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-950 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Rejected</span>;
    case "Pending":
    default:
      return <span className="text-[9px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-950 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Pending</span>;
  }
};

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
    updateDisputeStatus,
    sendDisputeMessage,
    disputes,
    fetchDataFromBackend,
  } = useApp();

  const [priceInput, setPriceInput] = useState("");
  const [qtyInput, setQtyInput] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [fpoAction, setFpoAction] = useState<"accept" | "reject" | "counter">("accept");

  const [disputeReplyText, setDisputeReplyText] = useState("");
  const [disputeAttachmentUrl, setDisputeAttachmentUrl] = useState("");

  const [aadhaarNum, setAadhaarNum] = useState("4829 1029 3847");
  const [mobileNum, setMobileNum] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("123456");
  const [agreeChecked, setAgreeChecked] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [guideSource, setGuideSource] = useState<"dashboard" | "profile">("dashboard");

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
  
  const [profileMembers, setProfileMembers] = useState<{id?: number, name: string, email: string, role: string, status: string}[]>([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("Employee");
  const [profilePrefs, setProfilePrefs] = useState<{ categoryId: number; productTypeId?: number; customProductName?: string }[]>([]);
  const [activeProfileTab, setActiveProfileTab] = useState<"business" | "members" | "preferences">("business");

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

          if (currentRole === "buyer" || currentRole === "fpo") {
            const resPrefs = await fetch(`http://localhost:8000/lots/${currentRole}s/me/product-preferences`, {
              headers: { "Authorization": `Bearer ${token}` }
            });
            if (resPrefs.ok) {
              const data = await resPrefs.json();
              const mapped = (data.rows || []).map((row: any) => ({
                categoryId: row.categoryId,
                productTypeId: row.productTypeId,
                customProductName: row.customProductName
              }));
              setProfilePrefs(mapped);
            }
          }
        } catch (err) {
          console.error("Failed to load user-profile data:", err);
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

    const handleGenerateOtp = async () => {
      if (!aadhaarNum.replace(/\s/g, "").match(/^\d{12}$/)) {
        alert("Please enter a valid 12-digit Aadhaar number.");
        return;
      }
      if (!mobileNum.trim() || mobileNum.trim().length < 10) {
        alert("Please enter a valid Aadhaar-linked mobile phone number.");
        return;
      }

      try {
        const cleanPhone = mobileNum.replace(/\s/g, "");
        const response = await fetch("http://localhost:8000/auth/otp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mobile_number: cleanPhone,
            purpose: "esign"
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Failed to send OTP.");
        }

        const data = await response.json();
        
        // Auto-populate generated OTP if in Dev Mode
        if (data.otp) {
          setGeneratedOtp(data.otp);
          setOtpInput(data.otp);
          showToast(`[Dev Mode] OTP auto-populated: ${data.otp}`, "info");
        } else {
          setGeneratedOtp("");
          setOtpInput("");
        }

        showToast(`OTP Sent to Aadhaar-linked mobile successfully!`, "success");
        setOtpSent(true);
      } catch (err: any) {
        console.error("eSign OTP sending error:", err);
        alert(`Failed to send OTP: ${err.message}. Make sure Twilio credentials are correct or backend OTP_DEV_MODE is true.`);
      }
    };

    const handleConfirmSign = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!agreeChecked) return;

      try {
        const cleanPhone = mobileNum.replace(/\s/g, "");
        const response = await fetch("http://localhost:8000/auth/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mobile_number: cleanPhone,
            otp: otpInput.trim(),
            purpose: "esign"
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Invalid OTP code.");
        }

        signContract(contract.id, "esign");
        closeModal();
        showToast(`Contract ${contract.id} signed and escrow funds deposited.`, "success");
      } catch (err: any) {
        console.error("eSign OTP verification error:", err);
        alert(`Verification failed: ${err.message}. Please enter the correct OTP.`);
      }
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
            <div className="text-[9px] inline-block text-teal-accent bg-teal-bg/60 border border-teal-m/10 px-2 py-0.5 rounded font-bold uppercase mt-1">
              Simulated Aadhaar eSign (DSC integration planned)
            </div>
          </div>
        </div>

        <div className="text-sm leading-relaxed text-tx-s space-y-1.5">
          <div><strong className="text-tx-p">FPO:</strong> {contract.fpoName}</div>
          <div><strong className="text-tx-p">Lot:</strong> {contract.lotDescription}</div>
          <div>
            <strong className="text-tx-p">Escrow Amount:</strong> ₹{contract.amount.toFixed(2)}L (₹{contract.price}/kg)
            <div className="text-[9px] inline-block text-amb bg-amb-bg/60 border border-amb-m/10 px-2 py-0.5 rounded font-bold uppercase ml-2 align-middle">
              Simulated Payment (Razorpay Route planned)
            </div>
          </div>
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
      admin: "Platform Admin"
    };

    const displayRole = currentRole ? roleLabels[currentRole] || currentRole : "User";

    const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      assignUserRole(selectedRoleId ? parseInt(selectedRoleId) : null);
      
      if (currentRole === "buyer" || currentRole === "fpo") {
        try {
          const token = localStorage.getItem("token");
          const categoriesList = Array.from(new Set(profilePrefs.map(p => p.categoryId).filter(Boolean)));
          const productTypesList = Array.from(new Set(profilePrefs.map(p => p.productTypeId).filter((id): id is number => !!id)));

          const res = await fetch(`http://localhost:8000/lots/${currentRole}s/me/product-preferences`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              categories: categoriesList,
              product_types: productTypesList,
              rows: profilePrefs.map(p => ({
                category_id: p.categoryId,
                product_type_id: p.productTypeId,
                custom_product_name: p.customProductName
              }))
            })
          });
          if (!res.ok) {
            throw new Error("Failed to save product preferences.");
          }
          fetchDataFromBackend();
        } catch (err: any) {
          showToast(err.message, "error");
          return;
        }
      }
      
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

    const handleApproveMember = async (memberId: number) => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`http://localhost:8000/auth/members/${memberId}/approve`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || "Failed to approve member.");
        }
        
        showToast("Member approved successfully.", "success");
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

    const handleRejectMember = async (memberId: number) => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`http://localhost:8000/auth/members/${memberId}/reject`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || "Failed to reject member.");
        }
        
        showToast("Member registration rejected.", "warning");
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
      <div className="flex flex-col h-full select-none max-w-7xl mx-auto w-full text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-bd-t">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <IconUser className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-tx-p flex items-center gap-2">
                <span>Profile Settings</span>
              </h2>
              <p className="text-xs md:text-sm text-tx-s mt-0.5">
                Manage your corporate profile, registry credentials, and authorized member lists (Role: <strong>{displayRole}</strong>)
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setGuideSource("profile");
              openModal("user-guide");
            }}
            className="text-xs font-semibold px-4 flex items-center gap-1.5 border-primary/20 text-primary bg-primary/5 hover:bg-primary/10"
          >
            <IconBook className="w-4 h-4" />
            <span>View User Guide</span>
          </Button>
        </div>

        {/* Two Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 py-5 overflow-y-auto flex-1 pr-1 scrollbar-thin">
          {/* Left Column: Business Registry Details (col-span-5) */}
          <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-base font-bold text-tx-p flex items-center gap-2">
                <IconBuilding className="w-4 h-4 text-primary" />
                <span>Business Registry Details</span>
              </h3>
              
              <div className="space-y-4">
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
              </div>
            </div>

            {/* Active System Role Selector */}
            <div className="border-t border-bd-t pt-5 mt-2 space-y-3">
              <h3 className="text-sm font-bold text-tx-p">Demo Configuration</h3>
              <div>
                <label className="block text-[11px] font-bold text-tx-s mb-1.5 uppercase tracking-wide">
                  Switch Active System Role
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

            {/* Save Buttons for Left Column */}
            <div className="pt-5 border-t border-bd-t mt-4 flex gap-3">
              <Button type="button" variant="secondary" size="md" onClick={closeModal} className="flex-1">
                Cancel
              </Button>
              <Button type="button" size="md" onClick={handleSave} className="flex-1">
                Save Settings
              </Button>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-7 space-y-6 lg:border-l lg:border-bd-t lg:pl-10 flex flex-col justify-between">
            <div className="space-y-4 flex-1">
              
              {/* Buyer/FPO Tab Toggle */}
              {(currentRole === "buyer" || currentRole === "fpo") && (
                <div className="flex gap-2 border-b border-bd-t pb-3 mb-4 text-[12px] font-bold uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => setActiveProfileTab("members")}
                    className={`px-3 py-1.5 rounded-lg border transition-all ${
                      activeProfileTab === "members"
                        ? "bg-primary text-white border-primary"
                        : "bg-bg-s border-bd-s text-tx-s hover:text-tx-p"
                    }`}
                  >
                    Team Members
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveProfileTab("preferences")}
                    className={`px-3 py-1.5 rounded-lg border transition-all ${
                      activeProfileTab === "preferences"
                        ? "bg-primary text-white border-primary"
                        : "bg-bg-s border-bd-s text-tx-s hover:text-tx-p"
                    }`}
                  >
                    Product Preferences
                  </button>
                </div>
              )}

              {/* Preferences Tab View */}
              {(currentRole === "buyer" || currentRole === "fpo") && activeProfileTab === "preferences" ? (
                <div className="space-y-4">
                  <div className="pb-2 border-b border-bd-t">
                    <h3 className="text-base font-bold text-tx-p flex items-center gap-2">
                      <IconShieldCheck className="w-5 h-5 text-primary" />
                      <span>Product Preferences Selection</span>
                    </h3>
                    <p className="text-xs text-tx-s mt-1 leading-relaxed">
                      Select categories or specific product types you wish to trade. Saved preferences are matched against incoming supplier lots automatically.
                    </p>
                  </div>
                  <ProductPreferenceSelector
                    preferences={profilePrefs}
                    onChange={(newPrefs) => setProfilePrefs(newPrefs)}
                    role={currentRole as "buyer" | "fpo"}
                  />
                </div>
              ) : (
                /* Members Tab View */
                <>
                  <h3 className="text-base font-bold text-tx-p flex items-center gap-2">
                    <IconShieldCheck className="w-5 h-5 text-primary" />
                    <span>Authorized Google OAuth Accounts</span>
                  </h3>
                  <p className="text-xs text-tx-s leading-relaxed">
                    Add and manage Google accounts authorized to log in under your organization. Authorized accounts can bypass standard sign-in restrictions.
                  </p>

                  {/* Members List styled as cards/boxes */}
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                    {profileMembers.length === 0 ? (
                      <div className="text-center py-8 text-sm text-tx-t border border-dashed border-bd-t rounded-xl bg-bg-s/30">
                        No authorized Google accounts registered.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {profileMembers.map((m, idx) => (
                          <div
                            key={idx}
                            className="bg-bg-s border border-bd-t rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:shadow-md hover:border-bd-s transition-all"
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 shadow-inner">
                                {getInitials(m.name, m.email)}
                              </div>
                              <div className="overflow-hidden">
                                <div className="text-sm font-semibold text-tx-p truncate flex items-center gap-2 flex-wrap">
                                  <span>{m.name}</span>
                                  <span className="text-[9px] bg-bg-t text-primary border border-bd-t px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                    {m.role}
                                  </span>
                                  {getStatusBadge(m.status)}
                                </div>
                                <div className="text-xs text-tx-s font-medium mt-0.5 truncate">{m.email}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 self-end sm:self-auto">
                              {m.status === "Pending" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleApproveMember(m.id!)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded shadow-sm transition-all"
                                    title="Approve Registration"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRejectMember(m.id!)}
                                    className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded shadow-sm transition-all"
                                    title="Reject Registration"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(m.id!)}
                                className="p-2 rounded-lg text-tx-t hover:text-danger hover:bg-danger/10 transition-all shrink-0"
                                title="Remove Authorization"
                              >
                                <IconTrash className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add member form */}
                  <div className="border-t border-bd-t pt-5 space-y-4">
                    <h4 className="text-sm font-bold text-tx-p uppercase tracking-wider">
                      Invite & Authorize New Member
                    </h4>
                    <p className="text-[11px] text-tx-s font-semibold leading-relaxed max-w-xl">
                      * Note: Adding a member generates a secure registration link logged in the notifications registry. The member must set their password and receive your final approval before logging in.
                    </p>
                    <div className="space-y-4 bg-bg-s/40 border border-bd-t rounded-xl p-4 md:p-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Member Full Name"
                          placeholder="e.g. Ramesh More"
                          value={newMemberName}
                          onChange={(e) => setNewMemberName(e.target.value)}
                          floating={false}
                        />
                        <Input
                          label="Google Email Address (for Sign-In)"
                          placeholder="e.g. ramesh@gmail.com"
                          type="email"
                          value={memberEmail}
                          onChange={(e) => setMemberEmail(e.target.value)}
                          floating={false}
                        />
                      </div>
                      <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                          <label className="block text-[10px] font-bold text-tx-s mb-1.5 uppercase tracking-wide">
                            Role / Position
                          </label>
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
                        <Button
                          type="button"
                          onClick={handleAddMember}
                          className="h-[38px] flex items-center justify-center px-6 w-full md:w-auto shrink-0"
                        >
                          <IconPlus className="w-4 h-4 mr-1.5" /> Authorize Account
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
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

  const renderUserGuide = () => {
    const handleBack = () => {
      if (guideSource === "profile") {
        openModal("user-profile");
      } else {
        closeModal();
      }
    };

    return (
      <div className="flex flex-col h-full select-none max-w-5xl mx-auto w-full text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-bd-t">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-bg text-primary flex items-center justify-center shrink-0">
              <IconBook className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-tx-p flex items-center gap-2">
                <span>User Guide & Onboarding Reference</span>
              </h2>
              <p className="text-xs md:text-sm text-tx-s mt-0.5">
                Learn how to manage lots, submit bids, sign contracts, and handle escrow payouts.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleBack}
            className="text-xs font-semibold px-4"
          >
            Back
          </Button>
        </div>

        {/* Guides for FPO and Buyer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6 overflow-y-auto flex-1 pr-1 scrollbar-thin">
          {/* FPO Column */}
          <div className="space-y-5 bg-bg-s/30 border border-bd-t rounded-2xl p-6">
            <div className="flex items-center gap-2 text-primary">
              <IconPackage className="w-6 h-6" />
              <h3 className="text-lg font-bold">FPO (Seller) Guide</h3>
            </div>
            <p className="text-xs text-tx-s leading-relaxed">
              As an FPO, you represent farmers. Your primary workflow involves listing harvested turmeric supply, negotiating bids, and coordinating payouts.
            </p>
            
            <div className="space-y-4 pt-2">
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-teal-bg text-primary text-xs font-bold flex items-center justify-center shrink-0">1</span>
                <div>
                  <h4 className="text-sm font-semibold text-tx-p">Register New Lots</h4>
                  <p className="text-xs text-tx-s mt-1 leading-relaxed">
                    Click <strong>Register new lot</strong> tab. Enter variety (e.g., Erode finger, Salem bulb), grade, expected price, weight, and curcumin content.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-teal-bg text-primary text-xs font-bold flex items-center justify-center shrink-0">2</span>
                <div>
                  <h4 className="text-sm font-semibold text-tx-p">AI Match Generation</h4>
                  <p className="text-xs text-tx-s mt-1 leading-relaxed">
                    The platform scans database buyers to pair your lot with appropriate buyers based on curcumin profile, location, and grading specs.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-teal-bg text-primary text-xs font-bold flex items-center justify-center shrink-0">3</span>
                <div>
                  <h4 className="text-sm font-semibold text-tx-p">Respond to Bids (Quotes)</h4>
                  <p className="text-xs text-tx-s mt-1 leading-relaxed">
                    Review incoming bids in the <strong>Quotes</strong> tab. You can Accept the bid directly, decline it, or counter with a revised price.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-teal-bg text-primary text-xs font-bold flex items-center justify-center shrink-0">4</span>
                <div>
                  <h4 className="text-sm font-semibold text-tx-p">eSign & Legal Conformance</h4>
                  <p className="text-xs text-tx-s mt-1 leading-relaxed">
                    Once a quote is accepted, the system generates a draft trade contract. eSign via Aadhaar verification to lock escrow.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-teal-bg text-primary text-xs font-bold flex items-center justify-center shrink-0">5</span>
                <div>
                  <h4 className="text-sm font-semibold text-tx-p">Escrow Splits & Farmer Payout</h4>
                  <p className="text-xs text-tx-s mt-1 leading-relaxed">
                    Ship details and transit tracking update automatically. When buyer receives supply and releases escrow, payment splits directly to farmers' accounts.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Buyer Column */}
          <div className="space-y-5 bg-bg-s/30 border border-bd-t rounded-2xl p-6">
            <div className="flex items-center gap-2 text-primary">
              <IconBuilding className="w-6 h-6" />
              <h3 className="text-lg font-bold">Buyer Guide</h3>
            </div>
            <p className="text-xs text-tx-s leading-relaxed">
              As a procurement manager or trader, your workflow centers around sourcing quality turmeric, negotiating deals, depositing escrow, and accepting delivery.
            </p>
            
            <div className="space-y-4 pt-2">
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">1</span>
                <div>
                  <h4 className="text-sm font-semibold text-tx-p">Explore turmeric Lots</h4>
                  <p className="text-xs text-tx-s mt-1 leading-relaxed">
                    Browse FPO listings. View detailed lot profiles including curcumin percentage, harvest history, grade metrics, and location.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">2</span>
                <div>
                  <h4 className="text-sm font-semibold text-tx-p">Submit a Quote (Bid)</h4>
                  <p className="text-xs text-tx-s mt-1 leading-relaxed">
                    Input your target purchase price and quantity, then submit a quote. Bids are instantly transmitted to FPOs.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">3</span>
                <div>
                  <h4 className="text-sm font-semibold text-tx-p">Negotiate Counters</h4>
                  <p className="text-xs text-tx-s mt-1 leading-relaxed">
                    If an FPO sends a counter-offer, you can either accept the counter or respond with a new buyer bid in the <strong>Quotes</strong> page.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">4</span>
                <div>
                  <h4 className="text-sm font-semibold text-tx-p">Lock Escrow Payment</h4>
                  <p className="text-xs text-tx-s mt-1 leading-relaxed">
                    eSign the contract via Aadhaar OTP or DSC. Deposit the required contract amount into the MahaFPC escrow pool to initiate logistics.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">5</span>
                <div>
                  <h4 className="text-sm font-semibold text-tx-p">Accept Delivery & Release</h4>
                  <p className="text-xs text-tx-s mt-1 leading-relaxed">
                    Monitor delivery. Once the turmeric shipment is delivered and quality conformed, click <strong>Release Funds</strong> to disburse to farmers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-bd-t flex justify-end">
          <Button type="button" size="md" onClick={handleBack}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  };

  const renderDisputeDetails = () => {
    const disputeData = modal.data?.dispute;
    if (!disputeData) return null;

    // Retrieve from state to ensure updates display immediately
    const dispute = disputes.find((d) => d.id === disputeData.id) || disputeData;

    const handleSendReply = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!disputeReplyText.trim()) return;

      await sendDisputeMessage(dispute.id, disputeReplyText.trim(), disputeAttachmentUrl.trim() || undefined);
      setDisputeReplyText("");
      setDisputeAttachmentUrl("");
    };

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-bd-t pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-bg text-red-accent shrink-0">
              <IconLock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="card-title flex items-center gap-2">
                <span>Dispute {dispute.id}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                  dispute.status === "Resolved" ? "bg-emerald-bg text-emerald-accent" :
                  dispute.status === "Rejected" ? "bg-red-bg text-red-accent" :
                  dispute.status === "In Review" ? "bg-amb-bg text-amb" : "bg-teal-bg text-teal-accent"
                }`}>
                  {dispute.status}
                </span>
              </h2>
              <p className="text-xs text-tx-s mt-0.5">{dispute.type} &middot; Lot {dispute.lotId}</p>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 bg-bg-s p-3 rounded-lg border border-bd-t text-xs font-semibold">
          <div>
            <span className="text-tx-s block text-[10px] uppercase">Filed By</span>
            <span className="text-tx-p">{dispute.creatorRole === "buyer" ? dispute.buyerName : dispute.fpoName} ({dispute.creatorRole.toUpperCase()})</span>
          </div>
          <div>
            <span className="text-tx-s block text-[10px] uppercase">Against Party</span>
            <span className="text-tx-p">{dispute.creatorRole === "buyer" ? dispute.fpoName : dispute.buyerName}</span>
          </div>
          <div>
            <span className="text-tx-s block text-[10px] uppercase">Date Filed</span>
            <span className="text-tx-p">{new Date(dispute.filedAt).toLocaleDateString()}</span>
          </div>
          {dispute.attachmentUrl && (
            <div>
              <span className="text-tx-s block text-[10px] uppercase">Attachment</span>
              <a href={dispute.attachmentUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold">
                📎 View File
              </a>
            </div>
          )}
        </div>

        {/* Message Thread */}
        <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
          {dispute.messages && dispute.messages.length > 0 ? (
            dispute.messages.map((m: any, idx: number) => (
              <div key={idx} className={`p-3 rounded-xl border max-w-[85%] space-y-1 ${
                m.senderRole === currentRole ? "ml-auto bg-primary/10 border-primary/20" : "bg-bg-p border-bd-t"
              }`}>
                <div className="flex items-center justify-between text-[10px] font-bold text-tx-s">
                  <span>{m.senderName} ({m.senderRole.toUpperCase()})</span>
                  <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-xs text-tx-p leading-relaxed font-medium">{m.message}</p>
                {m.attachmentUrl && (
                  <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline text-[10px] flex items-center gap-1 font-semibold pt-0.5">
                    📎 View Attachment
                  </a>
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-tx-t text-xs">No conversation history.</p>
          )}
        </div>

        {/* Regulator Actions (Admin/MahaFPC Only) */}
        {((currentRole as any) === "admin" || currentRole === "mahafpc") && (
          <div className="border-t border-bd-t pt-4 space-y-2">
            <h4 className="text-[11px] font-bold text-tx-s uppercase tracking-wider">Regulator Arbitration Actions</h4>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => updateDisputeStatus(dispute.id, "In Review")} disabled={dispute.status === "In Review"}>
                Investigate
              </Button>
              <Button type="button" size="sm" className="bg-emerald-accent hover:bg-emerald-m text-white" onClick={() => updateDisputeStatus(dispute.id, "Resolved")} disabled={dispute.status === "Resolved"}>
                Uphold & Resolve
              </Button>
              <Button type="button" size="sm" className="bg-red-accent hover:bg-red-m text-white" onClick={() => updateDisputeStatus(dispute.id, "Rejected")} disabled={dispute.status === "Rejected"}>
                Reject Claim
              </Button>
            </div>
          </div>
        )}

        {/* Reply Box */}
        {dispute.status !== "Resolved" && dispute.status !== "Rejected" ? (
          <form onSubmit={handleSendReply} className="border-t border-bd-t pt-4 space-y-3.5">
            <Textarea
              label="Write Response Message"
              value={disputeReplyText}
              onChange={(e) => setDisputeReplyText(e.target.value)}
              placeholder="Provide evidence, response statements, or updates..."
              rows={2}
              required
            />
            <div className="flex gap-3.5 items-end">
              <div className="flex-1">
                <Input
                  label="Attachment URL (optional)"
                  type="text"
                  value={disputeAttachmentUrl}
                  onChange={(e) => setDisputeAttachmentUrl(e.target.value)}
                  placeholder="e.g. http://imgur.com/evidence.jpg"
                  floating={false}
                />
              </div>
              <Button type="submit" size="md">Send Reply</Button>
            </div>
          </form>
        ) : (
          <div className="border-t border-bd-t pt-4 text-center text-xs font-semibold text-tx-s">
            This case is closed. No further messages can be added.
          </div>
        )}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {modal.type && (
        <div className={
          modal.type === "user-profile" || modal.type === "user-guide"
            ? "fixed inset-0 z-50 flex items-center justify-center"
            : "fixed inset-0 z-50 flex items-center justify-center p-4"
        }>
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
            initial={modal.type === "user-profile" || modal.type === "user-guide"
              ? { opacity: 0, y: 15 } 
              : { opacity: 0, scale: 0.95, y: 8 }
            }
            animate={modal.type === "user-profile" || modal.type === "user-guide"
              ? { opacity: 1, y: 0 } 
              : { opacity: 1, scale: 1, y: 0 }
            }
            exit={modal.type === "user-profile" || modal.type === "user-guide"
              ? { opacity: 0, y: 15 } 
              : { opacity: 0, scale: 0.95, y: 8 }
            }
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            className={
              modal.type === "user-profile" || modal.type === "user-guide"
                ? "bg-bg-p z-10 relative flex flex-col w-screen h-screen max-w-none rounded-none p-6 md:p-10 overflow-hidden"
                : "bg-bg-p border border-bd-t rounded-xl shadow-lg w-full max-w-md p-6 z-10 relative"
            }
          >
            <button
              onClick={closeModal}
              className={
                modal.type === "user-profile" || modal.type === "user-guide"
                  ? "absolute text-tx-t hover:text-tx-p transition-colors p-1.5 rounded-md hover:bg-bg-t top-6 right-6 md:top-8 md:right-8 z-20"
                  : "absolute text-tx-t hover:text-tx-p transition-colors p-1.5 rounded-md hover:bg-bg-t top-4 right-4 z-20"
              }
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
            {modal.type === "user-guide" && renderUserGuide()}
            {modal.type === "dispute-details" && renderDisputeDetails()}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
