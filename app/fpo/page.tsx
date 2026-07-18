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
import { useRouter } from "next/navigation";
import {
  IconPlus,
  IconPackage,
  IconReceipt,
  IconTruck,
  IconWallet,
  IconBook,
  IconX,
} from "@tabler/icons-react";

export default function FpoDashboard() {
  const router = useRouter();
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
    dispatchGoods,
    logs,
    disputes,
    fileDispute,
  } = useApp();

  // Ensure role is synchronized and protected
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedRole = localStorage.getItem("user_role");
    if (!token || !savedRole) {
      router.push("/auth");
    } else if (savedRole !== "fpo") {
      router.push(`/${savedRole}`);
    } else {
      loginAsRole("fpo");
    }
  }, [loginAsRole, router]);

  const activeTab = activeTabs.fpo || "Overview";

  // Dismissible onboarding banner state (persisted per user in localStorage)
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  useEffect(() => {
    const email = localStorage.getItem("user_email") || "fpo";
    const dismissed = localStorage.getItem(`onboarding_dismissed_${email}`);
    if (dismissed === "true") setOnboardingDismissed(true);
  }, []);

  const dismissOnboarding = () => {
    const email = localStorage.getItem("user_email") || "fpo";
    localStorage.setItem(`onboarding_dismissed_${email}`, "true");
    setOnboardingDismissed(true);
  };

  // Upload Form states
  const { categories, fpoPreferences } = useApp();

  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedProductTypeId, setSelectedProductTypeId] = useState("");
  const [customProductName, setCustomProductName] = useState("");
  const [categoryProducts, setCategoryProducts] = useState<any[]>([]);

  useEffect(() => {
    if (selectedCategoryId) {
      const fetchProducts = async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await fetch(`http://localhost:8000/lots/product-categories/${selectedCategoryId}/products`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (res.ok) {
            setCategoryProducts(await res.json());
          }
        } catch (err) {
          console.error("Failed to load products for category", selectedCategoryId, err);
        }
      };
      fetchProducts();
      setSelectedProductTypeId("");
      setCustomProductName("");
    } else {
      setCategoryProducts([]);
    }
  }, [selectedCategoryId]);

  const [productPhoto, setProductPhoto] = useState<File | null>(null);
  const [labReport, setLabReport] = useState<File | null>(null);

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

    if (!selectedCategoryId) {
      showToast("Please select a product category.", "error");
      return;
    }
    if (!selectedProductTypeId) {
      showToast("Please select a product name.", "error");
      return;
    }
    if (selectedProductTypeId === "other" && !customProductName.trim()) {
      showToast("Please enter a custom product name.", "error");
      return;
    }

    const cat = categories.find(c => c.id === parseInt(selectedCategoryId));
    const prod = categoryProducts.find(p => p.id === parseInt(selectedProductTypeId));
    const catName = cat ? cat.name : "";
    const prodName = prod ? prod.name : (selectedProductTypeId === "other" ? customProductName : "");
    const description = `${prodName} (${catName})`;

    uploadLot({
      description,
      qty: q,
      grade,
      priceExpectation: p,
      location: location || "Nashik, MH",
      categoryId: parseInt(selectedCategoryId),
      productTypeId: selectedProductTypeId !== "other" ? parseInt(selectedProductTypeId) : undefined,
      customProductName: selectedProductTypeId === "other" ? customProductName : undefined,
      labReport,
      productPhoto,
    });

    // Reset and redirect
    setSelectedCategoryId("");
    setSelectedProductTypeId("");
    setCustomProductName("");
    setQty("");
    setGrade("Premium");
    setCurcumin("");
    setPriceExpectation("");
    setHarvestDate("");
    setLocation("");
    setNotes("");
    setProductPhoto(null);
    setLabReport(null);

    setActiveTabForRole("fpo", "My lots");
  };

  // Views rendering
  const renderOverview = () => {
    const activeLots = lots.filter((l) => l.status !== "Delivered" && l.status !== "GRN Issued").slice(0, 4);
    const activeShipments = contracts.filter((c) => c.status === "Signed" && c.escrowStatus === "Deposited" && !c.grnNumber);

    return (
      <div className="space-y-6">
        <PageHeader
          title="Overview"
          subtitle="Crop supply, matches, and payouts dashboard"
        />

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
                Logically, first-time users have zero active trade transactions. We have prepared an onboarding guide explaining how to list lots, negotiate with buyers, and secure farmer payouts.
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
            label="Active lots"
            value={lots.filter((l) => l.status !== "Delivered" && l.status !== "GRN Issued").length.toString()}
            sub="Live listings"
            trend="neutral"
            trendValue="Active"
            icon={<IconPackage className="w-5 h-5" />}
            accentColor="#0F766E"
            iconBg="#CCFBF1"
            onClick={() => setActiveTabForRole("fpo", "My lots")}
          />
          <KpiCard
            label="Pending quotes"
            value={quotes.filter((q) => q.status === "Awaiting response" || q.status === "Counter-offer").length.toString()}
            sub="Awaiting response"
            trend="neutral"
            trendValue="Active"
            icon={<IconReceipt className="w-5 h-5" />}
            accentColor="#F59E0B"
            iconBg="#FFFBEB"
            onClick={() => setActiveTabForRole("fpo", "Quotes")}
          />
          <KpiCard
            label="Dispatched"
            value={contracts.filter((c) => c.status === "Signed" && c.escrowStatus === "Deposited").length.toString()}
            sub="In transit"
            trend="neutral"
            trendValue="On track"
            icon={<IconTruck className="w-5 h-5" />}
            accentColor="#6366F1"
            iconBg="#EEF2FF"
            onClick={() => setActiveTabForRole("fpo", "Contracts")}
          />
          <KpiCard
            label="Payout due"
            value={`₹${(splits.filter((s) => s.status === "Pending").reduce((acc, s) => acc + s.amount, 0) / 100000).toFixed(2)}L`}
            sub="Farmer splits"
            trend="neutral"
            trendValue="Pending"
            icon={<IconWallet className="w-5 h-5" />}
            accentColor="#22C55E"
            iconBg="#F0FDF4"
            onClick={() => setActiveTabForRole("fpo", "Payouts")}
          />
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
                {activeLots.length === 0 ? (
                  <div className="text-center py-8 text-tx-t text-xs font-semibold border border-dashed border-bd-t rounded-xl">
                    No active trade lots registered.
                  </div>
                ) : (
                  activeLots.map((l) => (
                    <div key={l.id} className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0 text-[12px]">
                      <span className="font-bold text-tx-p font-mono text-[12px] min-w-[72px]">{l.id}</span>
                      <span className="flex-1 text-tx-s font-semibold">
                        {l.qty} MT &middot; {l.description} ({l.grade})
                      </span>
                      <Pill status={l.status} />
                    </div>
                  ))
                )}
              </div>
            </Card>

            <ChartPlaceholder title="Volume Trends" subtitle="Monthly lot volume traded" type="bar" color="#0F766E" />
          </div>

          <div className="lg:col-span-4 space-y-5">
            {/* Shipment tracker */}
            <Card title="Shipment tracker" subtitle="Live tracking from warehouse to buyer">
              <div className="space-y-3.5">
                {activeShipments.length === 0 ? (
                  <div className="text-center py-8 text-tx-t text-xs font-semibold border border-dashed border-bd-t rounded-xl">
                    No active shipments in transit.
                  </div>
                ) : (
                  activeShipments.map((track) => (
                    <div key={track.id} className="text-[12px] font-semibold">
                      <div className="flex justify-between text-tx-s">
                        <span>{track.lotId} &rarr; {track.buyerName}</span>
                        <span>In Transit</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-bd-t mt-1.5 overflow-hidden">
                        <div className="h-full rounded-full bg-teal-accent" style={{ width: "65%" }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Product Focus Preferences */}
            <Card title="Product Focus" subtitle="Your registered product categories & custom varieties">
              {fpoPreferences && fpoPreferences.categories && fpoPreferences.categories.length > 0 ? (
                <div className="space-y-3 text-[11px] font-semibold">
                  <div className="flex flex-wrap gap-1.5">
                    {categories.filter(c => fpoPreferences.categories.includes(c.id)).map(cat => (
                      <span key={cat.id} className="inline-flex items-center gap-1 bg-teal-bg text-primary px-2.5 py-1 rounded-lg">
                        <span>{cat.emoji || "🌱"}</span>
                        <span>{cat.name}</span>
                      </span>
                    ))}
                  </div>
                  {fpoPreferences.rows && fpoPreferences.rows.length > 0 && (
                    <div className="pt-2.5 border-t border-bd-t space-y-1">
                      <div className="text-[10px] text-tx-t uppercase tracking-wider font-bold">Registered Varieties</div>
                      <div className="space-y-1 text-tx-s max-h-[120px] overflow-y-auto pr-1">
                        {fpoPreferences.rows.map((row: any, idx: number) => {
                          const cat = categories.find(c => c.id === row.categoryId);
                          return (
                            <div key={idx} className="flex justify-between items-center py-0.5">
                              <span>
                                {row.customProductName ? (
                                  <span className="font-bold text-tx-p">{row.customProductName} <span className="text-[9px] text-tx-t font-semibold">(Custom)</span></span>
                                ) : (
                                  <span className="font-semibold text-tx-p">
                                    Turmeric variety
                                  </span>
                                )}
                              </span>
                              <span className="text-[9px] text-tx-t">{cat?.emoji || "🌱"} {cat?.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-tx-t text-xs font-semibold border border-dashed border-bd-t rounded-xl">
                  No focus preferences selected. Configure in profile settings.
                </div>
              )}
            </Card>

            {/* Notifications */}
            <Card title="Recent notifications">
              <div className="space-y-3.5 text-[12px] font-semibold">
                {logs && logs.length > 0 ? (
                  logs
                    .filter(l => l.recipientRole === "fpo" || l.channel === "System")
                    .slice(0, 4)
                    .map((notif, idx) => (
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
                    ))
                ) : (
                  <p className="text-tx-t text-[11px]">No recent notifications.</p>
                )}
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
    const allowedCategories = fpoPreferences && fpoPreferences.categories && fpoPreferences.categories.length > 0
      ? categories.filter((c) => fpoPreferences.categories.includes(c.id))
      : categories;

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
            {/* Row 1: Category & Product Name Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11.5px] font-bold text-tx-s mb-1">Product Category</label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-teal-m"
                  required
                >
                  <option value="">-- Select Category --</option>
                  {allowedCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji || "🌱"} {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11.5px] font-bold text-tx-s mb-1">Product Name</label>
                <select
                  value={selectedProductTypeId}
                  onChange={(e) => setSelectedProductTypeId(e.target.value)}
                  disabled={!selectedCategoryId}
                  className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-teal-m disabled:opacity-50"
                  required
                >
                  <option value="">-- Select Product --</option>
                  {categoryProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                  {selectedCategoryId && <option value="other">Other</option>}
                </select>
              </div>
            </div>

            {/* Custom Product Name Field (conditional on "Other") */}
            {selectedProductTypeId === "other" && (
              <div className="mt-4 animate-fade-in">
                <label className="block text-[11.5px] font-bold text-tx-s mb-1">Enter Custom Product Name</label>
                <input
                  type="text"
                  value={customProductName}
                  onChange={(e) => setCustomProductName(e.target.value)}
                  placeholder="e.g. Turmeric Body Butter"
                  className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-teal-m"
                  required
                />
              </div>
            )}

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

            {/* Row 5: Lab test report & Product Photo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-[11.5px] font-bold text-tx-s mb-1">Lab test report</label>
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setLabReport(e.target.files[0]);
                    }
                  }}
                  className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1 text-[12px] font-semibold text-tx-p focus:outline-none file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-bg-t file:text-tx-s file:hover:bg-bg-t/80 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[11.5px] font-bold text-tx-s mb-1">Product Photo (Real-time)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setProductPhoto(e.target.files[0]);
                    }
                  }}
                  className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1 text-[12px] font-semibold text-tx-p focus:outline-none file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-bg-t file:text-tx-s file:hover:bg-bg-t/80 cursor-pointer"
                />
              </div>
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
                          // Find active quote from database
                          const realQuote = quotes.find(
                            (q) =>
                              q.lotId === l.id &&
                              q.buyerName === m.buyerName &&
                              q.status !== "Rejected"
                          );

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
                              <td className="px-4 py-3 text-right font-bold pr-12 text-tx-p">
                                {realQuote ? `₹${realQuote.price}/kg` : <span className="text-tx-t text-xs font-normal italic">No offer yet</span>}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold border ${reliabilityBg}`}>
                                  {m.matchScore} / 100
                                </span>
                              </td>
                              <td className="px-4 py-3 text-tx-s font-medium">{city}</td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex justify-center items-center gap-2">
                                  {realQuote ? (
                                    <>
                                      {realQuote.status === "Awaiting response" || realQuote.status === "Counter-offer" || realQuote.status === "Negotiating" ? (
                                        <>
                                          <button
                                            onClick={async () => {
                                              showToast(`Accepting bid and generating contract for ${m.buyerName}...`, "info");
                                              await respondToQuote(realQuote.id, "accept");
                                              setActiveTabForRole("fpo", "Contracts");
                                            }}
                                            className="bg-teal-accent hover:bg-teal-m text-white px-3.5 py-0.5 rounded text-[11px] font-bold shadow-sm transition-all shadow-teal-m/20"
                                          >
                                            Accept
                                          </button>
                                          <button
                                            onClick={() => {
                                              openModal("quote-response", { quote: realQuote });
                                            }}
                                            className="bg-bg-p border border-bd-s hover:bg-bg-t text-tx-p px-3.5 py-0.5 rounded text-[11px] font-bold transition-all"
                                          >
                                            Counter
                                          </button>
                                        </>
                                      ) : (
                                        <span className="text-xs text-tx-s font-bold capitalize">{realQuote.status}</span>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-tx-t text-xs font-semibold italic">Awaiting bid</span>
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
      {
        header: "Actions",
        render: (item: any) => {
          if (item.status === "Signed" && item.escrowStatus === "Deposited") {
            return (
              <button
                onClick={async () => {
                  showToast(`Dispatching order for contract ${item.id}...`, "info");
                  await dispatchGoods(item.id);
                }}
                className="px-2.5 py-0.5 text-[11px] font-bold text-white bg-amb hover:bg-amb-m rounded transition-colors shrink-0"
              >
                Dispatch Goods
              </button>
            );
          }
          if (item.status === "Dispatched") {
            return <span className="text-[11px] font-semibold text-tx-s">Dispatched</span>;
          }
          if (item.status === "GRN Issued") {
            return <span className="text-[11px] font-semibold text-teal-accent">GRN Issued</span>;
          }
          return <span className="text-[11px] font-semibold text-tx-t">Awaiting Escrow</span>;
        }
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
    const filedDisputes = disputes.filter((d) => d.creatorRole === "fpo");
    const incomingDisputes = disputes.filter((d) => d.creatorRole === "buyer");

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
      { header: isIncoming ? "Filer Buyer" : "Accused Buyer", render: (item: any) => <span className="font-semibold text-tx-p">{item.buyerName}</span> },
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
          onClick={() => setActiveTabForRole("fpo", "Overview")}
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
                    rows={3}
                    placeholder="Provide details about quality report differences or unpaid escrow holds..."
                    className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-teal-m"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-tx-s mb-1.5 uppercase tracking-wide">Attachment Link (optional)</label>
                  <input
                    type="text"
                    name="attachmentUrl"
                    placeholder="e.g. http://imgur.com/photo.jpg"
                    className="w-full bg-bg-p border border-bd-s rounded px-2.5 py-1.5 font-semibold text-tx-p focus:outline-none focus:border-teal-m"
                  />
                </div>

                <Button type="submit" className="w-full">File Dispute with MahaFPC</Button>
              </form>
            </Card>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <Card title="Filed Disputes" subtitle="Complaints raised by you against Buyers">
              <DataTable columns={getColumns(false)} data={filedDisputes} emptyMessage="No disputes filed by your FPO." />
            </Card>

            <Card title="Incoming Disputes" subtitle="Complaints filed against you by Buyers">
              <DataTable columns={getColumns(true)} data={incomingDisputes} emptyMessage="No disputes filed against your FPO." />
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
