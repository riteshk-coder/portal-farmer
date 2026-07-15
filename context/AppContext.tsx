"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

// Interfaces
export interface Lot {
  id: string;
  description: string;
  qty: number; // in MT
  grade: string;
  status: "Matched" | "Quoting" | "Pending match" | "Counter-offer" | "Dispatched" | "Delivered" | "GRN Issued";
  priceExpectation: number; // in ₹/kg
  location: string;
  fpoName: string;
  createdAt: string;
  matches?: {
    buyerName: string;
    matchScore: number; // percentage
    offeredPrice: number;
  }[];
  curcuminPercent?: number;
  harvestDate?: string;
  notes?: string;
}

export interface Quote {
  id: string;
  lotId: string;
  lotDescription: string;
  buyerName: string;
  price: number; // in ₹/kg
  qty: number; // in MT
  status: "Awaiting response" | "Counter-offer" | "Accepted" | "Rejected" | "Negotiating";
  counterBy?: "FPO" | "Buyer" | null;
  message?: string;
}

export interface Contract {
  id: string;
  lotId: string;
  lotDescription: string;
  buyerName: string;
  fpoName: string;
  qty: number;
  price: number;
  amount: number; // in lakhs (₹)
  status: "Draft" | "eSign pending" | "Signed";
  fpoSigned: boolean;
  buyerSigned: boolean;
  escrowStatus: "Pending Deposit" | "Deposited" | "Released";
  grnNumber?: string;
}

export interface Dispute {
  id: string;
  type: "Quality mismatch" | "Payment delay";
  lotId: string;
  buyerName: string;
  fpoName: string;
  description: string;
  status: "Review" | "Pending" | "Resolved" | "In progress" | "Not resolved";
  filedAt: string;
}

export interface SystemLog {
  id: string;
  channel: "WhatsApp" | "Email" | "System";
  recipient: string;
  message: string;
  timestamp: string;
}

export interface FarmerSplit {
  lotId: string;
  farmerName: string;
  sharePercent: number;
  amount: number; // in ₹
  status: "Pending" | "Paid";
}

export interface LedgerEntry {
  id: string;
  contractId: string;
  type: "Credit" | "Debit";
  party: string;
  amount: number; // in ₹
  timestamp: string;
}

export interface Toast {
  id: string;
  message: string;
  type: "success" | "warning" | "error" | "info";
}

export interface SystemRole {
  id: number;
  name: string;
  description: string;
  email?: string;
  is_superadmin: boolean;
  usersAssigned: number;
  created: string;
}

export type PermissionAction = "view" | "add" | "edit" | "delete";

export type RolePermissions = Record<string, Record<PermissionAction, boolean>>;

type Role = "fpo" | "buyer" | "mahafpc" | "portal" | "escrow";

interface AppContextType {
  currentRole: Role | null;
  activeTabs: Record<Role, string>;
  lots: Lot[];
  quotes: Quote[];
  contracts: Contract[];
  disputes: Dispute[];
  logs: SystemLog[];
  splits: FarmerSplit[];
  ledger: LedgerEntry[];
  toasts: Toast[];
  modal: {
    type: "quote-response" | "buyer-quote" | "buyer-counter" | "fpo-counter" | "buyer-esign" | "user-profile" | "buyer-lot-details" | "user-guide" | null;
    data: any;
  };
  loginAsRole: (role: Role) => void;
  logout: () => void;
  setActiveTabForRole: (role: Role, tab: string) => void;
  showToast: (message: string, type?: Toast["type"]) => void;
  removeToast: (id: string) => void;
  openModal: (type: AppContextType["modal"]["type"], data?: any) => void;
  closeModal: () => void;
  
  // Roles & Permissions state
  roles: SystemRole[];
  permissions: Record<number, RolePermissions>;
  currentUserRoleId: number | null;
  createRole: (name: string, description: string, email?: string) => void;
  updateRole: (id: number, name: string, description: string, email?: string) => void;
  deleteRole: (id: number) => void;
  savePermissions: (roleId: number, perms: RolePermissions) => void;
  assignUserRole: (roleId: number | null) => void;
  
