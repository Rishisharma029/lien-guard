import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Building2,
  CheckCircle2,
  Clock,
  FileCheck2,
  FilePlus2,
  FileQuestion,
  FolderKanban,
  Landmark,
  Mail,
  Scale,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { useLocation } from "wouter";

const roleDetails = {
  citizen: {
    eyebrow: "Citizen Case Workspace",
    icon: UserRound,
    accent: "bg-[#dff4ef] text-[#1d6971]",
    title: "Bank Lien & Cybercrime Resolution Portal",
    description:
      "Manage your frozen account position, track authority communications, monitor response deadlines, and prepare RTI drafts in one protected place.",
    action: "Go to Case Register",
  },
  bank: {
    eyebrow: "Institution Workspace",
    icon: Landmark,
    accent: "bg-[#e6edfb] text-[#385b98]",
    title: "Bank Lien Grievance Review",
    description:
      "Review citizen inquiries, verify Section 102/106 cybercrime requisitions, and communicate status updates.",
    action: "View Operational Cases",
  },
  authority: {
    eyebrow: "Law Enforcement & Authority Workspace",
    icon: Scale,
    accent: "bg-[#f4eadc] text-[#86622e]",
    title: "Cyber Cell Inquiries Queue",
    description:
      "Manage account freeze representations, provide investigation updates, and issue de-freeze NOCs.",
    action: "Open Authority Queue",
  },
  admin: {
    eyebrow: "Governance Workspace",
    icon: ShieldCheck,
    accent: "bg-[#f0e6f7] text-[#6d3f8f]",
    title: "Access Governance & Audit",
    description: "Manage user permissions, monitor audit history, and ensure seamless platform compliance.",
    action: "Manage User Access",
  },
} as const;

const formatCurrency = (amount?: number | null) => {
  if (!amount) return "₹0";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
};

export default function Workspace() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const role = user?.role ?? "citizen";
  const detail = roleDetails[role];
  const Icon = detail.icon;

  const { data: metrics } = trpc.cases.metrics.useQuery(undefined, { enabled: Boolean(user) });

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-[2rem] bg-[#20314c] px-6 py-8 text-white shadow-xl sm:px-10 sm:py-11">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_80%_10%,rgba(159,226,211,0.22),transparent_50%)]" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[#a9e5d8]">{detail.eyebrow}</p>
            <h1 className="font-display mt-3 text-3xl leading-tight sm:text-5xl">{detail.title}</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">{detail.description}</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 backdrop-blur">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#9fe2d3] text-[#20314c]">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">{user?.name || "LienGuard User"}</p>
              <p className="mt-0.5 text-xs text-slate-400">Authenticated ({role.toUpperCase()})</p>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Row */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-[#dfe3e7] bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-[#607089] uppercase tracking-wider">Total Under Lien</span>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e8f8f4] text-[#1d6971]">
                <Landmark className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-[#20314c]">{formatCurrency(metrics?.totalFrozenAmount)}</p>
            <p className="mt-1 text-xs text-[#718095]">Across all registered cases</p>
          </CardContent>
        </Card>

        <Card className="border-[#dfe3e7] bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-[#607089] uppercase tracking-wider">Active Cases</span>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e6edfb] text-[#385b98]">
                <FolderKanban className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-[#20314c]">{metrics?.activeCases ?? 0}</p>
            <p className="mt-1 text-xs text-[#718095]">Currently in resolution queue</p>
          </CardContent>
        </Card>

        <Card className="border-[#dfe3e7] bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-[#607089] uppercase tracking-wider">Awaiting Response</span>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#fef3c7] text-[#92400e]">
                <Clock className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-[#92400e]">{metrics?.awaitingResponse ?? 0}</p>
            <p className="mt-1 text-xs text-[#718095]">Notice sent, tracking deadline</p>
          </CardContent>
        </Card>

        <Card className="border-[#dfe3e7] bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-[#607089] uppercase tracking-wider">Overdue SLA</span>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#fee2e2] text-[#991b1b]">
                <AlertTriangle className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-[#ae5140]">{metrics?.overdueDeadlines ?? 0}</p>
            <p className="mt-1 text-xs text-[#718095]">Eligible for reminder / escalation</p>
          </CardContent>
        </Card>
      </section>

      {/* Feature Modules Grid */}
      <section className="grid gap-5 lg:grid-cols-3">
        <Card className="border-[#dfe3e7] bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 space-y-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8f8f4] text-[#1d6971]">
              <Mail className="h-5 w-5" />
            </span>
            <h3 className="font-semibold text-lg text-[#20314c]">Authority Communication</h3>
            <p className="text-xs text-[#607089] leading-relaxed">
              Auto-generate structured representations to Bank Branch Managers and Cyber Crime Investigating Officers with unique Case IDs.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/cases")}
              className="mt-2 text-xs border-[#1d6971] text-[#1d6971]"
            >
              Open Cases <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-[#dfe3e7] bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 space-y-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff2f0] text-[#ae5140]">
              <TrendingUp className="h-5 w-5" />
            </span>
            <h3 className="font-semibold text-lg text-[#20314c]">Multi-Tier Escalation</h3>
            <p className="text-xs text-[#607089] leading-relaxed">
              Escalate unresponsive cases to Bank Principal Nodal Officers, Cyber Crime SPs, and the Banking Ombudsman (RBI Scheme).
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/cases")}
              className="mt-2 text-xs border-[#ae5140] text-[#ae5140]"
            >
              View Escalations <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-[#dfe3e7] bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 space-y-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eee9fb] text-[#654aa1]">
              <FileQuestion className="h-5 w-5" />
            </span>
            <h3 className="font-semibold text-lg text-[#20314c]">RTI Section 6(1) Assistant</h3>
            <p className="text-xs text-[#607089] leading-relaxed">
              Auto-compile case facts into a ready-to-file legal draft to request certified Section 102/106 notice copies via rtionline.gov.in.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/cases")}
              className="mt-2 text-xs border-[#654aa1] text-[#654aa1]"
            >
              Draft RTI Request <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

