"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useApp, Dispute } from "@/context/AppContext";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { DataTable } from "@/components/DataTable";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { ChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { Button } from "@/components/ui/Button";
import {
  IconPlus,
  IconPackage,
  IconReceipt,
  IconTruck,
  IconWallet,
} from "@tabler/icons-react";

export default function FpoDashboard() {
  const {
    loginAsRole,
    activeTabs,
    setActiveTabForRole,
    lots,
    quotes,
    contracts,
    splits,
    uploadLot,
    openModal,
    showToast,
    respondToQuote,
    logs,
    disputes,
    fileDispute,
  } = useApp();

  // Ensure role is synchronized
  useEffect(() => {
    loginAsRole("fpo");
  }, [loginAsRole]);

  const activeTab = activeTabs.fpo || "Overview";

  // Upload Form states
  const [commodity, setCommodity] = useState("Erode finger");
  const [qty, setQty] = useState("");
  const [grade, setGrade] = useState("Premium");
  const [curcumin, setCurcumin] = useState("");
  const [priceExpectation, setPriceExpectation] = useState("");
  const [harvestDate, setHarvestDate] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = parseFloat(qty);
    const p = parseFloat(priceExpectation);
    if (isNaN(q) || isNaN(p) || q <= 0 || p <= 0) {
      showToast("Please fill in valid quantity and expected price.", "error");
      return;
    }

    uploadLot({
      description: `${commodity} turmeric`,
      qty: q,
      grade,
      priceExpectation: p,
      location: location || "Nashik, MH",
    });

    // Reset and redirect
    setCommodity("Erode finger");
    setQty("");
    setGrade("A");
    setCurcumin("");
    setPriceExpectation("");
    setHarvestDate("");
    setLocation("");
    setNotes("");

    setActiveTabForRole("fpo", "My lots");
  };

  // Views rendering
  const renderOverview = () => {
    const activeLots = lots.filter((l) => l.status !== "Delivered").slice(0, 4);

    return (
      <div className="space-y-6">
        <PageHeader
          title="Overview"
          subtitle="Crop supply, matches, and payouts dashboard"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard label="Active lots" value="7" sub="This week" trend="up" trendValue="+2" icon={<IconPackage className="w-5 h-5" />} accentColor="#0F766E" iconBg="#CCFBF1" onClick={() => setActiveTabForRole("fpo", "My lots")} />
          <KpiCard label="Pending quotes" value="4" sub="2 counter-offers" trend="neutral" trendValue="Active" icon={<IconReceipt className="w-5 h-5" />} accentColor="#F59E0B" iconBg="#FFFBEB" onClick={() => setActiveTabForRole("fpo", "Quotes")} />
          <KpiCard label="Dispatched" value="3" sub="In transit" trend="up" trendValue="On track" icon={<IconTruck className="w-5 h-5" />} accentColor="#6366F1" iconBg="#EEF2FF" onClick={() => setActiveTabForRole("fpo", "Contracts")} />
          <KpiCard label="Payout due" value="₹4.2L" sub="Est. this month" trend="up" trendValue="+12%" icon={<IconWallet className="w-5 h-5" />} accentColor="#22C55E" iconBg="#F0FDF4" onClick={() => setActiveTabForRole("fpo", "Payouts")} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 space-y-5">
            <Card
              title="Active Lots status"
              subtitle="Recently created trade lots awaiting matching or bidding"
              extra={
                <Button size="sm" onClick={() => setActiveTabForRole("fpo", "Upload lot")}>
                  <IconPlus className="w-4 h-4" />
                  Upload Lot
                </Button>
              }
            >
              <div className="divide-y divide-bd-t">
                {activeLots.map((l) => (
                  <div key={l.id} className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0 text-[12px]">
                    <span className="font-bold text-tx-p font-mono text-[12px] min-w-[72px]">{l.id}</span>
                    <span className="flex-1 text-tx-s font-semibold">
                      {l.qty} MT &middot; {l.description} ({l.grade})
                    </span>
                    <Pill status={l.status} />
                  </div>
                ))}
              </div>
            </Card>

            <ChartPlaceholder title="Volume Trends" subtitle="Monthly lot volume traded" type="bar" color="#0F766E" />
          </div>

          <div className="lg:col-span-4 space-y-5">
            {/* Shipment tracker */}
            <Card title="Shipment tracker" subtitle="Live tracking from warehouse to buyer">
              <div className="space-y-3.5">
                {[
                  { id: "LOT-2839", dest: "R.K. Traders Pvt. Ltd", day: "3/5", pct: "60%" },
                  { id: "LOT-2837", dest: "Spice Exports Ltd", day: "5/5", pct: "96%" },
                  { id: "LOT-2835", dest: "Agmark Foods", day: "1/5", pct: "18%" },
                ].map((track) => (
                  <div key={track.id} className="text-[12px] font-semibold">
                    <div className="flex justify-between text-tx-s">
                      <span>{track.id} &rarr; {track.dest}</span>
                      <span>Day {track.day}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bd-t mt-1.5 overflow-hidden">
                      <div className="h-full rounded-full bg-teal-accent" style={{ width: track.pct }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Notifications */}
            <Card title="Recent notifications">
              <div className="space-y-3.5 text-[12px] font-semibold">
                {(logs && logs.length > 0
                  ? logs.filter(l => l.recipient.includes("FPO") || l.channel === "System")
                  : [
                      { message: "LOT-2841 matched with 3 buyers", timestamp: "10 min ago", channel: "System" },
                      { message: "Counter-offer received on LOT-2844", timestamp: "1 hr ago", channel: "SMS" },
                      { message: "₹4.2L payout scheduled for 25 Jun", timestamp: "2 hr ago", channel: "System" }
                    ]
                ).slice(0, 4).map((notif, idx) => (
                  <div key={idx} className="flex gap-2.5 items-start">
                    <div className={cn(
                      "w-2 h-2 rounded-full shrink-0 mt-1.5",
                      notif.channel === "System" ? "bg-teal-accent" : "bg-amb"
                    )} />
                    <div>
                      <div className="text-tx-p leading-tight">{notif.message}</div>
                      <div className="text-[10px] text-tx-t mt-1">{notif.timestamp}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const renderMyLots = () => {
    const columns = [
      {
        header: "Lot ID",
        render: (item: any) => <span className="font-mono font-bold text-tx-p">{item.id}</span>,
      },
      {
        header: "Description",
        render: (item: any) => <span>{item.description}</span>,
      },
      {
        header: "Quantity (MT)",
        render: (item: any) => <span>{item.qty} MT</span>,
      },
      {
        header: "Grade",
        render: (item: any) => <span>{item.grade}</span>,
      },
      {
        header: "Status",
        render: (item: any) => <Pill status={item.status} />,
      },
      {
        header: "Action",
        render: (item: any) => {
          if (item.status === "Counter-offer") {
            const q = quotes.find((q) => q.lotId === item.id);
            return (
              <button
                onClick={() => q && openModal("quote-response", { quote: q })}
                className="px-2.5 py-0.5 text-[11px] font-bold text-white bg-teal-accent hover:bg-teal-m rounded-sm transition-all"
              >
                Respond
              </button>
            );
          }
          if (item.status === "Matched") {
            return (
              <button
                onClick={() => setActiveTabForRole("fpo", "Quotes")}
                className="px-2.5 py-0.5 text-[11px] font-bold text-tx-p bg-bg-s border border-bd-t hover:bg-bg-t rounded-sm transition-all"
              >
                Quotes
              </button>
            );
          }
          if (item.status === "Dispatched") {
            return (
              <span className="text-[10px] text-pur font-bold tracking-wide">
                Transit Tracking
              </span>
            );
          }
          return <span className="text-tx-t text-[11px] font-semibold">Active search</span>;
        },
      },
    ];

    return (
      <div className="space-y-4 animate-fade-in">
        <button
          type="button"
          onClick={() => setActiveTabForRole("fpo", "Overview")}
          className="flex items-center gap-1 text-tx-s hover:text-tx-p font-semibold text-xs transition-colors w-fit mb-2"
        >
          &larr; Back to Overview
        </button>
        <div className="flex justify-between items-center mb-4">
          <div className="page-hd !mb-0">
            <div className="page-title">Commodity Lots Registry</div>
            <div className="page-sub">All turmeric crop lots registered for trade matching</div>
          </div>
          <button
            onClick={() => setActiveTabForRole("fpo", "Upload lot")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold text-white bg-teal-accent hover:bg-teal-m rounded-sm shadow-sm transition-all"
          >
            <IconPlus className="w-4 h-4" />
            <span>Register New Lot</span>
          </button>
        </div>

        <DataTable
          columns={columns}
          data={lots}
          searchPlaceholder="Search commodity lots..."
          searchFilter={(item, q) =>
            item.id.toLowerCase().includes(q.toLowerCase()) ||
            item.description.toLowerCase().includes(q.toLowerCase()) ||
            item.status.toLowerCase().includes(q.toLowerCase())
          }
        />
      </div>
    );
  };

  const renderUploadLot = () => {
    return (
      <div className="space-y-4 animate-fade-in">
        <button
          type="button"
          onClick={() => setActiveTabForRole("fpo", "Overview")}
          className="flex items-center gap-1 text-tx-s hover:text-tx-p font-semibold text-xs transition-colors w-fit mb-2"
        >
          &larr; Back to Overview
        </button>
        {/* Page Header */}
        <div className="page-hd">
          <div className="page-title">Upload lot</div>
          <div className="page-sub">Register a new turmeric lot for buyer matching</div>
        </div>

        {/* Form Card */}
        <Card title="Lot details">
          <form onSubmit={handleUploadSubmit} className="text-[12px] font-semibold">
            {/* Row 1: Lot ID & Variety */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11.5px] font-bold text-tx-s mb-1">Lot ID (auto-generated)</label>
                <input
                  type="text"
                  value="LOT-2847"
                  disabled
                  className="w-full bg-bg-s border border-bd-t rounded px-2.5 py-1.5 font-semibold text-tx-s cursor-not-allowed select-none focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11.5px] font-bold text-tx-s mb-1">Variety</label>
                <select
                  value={commodity}
                  onChange={(e) => setCommodity(e.target.value)}
                  className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-teal-m"
                >
                  <option value="Erode finger">Erode finger</option>
                  <option value="Salem bulb">Salem bulb</option>
                  <option value="Nizamabad">Nizamabad</option>
                  <option value="Rajapuri">Rajapuri</option>
                </select>
              </div>
            </div>

            {/* Row 2: Qty, Grade, Curcumin */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-[11.5px] font-bold text-tx-s mb-1">Quantity (MT)</label>
                <input
                  type="text"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-teal-m"
                  required
                />
              </div>
              <div>
                <label className="block text-[11.5px] font-bold text-tx-s mb-1">Grade</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-teal-m"
                >
                  <option value="Premium">Premium</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>
              <div>
                <label className="block text-[11.5px] font-bold text-tx-s mb-1">Curcumin % (min)</label>
                <input
                  type="text"
                  value={curcumin}
                  onChange={(e) => setCurcumin(e.target.value)}
                  placeholder="e.g. 3.5"
                  className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-teal-m"
                />
              </div>
            </div>

            {/* Row 3: Expected price & Harvest date */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-[11.5px] font-bold text-tx-s mb-1">Expected price (₹/kg)</label>
                <input
                  type="text"
                  value={priceExpectation}
                  onChange={(e) => setPriceExpectation(e.target.value)}
                  placeholder="e.g. 130"
                  className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-teal-m"
                  required
                />
              </div>
              <div>
                <label className="block text-[11.5px] font-bold text-tx-s mb-1">Harvest date</label>
                <input
                  type="date"
                  value={harvestDate}
                  onChange={(e) => setHarvestDate(e.target.value)}
                  className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-teal-m"
                />
              </div>
            </div>

            {/* Row 4: Storage location */}
            <div className="mt-4">
              <label className="block text-[11.5px] font-bold text-tx-s mb-1">Storage location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Warehouse address"
                className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-teal-m"
              />
            </div>

            {/* Row 5: Lab test report */}
            <div className="mt-4">
              <label className="block text-[11.5px] font-bold text-tx-s mb-1">Lab test report</label>
              <input
                type="file"
                className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1 text-[12px] font-semibold text-tx-p focus:outline-none file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-bg-t file:text-tx-s file:hover:bg-bg-t/80 cursor-pointer"
              />
            </div>

            {/* Row 6: Additional notes */}
            <div className="mt-4">
              <label className="block text-[11.5px] font-bold text-tx-s mb-1">Additional notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Moisture content, storage conditions, certifications..."
                rows={3}
                className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-teal-m"
              />
            </div>

            {/* Row 7: Actions */}
            <div className="pt-4 border-t border-bd-t flex justify-end gap-2 text-[11px] mt-4">
              <button
                type="button"
                onClick={() => setActiveTabForRole("fpo", "My lots")}
                className="px-3.5 py-1 text-tx-p bg-bg-p border border-bd-s rounded-[4px] hover:bg-bg-t transition-all font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1 text-white bg-teal-accent hover:bg-teal-m rounded-[4px] shadow-sm transition-all font-bold"
              >
                Submit lot
              </button>
            </div>
          </form>
        </Card>
      </div>
    );
  };

  const renderMatches = () => {
    const lotsWithMatches = lots.filter((l) => l.matches && l.matches.length > 0);

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="page-hd">
          <div className="page-title">Buyer matches</div>
          <div className="page-sub">AI-matched buyers for your active lots</div>
        </div>

        {lotsWithMatches.length > 0 ? (
          <div className="space-y-5">
            {lotsWithMatches.map((l) => {
              const lotDisplay = `${l.qty} MT ${l.description.split(" ")[0]} ${l.grade}`;
              return (
                <Card key={l.id} className="p-4">
                  {/* Card Title */}
                  <h3 className="font-outfit font-bold text-[14px] text-tx-p tracking-tight mb-3">
                    {l.id} &middot; {lotDisplay} &middot; Matched buyers
                  </h3>

                  {/* Table */}
                  <div className="overflow-x-auto -mx-4 -mb-4">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-bd-t text-[10px] text-tx-t font-semibold tracking-wider uppercase">
                          <th className="px-4 pb-2.5 font-bold">Buyer</th>
                          <th className="px-4 pb-2.5 font-bold text-right pr-12">Offer/kg</th>
                          <th className="px-4 pb-2.5 font-bold text-center">Reliability</th>
                          <th className="px-4 pb-2.5 font-bold">City</th>
                          <th className="px-4 pb-2.5 font-bold text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-bd-t text-[12px] font-semibold">
                        {l.matches?.map((m, idx) => {
                          // Determine reliability score styling
                          let reliabilityBg = "bg-teal-bg text-teal-accent border-teal-m/30";
                          if (m.matchScore < 80) {
                            reliabilityBg = "bg-amb-bg text-amb border border-amb-m/30";
                          } else {
                            reliabilityBg = "bg-teal-bg text-teal-accent border border-teal-m/30";
                          }

                          // Map cities dynamically for demo or database
                          let city = "Mumbai";
                          if (m.buyerName.includes("Spice")) city = "Pune";
                          if (m.buyerName.includes("Agmark")) city = "Nagpur";

                          return (
                            <tr key={idx} className="text-tx-p hover:bg-bg-s/30 transition-colors">
                              <td className="px-4 py-3 font-bold">{m.buyerName}</td>
                              <td className="px-4 py-3 text-right font-bold pr-12 text-tx-p">₹{m.offeredPrice}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold border ${reliabilityBg}`}>
                                  {m.matchScore} / 100
                                </span>
                              </td>
                              <td className="px-4 py-3 text-tx-s font-medium">{city}</td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex justify-center items-center gap-2">
                                  {idx === 0 ? (
                                    <button
                                      onClick={() => {
                                        showToast(`Bid accepted! Contract generated for ${m.buyerName}`, "success");
                                        respondToQuote("QT-203", "accept");
                                        setActiveTabForRole("fpo", "Contracts");
                                      }}
                                      className="bg-teal-accent hover:bg-teal-m text-white px-3.5 py-0.5 rounded text-[11px] font-bold shadow-sm transition-all"
                                    >
                                      Accept
                                    </button>
                                  ) : idx === 1 ? (
                                    <button
                                      onClick={() => {
                                        showToast(`Initiating counter offer for ${m.buyerName}`, "info");
                                        openModal("quote-response", {
                                          quote: {
                                            id: "QT-202",
                                            lotId: l.id,
                                            lotDescription: l.description,
                                            buyerName: m.buyerName,
                                            price: m.offeredPrice,
                                            qty: l.qty,
                                            status: "Counter-offer",
                                          },
                                        });
                                      }}
                                      className="bg-bg-p border border-bd-s hover:bg-bg-t text-tx-p px-3.5 py-0.5 rounded text-[11px] font-bold transition-all"
                                    >
                                      Counter
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        showToast(`Viewing matched record for ${m.buyerName}`, "info");
                                      }}
                                      className="bg-bg-p border border-bd-s hover:bg-bg-t text-tx-p px-3.5 py-0.5 rounded text-[11px] font-bold transition-all"
                                    >
                                      View
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="bg-bg-p border border-bd-t p-8 text-center rounded text-tx-t font-semibold text-[11px]">
            No AI matching computations active. Upload a lot to generate buyer targets.
          </div>
        )}
      </div>
    );
  };

  const renderQuotes = () => {
    const columns = [
      {
        header: "Quote ID",
        render: (item: any) => <span className="font-mono font-bold text-tx-p">{item.id}</span>,
      },
      {
        header: "Lot ID",
        render: (item: any) => <span className="font-mono text-tx-s">{item.lotId}</span>,
      },
      {
        header: "Buyer",
        render: (item: any) => <span className="font-bold text-tx-p">{item.buyerName}</span>,
      },
      {
        header: "Bid Price",
        render: (item: any) => <span className="font-bold text-teal-accent">₹{item.price}/kg</span>,
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
        header: "Actions",
        render: (item: any) => {
          if (item.status === "Awaiting response" || item.status === "Counter-offer") {
            return (
              <button
                onClick={() => openModal("quote-response", { quote: item })}
                className="px-2.5 py-0.5 text-[11px] font-bold text-white bg-teal-accent hover:bg-teal-m rounded-sm shadow-sm transition-all"
              >
                Respond
              </button>
            );
          }
          return <span className="text-tx-t text-[11px] font-semibold">Negotiation closed</span>;
        },
      },
    ];

    return (
      <div className="space-y-4 animate-fade-in">
        <button
          type="button"
          onClick={() => setActiveTabForRole("fpo", "Overview")}
          className="flex items-center gap-1 text-tx-s hover:text-tx-p font-semibold text-xs transition-colors w-fit mb-2"
        >
          &larr; Back to Overview
        </button>
        <div className="page-hd">
          <div className="page-title">Incoming Buyer Quotes</div>
          <div className="page-sub">Review and accept bids or send counters to verified buyers</div>
        </div>

        <DataTable
          columns={columns}
          data={quotes}
          searchPlaceholder="Search buyer quotes..."
          searchFilter={(item, q) =>
            item.id.toLowerCase().includes(q.toLowerCase()) ||
            item.buyerName.toLowerCase().includes(q.toLowerCase()) ||
            item.lotId.toLowerCase().includes(q.toLowerCase())
          }
        />
      </div>
    );
  };

  const renderContracts = () => {
    const columns = [
      {
        header: "Contract ID",
        render: (item: any) => <span className="font-mono font-bold text-tx-p">{item.id}</span>,
      },
      {
        header: "Lot Target",
        render: (item: any) => <span className="text-tx-s">{item.lotDescription}</span>,
      },
      {
        header: "Buyer Party",
        render: (item: any) => <span className="font-bold text-tx-p">{item.buyerName}</span>,
      },
      {
        header: "Contract Value",
        render: (item: any) => <span className="font-bold text-tx-p">₹{item.amount.toFixed(2)}L</span>,
      },
      {
        header: "Sign Status",
        render: (item: any) => <Pill status={item.status} />,
      },
      {
        header: "Escrow Deposit Status",
        render: (item: any) => <Pill status={item.escrowStatus} />,
      },
    ];

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="page-hd">
          <div className="page-title">Generated Escrow Contracts</div>
          <div className="page-sub">Legal templates and eSign validation status for matched lots</div>
        </div>

        <DataTable
          columns={columns}
          data={contracts}
          searchPlaceholder="Search contracts..."
          searchFilter={(item, q) =>
            item.id.toLowerCase().includes(q.toLowerCase()) ||
            item.buyerName.toLowerCase().includes(q.toLowerCase()) ||
            item.lotId.toLowerCase().includes(q.toLowerCase())
          }
        />
      </div>
    );
  };

  const renderPayouts = () => {
    const columns = [
      {
        header: "Farmer",
        render: (item: any) => <span className="font-bold text-tx-p">{item.farmerName}</span>,
      },
      {
        header: "Land (ac)",
        render: (item: any) => <span>{item.farmerName === "Ramesh Patil" ? "3.5" : item.farmerName === "Suresh Jadhav" ? "2.8" : item.farmerName === "Priya Kulkarni" ? "2.1" : "4.0"}</span>,
      },
      {
        header: "Share",
        render: (item: any) => <span>{item.sharePercent}%</span>,
      },
      {
        header: "Amount",
        render: (item: any) => <span className="font-bold text-teal-accent">₹{(item.amount / 100000).toFixed(2)}L</span>,
      },
    ];

    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setActiveTabForRole("fpo", "Overview")}
          className="flex items-center gap-1 text-tx-s hover:text-tx-p font-semibold text-xs transition-colors w-fit mb-2"
        >
          &larr; Back to Overview
        </button>
        <div className="page-hd">
          <div className="page-title">Payouts</div>
          <div className="page-sub">Farmer split payments from escrow</div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          {[
            { label: "Total received", val: "₹42.1L", sub: "Season to date" },
            { label: "Pending release", val: "₹14.3L", sub: "2 tranches" },
            { label: "Farmers paid", val: "82", sub: "Direct to bank" },
          ].map((stat, idx) => (
            <Card key={idx}>
              <div className="text-[11px] font-bold text-tx-t uppercase tracking-wider">{stat.label}</div>
              <div className="text-[20px] font-outfit font-black text-tx-p mt-1">{stat.val}</div>
              <div className="text-[11.5px] text-tx-s font-semibold mt-1">{stat.sub}</div>
            </Card>
          ))}
        </div>

        <Card title="Farmer split — CNT-0090">
          <DataTable
            columns={columns}
            data={splits.filter(s => s.lotId === "LOT-2837")}
            emptyMessage="No payout splits found for this contract."
          />
        </Card>
      </div>
    );
  };

  const renderDisputes = () => {
    const fpoDisputes = disputes.filter((d) => d.fpoName === "Nashik Agro FPO");

    const handleFileDispute = (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.currentTarget as HTMLFormElement;
      const type = (form.elements.namedItem("disputeType") as HTMLSelectElement).value as Dispute["type"];
      const lotId = (form.elements.namedItem("lotId") as HTMLSelectElement).value;
      const desc = (form.elements.namedItem("description") as HTMLTextAreaElement).value;
      
      if (!lotId || !desc) {
        showToast("Please fill in all fields to file complaint.", "error");
        return;
      }
      fileDispute(type, lotId, desc);
      form.reset();
    };

    const columns = [
      { header: "Case ID", render: (item: any) => <span className="font-mono font-bold text-tx-p">{item.id}</span> },
      { header: "Type", render: (item: any) => <span className="text-cor font-bold">{item.type}</span> },
      { header: "Lot ID", render: (item: any) => <span className="font-mono text-tx-s">{item.lotId}</span> },
      { header: "Buyer", render: (item: any) => <span className="font-semibold text-tx-p">{item.buyerName}</span> },
      { header: "Summary", render: (item: any) => <span className="text-tx-s">{item.description}</span> },
      { header: "Status", render: (item: any) => <Pill status={item.status} /> },
    ];

    return (
      <div className="space-y-6 animate-fade-in">
        <button
          type="button"
          onClick={() => setActiveTabForRole("fpo", "Overview")}
          className="flex items-center gap-1 text-tx-s hover:text-tx-p font-semibold text-xs transition-colors w-fit mb-2"
        >
          &larr; Back to Overview
        </button>
        <PageHeader title="Disputes & Complaints" subtitle="File quality conformance or payment hold disputes with MahaFPC Regulator" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-4">
            <Card title="File New Dispute">
              <form onSubmit={handleFileDispute} className="space-y-4 text-[12px] font-semibold">
                <div>
                  <label className="block text-[11px] font-bold text-tx-s mb-1.5 uppercase tracking-wide">Dispute Category</label>
                  <select name="disputeType" className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-teal-m">
                    <option value="Quality mismatch">Quality mismatch</option>
                    <option value="Payment delay">Payment delay</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-tx-s mb-1.5 uppercase tracking-wide">Select Lot ID</label>
                  <select name="lotId" className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-teal-m">
                    {lots.map((l) => (
                      <option key={l.id} value={l.id}>{l.id} &middot; {l.description}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-tx-s mb-1.5 uppercase tracking-wide">Detailed Complaint Summary</label>
                  <textarea
                    name="description"
                    rows={4}
                    placeholder="Provide details about quality report differences or unpaid escrow holds..."
                    className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-teal-m"
                    required
                  />
                </div>

                <Button type="submit" className="w-full">File Dispute with MahaFPC</Button>
              </form>
            </Card>
          </div>

          <div className="lg:col-span-8">
            <Card title="Dispute Log & Case Status" subtitle="Ongoing quality disputes and regulatory resolutions">
              <DataTable columns={columns} data={fpoDisputes} emptyMessage="No disputes filed by your FPO." />
            </Card>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardShell>
      {activeTab === "Overview" && renderOverview()}
      {activeTab === "My lots" && renderMyLots()}
      {activeTab === "Upload lot" && renderUploadLot()}
      {activeTab === "Buyer matches" && renderMatches()}
      {activeTab === "Quotes" && renderQuotes()}
      {activeTab === "Contracts" && renderContracts()}
      {activeTab === "Payouts" && renderPayouts()}
      {activeTab === "Disputes" && renderDisputes()}
    </DashboardShell>
  );
}