  // Platform Actions
  uploadLot: (lot: Omit<Lot, "id" | "status" | "createdAt" | "fpoName">) => void;
  submitBuyerQuote: (lotId: string, price: number, qty: number, msg?: string) => void;
  submitBuyerCounter: (quoteId: string, price: number, msg?: string) => void;
  respondToQuote: (quoteId: string, action: "accept" | "reject" | "counter", counterPrice?: number) => void;
  signContract: (contractId: string, method: "esign" | "dsc") => void;
  releaseFunds: (contractId: string) => void;
  resolveDispute: (disputeId: string) => void;
  fileDispute: (type: Dispute["type"], lotId: string, description: string) => void;
  updateDisputeStatus: (disputeId: string, status: Dispute["status"]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Initial Mock Data (Empty for clean initial state)
const initialLots: Lot[] = [];
const initialQuotes: Quote[] = [];
const initialContracts: Contract[] = [];
const initialDisputes: Dispute[] = [];
const initialLogs: SystemLog[] = [];
const initialSplits: FarmerSplit[] = [];
const initialLedger: LedgerEntry[] = [];
const initialRoles: SystemRole[] = [];
const initialPermissions: Record<number, RolePermissions> = {};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [activeTabs, setActiveTabs] = useState<Record<Role, string>>({
    fpo: "Overview",
    buyer: "Overview",
    mahafpc: "Overview",
    portal: "System status",
    escrow: "Overview",
  });

  const [roles, setRoles] = useState<SystemRole[]>(initialRoles);
  const [permissions, setPermissions] = useState<Record<number, RolePermissions>>(initialPermissions);
  const [currentUserRoleId, setCurrentUserRoleId] = useState<number | null>(2); // Manager by default
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // State arrays representing client-side databases synced with backend
  const [lots, setLots] = useState<Lot[]>(initialLots);
  const [quotes, setQuotes] = useState<Quote[]>(initialQuotes);
  const [contracts, setContracts] = useState<Contract[]>(initialContracts);
  const [disputes, setDisputes] = useState<Dispute[]>(initialDisputes);
  const [logs, setLogs] = useState<SystemLog[]>(initialLogs);
  const [splits, setSplits] = useState<FarmerSplit[]>(initialSplits);
  const [ledger, setLedger] = useState<LedgerEntry[]>(initialLedger);

  // Notifications and Modals
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [modal, setModal] = useState<{ type: AppContextType["modal"]["type"]; data: any }>({
    type: null,
    data: null,
  });

  const showToast = (message: string, type: Toast["type"] = "success") => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const openModal = (type: AppContextType["modal"]["type"], data: any = null) => {
    setModal({ type, data });
  };

  const closeModal = () => {
    setModal({ type: null, data: null });
  };

  const loginAsRole = (role: Role) => {
    setCurrentRole(role);
  };

  const logout = () => {
    setCurrentRole(null);
    setCurrentUserId(null);
    setCurrentUserRoleId(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user_role");
      localStorage.removeItem("user_name");
      localStorage.removeItem("user_email");
      localStorage.removeItem("user_position");
    }
  };

  const setActiveTabForRole = (role: Role, tab: string) => {
    setActiveTabs((prev) => ({ ...prev, [role]: tab }));
  };

  // Sync data with backend API
  const fetchDataFromBackend = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;

    try {
      const headers = { "Authorization": `Bearer ${token}` };

      // Fetch User Info
      const resMe = await fetch("http://localhost:8000/auth/me", { headers });
      if (resMe.ok) {
        const meData = await resMe.json();
        setCurrentUserId(meData.id);
        setCurrentUserRoleId(meData.system_role_id);
      }

      // Fetch Lots
      const resLots = await fetch("http://localhost:8000/lots", { headers });
      if (resLots.ok) setLots(await resLots.json());

      // Fetch Quotes
      const resQuotes = await fetch("http://localhost:8000/quotes", { headers });
      if (resQuotes.ok) setQuotes(await resQuotes.json());

      // Fetch Contracts
      const resContracts = await fetch("http://localhost:8000/contracts", { headers });
      if (resContracts.ok) setContracts(await resContracts.json());

      // Fetch Disputes
      const resDisputes = await fetch("http://localhost:8000/disputes", { headers });
      if (resDisputes.ok) setDisputes(await resDisputes.json());

      // Fetch Logs
      const resLogs = await fetch("http://localhost:8000/logs", { headers });
      if (resLogs.ok) setLogs(await resLogs.json());

      // Fetch Ledger
      const resLedger = await fetch("http://localhost:8000/escrow/ledger", { headers });
      if (resLedger.ok) setLedger(await resLedger.json());

      // Fetch Splits
      const resSplits = await fetch("http://localhost:8000/escrow/farmer-splits", { headers });
      if (resSplits.ok) setSplits(await resSplits.json());

      // Fetch Roles
      const resRoles = await fetch("http://localhost:8000/roles", { headers });
      if (resRoles.ok) {
        const rolesData = await resRoles.json();
        setRoles(rolesData);

        const permsMap: Record<number, RolePermissions> = {};
        for (const r of rolesData) {
          const resPerms = await fetch(`http://localhost:8000/roles/${r.id}/permissions`, { headers });
          if (resPerms.ok) {
            permsMap[r.id] = await resPerms.json();
          }
        }
        setPermissions(permsMap);
      }
    } catch (err) {
      console.error("Failed to load backend data:", err);
    }
  };

