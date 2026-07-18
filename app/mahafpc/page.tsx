"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { DataTable } from "@/components/DataTable";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { ChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  IconStar,
  IconExchange,
  IconPackage,
  IconAlertTriangle,
  IconUsers,
  IconUserCheck,
  IconChartBar,
  IconLock,
  IconShield,
  IconEdit,
  IconTrash,
  IconX,
  IconChevronLeft,
  IconSearch,
} from "@tabler/icons-react";

export default function MahaFpcDashboard() {
  const router = useRouter();
  const {
    loginAsRole,
    activeTabs,
    setActiveTabForRole,
    lots,
    contracts,
    disputes,
    resolveDispute,
    updateDisputeStatus,
    openModal,
  } = useApp();

  // Ensure role is synchronized and protected
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedRole = localStorage.getItem("user_role");
    if (!token || !savedRole) {
      router.push("/auth");
    } else if (savedRole !== "mahafpc" && savedRole !== "admin") {
      router.push(`/${savedRole}`);
    } else {
      loginAsRole("mahafpc");
    }
  }, [loginAsRole, router]);

  const activeTab = activeTabs.mahafpc || "Overview";

  const [dirUsers, setDirUsers] = useState<any[]>([]);
  const [dirFpos, setDirFpos] = useState<any[]>([]);
  const [dirBuyers, setDirBuyers] = useState<any[]>([]);
  const [selectedDirTab, setSelectedDirTab] = useState<"users" | "fpos" | "buyers">("users");

  const [contactInquiries, setContactInquiries] = useState<any[]>([]);
  const [searchInquiry, setSearchInquiry] = useState("");

  useEffect(() => {
    const fetchDirectory = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:8000/auth/directory", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setDirUsers(data.users || []);
          setDirFpos(data.fpos || []);
          setDirBuyers(data.buyers || []);
        }
      } catch (err) {
        console.error("Failed to fetch directory:", err);
      }
    };
    fetchDirectory();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "Contact Inquiries") {
      const fetchInquiries = async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await fetch("http://localhost:8000/auth/contact-inquiries", {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setContactInquiries(data);
          }
        } catch (err) {
          console.error("Failed to fetch contact inquiries:", err);
        }
      };
      fetchInquiries();
    }
  }, [activeTab]);

  // Mock static scoring tables
  const buyerScores = [
    { rank: 1, name: "R.K. Traders", score: 98, paymentDays: "1.2 days", volume: "142 MT" },
    { rank: 2, name: "Nurture Foods Ltd", score: 95, paymentDays: "1.5 days", volume: "210 MT" },
    { rank: 3, name: "Spice Exports", score: 92, paymentDays: "2.1 days", volume: "85 MT" },
    { rank: 4, name: "Agmark Foods", score: 86, paymentDays: "3.4 days", volume: "115 MT" },
    { rank: 5, name: "NutriTrade Co.", score: 79, paymentDays: "4.8 days", volume: "62 MT" },
  ];

  const fpoRatings = [
    { rank: 1, name: "Erode Agro FPO", members: 420, gradeConformance: "97%", rating: "4.9 / 5.0" },
    { rank: 2, name: "Salem Farmers FPO", members: 310, gradeConformance: "94%", rating: "4.7 / 5.0" },
    { rank: 3, name: "Telangana Agri Growers", members: 580, gradeConformance: "92%", rating: "4.6 / 5.0" },
    { rank: 4, name: "Pune Agro FPO", members: 290, gradeConformance: "88%", rating: "4.2 / 5.0" },
  ];

  // Views rendering
  const renderOverview = () => {
    const activeDisputes = disputes.filter((d) => d.status !== "Resolved");
    const totalVolume = lots.reduce((acc, curr) => acc + curr.qty, 0);
    const totalGmvVal = contracts.reduce((acc, curr) => acc + curr.amount, 0);
    const formattedGmv = totalGmvVal >= 100 
      ? `₹${(totalGmvVal / 100).toFixed(2)}Cr` 
      : `₹${totalGmvVal.toFixed(2)}L`;

    const barChartData = dirBuyers.length > 0 
      ? dirBuyers.slice(0, 5).map(b => ({ name: b.name.split(" ")[0], score: b.reliabilityScore }))
      : [
          { name: "No Buyers", score: 0 }
        ];

    return (
      <div className="space-y-5 animate-fade-in">
        <PageHeader
          title="Overview"
          subtitle="Regulator dashboard for transaction metrics, compliance, and dispute resolution"
        />

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard label="Total Transactions" value={contracts.length.toString()} sub="Contracts created" trend="neutral" trendValue="Active" icon={<IconExchange className="w-5 h-5" />} accentColor="#0F766E" iconBg="#CCFBF1" onClick={() => setActiveTabForRole("mahafpc", "All transactions")} />
          <KpiCard label="Volume (MT)" value={totalVolume.toLocaleString()} sub="Turmeric traded" trend="neutral" trendValue="Traded" icon={<IconPackage className="w-5 h-5" />} accentColor="#4F46E5" iconBg="#EEF2FF" onClick={() => setActiveTabForRole("mahafpc", "Reports")} />
          <KpiCard label="GMV" value={formattedGmv} sub="Contract value" trend="neutral" trendValue="Valued" icon={<IconChartBar className="w-5 h-5" />} accentColor="#16A34A" iconBg="#F0FDF4" onClick={() => setActiveTabForRole("mahafpc", "Reports")} />
          <KpiCard label="Open Disputes" value={activeDisputes.length.toString()} sub="Require mediation" trend={activeDisputes.length > 0 ? "down" : "neutral"} trendValue={activeDisputes.length > 0 ? `${activeDisputes.length} open` : "Clean"} icon={<IconAlertTriangle className="w-5 h-5" />} accentColor="#DC2626" iconBg="#FEF2F2" onClick={() => setActiveTabForRole("mahafpc", "Disputes")} />
          <KpiCard label="Active FPOs" value={dirFpos.length.toString()} sub="Registered coop" trend="neutral" trendValue="Active" icon={<IconUsers className="w-5 h-5" />} accentColor="#D97706" iconBg="#FFF7ED" onClick={() => setActiveTabForRole("mahafpc", "FPO ratings")} />
          <KpiCard label="Active Buyers" value={dirBuyers.length.toString()} sub="Verified access" trend="neutral" trendValue="Verified" icon={<IconUserCheck className="w-5 h-5" />} accentColor="#7C3AED" iconBg="#F5F3FF" onClick={() => setActiveTabForRole("mahafpc", "Buyer scores")} />
        </div>

        {/* Content rows */}
        <div className="grid grid-cols-12 gap-5">
          {/* Reliability chart */}
          <div className="col-span-6">
            <Card title="Buyer Reliability Scores" subtitle="AI-computed payment reliability index per buyer">
              <div className="h-[200px] mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barChartData}
                    margin={{ top: 4, right: 16, left: -20, bottom: 4 }}
                    barSize={32}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94A3B8", fontFamily: "Inter" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94A3B8", fontFamily: "Inter" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "12px", fontSize: 12, fontFamily: "Inter", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
                      formatter={(v: any) => [`${v} / 100`, "Reliability Score"]}
                    />
                    <Bar dataKey="score" fill="#0F766E" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Open Disputes link / minimal */}
          <div className="col-span-6 space-y-4">
            <Card
              title="Active Disputes Awaiting Arbitration"
              subtitle="Pending arbitration review"
              extra={
                <button
                  onClick={() => setActiveTabForRole("mahafpc", "Disputes")}
                  className="text-tx-p hover:text-pur transition-colors text-[11px] font-bold"
                >
                  View All →
                </button>
              }
            >
              {activeDisputes.length > 0 ? (
                <div className="space-y-3">
                  {activeDisputes.map((d) => (
                    <div key={d.id} className="border border-bd-t bg-bg-s/35 p-3 rounded text-[11.5px] font-semibold space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-tx-p font-bold">{d.id} · {d.type}</span>
                        <span className="text-[10px] text-tx-t font-semibold">{d.filedAt}</span>
                      </div>
                      <div className="text-[11px] text-tx-s leading-normal font-medium">
                        <strong className="text-tx-p">{d.buyerName}</strong> vs <strong className="text-tx-p">{d.fpoName}</strong>
                        <div className="mt-1 italic text-tx-t">"{d.description}"</div>
                      </div>
                      <button
                        onClick={() => resolveDispute(d.id)}
                        className="px-2.5 py-0.5 text-[11px] font-bold text-white bg-pur hover:bg-pur-m rounded transition-colors"
                      >
                        Arbitrate
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-tx-t font-semibold text-[11px]">
                  No active disputes. Compliance parameters within standard operational limits.
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const renderAllTransactions = () => {
    // Platform wide list of lots
    const columns = [
      {
        header: "Lot ID",
        render: (item: any) => <span className="font-mono font-bold text-tx-p">{item.id}</span>,
      },
      {
        header: "FPO Supplier",
        render: (item: any) => <span>{item.fpoName}</span>,
      },
      {
        header: "Description",
        render: (item: any) => <span>{item.description}</span>,
      },
      {
        header: "Weight",
        render: (item: any) => <span>{item.qty} MT</span>,
      },
      {
        header: "Target/kg",
        render: (item: any) => <span>₹{item.priceExpectation}</span>,
      },
      {
        header: "Trade Status",
        render: (item: any) => <Pill status={item.status} />,
      },
      {
        header: "Location",
        render: (item: any) => <span className="font-semibold text-tx-t">{item.location}</span>,
      },
    ];

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="page-hd">
          <div className="page-title">Platform Trade Ledger</div>
          <div className="page-sub">Consolidated platform registry listing all active negotiations, transit agreements, and completed trades</div>
        </div>

        <DataTable
          columns={columns}
          data={lots}
          searchPlaceholder="Search all transactions..."
          searchFilter={(item, q) =>
            item.id.toLowerCase().includes(q.toLowerCase()) ||
            item.fpoName.toLowerCase().includes(q.toLowerCase()) ||
            item.description.toLowerCase().includes(q.toLowerCase()) ||
            item.status.toLowerCase().includes(q.toLowerCase())
          }
        />
      </div>
    );
  };

  const renderReports = () => {
    const totalVolume = lots.reduce((acc, curr) => acc + curr.qty, 0);
    const avgPrice = Math.round(lots.reduce((acc, curr) => acc + curr.priceExpectation, 0) / lots.length);

    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Platform Trade Volume Reports"
          subtitle="Consolidated agricultural trade flow metrics and price indexes computed in real-time"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartPlaceholder title="Volume Trends" subtitle="Monthly trade volume (MT)" type="bar" color="#0F766E" />
          <ChartPlaceholder title="Revenue Analytics" subtitle="GMV trend over time" type="area" color="#6366F1" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card title="Volume by Grade">
            <div className="space-y-3 mt-2 text-[12px] font-semibold">
              {[
                { grade: "Premium Spec", vol: `${lots.filter(l => l.grade === "Premium").reduce((a, b) => a + b.qty, 0)} MT`, percent: "42%" },
                { grade: "Grade A", vol: `${lots.filter(l => l.grade === "Grade A").reduce((a, b) => a + b.qty, 0)} MT`, percent: "38%" },
                { grade: "Grade B", vol: `${lots.filter(l => l.grade === "Grade B").reduce((a, b) => a + b.qty, 0)} MT`, percent: "20%" },
              ].map((g, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 border border-bd-t rounded bg-bg-s/35">
                  <span className="text-tx-p">{g.grade}</span>
                  <div className="flex gap-4">
                    <span>{g.vol}</span>
                    <span className="text-pur font-bold">{g.percent}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Average Prices Index">
            <div className="space-y-3 mt-2 text-[12px] font-semibold">
              <div className="flex justify-between p-2 border border-bd-t rounded bg-bg-s/35">
                <span className="text-tx-p">All Grades Index</span>
                <span className="font-bold text-teal-accent">₹{avgPrice}/kg</span>
              </div>
              <div className="flex justify-between p-2 border border-bd-t rounded bg-bg-s/35">
                <span className="text-tx-p">Premium Grade Avg</span>
                <span className="font-bold text-teal-accent">₹132/kg</span>
              </div>
              <div className="flex justify-between p-2 border border-bd-t rounded bg-bg-s/35">
                <span className="text-tx-p">Grade A Finger Avg</span>
                <span className="font-bold text-teal-accent">₹130/kg</span>
              </div>
            </div>
          </Card>

          <Card title="Market Summary Stats">
            <div className="space-y-2 mt-1 text-[11.5px] font-semibold">
              <div className="flex justify-between">
                <span className="text-tx-s">Total Traded Volume:</span>
                <span className="text-tx-p font-bold">{totalVolume} MT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-tx-s">Negotiated Escrow Vault:</span>
                <span className="text-tx-p font-bold">₹{(contracts.reduce((a, b) => a + b.amount, 0)).toFixed(2)} Lakhs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-tx-s">Regional FPOs Active:</span>
                <span className="text-tx-p font-bold">4 FPOs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-tx-s">Active Escrows:</span>
                <span className="text-tx-p font-bold">{contracts.filter(c => c.escrowStatus === "Deposited").length} active</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderBuyerScores = () => {
    const columns = [
      {
        header: "Rank",
        render: (item: any) => <span className="font-bold text-tx-p">{item.rank}</span>,
        className: "w-16 text-center",
      },
      {
        header: "Trader Company",
        render: (item: any) => <span className="font-bold text-tx-p">{item.name}</span>,
      },
      {
        header: "Compliance Index Score",
        render: (item: any) => (
          <div className="flex items-center gap-2">
            <div className="overflow-hidden h-1.5 w-24 rounded bg-bg-t">
              <div style={{ width: `${item.score}%` }} className="h-full bg-pur" />
            </div>
            <span className="font-bold text-pur">{item.score} / 100</span>
          </div>
        ),
      },
      {
        header: "Escrow Funding SLA",
        render: (item: any) => <span>{item.paymentDays}</span>,
      },
      {
        header: "Total Vol Traded",
        render: (item: any) => <span>{item.volume}</span>,
      },
    ];

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="page-hd">
          <div className="page-title">Trader Compliance Scores</div>
          <div className="page-sub">Regulatory compliance ranks calculated based on escrow contract funding speed, GRN disputes, and trade volumes</div>
        </div>

        <DataTable columns={columns} data={buyerScores} />
      </div>
    );
  };

  const renderFpoRatings = () => {
    const columns = [
      {
        header: "Rank",
        render: (item: any) => <span className="font-bold text-tx-p">{item.rank}</span>,
        className: "w-16 text-center",
      },
      {
        header: "FPO Name",
        render: (item: any) => <span className="font-bold text-tx-p">{item.name}</span>,
      },
      {
        header: "Grower Members",
        render: (item: any) => <span>{item.members} farmers</span>,
      },
      {
        header: "Grade Quality Conformance",
        render: (item: any) => (
          <span className="font-bold text-teal-accent">{item.gradeConformance}</span>
        ),
      },
      {
        header: "Platform Rating",
        render: (item: any) => (
          <span className="font-bold text-tx-p flex items-center gap-1">
            <IconStar className="w-3.5 h-3.5 fill-amb-m text-amb-m" />
            <span>{item.rating}</span>
          </span>
        ),
      },
    ];

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="page-hd">
          <div className="page-title">FPO Catalog Quality Ratings</div>
          <div className="page-sub">Supplier rating indexes derived from grading certificates conformance and delivery timelines compliance</div>
        </div>

        <DataTable columns={columns} data={fpoRatings} />
      </div>
    );
  };

  const renderDisputes = () => {
    const columns = [
      {
        header: "Case ID",
        render: (item: any) => <span className="font-mono font-bold text-tx-p">{item.id}</span>,
      },
      {
        header: "Dispute Type",
        render: (item: any) => <span className="font-bold text-cor">{item.type}</span>,
      },
      {
        header: "FPO Supplier",
        render: (item: any) => <span>{item.fpoName}</span>,
      },
      {
        header: "Buyer Accuser",
        render: (item: any) => <span>{item.buyerName}</span>,
      },
      {
        header: "Case Summary",
        render: (item: any) => <span className="text-tx-s truncate max-w-[240px] block">{item.description}</span>,
      },
      {
        header: "Dispute Status",
        render: (item: any) => <Pill status={item.status} />,
      },
      {
        header: "Action",
        render: (item: any) => {
          return (
            <Button size="sm" onClick={() => openModal("dispute-details", { dispute: item })}>
              View Thread
            </Button>
          );
        },
      },
    ];

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="page-hd">
          <div className="page-title">Regulatory Dispute Cases</div>
          <div className="page-sub">Platform dispute arbitration portal for Agmark quality conformance and escrow payment disbursements</div>
        </div>

        <DataTable
          columns={columns}
          data={disputes}
          searchPlaceholder="Search dispute logs..."
          searchFilter={(item, q) =>
            item.id.toLowerCase().includes(q.toLowerCase()) ||
            item.fpoName.toLowerCase().includes(q.toLowerCase()) ||
            item.buyerName.toLowerCase().includes(q.toLowerCase())
          }
        />
      </div>
    );
  };

  const renderArchive = () => {
    // Filter closed transactions (e.g. Delivered or Escrow status is Released)
    const closedContracts = contracts.filter((c) => c.escrowStatus === "Released");

    const columns = [
      {
        header: "Contract Ref",
        render: (item: any) => <span className="font-mono font-bold text-tx-p">{item.id}</span>,
      },
      {
        header: "Lot Ref",
        render: (item: any) => <span>{item.lotDescription}</span>,
      },
      {
        header: "Supplier FPO",
        render: (item: any) => <span>{item.fpoName}</span>,
      },
      {
        header: "Purchasing Trader",
        render: (item: any) => <span>{item.buyerName}</span>,
      },
      {
        header: "Total Settlement",
        render: (item: any) => <span className="font-bold text-tx-p">₹{item.amount.toFixed(2)}L</span>,
      },
      {
        header: "Escrow Status",
        render: () => <Pill status="Released" />,
      },
    ];

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="page-hd">
          <div className="page-title">Completed Trade Archives</div>
          <div className="page-sub">Closed transactions where escrow funds have been successfully released to farmers</div>
        </div>

        <DataTable
          columns={columns}
          data={closedContracts}
          searchPlaceholder="Search closed logs..."
          searchFilter={(item, q) =>
            item.id.toLowerCase().includes(q.toLowerCase()) ||
            item.fpoName.toLowerCase().includes(q.toLowerCase()) ||
            item.buyerName.toLowerCase().includes(q.toLowerCase())
          }
        />
      </div>
    );
  };

  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = React.useState<any>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = React.useState(false);
  const [roleModalMode, setRoleModalMode] = React.useState<"create" | "edit">("create");
  const [roleModalId, setRoleModalId] = React.useState<number | null>(null);
  const [roleModalName, setRoleModalName] = React.useState("");
  const [roleModalDesc, setRoleModalDesc] = React.useState("");
  const [roleModalEmail, setRoleModalEmail] = React.useState("");

  const {
    roles,
    permissions,
    createRole,
    updateRole,
    deleteRole,
    savePermissions,
    showToast,
  } = useApp();

  const toast = (msg: string) => showToast(msg);

  const handleCreateRoleClick = () => {
    setRoleModalMode("create");
    setRoleModalId(null);
    setRoleModalName("");
    setRoleModalDesc("");
    setRoleModalEmail("");
    setIsRoleModalOpen(true);
  };

  const handleEditRoleClick = (role: any) => {
    setRoleModalMode("edit");
    setRoleModalId(role.id);
    setRoleModalName(role.name);
    setRoleModalDesc(role.description);
    setRoleModalEmail(role.email || "");
    setIsRoleModalOpen(true);
  };

  const handleDeleteRoleClick = (role: any) => {
    if (role.usersAssigned > 0) {
      toast(`Cannot delete — ${role.usersAssigned} users still assigned`);
      return;
    }
    deleteRole(role.id);
    toast("Role deleted successfully");
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleModalName.trim() || !roleModalDesc.trim()) return;

    if (roleModalMode === "create") {
      createRole(roleModalName, roleModalDesc, roleModalEmail.trim());
      toast("Role created successfully");
    } else if (roleModalMode === "edit" && roleModalId !== null) {
      updateRole(roleModalId, roleModalName, roleModalDesc, roleModalEmail.trim());
      toast("Role updated");
    }
    setIsRoleModalOpen(false);
  };

  const handlePermissionChange = (roleId: number, moduleName: string, action: string) => {
    const currentRolePerms = permissions[roleId] || {};
    const modulePerms = currentRolePerms[moduleName] || { view: false, add: false, edit: false, delete: false };
    
    const updatedPerms = {
      ...currentRolePerms,
      [moduleName]: {
        ...modulePerms,
        [action]: !modulePerms[action as "view" | "add" | "edit" | "delete"],
      },
    };
    savePermissions(roleId, updatedPerms);
  };

  const handleSavePermissions = (roleName: string) => {
    // TODO: POST /api/roles
    toast(`Permissions saved for ${roleName}`);
    setSelectedRoleForPermissions(null);
  };

  const renderRolesList = () => {
    const totalRoles = roles.length;
    const activeUsers = roles.reduce((sum, r) => sum + r.usersAssigned, 0);
    const modulesCount = 7;
    const lastChange = "2 hours ago";

    return (
      <div className="space-y-5 animate-fade-in">
        <PageHeader
          title="Roles & Permissions"
          subtitle="Manage access control for all modules"
        />

        {/* Metric tiles row */}
        <div className="mg">
          <div className="mc">
            <span className="text-xs font-semibold text-tx-s uppercase tracking-wider">Total Roles</span>
            <span className="text-2xl font-bold text-tx-p mt-1">{totalRoles}</span>
            <span className="text-[10px] text-tx-t mt-1 font-semibold">Active roles configured</span>
          </div>
          <div className="mc">
            <span className="text-xs font-semibold text-tx-s uppercase tracking-wider">Active Users</span>
            <span className="text-2xl font-bold text-tx-p mt-1">{activeUsers}</span>
            <span className="text-[10px] text-tx-t mt-1 font-semibold">Users with roles assigned</span>
          </div>
          <div className="mc">
            <span className="text-xs font-semibold text-tx-s uppercase tracking-wider">Modules</span>
            <span className="text-2xl font-bold text-tx-p mt-1">{modulesCount}</span>
            <span className="text-[10px] text-tx-t mt-1 font-semibold">Protected modules</span>
          </div>
          <div className="mc">
            <span className="text-xs font-semibold text-tx-s uppercase tracking-wider">Last Change</span>
            <span className="text-2xl font-bold text-tx-p mt-1">{lastChange}</span>
            <span className="text-[10px] text-tx-t mt-1 font-semibold">System configuration update</span>
          </div>
        </div>

        {/* Roles Table card */}
        <div className="card bg-bg-p border border-bd-t rounded-lg shadow-card p-6">
          <div className="flex justify-between items-center pb-4 mb-4 border-b border-bd-t">
            <div>
              <h3 className="card-title text-tx-p">Access Control Roles</h3>
              <p className="text-xs text-tx-s mt-1">Configure permission templates and assign them to users</p>
            </div>
            <button className="btn btn-pr btn-sm px-4 h-9" onClick={handleCreateRoleClick}>
              Create Role
            </button>
          </div>

          <div className="tgrid">
            {/* Header */}
            <div className="trow font-bold text-xs uppercase tracking-wider text-tx-s bg-bg-s border-b border-bd-t rounded-t-md thead-row">
              <div className="w-1/5">Role Name</div>
              <div className="w-1/3">Description</div>
              <div className="w-1/5">Access Email</div>
              <div className="w-1/12 text-center">Users</div>
              <div className="w-1/12 text-center">Created</div>
              <div className="w-1/6 text-right">Actions</div>
            </div>

            {/* Rows */}
            {roles.map((role) => (
              <div key={role.id} className="trow hover:bg-bg-t/50 transition-colors text-sm text-tx-s">
                <div className="w-1/5 font-semibold text-tx-p flex items-center gap-2">
                  {role.is_superadmin ? (
                    <>
                      <IconLock className="w-4 h-4 text-tx-t shrink-0" />
                      <span
                        onClick={() => setSelectedRoleForPermissions(role)}
                        className="cursor-pointer text-primary hover:underline"
                      >
                        {role.name}
                      </span>
                      <span className="pill p-teal text-[10px] leading-none py-0.5 ml-1">
                        System
                      </span>
                    </>
                  ) : (
                    <span
                      onClick={() => setSelectedRoleForPermissions(role)}
                      className="cursor-pointer text-tx-p hover:text-primary hover:underline"
                    >
                      {role.name}
                    </span>
                  )}
                </div>
                <div className="w-1/3 truncate pr-4 text-xs font-medium text-tx-s">{role.description}</div>
                <div className="w-1/5 truncate pr-4 text-xs font-mono font-semibold text-tx-p">
                  {role.email || <span className="text-tx-t italic font-normal">—</span>}
                </div>
                <div className="w-1/12 text-center font-semibold text-tx-p">{role.usersAssigned}</div>
                <div className="w-1/12 text-center text-xs text-tx-t">{role.created}</div>
                <div className="w-1/6 text-right flex justify-end gap-2 shrink-0">
                  {!role.is_superadmin ? (
                    <>
                      <button
                        className="btn btn-sm hover:bg-bg-t font-semibold"
                        onClick={() => handleEditRoleClick(role)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-dn font-semibold text-white"
                        onClick={() => handleDeleteRoleClick(role)}
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-tx-t italic font-semibold flex items-center gap-1">
                      <IconLock className="w-3.5 h-3.5" /> Locked
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderPermissionMatrix = (role: any) => {
    const modulesList = ["Dashboard", "Users", "Roles", "Reports", "Settings", "Billing", "Audit Logs"];

    return (
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedRoleForPermissions(null)}
            className="p-1.5 rounded-md hover:bg-bg-t text-tx-s hover:text-tx-p transition-colors border border-bd-t bg-bg-p cursor-pointer"
          >
            <IconChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-tx-p leading-none">Permissions — {role.name}</h2>
            <p className="text-xs text-tx-s mt-1.5 font-semibold">Manage modular actions access limits for role template</p>
          </div>
        </div>

        {role.is_superadmin && (
          <div className="card border-teal-left bg-bg-p border border-bd-t rounded-lg p-5 shadow-card">
            <div className="flex gap-3 items-start">
              <IconShield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-tx-p text-sm">System Role Configuration</h4>
                <p className="text-xs text-tx-s mt-1 font-medium leading-relaxed">
                  Superadmin has all permissions by default. This cannot be modified.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="card bg-bg-p border border-bd-t rounded-lg shadow-card p-6">
          <div className="tgrid">
            {/* Header row */}
            <div className="trow font-bold text-xs uppercase tracking-wider text-tx-s bg-bg-s border-b border-bd-t rounded-t-md thead-row">
              <div className="w-1/3">Module</div>
              <div className="w-1/6 text-center">View</div>
              <div className="w-1/6 text-center">Add</div>
              <div className="w-1/6 text-center">Edit</div>
              <div className="w-1/6 text-center">Delete</div>
            </div>

            {/* Rows */}
            {modulesList.map((module) => {
              const isSuper = role.is_superadmin;
              const perms = permissions[role.id]?.[module] || { view: false, add: false, edit: false, delete: false };

              return (
                <div key={module} className="trow hover:bg-bg-t/50 transition-colors text-sm text-tx-s">
                  <div className="w-1/3 font-semibold text-tx-p">{module}</div>
                  {["view", "add", "edit", "delete"].map((action) => {
                    const isChecked = isSuper ? true : !!perms[action as "view" | "add" | "edit" | "delete"];
                    return (
                      <div key={action} className="w-1/6 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isSuper}
                          onChange={() => handlePermissionChange(role.id, module, action)}
                          className="rounded border-bd-s text-primary focus:ring-primary h-4 w-4 cursor-pointer disabled:cursor-not-allowed"
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div className="pt-5 border-t border-bd-t flex justify-end gap-3 mt-6">
            <button
              className="btn hover:bg-bg-t font-semibold"
              onClick={() => setSelectedRoleForPermissions(null)}
            >
              Cancel
            </button>
            <button
              className="btn btn-pr font-semibold"
              onClick={() => handleSavePermissions(role.name)}
            >
              Save Permissions
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderRolesAndPermissions = () => {
    return (
      <div className="animate-fade-in relative min-h-[500px]">
        {selectedRoleForPermissions ? (
          renderPermissionMatrix(selectedRoleForPermissions)
        ) : (
          renderRolesList()
        )}

        {/* Create/Edit Modal */}
        <AnimatePresence>
          {isRoleModalOpen && (
            <div className="modal-wrap">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-tx-p/50 backdrop-blur-sm z-40"
                onClick={() => setIsRoleModalOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                role="dialog"
                aria-modal="true"
                className="modal z-50 bg-bg-p border border-bd-t rounded-xl shadow-lg w-full max-w-md p-6 relative"
              >
                <button
                  onClick={() => setIsRoleModalOpen(false)}
                  className="absolute top-4 right-4 text-tx-t hover:text-tx-p transition-colors p-1.5 rounded-md hover:bg-bg-t"
                  aria-label="Close modal"
                >
                  <IconX className="w-5 h-5" />
                </button>

                <form onSubmit={handleSaveRole} className="space-y-5">
                  <div>
                    <h2 className="card-title text-tx-p">
                      {roleModalMode === "create" ? "Create Role" : "Edit Role"}
                    </h2>
                    <p className="text-xs text-tx-s mt-1 font-semibold">
                      {roleModalMode === "create" ? "Add a custom role configuration" : "Modify role description and template settings"}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Input
                      label="Role Name"
                      value={roleModalName}
                      onChange={(e) => setRoleModalName(e.target.value)}
                      required
                      floating={false}
                      disabled={roleModalMode === "edit"}
                    />
                    <Textarea
                      label="Description"
                      value={roleModalDesc}
                      onChange={(e) => setRoleModalDesc(e.target.value)}
                      required
                      rows={3}
                      placeholder="e.g. Manages operations and views billing records"
                    />
                    <Input
                      label="Authorized Access Email"
                      type="email"
                      value={roleModalEmail}
                      onChange={(e) => setRoleModalEmail(e.target.value)}
                      placeholder="e.g. employee@mahafpc.in"
                      floating={false}
                      required
                    />
                  </div>

                  <div className="pt-4 flex justify-end gap-3 border-t border-bd-t mt-6">
                    <button
                      type="button"
                      className="btn hover:bg-bg-t font-semibold"
                      onClick={() => setIsRoleModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-pr font-semibold">
                      Save
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderMemberDirectory = () => {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Member Directory"
          subtitle="Complete registry of central organization employees, registered Buyers, and FPO coordinators."
        />

        {/* Directory Navigation Tabs */}
        <div className="flex border-b border-bd-t gap-6 text-sm font-semibold select-none">
          {[
            { id: "users", label: "Employees & Managers", count: dirUsers.length },
            { id: "fpos", label: "Registered FPOs", count: dirFpos.length },
            { id: "buyers", label: "Registered Buyers", count: dirBuyers.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedDirTab(tab.id as any)}
              className={`pb-3 relative transition-all ${
                selectedDirTab === tab.id
                  ? "text-primary border-b-2 border-primary font-bold"
                  : "text-tx-s hover:text-tx-p"
              }`}
            >
              <span>{tab.label}</span>
              <span className="ml-2 text-xs bg-bg-t px-1.5 py-0.5 rounded text-tx-t">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content Tabs */}
        {selectedDirTab === "users" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dirUsers.length === 0 ? (
              <div className="col-span-full text-center py-8 text-tx-t text-sm border border-dashed border-bd-t rounded-xl bg-bg-s/20">
                No employees or managers registered.
              </div>
            ) : (
              dirUsers.map((u) => (
                <div key={u.id} className="bg-bg-p border border-bd-t rounded-2xl p-5 shadow-sm hover:shadow-md transition-all space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-tx-p">{u.name}</h4>
                      <p className="text-xs text-tx-s mt-0.5">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-bd-t pt-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-tx-t tracking-wider">Role Type</span>
                      <div className="font-semibold text-tx-p capitalize mt-0.5 text-xs">{u.roleType}</div>
                    </div>
                    {u.employeeRole && (
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-tx-t tracking-wider">Position</span>
                        <div className="font-semibold text-tx-p mt-0.5 text-xs">{u.employeeRole}</div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-tx-t tracking-wider">Status</span>
                      <div className="mt-0.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.isActive ? "bg-teal-bg text-primary" : "bg-cor-bg text-cor"
                        }`}>
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                    {u.employeeId && (
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-tx-t tracking-wider">Employee ID</span>
                        <div className="font-semibold text-tx-p mt-0.5 text-xs">{u.employeeId}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {selectedDirTab === "fpos" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dirFpos.length === 0 ? (
              <div className="col-span-full text-center py-8 text-tx-t text-sm border border-dashed border-bd-t rounded-xl bg-bg-s/20">
                No FPOs registered in the system.
              </div>
            ) : (
              dirFpos.map((f) => (
                <div key={f.id} className="bg-bg-p border border-bd-t rounded-2xl p-5 shadow-sm hover:shadow-md transition-all space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-tx-p">{f.name}</h4>
                    <p className="text-xs text-tx-s mt-1">Location: {f.location || "N/A"}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs border-t border-bd-t pt-3">
                    <div className="border-r border-bd-t">
                      <span className="text-[9px] uppercase font-bold text-tx-t">Farmers</span>
                      <div className="font-bold text-tx-p mt-0.5 text-xs">{f.membersCount || 0}</div>
                    </div>
                    <div className="border-r border-bd-t">
                      <span className="text-[9px] uppercase font-bold text-tx-t">Conformance</span>
                      <div className="font-bold text-tx-p mt-0.5 text-xs">{f.gradeConformance || "90%"}</div>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-tx-t">Rating</span>
                      <div className="font-bold text-tx-p mt-0.5 text-xs">{f.rating || "4.0/5"}</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-bd-t pt-3">
                    <span className="text-tx-s font-semibold text-xs">Reliability Score</span>
                    <span className="font-bold text-primary text-xs">{f.reliabilityScore || 70} / 100</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {selectedDirTab === "buyers" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dirBuyers.length === 0 ? (
              <div className="col-span-full text-center py-8 text-tx-t text-sm border border-dashed border-bd-t rounded-xl bg-bg-s/20">
                No Buyers registered in the system.
              </div>
            ) : (
              dirBuyers.map((b) => (
                <div key={b.id} className="bg-bg-p border border-bd-t rounded-2xl p-5 shadow-sm hover:shadow-md transition-all space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-tx-p">{b.name}</h4>
                    {b.companyName && <p className="text-xs text-tx-s mt-0.5">{b.companyName}</p>}
                    <p className="text-[11px] text-tx-t mt-1">Location: {b.location || "N/A"} &middot; Type: {b.businessType || "N/A"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center text-xs border-t border-bd-t pt-3">
                    <div className="border-r border-bd-t">
                      <span className="text-[9px] uppercase font-bold text-tx-t">Volume Traded</span>
                      <div className="font-bold text-tx-p mt-0.5 text-xs">{b.volumeTraded || "0 MT"}</div>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-tx-t">Avg Pay Days</span>
                      <div className="font-bold text-tx-p mt-0.5 text-xs">{b.paymentDaysAvg || "3.0 days"}</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-bd-t pt-3">
                    <span className="text-tx-s font-semibold text-xs">Reliability Score</span>
                    <span className="font-bold text-amb text-xs">{b.reliabilityScore || 70} / 100</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  const renderContactInquiries = () => {
    const filtered = contactInquiries.filter((inq: any) =>
      inq.name.toLowerCase().includes(searchInquiry.toLowerCase()) ||
      inq.email.toLowerCase().includes(searchInquiry.toLowerCase()) ||
      (inq.company && inq.company.toLowerCase().includes(searchInquiry.toLowerCase())) ||
      (inq.phone && inq.phone.includes(searchInquiry))
    );

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-tx-p">Contact Inquiries</h2>
          <p className="text-xs md:text-sm text-tx-s mt-1">
            Review and track interest submissions and custom inquiries logged from the landing page.
          </p>
        </div>

        {/* Filters/Actions toolbar */}
        <div className="bg-[#FFFFFF] dark:bg-[#1E293B] border border-bd-t rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute inset-y-0 left-3 flex items-center text-tx-t pointer-events-none">
              <IconSearch className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search inquiries..."
              value={searchInquiry}
              onChange={(e) => setSearchInquiry(e.target.value)}
              className="w-full bg-[#F8FAFC] dark:bg-[#0F172A] border border-bd-t rounded-lg pl-9 pr-3.5 py-1.5 font-semibold text-xs text-tx-p focus:outline-none focus:border-primary placeholder:text-tx-t"
            />
          </div>
          <div className="text-xs font-semibold text-tx-s">
            Showing <strong className="text-tx-p">{filtered.length}</strong> of {contactInquiries.length} submissions
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-[#FFFFFF] dark:bg-[#1E293B] border border-bd-t rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-semibold">
              <thead>
                <tr className="bg-[#F1F5F9] dark:bg-[#0F172A] text-tx-s border-b border-bd-t uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 font-bold">Contact Name</th>
                  <th className="py-3.5 px-4 font-bold">Work Email</th>
                  <th className="py-3.5 px-4 font-bold">Organization</th>
                  <th className="py-3.5 px-4 font-bold">Phone Number</th>
                  <th className="py-3.5 px-4 font-bold">Submission Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bd-t text-tx-p">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-tx-t font-semibold">
                      No contact inquiries found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((inq: any) => (
                    <tr key={inq.id} className="hover:bg-bg-s/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-tx-p">{inq.name}</td>
                      <td className="py-3 px-4 text-tx-s font-medium">{inq.email}</td>
                      <td className="py-3 px-4 text-tx-p">{inq.company || <span className="text-tx-t italic">N/A</span>}</td>
                      <td className="py-3 px-4 font-mono text-tx-p">{inq.phone || <span className="text-tx-t italic">N/A</span>}</td>
                      <td className="py-3 px-4 text-tx-s font-medium">
                        {new Date(inq.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardShell>
      {activeTab === "Overview" && renderOverview()}
      {activeTab === "All transactions" && renderAllTransactions()}
      {activeTab === "Reports" && renderReports()}
      {activeTab === "Buyer scores" && renderBuyerScores()}
      {activeTab === "FPO ratings" && renderFpoRatings()}
      {activeTab === "Disputes" && renderDisputes()}
      {activeTab === "Archive" && renderArchive()}
      {activeTab === "Roles & Permissions" && renderRolesAndPermissions()}
      {activeTab === "Member Directory" && renderMemberDirectory()}
      {activeTab === "Contact Inquiries" && renderContactInquiries()}
    </DashboardShell>
  );
}
