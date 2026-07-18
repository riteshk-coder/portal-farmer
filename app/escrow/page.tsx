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
import { useRouter } from "next/navigation";
import { IconExchange, IconUsers, IconWallet } from "@tabler/icons-react";

export default function EscrowDashboard() {
  const router = useRouter();
  const {
    loginAsRole,
    activeTabs,
    contracts,
    splits,
    ledger,
    releaseFunds,
  } = useApp();

  // Ensure role is synchronized and protected
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedRole = localStorage.getItem("user_role");
    if (!token || !savedRole) {
      router.push("/auth");
    } else if (savedRole !== "escrow") {
      router.push(`/${savedRole}`);
    } else {
      loginAsRole("escrow");
    }
  }, [loginAsRole, router]);

  const activeTab = activeTabs.escrow || "Overview";

  // Calculate metrics
  const totalHeld = contracts
    .filter((c) => c.escrowStatus === "Deposited")
    .reduce((a, b) => a + b.amount, 0);

  const totalReleased = contracts
    .filter((c) => c.escrowStatus === "Released")
    .reduce((a, b) => a + b.amount, 0);

  const pendingReleasesCount = contracts.filter(
    (c) => c.buyerSigned && c.escrowStatus === "Deposited"
  ).length;

  // Views rendering
  const renderOverview = () => {
    return (
      <div className="space-y-6">
        <PageHeader title="Overview" subtitle="Financial transactions, payouts, and splits tracking" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard label="Active Funds Held" value={`₹${totalHeld.toFixed(2)}L`} sub="In escrow" trend="up" trendValue="Secured" icon={<IconWallet className="w-5 h-5" />} accentColor="#0F766E" iconBg="#CCFBF1" />
          <KpiCard label="Total Settled Payouts" value={`₹${totalReleased.toFixed(2)}L`} sub="Released to FPOs" trend="up" trendValue="+18%" icon={<IconExchange className="w-5 h-5" />} accentColor="#22C55E" iconBg="#F0FDF4" />
          <KpiCard label="Pending Releases" value={pendingReleasesCount} sub="Awaiting GRN" trend="neutral" trendValue="Queue" icon={<IconUsers className="w-5 h-5" />} accentColor="#F59E0B" iconBg="#FFFBEB" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 space-y-5">
            <Card title="Financial Ledger (Recent Transactions)" subtitle="Double-entry records of platform credits and debits">
              <div className="space-y-2">
                {ledger.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-2.5 border border-bd-t bg-bg-s/35 rounded text-[11.5px] font-semibold">
                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded text-white ${item.type === "Credit" ? "bg-teal-accent" : "bg-cor"}`}>
                        <IconExchange className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-tx-p font-bold">{item.party}</div>
                        <div className="text-[9.5px] text-tx-t font-semibold mt-0.5">Contract: {item.contractId}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold text-[12px] ${item.type === "Credit" ? "text-teal-accent" : "text-cor"}`}>
                        {item.type === "Credit" ? "+" : "-"} ₹{item.amount.toLocaleString("en-IN")}
                      </div>
                      <div className="text-[9px] text-tx-t font-semibold mt-0.5">{item.timestamp}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <ChartPlaceholder title="Revenue Flow" subtitle="Monthly escrow settlement volume" type="area" color="#EF4444" />
          </div>

          <div className="lg:col-span-4 space-y-5">
            <Card title="Farmer Split Mechanism" subtitle="Autonomous payout protocol">
              <p className="text-[11.5px] leading-normal text-tx-s font-medium">
                Upon GRN inspection approval, the Escrow contract engine automatically splits the credit amount directly to FPO growers bank accounts according to verified landholding and supply shares records.
              </p>
              <div className="mt-3 flex items-center gap-2 text-[10px] text-tx-t font-bold uppercase">
                <IconUsers className="w-4 h-4 text-tx-t animate-pulse" />
                <span>Active Splitting Active</span>
              </div>
            </Card>

            <Card title="Security & Compliance" subtitle="Escrow parameters">
              <div className="space-y-2 text-[11.5px] font-semibold">
                <div className="flex justify-between items-center">
                  <span className="text-tx-s">Holding Vault:</span>
                  <span className="text-tx-p font-bold">256-bit AES Host</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-tx-s">Disbursement Delay:</span>
                  <span className="text-teal-accent font-bold">Instantly on GRN</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const renderHeldFunds = () => {
    // Show contracts where escrow status is Deposited
    const heldContracts = contracts.filter((c) => c.escrowStatus === "Deposited");

    const columns = [
      {
        header: "Contract Ref",
        render: (item: any) => <span className="font-mono font-bold text-tx-p">{item.id}</span>,
      },
      {
        header: "Depositor (Buyer)",
        render: (item: any) => <span className="font-bold text-tx-p">{item.buyerName}</span>,
      },
      {
        header: "Beneficiary (FPO)",
        render: (item: any) => <span>{item.fpoName}</span>,
      },
      {
        header: "Value (Lakhs)",
        render: (item: any) => <span className="font-bold text-tx-p">₹{item.amount.toFixed(2)}L</span>,
      },
      {
        header: "Escrow Status",
        render: (item: any) => <Pill status={item.escrowStatus} />,
      },
    ];

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="page-hd">
          <div className="page-title">Active Escrow Holding Accounts</div>
          <div className="page-sub">Funds currently locked in secure escrow accounts pending GRN issuance</div>
        </div>

        <DataTable columns={columns} data={heldContracts} />
      </div>
    );
  };

  const renderReleaseQueue = () => {
    // Contracts where status is Signed and lot is Delivered OR shipment has arrived (Deposited status)
    // We can allow escrow manager to manually release funds here as an alternate trigger, or release funds that are delivered.
    const columns = [
      {
        header: "Contract Ref",
        render: (item: any) => <span className="font-mono font-bold text-tx-p">{item.id}</span>,
      },
      {
        header: "FPO Supplier",
        render: (item: any) => <span>{item.fpoName}</span>,
      },
      {
        header: "Commodity Value",
        render: (item: any) => <span className="font-bold text-tx-p">₹{item.amount.toFixed(2)}L</span>,
      },
      {
        header: "Escrow Status",
        render: (item: any) => <Pill status={item.escrowStatus} />,
      },
      {
        header: "Release Trigger",
        render: (item: any) => {
          // If contract is Signed and escrow is Deposited (representing transit/delivered)
          if (item.escrowStatus === "Deposited") {
            return (
              <button
                onClick={() => releaseFunds(item.id)}
                className="px-3 py-1 text-[11px] font-bold text-white bg-gry hover:bg-gry-m rounded-sm shadow-sm transition-colors"
              >
                Release Payout
              </button>
            );
          }
          return <span className="text-[11px] text-teal-accent font-bold">Funds Disbursed</span>;
        },
      },
    ];

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="page-hd">
          <div className="page-title">Disbursement Release Queue</div>
          <div className="page-sub">Verify inspection checklist and disburse locked escrow payments directly to farmer growers</div>
        </div>

        <DataTable columns={columns} data={contracts} />
      </div>
    );
  };

  const renderFarmerSplits = () => {
    const columns = [
      {
        header: "Lot Ref",
        render: (item: any) => <span className="font-mono font-bold text-tx-p">{item.lotId}</span>,
      },
      {
        header: "Grower Name",
        render: (item: any) => <span className="font-bold text-tx-p">{item.farmerName}</span>,
      },
      {
        header: "Volume Share Split",
        render: (item: any) => <span>{item.sharePercent}%</span>,
      },
      {
        header: "Payout Amount",
        render: (item: any) => <span className="font-bold text-teal-accent">₹{item.amount.toLocaleString("en-IN")}</span>,
      },
      {
        header: "Payout Status",
        render: (item: any) => <Pill status={item.status} />,
      },
    ];

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="page-hd">
          <div className="page-title">Farmer Payout Split Ledgers</div>
          <div className="page-sub">Autonomous calculations showing the exact shares paid to individual grower members upon escrow clearance</div>
        </div>

        <DataTable columns={columns} data={splits} />
      </div>
    );
  };

  const renderLedger = () => {
    const columns = [
      {
        header: "Transaction ID",
        render: (item: any) => <span className="font-mono font-bold text-tx-p">{item.id}</span>,
      },
      {
        header: "Contract Ref",
        render: (item: any) => <span className="font-mono text-tx-s">{item.contractId}</span>,
      },
      {
        header: "Entry Type",
        render: (item: any) => (
          <span className={`text-[10px] font-bold uppercase ${item.type === "Credit" ? "text-teal-accent" : "text-cor"}`}>
            {item.type}
          </span>
        ),
      },
      {
        header: "Contra Party",
        render: (item: any) => <span className="font-bold text-tx-p">{item.party}</span>,
      },
      {
        header: "Account Amount",
        render: (item: any) => (
          <span className={`font-bold ${item.type === "Credit" ? "text-teal-accent" : "text-cor"}`}>
            ₹{item.amount.toLocaleString("en-IN")}
          </span>
        ),
      },
      {
        header: "Post Time",
        render: (item: any) => <span className="text-tx-t">{item.timestamp}</span>,
      },
    ];

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="page-hd">
          <div className="page-title">Chronological Bank Ledger Logs</div>
          <div className="page-sub">Audit logs tracking credits (deposit inputs) and debits (disbursement payouts) from bank gateways</div>
        </div>

        <DataTable columns={columns} data={ledger} />
      </div>
    );
  };

  return (
    <DashboardShell>
      {activeTab === "Overview" && renderOverview()}
      {activeTab === "Held funds" && renderHeldFunds()}
      {activeTab === "Release queue" && renderReleaseQueue()}
      {activeTab === "Farmer splits" && renderFarmerSplits()}
      {activeTab === "Ledger" && renderLedger()}
    </DashboardShell>
  );
}