  useEffect(() => {
    const savedRole = typeof window !== "undefined" ? localStorage.getItem("user_role") : null;
    if (savedRole && !currentRole) {
      setCurrentRole(savedRole as any);
    }

    if (currentRole || savedRole) {
      fetchDataFromBackend();
    }
  }, [currentRole]);

  // Actions
  const uploadLot = async (lotData: Omit<Lot, "id" | "status" | "createdAt" | "fpoName">) => {
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("description", lotData.description);
      formData.append("qty", lotData.qty.toString());
      formData.append("grade", lotData.grade);
      formData.append("priceExpectation", lotData.priceExpectation.toString());
      if (lotData.location) formData.append("location", lotData.location);

      const curcumin = (lotData as any).curcuminPercent || (lotData as any).curcumin_percent || 4.0;
      formData.append("curcuminPercent", curcumin.toString());

      const harvest = (lotData as any).harvestDate || (lotData as any).harvest_date || new Date().toISOString().split("T")[0];
      formData.append("harvestDate", harvest);

      if (lotData.notes) formData.append("notes", lotData.notes);

      const res = await fetch("http://localhost:8000/lots", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to upload lot.");
      }

      showToast("Lot uploaded and AI matching initialized successfully!", "success");
      await fetchDataFromBackend();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const submitBuyerQuote = async (lotId: string, price: number, qty: number, msg?: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/quotes", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          lot_id: lotId,
          price,
          qty,
          message: msg || "Initial buyer bid"
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to submit quote.");
      }

      showToast("Quote submitted successfully!", "success");
      await fetchDataFromBackend();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const submitBuyerCounter = async (quoteId: string, price: number, msg?: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8000/quotes/${quoteId}/counter`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          price,
          message: msg || "Buyer revised counter offer"
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to submit counter quote.");
      }

      showToast(`Counter offer submitted: ₹${price}/kg`, "success");
      await fetchDataFromBackend();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const respondToQuote = async (quoteId: string, action: "accept" | "reject" | "counter", counterPrice?: number) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8000/quotes/${quoteId}/respond`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action,
          counter_price: counterPrice
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to respond to quote.");
      }

      if (action === "accept") {
        const data = await res.json();
        showToast(`Quote accepted. Contract ${data.contractId} generated!`, "success");
      } else if (action === "reject") {
        showToast(`Quote ${quoteId} rejected.`, "warning");
      } else if (action === "counter") {
        showToast(`Counter offer of ₹${counterPrice}/kg sent to buyer.`, "info");
      }
      await fetchDataFromBackend();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const signContract = async (contractId: string, method: "esign" | "dsc") => {
    if (method === "dsc") {
      showToast("DSC module launched", "info");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const signRes = await fetch(`http://localhost:8000/contracts/${contractId}/sign`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ method })
      });

