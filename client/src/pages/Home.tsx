import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import {
  AlertCircle,
  ArrowRight,
  BellRing,
  Building2,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileQuestion,
  FolderKanban,
  History,
  Landmark,
  Mail,
  Scale,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

const corePillars = [
  {
    icon: FolderKanban,
    title: "1. Case Registration",
    description: "Record bank details, disputed lien amount (₹), transaction IDs, and NCRP/FIR complaint numbers into a centralized dossier.",
  },
  {
    icon: Mail,
    title: "2. Authority Communication",
    description: "Generate and dispatch structured legal representations with a unique Case ID (LG-CYB-1024) to the Bank & Cyber Cell.",
  },
  {
    icon: Clock,
    title: "3. Deadline & SLA Tracking",
    description: "Every communication is linked with a countdown SLA. You never have to manually guess when a response is overdue.",
  },
  {
    icon: BellRing,
    title: "4. Automated Reminders",
    description: "If the deadline passes without response, LienGuard triggers structured follow-up reminders urging urgent action.",
  },
  {
    icon: TrendingUp,
    title: "5. Multi-Tier Escalation",
    description: "Move unanswered disputes from Branch & IO to the Principal Nodal Officer, SP Cyber, and the Banking Ombudsman.",
  },
  {
    icon: FileQuestion,
    title: "6. Section 6(1) RTI Assistance",
    description: "Auto-compile case chronology and statutory cybercrime questions into a ready-to-file Right to Information draft.",
  },
];

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isAuthenticated) navigate("/workspace");
  }, [isAuthenticated, navigate]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#101b31] text-white">
      <section className="relative isolate min-h-screen px-5 pb-16 pt-5 sm:px-8 lg:px-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_16%,rgba(69,153,151,0.22),transparent_30%),radial-gradient(circle_at_89%_78%,rgba(64,85,134,0.32),transparent_40%)]" />

        {/* Navigation */}
        <nav className="mx-auto flex max-w-7xl items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#9fe2d3] text-[#101b31] shadow-lg shadow-black/20">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-xl leading-none">LienGuard</p>
              <p className="mt-1 font-mono text-[0.56rem] uppercase tracking-[0.18em] text-[#9fe2d3]">
                Cyber & Bank Lien Resolution
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => startLogin()}
            className="text-slate-200 hover:bg-white/10 hover:text-white"
          >
            Sign In / Workspace
          </Button>
        </nav>

        {/* Hero Section */}
        <div className="mx-auto grid max-w-7xl gap-14 pb-12 pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:pt-20">
          <div className="space-y-6">
            <Badge className="bg-[#1d6971]/60 text-[#9fe2d3] border-[#9fe2d3]/30 px-3 py-1 font-mono text-xs uppercase tracking-wider">
              Citizen-Centric Case Resolution Platform
            </Badge>

            <h1 className="font-display text-4xl leading-[1.05] sm:text-5xl lg:text-6xl text-white">
              Bank account frozen?<br />
              <span className="text-[#9fe2d3] italic">LienGuard takes over what happens next.</span>
            </h1>

            <p className="max-w-xl text-base sm:text-lg leading-relaxed text-slate-300">
              When money gets frozen due to cybercrime inquiries or disputed transactions, citizens struggle with missing reasons, unknown authorities, and unanswered emails. LienGuard turns confusing bank-lien issues into a <strong>structured, time-aware, trackable case</strong>.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center pt-2">
              <Button
                size="lg"
                disabled={loading}
                onClick={() => startLogin()}
                className="h-13 bg-[#9fe2d3] px-7 text-[#101b31] font-semibold hover:bg-[#c5f2e6] shadow-lg shadow-[#9fe2d3]/10"
              >
                Access My Case Workspace <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <span className="flex items-center text-xs text-slate-400">
                <ShieldCheck className="mr-1.5 h-4 w-4 text-[#9fe2d3]" />
                Secure Protected Citizen Access
              </span>
            </div>

            {/* Quick Flow Visual */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs font-mono text-slate-300 backdrop-blur flex flex-wrap items-center gap-2">
              <span className="text-[#9fe2d3]">Case: LG-CYB-1024</span>
              <span>→</span>
              <span>Lien: ₹15,000</span>
              <span>→</span>
              <span>Notice Sent</span>
              <span>→</span>
              <span>7d Deadline</span>
              <span>→</span>
              <span className="text-[#f87171]">Auto Follow-up</span>
              <span>→</span>
              <span className="text-[#9fe2d3]">RTI / Escalation</span>
            </div>
          </div>

          {/* Workflow Interactive Preview Card */}
          <div className="relative mx-auto w-full max-w-md rounded-[2rem] border border-white/15 bg-white/[0.07] p-5 shadow-2xl backdrop-blur">
            <div className="rounded-[1.45rem] bg-[#f7f6f2] p-6 text-[#20314c] space-y-4">
              <div className="flex items-center justify-between border-b border-[#e2e8e8] pb-4">
                <div>
                  <span className="font-mono text-[0.62rem] uppercase tracking-widest text-[#1d6971] font-bold">
                    LG-CYB-1024
                  </span>
                  <h2 className="font-display text-xl text-[#20314c] mt-0.5">₹15,000 Lien on Savings A/C</h2>
                </div>
                <Badge className="bg-[#fee2e2] text-[#991b1b] border-0 text-[0.68rem]">
                  Deadline Active
                </Badge>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center gap-3 rounded-xl border border-[#e1e6e5] bg-white p-3">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-[#e8f8f4] font-mono text-[0.65rem] text-[#1d6971] font-bold">
                    01
                  </span>
                  <div>
                    <p className="font-semibold">Formal Representation Dispatched</p>
                    <p className="text-[0.68rem] text-slate-500">Sent to SBI Branch & Cyber Crime Cell</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-[#e1e6e5] bg-white p-3">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-[#fef3c7] font-mono text-[0.65rem] text-[#92400e] font-bold">
                    02
                  </span>
                  <div>
                    <p className="font-semibold">7-Day Response SLA Monitored</p>
                    <p className="text-[0.68rem] text-slate-500">Automated reminder queued if unanswered</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-[#e1e6e5] bg-white p-3">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-[#eee9fb] font-mono text-[0.65rem] text-[#654aa1] font-bold">
                    03
                  </span>
                  <div>
                    <p className="font-semibold">Section 6(1) RTI Draft Generated</p>
                    <p className="text-[0.68rem] text-slate-500">Ready to file for certified Sec 102/106 notice</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-[#20314c] p-3.5 text-white">
                <p className="font-mono text-[0.58rem] uppercase tracking-widest text-[#9fe2d3]">What sets LienGuard apart</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  LienGuard doesn't stop when you submit a complaint. It actively manages the entire post-freeze lifecycle until funds are de-frozen.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 6 Core Pillars Grid */}
        <div className="mx-auto mt-6 max-w-7xl">
          <div className="text-center mb-8">
            <p className="font-mono text-xs uppercase tracking-widest text-[#9fe2d3]">Comprehensive Lifecycle Engine</p>
            <h2 className="font-display text-2xl sm:text-3xl text-white mt-1">
              Everything needed to resolve an account freeze.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {corePillars.map(pillar => (
              <div
                key={pillar.title}
                className="rounded-2xl border border-white/10 bg-[#142039]/80 p-5 space-y-2.5 transition hover:border-[#9fe2d3]/40"
              >
                <pillar.icon className="h-5 w-5 text-[#9fe2d3]" />
                <h3 className="text-sm font-semibold text-white">{pillar.title}</h3>
                <p className="text-xs leading-relaxed text-slate-300">{pillar.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Judges One-Liner Box */}
        <div className="mx-auto mt-12 max-w-4xl rounded-2xl border border-[#9fe2d3]/30 bg-[#1d6971]/20 p-6 text-center backdrop-blur">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-[#9fe2d3]">LienGuard Platform Vision</p>
          <p className="mt-2 text-sm sm:text-base leading-relaxed text-slate-200 italic">
            “LienGuard is a citizen-centric case management platform that tracks bank-lien and cybercrime cases, automates authority communication and deadline-based follow-ups, processes responses, escalates prolonged non-response, and assists citizens with appropriate information requests such as RTI drafts.”
          </p>
        </div>
      </section>
    </main>
  );
}

