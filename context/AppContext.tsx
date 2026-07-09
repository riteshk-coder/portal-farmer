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
}

export interface Dispute {
  id: string;
  type: "Quality mismatch" | "Payment delay";
  lotId: string;
  buyerName: string;
  fpoName: string;
  description: string;
  status: "Review" | "Pending" | "Resolved";
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
    type: "quote-response" | "buyer-quote" | "buyer-counter" | "fpo-counter" | "buyer-esign" | "user-profile" | null;
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
  createRole: (name: string, description: string) => void;
  updateRole: (id: number, name: string, description: string) => void;
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Initial Mock Data
const initialLots: Lot[] = [
  {
    id: "LOT-2841",
    description: "Erode finger turmeric",
    qty: 12,
    grade: "A",
    status: "Matched",
    priceExpectation: 134,
    location: "Nashik, MH",
    fpoName: "Nashik Agro FPO",
    createdAt: "10 min ago",
    matches: [
      { buyerName: "R.K. Traders Pvt. Ltd", matchScore: 91, offeredPrice: 131 },
      { buyerName: "Spice Exports Ltd", matchScore: 85, offeredPrice: 131 },
      { buyerName: "Agmark Foods", matchScore: 72, offeredPrice: 128 },
    ],
  },
  {
    id: "LOT-2842",
    description: "Salem bulb turmeric",
    qty: 8.5,
    grade: "B",
    status: "Quoting",
    priceExpectation: 130,
    location: "Salem, TN",
    fpoName: "Nashik Agro FPO",
    createdAt: "1 day ago",
  },
  {
    id: "LOT-2843",
    description: "Nizamabad premium",
    qty: 20,
    grade: "Premium",
    status: "Pending match",
    priceExpectation: 132,
    location: "Nizamabad, TS",
    fpoName: "Nashik Agro FPO",
    createdAt: "8 min ago",
  },
  {
    id: "LOT-2844",
    description: "Erode finger turmeric",
    qty: 5,
    grade: "B",
    status: "Counter-offer",
    priceExpectation: 128,
    location: "Nashik, MH",
    fpoName: "Nashik Agro FPO",
    createdAt: "1 hour ago",
  },
  {
    id: "LOT-2839",
    description: "Erode finger turmeric",
    qty: 12,
    grade: "A",
    status: "Dispatched",
    priceExpectation: 134,
    location: "Nashik, MH",
    fpoName: "Nashik Agro FPO",
    createdAt: "4 days ago",
  },
  {
    id: "LOT-2837",
    description: "Salem finger turmeric",
    qty: 8.8,
    grade: "B",
    status: "Dispatched",
    priceExpectation: 131,
    location: "Salem, TN",
    fpoName: "Nashik Agro FPO",
    createdAt: "5 days ago",
  },
  {
    id: "LOT-2835",
    description: "Nizamabad premium",
    qty: 7,
    grade: "Premium",
    status: "Dispatched",
    priceExpectation: 128,
    location: "Nizamabad, TS",
    fpoName: "Nashik Agro FPO",
    createdAt: "6 days ago",
  },
];

const initialQuotes: Quote[] = [
  {
    id: "QT-201",
    lotId: "LOT-2842",
    lotDescription: "Salem bulb turmeric",
    buyerName: "R.K. Traders Pvt. Ltd",
    price: 129,
    qty: 8.5,
    status: "Awaiting response",
    message: "Immediate pickup available.",
  },
  {
    id: "QT-202",
    lotId: "LOT-2844",
    lotDescription: "Erode finger turmeric",
    buyerName: "Spice Exports Ltd",
    price: 125,
    qty: 5,
    status: "Counter-offer",
    counterBy: "Buyer",
    message: "Our best offer for Grade B finger lot.",
  },
  {
    id: "QT-203",
    lotId: "LOT-2841",
    lotDescription: "Erode finger turmeric",
    buyerName: "Agmark Foods",
    price: 128,
    qty: 12,
    status: "Accepted",
    message: "Contract CNT-0092 generated.",
  },
];

const initialContracts: Contract[] = [
  {
    id: "CNT-0091",
    lotId: "LOT-2839",
    lotDescription: "Erode finger turmeric (12 MT)",
    buyerName: "R.K. Traders Pvt. Ltd",
    fpoName: "Nashik Agro FPO",
    qty: 12,
    price: 134,
    amount: 16.08,
    status: "eSign pending",
    fpoSigned: true,
    buyerSigned: false,
    escrowStatus: "Pending Deposit",
  },
  {
    id: "CNT-0090",
    lotId: "LOT-2837",
    lotDescription: "Salem finger turmeric (8.8 MT)",
    buyerName: "Spice Exports Ltd",
    fpoName: "Nashik Agro FPO",
    qty: 8.8,
    price: 131,
    amount: 11.5,
    status: "Signed",
    fpoSigned: true,
    buyerSigned: true,
    escrowStatus: "Deposited",
  },
  {
    id: "CNT-0088",
    lotId: "LOT-2835",
    lotDescription: "Nizamabad premium (7 MT)",
    buyerName: "Agmark Foods",
    fpoName: "Nashik Agro FPO",
    qty: 7,
    price: 127,
    amount: 8.9,
    status: "Signed",
    fpoSigned: true,
    buyerSigned: true,
    escrowStatus: "Released",
  },
];

const initialDisputes: Dispute[] = [
  {
    id: "DSP-004",
    type: "Quality mismatch",
    lotId: "LOT-2831",
    buyerName: "Agmark Foods",
    fpoName: "Pune Agro FPO",
    description: "Curcumin below specification standard. Expected 4.5%, tested 3.8%.",
    status: "Review",
    filedAt: "3 days ago",
  },
  {
    id: "DSP-005",
    type: "Payment delay",
    lotId: "LOT-2829",
    buyerName: "NutriTrade Co.",
    fpoName: "Salem Farmers FPO",
    description: "Escrow funds deposit timeline exceeded by 48 hours.",
    status: "Pending",
    filedAt: "5 days ago",
  },
];

const initialLogs: SystemLog[] = [
  {
    id: "LOG-001",
    channel: "WhatsApp",
    recipient: "+91 98452 10293 (Nashik Agro FPO)",
    message: "New AI Buyer Match found for Erode finger turmeric (LOT-2841). R.K. Traders Pvt. Ltd matched with 91% confidence score.",
    timestamp: "10 min ago",
  },
  {
    id: "LOG-002",
    channel: "Email",
    recipient: "purchase@rktraders.in",
    message: "Agronomic Alert: Nizamabad premium turmeric (LOT-2843) uploaded. Fits your curcumin requirement criteria. WhatsApp alert dispatched.",
    timestamp: "8 mins ago",
  },
  {
    id: "LOG-003",
    channel: "System",
    recipient: "Escrow Daemon",
    message: "Auto-generated contract CNT-0091 for LOT-2839 uploaded to vault.",
    timestamp: "1 day ago",
  },
];

const initialSplits: FarmerSplit[] = [
  { lotId: "LOT-2837", farmerName: "Ramesh Patil", sharePercent: 28, amount: 225000, status: "Paid" },
  { lotId: "LOT-2837", farmerName: "Suresh Jadhav", sharePercent: 22, amount: 177000, status: "Paid" },
  { lotId: "LOT-2837", farmerName: "Priya Kulkarni", sharePercent: 17, amount: 137000, status: "Paid" },
  { lotId: "LOT-2837", farmerName: "Ganesh More", sharePercent: 33, amount: 266000, status: "Paid" },
];

const initialLedger: LedgerEntry[] = [
  {
    id: "TXN-9021",
    contractId: "CNT-0091",
    type: "Credit",
    party: "R.K. Traders Pvt. Ltd",
    amount: 1608000,
    timestamp: "2 days ago",
  },
];

const initialRoles: SystemRole[] = [
  { id: 1, name: "Superadmin", description: "Full system access", is_superadmin: true, usersAssigned: 2, created: "Jan 1, 2024" },
  { id: 2, name: "Manager", description: "Manages users and reports", is_superadmin: false, usersAssigned: 5, created: "Mar 10, 2024" },
  { id: 3, name: "Viewer", description: "Read-only access", is_superadmin: false, usersAssigned: 0, created: "Apr 22, 2024" },
];

const initialPermissions: Record<number, RolePermissions> = {
  2: {
    Dashboard:    { view: true,  add: false, edit: false, delete: false },
    Users:        { view: true,  add: true,  edit: true,  delete: false },
    Roles:        { view: true,  add: false, edit: false, delete: false },
    Reports:      { view: true,  add: false, edit: false, delete: false },
    Settings:     { view: false, add: false, edit: false, delete: false },
    Billing:      { view: false, add: false, edit: false, delete: false },
    "Audit Logs": { view: true,  add: false, edit: false, delete: false },
  },
  3: {
    Dashboard:    { view: true,  add: false, edit: false, delete: false },
    Users:        { view: true,  add: false, edit: false, delete: false },
    Roles:        { view: false, add: false, edit: false, delete: false },
    Reports:      { view: true,  add: false, edit: false, delete: false },
    Settings:     { view: false, add: false, edit: false, delete: false },
    Billing:      { view: false, add: false, edit: false, delete: false },
    "Audit Logs": { view: false, add: false, edit: false, delete: false },
  },
};

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

