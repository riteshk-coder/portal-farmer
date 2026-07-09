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
  IconCpu,
  IconBell,
  IconShieldLock,
  IconSignature,
} from "@tabler/icons-react";

export default function PortalAiDashboard() {
  const {
    loginAsRole,
    activeTabs,
    lots,
    contracts,
    logs,
  } = useApp();

  // Ensure role is synchronized
  useEffect(() => {
    loginAsRole("portal");
  }, [loginAsRole]);

  const activeTab = activeTabs.portal || "System status";

  // Views rendering
  const renderSystemStatus = () => {
    return (
      <div className="space-y-6">
        <PageHeader title="System status" subtitle="AI Matcher daemon and system API gateways" />

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard label="AI Matcher Daemon" value="99.98%" sub="Uptime" trend="up" trendValue="Active" icon={<IconCpu className="w-5 h-5" />} accentColor="#0F766E" iconBg="#CCFBF1" />
          <KpiCard label="Notification Channels" value="WhatsApp + SMS" sub="Operational" trend="up" trendValue="Online" icon={<IconBell className="w-5 h-5" />} accentColor="#3B82F6" iconBg="#EFF6FF" />
          <KpiCard label="Contract Vault Host" value="Secure SSL" sub="AWS protected" trend="up" trendValue="Protected" icon={<IconShieldLock className="w-5 h-5" />} accentColor="#6366F1" iconBg="#EEF2FF" />
          <KpiCard label="eSign Gateway API" value="UIDAI v3" sub="0.2s latency" trend="up" trendValue="Fast" icon={<IconSignature className="w-5 h-5" />} accentColor="#22C55E" iconBg="#F0FDF4" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 space-y-5">
            <Card title="Portal AI Engine Heartbeat Log" subtitle="Real-time operational events from system tasks">
              <div className="space-y-3 font-mono text-[11px] leading-relaxed">
                <div className="p-2 border border-bd-t bg-bg-s/35 rounded text-tx-s">
                  <span className="text-blu-accent font-bold">[15:02:11]</span> Match Engine triggered scan for Nizamabad premium TURM-2843. Found 3 targets.
                </div>
                <div className="p-2 border border-bd-t bg-bg-s/35 rounded text-tx-s">
                  <span className="text-blu-accent font-bold">[14:38:42]</span> WhatsApp dispatch successful: "Alert: New Salem Bulb turmeric lot matches Salem region catalog standards."
                </div>
                <div className="p-2 border border-bd-t bg-bg-s/35 rounded text-tx-s">
                  <span className="text-blu-accent font-bold">[11:15:02]</span> Aadhaar eSign verification verified with UIDAI server. Attached hash SHA-256 to CNT-0091.
                </div>
              </div>
            </Card>

            <ChartPlaceholder title="Matching Queue Analytics" subtitle="Daily match processing volume" type="line" color="#6366F1" />
          </div>

          <div className="lg:col-span-4">
            <Card title="Engine Configurations" subtitle="Model scoring criteria weights">
              <div className="space-y-2 text-[12px] font-semibold">
                <div className="flex justify-between items-center py-1.5 border-b border-bd-t">
                  <span className="text-tx-s">Variety Correlation:</span>
                  <span className="text-tx-p font-bold">40% weight</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-bd-t">
                  <span className="text-tx-s">Price Delta Deviation:</span>
                  <span className="text-tx-p font-bold">30% weight</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-bd-t">
                  <span className="text-tx-s">Geographic Proximity:</span>
                  <span className="text-tx-p font-bold">20% weight</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-tx-s">Trader Score Weight:</span>
                  <span className="text-tx-p font-bold">10% weight</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const renderMatchingQueue = () => {
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
        header: "Grade",
        render: (item: any) => <span>{item.grade}</span>,
      },
      {
        header: "Matching Progress",
        render: (item: any) => {
          const matched = item.status !== "Pending match";
          return (
            <div className="flex items-center gap-2">
              <div className="overflow-hidden h-1.5 w-32 rounded bg-bg-t">
                <div
                  style={{ width: matched ? "100%" : "35%" }}
                  className={`h-full ${matched ? "bg-teal-accent" : "bg-blu-accent animate-pulse"}`}
                />
              </div>
              <span className={`text-[10px] font-bold ${matched ? "text-teal-accent" : "text-blu-accent"}`}>
                {matched ? "Scoring Complete" : "Evaluating Matches..."}
              </span>
            </div>
          );
        },
      },
      {
        header: "Suggested Targets",
        render: (item: any) => (
          <span>{item.status !== "Pending match" ? "3 Traders Found" : "Scanning Registry..."}</span>
        ),
      },
      {
        header: "Status",
        render: (item: any) => <Pill status={item.status} />,
      },
    ];

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="page-hd">
          <div className="page-title">Computational Matching Queue</div>
          <div className="page-sub">Active turmeric crop lots currently processing matching scores against the buyer registry database</div>
        </div>

        <DataTable columns={columns} data={lots} />
      </div>
    );
  };

  const renderNotifications = () => {
    const columns = [
      {
        header: "Log ID",
        render: (item: any) => <span className="font-mono font-bold text-tx-p">{item.id}</span>,
      },
      {
        header: "Alert Channel",
        render: (item: any) => (
          <span
            className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${item.channel === "WhatsApp"
                ? "bg-teal-bg text-teal-accent border-teal-m/20"
                : item.channel === "Email"
                  ? "bg-pur-bg text-pur border-pur-m/20"
                  : "bg-blu-bg text-blu-accent border-blu-accent/20"
              }`}
          >
            {item.channel}
          </span>
        ),
      },
      {
        header: "Recipient Contact",
        render: (item: any) => <span className="font-mono">{item.recipient}</span>,
      },
      {
        header: "Alert Message",
        render: (item: any) => <span className="text-tx-s max-w-[400px] truncate block">{item.message}</span>,
      },
      {
        header: "Dispatched",
        render: (item: any) => <span className="text-tx-t">{item.timestamp}</span>,
      },
    ];

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="page-hd">
          <div className="page-title">Automated System Alerts Log</div>
          <div className="page-sub">Audit logs tracking WhatsApp, SMS, and email buyer alerts dispatched by Portal AI</div>
        </div>

        <DataTable
          columns={columns}
          data={logs}
          searchPlaceholder="Search system alert logs..."
          searchFilter={(item, q) =>
            item.id.toLowerCase().includes(q.toLowerCase()) ||
            item.recipient.toLowerCase().includes(q.toLowerCase()) ||
            item.message.toLowerCase().includes(q.toLowerCase())
          }
        />
      </div>
    );
  };

  const renderAutoGenerated = () => {
    // List contracts as auto-generated agreements
    const columns = [
      {
        header: "Document Ref",
        render: (item: any) => <span className="font-mono font-bold text-tx-p">{item.id.replace("CNT-", "DOC-")}</span>,
      },
      {
        header: "Contract Ref",
        render: (item: any) => <span className="font-mono text-tx-s">{item.id}</span>,
      },
      {
        header: "Document Type",
        render: () => <span className="font-bold">Agri-Commodity Sales Agreement</span>,
      },
      {
        header: "Generated For",
        render: (item: any) => <span className="text-tx-s font-semibold">{item.lotDescription}</span>,
      },
      {
        header: "SLA Match Criteria",
        render: () => <span className="text-teal-accent font-bold font-mono">Agmark Grade Standard v1</span>,
      },
      {
        header: "Status",
        render: () => <Pill status="Active" />,
      },
    ];

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="page-hd">
          <div className="page-title">System Auto-Generated Agreements</div>
          <div className="page-sub">Legally binding crop sale agreements auto-drafted upon matching price agreements</div>
        </div>

        <DataTable columns={columns} data={contracts} />
      </div>
    );
  };

  const renderEsignStatus = () => {
    const columns = [
      {
        header: "Contract Ref",
        render: (item: any) => <span className="font-mono font-bold text-tx-p">{item.id}</span>,
      },
      {
        header: "Lot Target",
        render: (item: any) => <span>{item.lotDescription}</span>,
      },
      {
        header: "FPO Supplier Sign",
        render: (item: any) => (
          <span className={`text-[10px] font-bold ${item.fpoSigned ? "text-teal-accent" : "text-amb"}`}>
            {item.fpoSigned ? "eSigned (Aadhaar Verified)" : "Awaiting signature"}
          </span>
        ),
      },
      {
        header: "Buyer Trader Sign",
        render: (item: any) => (
          <span className={`text-[10px] font-bold ${item.buyerSigned ? "text-teal-accent" : "text-amb"}`}>
            {item.buyerSigned ? "eSigned (Aadhaar Verified)" : "Awaiting signature"}
          </span>
        ),
      },
      {
        header: "Escrow Funding Allocation",
        render: (item: any) => (
          <span className={`text-[10px] font-bold ${item.escrowStatus === "Deposited" || item.escrowStatus === "Released" ? "text-teal-accent" : "text-amb"}`}>
            {item.escrowStatus}
          </span>
        ),
      },
    ];

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="page-hd">
          <div className="page-title">Aadhaar e-Signature Tracking</div>
          <div className="page-sub">Audit logs mapping the status of signatures and subsequent escrow allocations per contract</div>
        </div>

        <DataTable columns={columns} data={contracts} />
      </div>
    );
  };

  return (
    <DashboardShell>
      {activeTab === "System status" && renderSystemStatus()}
      {activeTab === "Matching queue" && renderMatchingQueue()}
      {activeTab === "Notifications" && renderNotifications()}
      {activeTab === "Auto-generated" && renderAutoGenerated()}
      {activeTab === "eSign status" && renderEsignStatus()}
    </DashboardShell>
  );
}