      if (!signRes.ok) {
        const errorData = await signRes.json();
        throw new Error(errorData.detail || "Failed to sign contract.");
      }

      const fundRes = await fetch(`http://localhost:8000/contracts/${contractId}/fund-escrow`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!fundRes.ok) {
        const errorData = await fundRes.json();
        throw new Error(errorData.detail || "Failed to fund escrow.");
      }

      showToast(`Contract ${contractId} signed and escrow funded successfully!`, "success");
      await fetchDataFromBackend();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const releaseFunds = async (contractId: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8000/contracts/${contractId}/release-funds`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to release funds.");
      }

      showToast("Funds released to FPO and farmers successfully!", "success");
      await fetchDataFromBackend();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const resolveDispute = async (disputeId: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8000/disputes/${disputeId}/resolve`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to resolve dispute.");
      }

      showToast(`Dispute ${disputeId} status updated to Resolved.`, "success");
      await fetchDataFromBackend();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const fileDispute = async (type: Dispute["type"], lotId: string, description: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/disputes", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          lot_id: lotId,
          type,
          description
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to file dispute.");
      }

      const data = await res.json();
      showToast(`Dispute ${data.id} filed successfully with MahaFPC.`, "success");
      await fetchDataFromBackend();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const updateDisputeStatus = async (disputeId: string, status: Dispute["status"]) => {
    if (status === "Resolved") {
      await resolveDispute(disputeId);
    } else {
      showToast(`Dispute status update to ${status} requires Regulator dashboard.`, "info");
    }
  };

  const createRole = async (name: string, description: string, email?: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/roles", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, description, email })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to create role.");
      }

      showToast("System role created successfully!", "success");
      await fetchDataFromBackend();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const updateRole = async (id: number, name: string, description: string, email?: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8000/roles/${id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, description, email })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to update role.");
      }

      showToast("Role updated successfully!", "success");
      await fetchDataFromBackend();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const deleteRole = async (id: number) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8000/roles/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to delete role.");
      }

      showToast("Role deleted successfully.", "info");
      await fetchDataFromBackend();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const savePermissions = async (roleId: number, perms: RolePermissions) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8000/roles/${roleId}/permissions`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ permissions: perms })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to save permissions.");
      }

      showToast("Permissions updated successfully!", "success");
      await fetchDataFromBackend();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const assignUserRole = async (roleId: number | null) => {
    if (!currentUserId) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8000/roles/users/${currentUserId}/assign-role`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ roleId })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to assign system role.");
      }

      setCurrentUserRoleId(roleId);
      showToast("System role assigned successfully!", "success");
      await fetchDataFromBackend();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentRole,
        activeTabs,
        lots,
        quotes,
        contracts,
        disputes,
        logs,
        splits,
        ledger,
        toasts,
        modal,
        loginAsRole,
        logout,
        setActiveTabForRole,
        showToast,
        removeToast,
        openModal,
        closeModal,
        roles,
        permissions,
        currentUserRoleId,
        createRole,
        updateRole,
        deleteRole,
        savePermissions,
        assignUserRole,
        uploadLot,
        submitBuyerQuote,
        submitBuyerCounter,
        respondToQuote,
        signContract,
        releaseFunds,
        resolveDispute,
        fileDispute,
        updateDisputeStatus,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
