"use client";

import React, { useEffect, useState } from "react";
import { useApp, Dispute } from "@/context/AppContext";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { DataTable } from "@/components/DataTable";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { ChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { useRouter } from "next/navigation";
import {
  IconReceipt,
  IconBell,
  IconShieldLock,
  IconTruck,
  IconX,
} from "@tabler/icons-react";

export default function BuyerDashboard() {
  const router = useRouter();
  const {
    loginAsRole,
    activeTabs,
    setActiveTabForRole,
    lots,
    quotes,
    contracts,
    openModal,
    showToast,
    fundEscrow,
    issueGrn,
    releaseFunds,
    respondToQuote,
    disputes,
    fileDispute,
  } = useApp();

  const activeTab = activeTabs.buyer || "Overview";

  // Ensure role is synchronized and protected
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedRole = localStorage.getItem("user_role");
    if (!token || !savedRole) {
      router.push("/auth");
    } else if (savedRole !== "buyer") {
      router.push(`/${savedRole}`);
    } else {
      loginAsRole("buyer");
    }
  }, [loginAsRole, router]);

  const [selectedEscrowContractId, setSelectedEscrowContractId] = useState<string>("");
  const [selectedGrnContractId, setSelectedGrnContractId] = useState<string>("");

  const { categories, buyerPreferences, updateBuyerPreferences } = useApp();
  const [categoryProducts, setCategoryProducts] = useState<Record<number, any[]>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (activeTab === "Product Preferences" && categories.length > 0) {
      categories.forEach(async (cat) => {
        if (!categoryProducts[cat.id]) {
          try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:8000/lots/product-categories/${cat.id}/products`, {
              headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
              const data = await res.json();
              setCategoryProducts(prev => ({ ...prev, [cat.id]: data }));
            }
          } catch (err) {
            console.error("Failed to load products for category", cat.id, err);
          }
        }
      });
    }
  }, [activeTab, categories]);

  useEffect(() => {
    const fundable = contracts.filter((c) => c.status === "Signed" && c.escrowStatus === "Pending Deposit");
    if (fundable.length > 0 && !selectedEscrowContractId) {
      setSelectedEscrowContractId(fundable[0].id);
    }
    const dispatched = contracts.filter((c) => c.status === "Dispatched");
    if (dispatched.length > 0 && !selectedGrnContractId) {
      setSelectedGrnContractId(dispatched[0].id);
    }
  }, [contracts]);

  // Dismissible onboarding banner state (persisted per user in localStorage)
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  useEffect(() => {
    const email = localStorage.getItem("user_email") || "buyer";
    const dismissed = localStorage.getItem(`onboarding_dismissed_${email}`);
    if (dismissed === "true") setOnboardingDismissed(true);
  }, []);

  const dismissOnboarding = () => {
    const email = localStorage.getItem("user_email") || "buyer";
    localStorage.setItem(`onboarding_dismissed_${email}`, "true");
    setOnboardingDismissed(true);
  };

  // Views rendering
  const renderOverview = () => {
    const unsignedContracts = contracts.filter((c) => !c.buyerSigned);
    const alertLots = lots.filter((l) => l.status === "Pending match" || l.status === "Matched" || l.status === "Quoting");

    return (
      <div className="space-y-6">
        <PageHeader title="Overview" subtitle="Procurement alerts, quotes, escrow, and goods receipt" />

        {/* Onboarding Banner for New Users */}
        {lots.length === 0 && !onboardingDismissed && (
          <div className="bg-gradient-to-r from-teal-bg to-bg-s border border-primary/20 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative">
            <button
              onClick={dismissOnboarding}
              className="absolute top-3 right-3 text-tx-t hover:text-tx-p transition-colors"
              aria-label="Dismiss onboarding"
            >
              <IconX className="w-4 h-4" />
            </button>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-tx-p flex items-center gap-2">
                <span>Welcome to Buyer Portal Onboarding!</span>
              </h3>
              <p className="text-xs text-tx-s max-w-2xl leading-relaxed">
                Logically, first-time users have zero active trade transactions. We have prepared an onboarding guide explaining how to browse lots, submit quotes, deposit escrow, and confirm delivery.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => { openModal("user-guide"); dismissOnboarding(); }}
              className="text-xs font-semibold px-4 whitespace-nowrap"
            >
              Open Quick Start Guide
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            label="New lot alerts"
            value={alertLots.length.toString()}
            sub="Live market listings"
            trend="neutral"
            trendValue="Active"
            icon={<IconBell className="w-5 h-5" />}
            accentColor="#0F766E"
            iconBg="#CCFBF1"
            onClick={() => setActiveTabForRole("buyer", "Lot alerts")}
          />
          <KpiCard
            label="Active quotes"
            value={quotes.filter((q) => q.status === "Awaiting response" || q.status === "Counter-offer").length.toString()}
            sub="Negotiations active"
            trend="neutral"
            trendValue="Active"
            icon={<IconReceipt className="w-5 h-5" />}
            accentColor="#F59E0B"
            iconBg="#FFFBEB"
            onClick={() => setActiveTabForRole("buyer", "My quotes")}
          />
          <KpiCard
            label="Escrow funded"
            value={`₹${contracts.filter((c) => c.escrowStatus === "Deposited").reduce((acc, c) => acc + c.amount, 0).toFixed(2)}L`}
            sub="Locked funds"
            trend="neutral"
            trendValue="Secure"
            icon={<IconShieldLock className="w-5 h-5" />}
            accentColor="#6366F1"
            iconBg="#EEF2FF"
            onClick={() => setActiveTabForRole("buyer", "Escrow")}
          />
          <KpiCard
            label="GRN pending"
            value={contracts.filter((c) => c.status === "Signed" && c.escrowStatus === "Deposited" && !c.grnNumber).length.toString()}
            sub="Awaiting delivery"
            trend="neutral"
            trendValue="Transit"
            icon={<IconTruck className="w-5 h-5" />}
            accentColor="#EF4444"
            iconBg="#FEF2F2"
            onClick={() => setActiveTabForRole("buyer", "Issue GRN")}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 space-y-5">
            <Card title="Latest lot alerts">
              <div className="space-y-3">
                {alertLots.length === 0 ? (
                  <div className="text-center py-8 text-tx-t text-xs font-semibold border border-dashed border-bd-t rounded-xl">
                    No active lots listed in the market.
                  </div>
                ) : (
                  alertLots.slice(0, 3).map((l) => (
                    <div key={l.id} className="flex items-center justify-between py-2 border-b border-bd-t last:border-none text-[12px] font-semibold">
                      <div className="flex items-start gap-2.5">
                        <div className="w-2 h-2 rounded-full mt-1.5 bg-teal-accent shrink-0" />
                        <div>
                          <div className="text-tx-p font-bold">
                            {l.id} &middot; {l.qty} MT {l.description} &middot; ₹{l.priceExpectation}/kg
                          </div>
                          <div className="text-[10px] text-tx-t mt-0.5">Location: {l.location} &middot; Grade: {l.grade}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => openModal("buyer-lot-details", { lot: l })}
                        className="px-2.5 py-0.5 text-[11px] font-bold text-white bg-amb hover:bg-amb-m rounded transition-colors shrink-0"
                      >
                        Details
                      </button>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <ChartPlaceholder title="Transaction Analytics" subtitle="Monthly procurement volume" type="area" color="#14B8A6" />
          </div>

          <div className="lg:col-span-5 space-y-5">
            <Card title="Awaiting signature">
              <div className="space-y-3">
                {unsignedContracts.length === 0 ? (
                  <div className="text-center py-8 text-tx-t text-xs font-semibold border border-dashed border-bd-t rounded-xl">
                    No contracts awaiting signature.
                  </div>
                ) : (
                  unsignedContracts.map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-2 border-b border-bd-t last:border-none text-[12px] font-semibold">
                      <div>
                        <div className="text-tx-p font-bold">{c.id} &middot; {c.lotDescription} &middot; ₹{c.amount.toFixed(2)}L</div>
                        <div className="text-[10px] text-cor font-bold uppercase mt-0.5">eSign Pending</div>
                      </div>
                      <button
                        onClick={() => openModal("buyer-esign", { contract: c })}
                        className="px-2.5 py-0.5 text-[11px] font-bold text-white bg-amb hover:bg-amb-m rounded transition-colors shrink-0"
                      >
                        Sign
                      </button>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card title="Active purchases">
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-bd-t text-[12px] font-semibold">
                  <div>
                    <div className="text-tx-p font-bold">CNT-0090 &middot; LOT-2837</div>
                    <div className="text-[10px] text-tx-t mt-0.5">GRN issued &middot; Complete</div>
                  </div>
                  <span className="bg-teal-bg text-teal-accent px-2 py-0.5 rounded text-[11px] font-semibold border border-teal-m/30">Complete</span>
                </div>
                <div className="flex items-center justify-between py-2 text-[12px] font-semibold">
                  <div>
                    <div className="text-tx-p font-bold">CNT-0089 &middot; LOT-2835</div>
                    <div className="text-[10px] text-tx-t mt-0.5">In transit &middot; ETA today</div>
                  </div>
                  <span className="bg-pur-bg text-pur px-2 py-0.5 rounded text-[11px] font-semibold border border-pur-m/30">In transit</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const renderLotAlerts = () => {
    const alertLots = lots.filter((l) => l.status === "Pending match" || l.status === "Matched" || l.status === "Quoting");
    const columns = [
      {
        header: "Photo",
        render: (item: any) => (
          <div className="w-10 h-10 rounded overflow-hidden border border-bd-s relative bg-bg-p flex items-center justify-center shadow-sm shrink-0">
            {item.productPhoto ? (
              <img
                src={`http://localhost:8000${item.productPhoto}`}
                alt={item.description}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-amb/10 flex items-center justify-center text-amb text-[9px] font-bold">
                No Photo
              </div>
            )}
          </div>
        ),
      },
      {
        header: "Lot ID",
        render: (item: any) => <span className="font-mono font-bold text-tx-p">{item.id}</span>,
      },
      {
        header: "Crop Lot Description",
        render: (item: any) => (
          <div className="space-y-0.5">
            <span className="font-bold text-tx-p block">{item.description}</span>
            {item.curcuminPercent && (
              <span className="text-[10px] text-tx-t">Curcumin: {item.curcuminPercent}%</span>
            )}
          </div>
        ),
      },
      {
        header: "Qty",
        render: (item: any) => <span>{item.qty} MT</span>,
      },
      {
        header: "Grade",
        render: (item: any) => <span>{item.grade}</span>,
      },
      {
        header: "Target Price",
        render: (item: any) => <span className="font-bold text-tx-p">₹{item.priceExpectation}/kg</span>,
      },
      {
        header: "Channel",
        render: () => (
          <span className="text-[10px] text-amb font-semibold bg-amb-bg px-1.5 py-0.5 rounded border border-amb-m/15">
            WhatsApp + Email
          </span>
        ),
      },
      {
        header: "Action",
        render: (item: any) => (
          <button
            onClick={() => openModal("buyer-quote", { lot: item })}
            className="px-2.5 py-0.5 text-[11px] font-bold text-white bg-amb hover:bg-amb-m rounded-sm transition-colors"
          >
            Quote
          </button>
        ),
      },
    ];

    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setActiveTabForRole("buyer", "Overview")}
          className="flex items-center gap-1 text-tx-s hover:text-tx-p font-semibold text-xs transition-colors w-fit mb-2"
        >
          &larr; Back to Overview
        </button>
        <div>
          <h2 className="font-outfit font-bold text-[15px] text-tx-p leading-none">Catalog Lot Alerts</h2>
          <p className="text-[11px] text-tx-t mt-1 font-semibold">Active turmeric crop lots matched to your buyer profile.</p>
        </div>

        <DataTable
          columns={columns}
          data={alertLots}
          searchPlaceholder="Search crop alerts..."
          searchFilter={(item, q) =>
            item.id.toLowerCase().includes(q.toLowerCase()) ||
            item.description.toLowerCase().includes(q.toLowerCase()) ||
            item.grade.toLowerCase().includes(q.toLowerCase())
          }
        />
      </div>
    );
  };

  const renderMyQuotes = () => {
    const columns = [
      {
        header: "Quote ID",
        render: (item: any) => <span className="font-mono font-bold text-tx-p">{item.id}</span>,
      },
      {
        header: "Lot Ref",
        render: (item: any) => <span className="font-mono text-tx-s">{item.lotId}</span>,
      },
      {
        header: "Offered Bid",
        render: (item: any) => <span className="font-bold text-amb">₹{item.price}/kg</span>,
      },
      {
        header: "Volume",
        render: (item: any) => <span>{item.qty} MT</span>,
      },
      {
        header: "Status",
        render: (item: any) => <Pill status={item.status} />,
      },
      {
        header: "Action",
        render: (item: any) => {
          if (item.status === "Counter-offer" && item.counterBy === "FPO") {
            return (
              <div className="flex gap-1.5">
                <button
                  onClick={() => openModal("buyer-counter", { quote: item })}
                  className="px-2 py-0.5 text-[11px] font-bold text-white bg-amb hover:bg-amb-m rounded-sm transition-all"
                >
                  Counter
                </button>
                <button
                  onClick={() => {
                    const c = contracts.find((c) => c.lotId === item.lotId);
                    if (c) {
                      openModal("buyer-esign", { contract: c });
                    } else {
                      // Generate and sign contract instantly as demo shortcut
                      respondToQuote(item.id, "accept");
                      showToast("Negotiation completed. Contract generated.", "success");
                    }
                  }}
                  className="px-2 py-0.5 text-[11px] font-bold text-white bg-teal-accent hover:bg-teal-m rounded-sm transition-all"
                >
                  Accept & eSign
                </button>
              </div>
            );
          }
          return <span className="text-tx-t text-[11px] font-semibold">Under negotiation</span>;
        },
      },
    ];

    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setActiveTabForRole("buyer", "Overview")}
          className="flex items-center gap-1 text-tx-s hover:text-tx-p font-semibold text-xs transition-colors w-fit mb-2"
        >
          &larr; Back to Overview
        </button>
        <div>
          <h2 className="font-outfit font-bold text-[15px] text-tx-p leading-none">Bidding & Negotiation Console</h2>
          <p className="text-[11px] text-tx-t mt-1 font-semibold">Track bidding progress and respond to FPO counters.</p>
        </div>

        <DataTable
          columns={columns}
          data={quotes}
          searchPlaceholder="Search submitted bids..."
          searchFilter={(item, q) =>
            item.id.toLowerCase().includes(q.toLowerCase()) ||
            item.lotId.toLowerCase().includes(q.toLowerCase()) ||
            item.status.toLowerCase().includes(q.toLowerCase())
          }
        />
      </div>
    );
  };

  const renderSignContracts = () => {
    const columns = [
      {
        header: "Contract Ref",
        render: (item: any) => <span className="font-mono font-bold text-tx-p">{item.id}</span>,
      },
      {
        header: "Lot Description",
        render: (item: any) => <span>{item.lotDescription}</span>,
      },
      {
        header: "FPO Supplier",
        render: (item: any) => <span className="font-bold text-tx-p">{item.fpoName}</span>,
      },
      {
        header: "Value (Lakhs)",
        render: (item: any) => <span className="font-bold text-tx-p">₹{item.amount.toFixed(2)}L</span>,
      },
      {
        header: "Sign Status",
        render: (item: any) => <Pill status={item.status} />,
      },
      {
        header: "Actions",
        render: (item: any) => {
          if (!item.buyerSigned) {
            return (
              <div className="flex gap-1.5">
                <button
                  onClick={() => openModal("buyer-esign", { contract: item })}
                  className="px-2.5 py-0.5 text-[11px] font-bold text-white bg-amb hover:bg-amb-m rounded-sm shadow-sm transition-all"
                >
                  e-Sign
                </button>
                <button
                  onClick={() => showToast("DSC module launched", "info")}
                  className="px-2 py-0.5 text-[11px] font-bold text-tx-s bg-bg-s border border-bd-t hover:bg-bg-t rounded-sm transition-all"
                >
                  DSC Sign
                </button>
              </div>
            );
          }
          return <span className="text-teal-accent text-[11px] font-bold">Successfully eSigned</span>;
        },
      },
    ];

    return (
      <div className="space-y-4">
        <div>
          <h2 className="font-outfit font-bold text-[15px] text-tx-p leading-none">Aadhaar & DSC contract signing</h2>
          <p className="text-[11px] text-tx-t mt-1 font-semibold">Integrate electronic signatures to complete legal transaction validation.</p>
        </div>

        <DataTable
          columns={columns}
          data={contracts}
          searchPlaceholder="Search contracts..."
          searchFilter={(item, q) =>
            item.id.toLowerCase().includes(q.toLowerCase()) ||
            item.fpoName.toLowerCase().includes(q.toLowerCase())
          }
        />
      </div>
    );
  };

  const renderEscrow = () => {
    const columns = [
      {
        header: "Contract ID",
        render: (item: any) => <span className="font-mono font-bold text-tx-p">{item.id}</span>,
      },
      {
        header: "Amount Description",
        render: (item: any) => {
          let desc = `₹${item.amount.toFixed(2)}L`;
          if (item.escrowStatus === "Pending Deposit") {
            desc += " · Awaiting fund";
          } else if (item.escrowStatus === "Deposited") {
            desc += " · Funded · Awaiting dispatch/GRN";
          } else if (item.escrowStatus === "Released") {
            desc += " · Released to FPO/farmers";
          }
          return <span>{desc}</span>;
        },
      },
      {
        header: "Escrow Status",
        render: (item: any) => {
          let statusLabel = "Not funded";
          if (item.escrowStatus === "Deposited") {
            statusLabel = "In progress";
          } else if (item.escrowStatus === "Released") {
            statusLabel = "Complete";
          }
          return <Pill status={statusLabel} />;
        },
      },
    ];

    const fundedAmount = contracts
      .filter((c) => c.escrowStatus === "Deposited" || c.escrowStatus === "Released")
      .reduce((acc, c) => acc + c.amount, 0);
    const heldAmount = contracts
      .filter((c) => c.escrowStatus === "Deposited")
      .reduce((acc, c) => acc + c.amount, 0);
    const releasedAmount = contracts
      .filter((c) => c.escrowStatus === "Released")
      .reduce((acc, c) => acc + c.amount, 0);

    const fundableContracts = contracts.filter(
      (c) => c.status === "Signed" && c.escrowStatus === "Pending Deposit"
    );

    const activeContract = contracts.find((c) => c.id === selectedEscrowContractId) || fundableContracts[0];

    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setActiveTabForRole("buyer", "Overview")}
          className="flex items-center gap-1 text-tx-s hover:text-tx-p font-semibold text-xs transition-colors w-fit mb-2"
        >
          &larr; Back to Overview
        </button>
        <div className="page-hd">
          <div className="page-title">Escrow</div>
          <div className="page-sub">Fund escrow and track payment releases</div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          {[
            { label: "Total funded", val: `₹${fundedAmount.toFixed(2)}L`, sub: "All contracts" },
            { label: "Held in escrow", val: `₹${heldAmount.toFixed(2)}L`, sub: "Active locks" },
            { label: "Released to FPOs", val: `₹${releasedAmount.toFixed(2)}L`, sub: "Season to date" },
          ].map((stat, idx) => (
            <Card key={idx}>
              <div className="text-[11px] font-bold text-tx-t uppercase tracking-wider">{stat.label}</div>
              <div className="text-[20px] font-outfit font-black text-tx-p mt-1">{stat.val}</div>
              <div className="text-[11.5px] text-tx-s font-semibold mt-1">{stat.sub}</div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-6">
            {activeContract ? (
              <Card title={`Fund ${activeContract.id} · ₹${activeContract.amount.toFixed(2)}L required`} subtitle="Deposit the full contract value to activate shipment. Funds are held securely until you accept delivery.">
                <div className="space-y-3.5 text-[12px] font-semibold">
                  <div>
                    <label className="block text-[11.5px] font-bold text-tx-s mb-1">Select Contract Awaiting Funding</label>
                    <select
                      value={selectedEscrowContractId}
                      onChange={(e) => setSelectedEscrowContractId(e.target.value)}
                      className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-amb-m"
                    >
                      {fundableContracts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.id} ({c.lotDescription}) &middot; ₹{c.amount.toFixed(2)}L
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-bold text-tx-s mb-1">Bank account</label>
                    <select className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-amb-m">
                      <option>HDFC ****4521</option>
                      <option>ICICI ****8823</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-bold text-tx-s mb-1">Amount</label>
                    <input
                      type="text"
                      value={`₹${(activeContract.amount * 100000).toLocaleString()}`}
                      readOnly
                      className="w-full bg-bg-s border border-bd-t rounded px-2.5 py-1.5 font-semibold text-tx-s cursor-not-allowed select-none focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      showToast(`Depositing ₹${activeContract.amount.toFixed(2)}L to escrow...`, "info");
                      await fundEscrow(activeContract.id);
                    }}
                    className="w-full py-2 text-[11px] font-bold text-white bg-amb hover:bg-amb-m rounded transition-colors text-center"
                  >
                    Fund escrow →
                  </button>
                  <div className="mt-2 text-[10px] text-amber-600 bg-amber-50 border border-amber-200/40 rounded px-2 py-1 text-center font-bold uppercase tracking-wider">
                    Simulated Payment (Razorpay Route planned)
                  </div>
                </div>
              </Card>
            ) : (
              <Card title="No Contracts Awaiting Funding">
                <div className="text-center py-8 text-tx-t text-xs font-semibold border border-dashed border-bd-t rounded-xl">
                  All signed contracts have been successfully funded!
                </div>
              </Card>
            )}
          </div>

          <div className="col-span-6">
            <Card title="Escrow status">
              <DataTable
                columns={columns}
                data={contracts}
                emptyMessage="No contracts under escrow tracking."
              />
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const renderIncomingGoods = () => {
    const shippedContracts = contracts.filter((c) => c.status === "Dispatched" || c.status === "GRN Issued");

    return (
      <div className="space-y-4">
        <div className="page-hd">
          <div className="page-title">Incoming goods</div>
          <div className="page-sub">Track shipments from FPOs</div>
        </div>

        <Card title="Active shipments">
          <div className="space-y-4 text-[12px] font-semibold">
            {shippedContracts.length === 0 ? (
              <div className="text-center py-8 text-tx-t text-xs font-semibold border border-dashed border-bd-t rounded-xl">
                No active shipments in transit.
              </div>
            ) : (
              shippedContracts.map((c) => (
                <div key={c.id} className="border-b border-bd-t pb-3 last:border-none last:pb-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-tx-p">{c.id} &middot; {c.lotId} &middot; {c.fpoName}</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                      c.status === "GRN Issued"
                        ? "bg-teal-bg text-teal-accent border-teal-m/30"
                        : "bg-amb-bg text-amb border-amb-m/30"
                    }`}>
                      {c.status === "GRN Issued" ? "Delivered & GRN Issued" : "In transit"}
                    </span>
                  </div>
                  <div className="text-tx-s mb-2 font-medium">
                    {c.qty} MT &middot; E-Way Bill: {c.ewayBill || "EWAY-SIMULATED"} &middot; GPS: {c.gpsTrackingId || "GPS-SIMULATED"} &middot; Invoice: {c.gstInvoice || "INV-SIMULATED"}
                  </div>
                  <div className="h-1.5 rounded-full bg-bd-t overflow-hidden">
                    <div className={`h-full rounded-full ${
                      c.status === "GRN Issued" ? "bg-teal-accent" : "bg-amb animate-pulse"
                    }`} style={{ width: c.status === "GRN Issued" ? "100%" : "65%" }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    );
  };

  const renderIssueGrn = () => {
    const activeDispatchedContracts = contracts.filter((c) => c.status === "Dispatched");

    const activeContract = contracts.find((c) => c.id === selectedGrnContractId) || activeDispatchedContracts[0];

    const handleGrnFormSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (activeContract) {
        showToast(`Issuing GRN for contract ${activeContract.id}...`, "info");
        await issueGrn(activeContract.id);
        // Automatically release 70% immediate split payment from escrow to FPO & farmers
        showToast(`Releasing 70% payment for contract ${activeContract.id}...`, "info");
        await releaseFunds(activeContract.id);
      }
      setActiveTabForRole("buyer", "Overview");
    };

    return (
      <div className="max-w-[500px] mx-auto bg-bg-p border border-bd-t rounded-md p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <button
          type="button"
          onClick={() => setActiveTabForRole("buyer", "Overview")}
          className="flex items-center gap-1 text-tx-s hover:text-tx-p font-semibold text-xs transition-colors w-fit mb-4"
        >
          &larr; Back to Overview
        </button>
        <div className="border-b border-bd-t pb-3 mb-4">
          <h2 className="font-outfit font-bold text-[14px] text-tx-p flex items-center gap-1.5">
            <IconReceipt className="w-4 h-4 text-amb" />
            <span>GRN Issuance & Delivery Acceptance</span>
          </h2>
          <p className="text-[11px] text-tx-t mt-1 font-semibold">
            Issue GRN within 24 hours of delivery. This triggers the 70% payment release.
          </p>
        </div>

        {activeContract ? (
          <form onSubmit={handleGrnFormSubmit} className="space-y-3.5 text-[12px] font-semibold">
            <div>
              <label className="block text-[11.5px] font-bold text-tx-s mb-1">Select Contract to Issue GRN</label>
              <select
                value={selectedGrnContractId}
                onChange={(e) => setSelectedGrnContractId(e.target.value)}
                className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-amb-m"
              >
                {activeDispatchedContracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} &middot; {c.fpoName} &middot; {c.lotDescription}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11.5px] font-bold text-tx-s mb-1">Quantity received (MT)</label>
                <input
                  type="number"
                  step="0.1"
                  defaultValue={activeContract.qty}
                  className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-amb-m"
                  required
                />
              </div>
              <div>
                <label className="block text-[11.5px] font-bold text-tx-s mb-1">Curcumin % tested</label>
                <input
                  type="number"
                  step="0.1"
                  defaultValue={3.8}
                  className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-amb-m"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11.5px] font-bold text-tx-s mb-1">Moisture % tested</label>
                <input
                  type="number"
                  step="0.1"
                  defaultValue={9.2}
                  className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-amb-m"
                />
              </div>
              <div>
                <label className="block text-[11.5px] font-bold text-tx-s mb-1">Quality grade</label>
                <select
                  className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-amb-m"
                >
                  <option>A &mdash; Accepted</option>
                  <option>B &mdash; Accepted with discount</option>
                  <option>Rejected</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11.5px] font-bold text-tx-s mb-1">Inspection notes</label>
              <textarea
                defaultValue="Colour, aroma, and curcumin content meet contracted spec. Slight moisture variation within tolerance."
                rows={3}
                className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-amb-m"
              />
            </div>

            <div className="pt-3 border-t border-bd-t flex justify-end gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => showToast("GRN draft saved", "info")}
                className="px-3 py-1.5 text-tx-s bg-bg-s border border-bd-t rounded hover:bg-bg-t transition-colors"
              >
                Save draft
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-white bg-amb hover:bg-amb-m rounded shadow-sm transition-all"
              >
                Issue GRN &middot; Release 70%
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-8 text-tx-t text-xs font-semibold border border-dashed border-bd-t rounded-xl">
            No dispatched shipments currently awaiting GRN.
          </div>
        )}
      </div>
    );
  };

  const renderDisputes = () => {
    const filedDisputes = disputes.filter((d) => d.creatorRole === "buyer");
    const incomingDisputes = disputes.filter((d) => d.creatorRole === "fpo");

    const handleFileDispute = (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.currentTarget as HTMLFormElement;
      const type = (form.elements.namedItem("disputeType") as HTMLSelectElement).value;
      const lotId = (form.elements.namedItem("lotId") as HTMLSelectElement).value;
      const desc = (form.elements.namedItem("description") as HTMLTextAreaElement).value;
      const attachmentUrl = (form.elements.namedItem("attachmentUrl") as HTMLInputElement).value;
      
      if (!lotId || !desc) {
        showToast("Please fill in all fields to file complaint.", "error");
        return;
      }
      fileDispute(type, lotId, desc, attachmentUrl || undefined);
      form.reset();
    };

    const getColumns = (isIncoming: boolean) => [
      { header: "Case ID", render: (item: any) => <span className="font-mono font-bold text-tx-p">{item.id}</span> },
      { header: "Type", render: (item: any) => <span className="text-cor font-bold">{item.type}</span> },
      { header: "Lot ID", render: (item: any) => <span className="font-mono text-tx-s">{item.lotId}</span> },
      { header: isIncoming ? "Filer FPO" : "Supplier FPO", render: (item: any) => <span className="font-semibold text-tx-p">{item.fpoName}</span> },
      { header: "Summary", render: (item: any) => <span className="text-tx-s truncate max-w-[120px] block">{item.description}</span> },
      { header: "Status", render: (item: any) => <Pill status={item.status} /> },
      {
        header: "Action",
        render: (item: any) => (
          <Button size="sm" onClick={() => openModal("dispute-details", { dispute: item })}>
            View Thread
          </Button>
        ),
      },
    ];

    return (
      <div className="space-y-6 animate-fade-in">
        <button
          type="button"
          onClick={() => setActiveTabForRole("buyer", "Overview")}
          className="flex items-center gap-1 text-tx-s hover:text-tx-p font-semibold text-xs transition-colors w-fit mb-2"
        >
          &larr; Back to Overview
        </button>
        <PageHeader title="Disputes & Complaints" subtitle="Bidirectional complaint resolution and arbitration portal" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-4">
            <Card title="File New Dispute">
              <form onSubmit={handleFileDispute} className="space-y-4 text-[12px] font-semibold">
                <div>
                  <label className="block text-[11px] font-bold text-tx-s mb-1.5 uppercase tracking-wide">Dispute Category</label>
                  <select name="disputeType" className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-amb-m">
                    <option value="Quality mismatch">Quality mismatch</option>
                    <option value="Payment delay">Payment delay</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-tx-s mb-1.5 uppercase tracking-wide">Select Lot ID</label>
                  <select name="lotId" className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-amb-m">
                    {lots.map((l) => (
                      <option key={l.id} value={l.id}>{l.id} &middot; {l.description}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-tx-s mb-1.5 uppercase tracking-wide">Detailed Complaint Summary</label>
                  <textarea
                    name="description"
                    rows={3}
                    placeholder="Provide details about quality report differences or unpaid escrow holds..."
                    className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-amb-m"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-tx-s mb-1.5 uppercase tracking-wide">Attachment Link (optional)</label>
                  <input
                    type="text"
                    name="attachmentUrl"
                    placeholder="e.g. http://imgur.com/photo.jpg"
                    className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-amb-m"
                  />
                </div>

                <Button type="submit" className="w-full">File Dispute with MahaFPC</Button>
              </form>
            </Card>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <Card title="Filed Disputes" subtitle="Complaints raised by you against FPOs">
              <DataTable columns={getColumns(false)} data={filedDisputes} emptyMessage="No disputes filed by you." />
            </Card>

            <Card title="Incoming Disputes" subtitle="Complaints filed against you by FPOs">
              <DataTable columns={getColumns(true)} data={incomingDisputes} emptyMessage="No disputes filed against you." />
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const renderProductPreferences = () => {
    const handleCategoryToggle = (catId: number) => {
      const isSelected = buyerPreferences.categories.includes(catId);
      let newCats = [...buyerPreferences.categories];
      if (isSelected) {
        newCats = newCats.filter(id => id !== catId);
      } else {
        newCats.push(catId);
      }
      updateBuyerPreferences(newCats, buyerPreferences.product_types);
    };

    const handleProductToggle = (prodId: number) => {
      const isSelected = buyerPreferences.product_types.includes(prodId);
      let newProds = [...buyerPreferences.product_types];
      if (isSelected) {
        newProds = newProds.filter(id => id !== prodId);
      } else {
        newProds.push(prodId);
      }
      updateBuyerPreferences(buyerPreferences.categories, newProds);
    };

    const toggleExpand = (catId: number) => {
      setExpandedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
    };

    return (
      <div className="space-y-6 animate-fade-in text-[12px] font-semibold">
        <button
          type="button"
          onClick={() => setActiveTabForRole("buyer", "Overview")}
          className="flex items-center gap-1 text-tx-s hover:text-tx-p font-semibold text-xs transition-colors w-fit mb-2"
        >
          &larr; Back to Overview
        </button>
        <PageHeader title="Product Procurement Preferences" subtitle="Configure matching logic at the category or product level" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {categories.map((cat) => {
            const isCatSelected = buyerPreferences.categories.includes(cat.id);
            const isExpanded = !!expandedCategories[cat.id];
            const prods = categoryProducts[cat.id] || [];

            return (
              <Card key={cat.id}>
                <div className="flex items-center justify-between pb-3 border-b border-bd-t">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{cat.emoji || "🌱"}</span>
                    <div>
                      <h4 className="text-sm font-bold text-tx-p">{cat.name}</h4>
                      <p className="text-[10px] text-tx-t">Configure preferences for this group</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleExpand(cat.id)}
                      className="px-2 py-1 text-[10px] bg-bg-s border border-bd-s rounded text-tx-s hover:text-tx-p transition-colors font-bold"
                    >
                      {isExpanded ? "Collapse" : `Expand (${prods.length})`}
                    </button>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isCatSelected}
                        onChange={() => handleCategoryToggle(cat.id)}
                        className="rounded border-bd-s text-amb focus:ring-amb-m w-4 h-4"
                      />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-tx-s">All</span>
                    </label>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3.5 space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {prods.length === 0 ? (
                      <div className="text-center py-4 text-tx-t text-xs font-semibold">
                        No product options available.
                      </div>
                    ) : (
                      prods.map((prod) => {
                        const isProdSelected = buyerPreferences.product_types.includes(prod.id);
                        return (
                          <label key={prod.id} className="flex items-center justify-between p-2 rounded-lg bg-bg-s border border-bd-t hover:bg-bg-p transition-colors cursor-pointer">
                            <span className="text-tx-p font-medium">{prod.name}</span>
                            <input
                              type="checkbox"
                              checked={isProdSelected || isCatSelected}
                              disabled={isCatSelected}
                              onChange={() => handleProductToggle(prod.id)}
                              className="rounded border-bd-s text-amb focus:ring-amb-m w-4 h-4 disabled:opacity-50"
                            />
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <DashboardShell>
      {activeTab === "Overview" && renderOverview()}
      {activeTab === "Lot alerts" && renderLotAlerts()}
      {activeTab === "My quotes" && renderMyQuotes()}
      {activeTab === "Sign contracts" && renderSignContracts()}
      {activeTab === "Escrow" && renderEscrow()}
      {activeTab === "Incoming goods" && renderIncomingGoods()}
      {activeTab === "Issue GRN" && renderIssueGrn()}
      {activeTab === "Disputes" && renderDisputes()}
    </DashboardShell>
  );
}
