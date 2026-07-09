"use client";

import React, { useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { DataTable } from "@/components/DataTable";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { ChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import {
  IconReceipt,
  IconBell,
  IconShieldLock,
  IconTruck,
} from "@tabler/icons-react";

export default function BuyerDashboard() {
  const {
    loginAsRole,
    activeTabs,
    setActiveTabForRole,
    lots,
    quotes,
    contracts,
    openModal,
    showToast,
    releaseFunds,
    respondToQuote,
  } = useApp();

  // Ensure role is synchronized
  useEffect(() => {
    loginAsRole("buyer");
  }, [loginAsRole]);

  const activeTab = activeTabs.buyer || "Overview";

  // Views rendering
  const renderOverview = () => {
    const unsignedContracts = contracts.filter((c) => !c.buyerSigned);

    return (
      <div className="space-y-6">
        <PageHeader title="Overview" subtitle="Procurement alerts, quotes, escrow, and goods receipt" />

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard label="New lot alerts" value="9" sub="3 via WhatsApp" trend="up" trendValue="+3" icon={<IconBell className="w-5 h-5" />} accentColor="#0F766E" iconBg="#CCFBF1" />
          <KpiCard label="Active quotes" value="3" sub="1 counter pending" trend="neutral" trendValue="Active" icon={<IconReceipt className="w-5 h-5" />} accentColor="#F59E0B" iconBg="#FFFBEB" />
          <KpiCard label="Escrow funded" value="₹11L" sub="2 contracts" trend="up" trendValue="+₹2L" icon={<IconShieldLock className="w-5 h-5" />} accentColor="#6366F1" iconBg="#EEF2FF" />
          <KpiCard label="GRN pending" value="1" sub="Delivery today" trend="down" trendValue="Urgent" icon={<IconTruck className="w-5 h-5" />} accentColor="#EF4444" iconBg="#FEF2F2" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 space-y-5">
            <Card title="Latest lot alerts">
              <div className="space-y-3">
                {[
                  { id: "LOT-2843", desc: "20 MT Nizamabad premium", price: "₹132/kg", time: "8 min ago · WhatsApp + Email", bid: true },
                  { id: "LOT-2841", desc: "12 MT Erode A", price: "₹128/kg", time: "22 min ago · SMS", bid: false },
                  { id: "LOT-2845", desc: "6 MT Erode B", price: "₹121/kg", time: "1 hr ago · Email", bid: false },
                ].map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between py-2 border-b border-bd-t last:border-none text-[12px] font-semibold">
                    <div className="flex items-start gap-2.5">
                      <div className="w-2 h-2 rounded-full mt-1.5 bg-teal-accent shrink-0" />
                      <div>
                        <div className="text-tx-p font-bold">{alert.id} &middot; {alert.desc} &middot; {alert.price}</div>
                        <div className="text-[10px] text-tx-t mt-0.5">{alert.time}</div>
                      </div>
                    </div>
                    {alert.bid ? (
                      <button
                        onClick={() => {
                          const lot = lots.find(l => l.id === alert.id);
                          if (lot) openModal("buyer-quote", { lot });
                        }}
                        className="px-2.5 py-0.5 text-[11px] font-bold text-white bg-amb hover:bg-amb-m rounded transition-colors shrink-0"
                      >
                        Quote
                      </button>
                    ) : (
                      <button
                        onClick={() => showToast(`Viewing ${alert.id}`, "info")}
                        className="px-2.5 py-0.5 text-[11px] font-bold text-tx-s bg-bg-s border border-bd-t hover:bg-bg-t rounded transition-colors shrink-0"
                      >
                        View
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            <ChartPlaceholder title="Transaction Analytics" subtitle="Monthly procurement volume" type="area" color="#14B8A6" />
          </div>

          <div className="lg:col-span-5 space-y-5">
            <Card title="Awaiting signature">
              <div className="space-y-3">
                {unsignedContracts.map((c) => (
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
                ))}
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
        header: "Lot ID",
        render: (item: any) => <span className="font-mono font-bold text-tx-p">{item.id}</span>,
      },
      {
        header: "Crop Lot Description",
        render: (item: any) => <span>{item.description}</span>,
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
        render: (item: any) => (
          <span>
            {item.id === "CNT-0091"
              ? "₹16.08L · Awaiting fund"
              : item.id === "CNT-0090"
                ? "₹11.5L · 70% released · 30% in window"
                : "₹8.9L · Fully released"}
          </span>
        ),
      },
      {
        header: "Escrow Status",
        render: (item: any) => (
          <Pill
            status={item.id === "CNT-0091" ? "Not funded" : item.id === "CNT-0090" ? "In progress" : "Complete"}
          />
        ),
      },
    ];

    return (
      <div className="space-y-4">
        <div className="page-hd">
          <div className="page-title">Escrow</div>
          <div className="page-sub">Fund escrow and track payment releases</div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          {[
            { label: "Total funded", val: "₹27.6L", sub: "All contracts" },
            { label: "Held in escrow", val: "₹11L", sub: "2 contracts" },
            { label: "Released to FPOs", val: "₹16.6L", sub: "Season to date" },
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
            <Card title="Fund CNT-0091 · ₹16.08L required" subtitle="Deposit the full contract value to activate shipment. Funds are held securely until you accept delivery.">
              <div className="space-y-3.5 text-[12px] font-semibold">
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
                    value="₹16,08,000"
                    readOnly
                    className="w-full bg-bg-s border border-bd-t rounded px-2.5 py-1.5 font-semibold text-tx-s cursor-not-allowed select-none focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => showToast("₹16.08L transferred to escrow · Shipment begins within 24h", "success")}
                  className="w-full py-2 text-[11px] font-bold text-white bg-amb hover:bg-amb-m rounded transition-colors text-center"
                >
                  Fund escrow →
                </button>
              </div>
            </Card>
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
    return (
      <div className="space-y-4">
        <div className="page-hd">
          <div className="page-title">Incoming goods</div>
          <div className="page-sub">Track shipments from FPOs</div>
        </div>

        <Card title="Active shipments">
          <div className="space-y-4 text-[12px] font-semibold">
            {/* Shipment 1 */}
            <div className="border-b border-bd-t pb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-tx-p">CNT-0090 &middot; LOT-2837 &middot; Nashik Agro FPO</span>
                <span className="bg-amb-bg text-amb px-2 py-0.5 rounded text-[11px] font-semibold border border-amb-m/30">Arriving today</span>
              </div>
              <div className="text-tx-s mb-2 font-medium">12 MT &middot; Erode A &middot; Vehicle MH-12-AB-4521 &middot; Day 5/5</div>
              <div className="h-1.5 rounded-full bg-bd-t overflow-hidden">
                <div className="h-full rounded-full bg-amb" style={{ width: "95%" }} />
              </div>
            </div>

            {/* Shipment 2 */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-tx-p">CNT-0089 &middot; LOT-2835 &middot; Pune Agro FPO</span>
                <span className="bg-blu-bg text-blu-accent px-2 py-0.5 rounded text-[11px] font-semibold border border-blu-accent/20">In transit</span>
              </div>
              <div className="text-tx-s mb-2 font-medium">8 MT &middot; Salem B &middot; Vehicle MH-09-CD-7732 &middot; Day 2/5</div>
              <div className="h-1.5 rounded-full bg-bd-t overflow-hidden">
                <div className="h-full rounded-full bg-blu-accent" style={{ width: "35%" }} />
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const renderIssueGrn = () => {
    const activeDispatchedContracts = contracts.filter((c) => c.buyerSigned && c.escrowStatus === "Deposited");

    const handleGrnFormSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      showToast("GRN issued · 70% (₹8.05L) released from escrow to Nashik Agro FPO", "success");

      const c = activeDispatchedContracts[0];
      if (c) {
        releaseFunds(c.id);
      }

      setActiveTabForRole("buyer", "Overview");
    };

    return (
      <div className="max-w-[500px] mx-auto bg-bg-p border border-bd-t rounded-md p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="border-b border-bd-t pb-3 mb-4">
          <h2 className="font-outfit font-bold text-[14px] text-tx-p flex items-center gap-1.5">
            <IconReceipt className="w-4 h-4 text-amb" />
            <span>GRN for CNT-0090 &middot; LOT-2837</span>
          </h2>
          <p className="text-[11px] text-tx-t mt-1 font-semibold">
            Received: 12 MT Erode grade A &middot; Nashik Agro FPO &middot; Arrived today
          </p>
        </div>

        <form onSubmit={handleGrnFormSubmit} className="space-y-3.5 text-[12px] font-semibold">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11.5px] font-bold text-tx-s mb-1">Quantity received (MT)</label>
              <input
                type="number"
                step="0.1"
                defaultValue={11.9}
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
    </DashboardShell>
  );
}