  // State arrays representing client-side mock databases
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
  };

  const setActiveTabForRole = (role: Role, tab: string) => {
    setActiveTabs((prev) => ({ ...prev, [role]: tab }));
  };

  // Trigger simulated AI matching for new lots
  const runAiMatching = (newLot: Lot) => {
    // Stage 1: Add to AI Matching queue logs
    const l1: SystemLog = {
      id: `LOG-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      channel: "System",
      recipient: "AI Matching Core",
      message: `Scanning buyers for ${newLot.id} (${newLot.qty} MT, ${newLot.grade}) with price expectation ₹${newLot.priceExpectation}/kg.`,
      timestamp: "Just now",
    };
    setLogs((prev) => [l1, ...prev]);

    // Simulate standard delay
    setTimeout(() => {
      setLots((prevLots) =>
        prevLots.map((l) => {
          if (l.id === newLot.id) {
            // update status and generate matches
            const generatedMatches = [
              { buyerName: "R.K. Traders", matchScore: 92, offeredPrice: newLot.priceExpectation - 2 },
              { buyerName: "Spice Exports", matchScore: 87, offeredPrice: newLot.priceExpectation - 4 },
              { buyerName: "Agmark Foods", matchScore: 82, offeredPrice: newLot.priceExpectation - 5 },
            ];
            return {
              ...l,
              status: "Matched",
              matches: generatedMatches,
            };
          }
          return l;
        })
      );

      // Log success matching
      const l2: SystemLog = {
        id: `LOG-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        channel: "WhatsApp",
        recipient: `+91 99000 12345 (${newLot.fpoName})`,
        message: `AI Matching Complete for ${newLot.id}: 3 buyers matching > 80% found. Top match: R.K. Traders.`,
        timestamp: "Just now",
      };
      const l3: SystemLog = {
        id: `LOG-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        channel: "Email",
        recipient: "purchase@rktraders.in",
        message: `Alert: New lot ${newLot.id} meets your procurement requirements. Expected price: ₹${newLot.priceExpectation}/kg.`,
        timestamp: "Just now",
      };
      setLogs((prev) => [l2, l3, ...prev]);
      showToast(`AI Matching completed for ${newLot.id}! matches found.`, "info");
    }, 2500);
  };

  // Actions
  const uploadLot = (lotData: Omit<Lot, "id" | "status" | "createdAt" | "fpoName">) => {
    const lotId = `LOT-${Math.floor(2845 + Math.random() * 1000)}`;
    const newLot: Lot = {
      ...lotData,
      id: lotId,
      status: "Pending match",
      fpoName: "Nashik Agro FPO", // Hardcoded user FPO for demo
      createdAt: "Just now",
    };

    setLots((prev) => [newLot, ...prev]);
    showToast(`${lotId} uploaded · AI matching started`, "success");

    // run matching simulation
    runAiMatching(newLot);
  };

  const submitBuyerQuote = (lotId: string, price: number, qty: number, msg?: string) => {
    const quoteId = `QT-${Math.floor(205 + Math.random() * 100)}`;
    const lot = lots.find((l) => l.id === lotId);
    
    const newQuote: Quote = {
      id: quoteId,
      lotId,
      lotDescription: lot?.description || "Finger turmeric",
      buyerName: "Spice Exports Ltd", // Demo buyer
      price,
      qty,
      status: "Awaiting response",
      message: msg || "Premium bid for high curcumin lot.",
    };

    setQuotes((prev) => [newQuote, ...prev]);
    
    // Update lot status to Quoting
    setLots((prev) =>
      prev.map((l) => (l.id === lotId ? { ...l, status: "Quoting" } : l))
    );

    // AI Notification
    const newLog: SystemLog = {
      id: `LOG-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      channel: "System",
      recipient: "FPO Notifications",
      message: `Buyer Spice Exports submitted a bid of ₹${price}/kg for ${lotId}. Notification sent via SMS.`,
      timestamp: "Just now",
    };
    setLogs((prev) => [newLog, ...prev]);

    showToast(`Quote ${quoteId} submitted successfully for ₹${price}/kg.`, "success");
  };

  const submitBuyerCounter = (quoteId: string, price: number, msg?: string) => {
    setQuotes((prev) =>
      prev.map((q) =>
        q.id === quoteId
          ? {
              ...q,
              price,
              status: "Counter-offer",
              counterBy: "Buyer",
              message: msg || "Revised buyer counter offer.",
            }
          : q
      )
    );

    // Find quote to get Lot ID
    const quote = quotes.find((q) => q.id === quoteId);
    if (quote) {
      setLots((prev) =>
        prev.map((l) => (l.id === quote.lotId ? { ...l, status: "Counter-offer" } : l))
      );
    }

    showToast(`Counter offer submitted: ₹${price}/kg`, "success");
  };

  const respondToQuote = (quoteId: string, action: "accept" | "reject" | "counter", counterPrice?: number) => {
    const quote = quotes.find((q) => q.id === quoteId);
    if (!quote) return;

    if (action === "accept") {
      // 1. Update quote status
      setQuotes((prev) =>
        prev.map((q) => (q.id === quoteId ? { ...q, status: "Accepted" } : q))
      );

      // 2. Generate contract
      const contractId = `CNT-00${Math.floor(92 + Math.random() * 8)}`;
      const totalAmt = parseFloat(((quote.qty * 1000 * quote.price) / 100000).toFixed(2)); // in Lakhs
      const newContract: Contract = {
        id: contractId,
        lotId: quote.lotId,
        lotDescription: `${quote.lotDescription} (${quote.qty} MT)`,
        buyerName: quote.buyerName,
        fpoName: "Nashik Agro FPO",
        qty: quote.qty,
        price: quote.price,
        amount: totalAmt,
        status: "eSign pending",
        fpoSigned: true, // Signed by FPO accepting it
        buyerSigned: false,
        escrowStatus: "Pending Deposit",
      };

      setContracts((prev) => [newContract, ...prev]);

      // 3. Update lot status
      setLots((prev) =>
        prev.map((l) => (l.id === quote.lotId ? { ...l, status: "Matched" } : l))
      );

      // 4. Log system event
      const newLog: SystemLog = {
        id: `LOG-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        channel: "System",
        recipient: "Escrow & Buyer Vault",
        message: `Contract ${contractId} generated. FPO eSign attached. Awaiting buyer Aadhaar eSign.`,
        timestamp: "Just now",
      };
      setLogs((prev) => [newLog, ...prev]);

      showToast(`Quote accepted. Contract ${contractId} generated!`, "success");
    } else if (action === "reject") {
      setQuotes((prev) =>
        prev.map((q) => (q.id === quoteId ? { ...q, status: "Rejected" } : q))
      );
      showToast(`Quote ${quoteId} rejected.`, "warning");
    } else if (action === "counter" && counterPrice) {
      setQuotes((prev) =>
        prev.map((q) =>
          q.id === quoteId
            ? {
                ...q,
                price: counterPrice,
                status: "Counter-offer",
                counterBy: "FPO",
                message: "FPO Counter offer expectation.",
              }
            : q
        )
      );

      setLots((prev) =>
        prev.map((l) => (l.id === quote.lotId ? { ...l, status: "Counter-offer" } : l))
      );

      const newLog: SystemLog = {
        id: `LOG-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        channel: "WhatsApp",
        recipient: `Buyer (${quote.buyerName})`,
        message: `FPO countered quote ${quoteId} at ₹${counterPrice}/kg. SMS alert dispatched.`,
        timestamp: "Just now",
      };
      setLogs((prev) => [newLog, ...prev]);

      showToast(`Counter offer of ₹${counterPrice}/kg sent to buyer.`, "info");
    }
  };

  const signContract = (contractId: string, method: "esign" | "dsc") => {
    if (method === "dsc") {
      showToast("DSC module launched", "info");
      return;
    }

    let lotIdOfContract = "";
    let contractAmt = 0;
    let contractBuyer = "";
    let contractFpo = "";

    setContracts((prev) =>
      prev.map((c) => {
        if (c.id === contractId) {
          lotIdOfContract = c.lotId;
          contractAmt = c.amount * 100000; // in Rupees
          contractBuyer = c.buyerName;
          contractFpo = c.fpoName;
          return {
            ...c,
            buyerSigned: true,
            status: "Signed",
            escrowStatus: "Deposited", // Automatically mock escrow deposit for the demo logic
          };
        }
        return c;
      })
    );

    // Update lot status to Dispatched
    if (lotIdOfContract) {
      setLots((prev) =>
        prev.map((l) => (l.id === lotIdOfContract ? { ...l, status: "Dispatched" } : l))
      );

      // Create Ledger entry for Escrow deposit
      const ledgerId = `TXN-${Math.floor(9022 + Math.random() * 100)}`;
      const newLedger: LedgerEntry = {
        id: ledgerId,
        contractId,
        type: "Credit",
        party: contractBuyer,
        amount: contractAmt,
        timestamp: "Just now",
      };
      setLedger((prev) => [newLedger, ...prev]);

      // Generate Farmer splits for FPO payout
      const newSplits: FarmerSplit[] = [
        { lotId: lotIdOfContract, farmerName: "Ramesh Patil", sharePercent: 28, amount: contractAmt * 0.28, status: "Pending" },
        { lotId: lotIdOfContract, farmerName: "Suresh Jadhav", sharePercent: 22, amount: contractAmt * 0.22, status: "Pending" },
        { lotId: lotIdOfContract, farmerName: "Priya Kulkarni", sharePercent: 17, amount: contractAmt * 0.17, status: "Pending" },
        { lotId: lotIdOfContract, farmerName: "Ganesh More", sharePercent: 33, amount: contractAmt * 0.33, status: "Pending" },
      ];
      setSplits((prev) => [...prev.filter(s => s.lotId !== lotIdOfContract), ...newSplits]);

      // System Log
      const newLog: SystemLog = {
        id: `LOG-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        channel: "System",
        recipient: "Escrow Ledger",
        message: `Funds of ₹${(contractAmt/100000).toFixed(2)}L deposited into escrow under ${contractId}. Shipment transit initialized.`,
        timestamp: "Just now",
      };
      setLogs((prev) => [newLog, ...prev]);
    }

    showToast(`Contract ${contractId} signed successfully!`, "success");
  };

  const releaseFunds = (contractId: string) => {
    let lotId = "";
    let contractAmt = 0;
    let buyer = "";
    let fpo = "";

    setContracts((prev) =>
      prev.map((c) => {
        if (c.id === contractId) {
          lotId = c.lotId;
          contractAmt = c.amount * 100000;
          buyer = c.buyerName;
          fpo = c.fpoName;
          return {
            ...c,
            escrowStatus: "Released",
          };
        }
        return c;
      })
    );

    // Update splits to Paid
    if (lotId) {
      setSplits((prev) =>
        prev.map((s) => (s.lotId === lotId ? { ...s, status: "Paid" } : s))
      );

      // Update Lot to delivered / GRN Issued
      setLots((prev) =>
        prev.map((l) => (l.id === lotId ? { ...l, status: "Delivered" } : l))
      );

      // Create Ledger Debit entry for releasing to FPO
      const ledgerId = `TXN-${Math.floor(9050 + Math.random() * 100)}`;
      const newLedger: LedgerEntry = {
        id: ledgerId,
        contractId,
        type: "Debit",
        party: fpo,
        amount: contractAmt,
        timestamp: "Just now",
      };
      setLedger((prev) => [newLedger, ...prev]);

      // Log it
      const newLog: SystemLog = {
        id: `LOG-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        channel: "System",
        recipient: "Bank Gateway",
        message: `Escrow funds of ₹${(contractAmt/100000).toFixed(2)}L disbursed. Splits released to farmers.`,
        timestamp: "Just now",
      };
      setLogs((prev) => [newLog, ...prev]);
    }

    showToast(`Funds released to FPO and farmers!`, "success");
  };

  const resolveDispute = (disputeId: string) => {
    setDisputes((prev) =>
      prev.map((d) => (d.id === disputeId ? { ...d, status: "Resolved" } : d))
    );

    const dispute = disputes.find((d) => d.id === disputeId);
    if (dispute) {
      const newLog: SystemLog = {
        id: `LOG-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        channel: "System",
        recipient: "MahaFPC Arbitration",
        message: `Dispute ${disputeId} regarding lot ${dispute.lotId} resolved by Regulator. Settlement terms dispatched.`,
        timestamp: "Just now",
      };
      setLogs((prev) => [newLog, ...prev]);
    }

    showToast(`Dispute ${disputeId} resolved.`, "success");
  };

  const createRole = (name: string, description: string) => {
    // TODO: POST /api/roles
    const newId = roles.length > 0 ? Math.max(...roles.map((r) => r.id)) + 1 : 1;
    const today = new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const createdStr = `${months[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
    
    const newRole: SystemRole = {
      id: newId,
      name,
      description,
      is_superadmin: false,
      usersAssigned: 0,
      created: createdStr,
    };
    
    setRoles((prev) => [...prev, newRole]);
  };

  const updateRole = (id: number, name: string, description: string) => {
    // TODO: POST /api/roles
    setRoles((prev) =>
      prev.map((r) => (r.id === id ? { ...r, name, description } : r))
    );
  };

  const deleteRole = (id: number) => {
    // TODO: POST /api/roles
    setRoles((prev) => prev.filter((r) => r.id !== id));
    // Clean up permissions
    setPermissions((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const savePermissions = (roleId: number, perms: RolePermissions) => {
    // TODO: POST /api/roles
    setPermissions((prev) => ({
      ...prev,
      [roleId]: perms,
    }));
  };

  const assignUserRole = (roleId: number | null) => {
    // TODO: POST /api/roles
    setCurrentUserRoleId(roleId);
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
