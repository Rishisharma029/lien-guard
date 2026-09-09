import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { SEO } from "@/components/SEO";
import { Footer } from "@/components/Footer";
import { StickyMobileCTA } from "@/components/StickyMobileCTA";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  FileCheck2,
  FileText,
  Gavel,
  Landmark,
  Mail,
  Scale,
  ShieldCheck,
  UserRound,
  WandSparkles,
  Zap,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { trackEvent } from "@/lib/analytics";

const rolePaths = [
  { name: "Citizen", role: "citizen" as const, note: "Submit lien details, follow statutory grace periods, and review RTI drafts.", icon: UserRound, tag: "Citizen Workspace" },
  { name: "Bank", role: "bank" as const, note: "Coordinate secured-interest inquiries, evidence, and hold verifications across your institution.", icon: Landmark, tag: "Nodal Bank Operations" },
  { name: "Authority", role: "authority" as const, note: "Review verified cases, issue document requisitions, and record formal clearance notices.", icon: Scale, tag: "Cyber Police Authority" },
  { name: "Administrator", role: "admin" as const, note: "Maintain official State/UT directory records and oversee immutable audit history.", icon: ShieldCheck, tag: "Access Governance" },
];

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const demoLogin = trpc.auth.demoLogin.useMutation();

  const openWorkspace = async (role: "citizen" | "bank" | "authority" | "admin" = "citizen", redirectTo = "/workspace") => {
    trackEvent("demo_started", { role, target: redirectTo });

    const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
    if (oauthPortalUrl && !oauthPortalUrl.includes("example.com") && !window.location.hostname.includes("localhost")) {
      startLogin();
      return;
    }

    try {
      await demoLogin.mutateAsync({ role });
      await utils.auth.me.invalidate();
      await utils.auth.me.refetch();
    } catch {
      // Continue navigation even if mutation catches
    } finally {
      navigate(redirectTo);
    }
  };

  useEffect(() => { if (isAuthenticated) navigate("/workspace"); }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-[#0b1627] text-[#f7f8f1] flex flex-col justify-between">
      <SEO
        title="LienGuard — Statutory Lien & Cyber Dispute Governance Platform"
        description="Secure, auditable statutory lien and dispute case management with official authority routing, verified communication, deadline tracking and procedural escalation."
        canonical="https://lienguard.org/"
      />

      {/* Top Navbar */}
      <nav className="border-b border-white/10 px-5 py-3 sm:px-8 lg:px-12 sticky top-0 z-30 bg-[#0b1627]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bcff6b]">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#bcff6b] text-[#0b1627]">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-lg font-extrabold tracking-tight">LienGuard</span>
              <span className="eyebrow mt-0.5 block text-[0.51rem] text-[#aab7cc]">Statutory Case Intelligence</span>
            </span>
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              onClick={() => navigate("/directory")}
              variant="outline"
              className="border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 hover:text-sky-200 text-xs font-semibold h-9 sm:h-10 px-3 sm:px-4 rounded-lg"
            >
              🏛️ Cyber Directory
            </Button>
            <Button
              onClick={() => navigate("/demo")}
              variant="outline"
              className="border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 text-xs font-semibold h-9 sm:h-10 px-3 sm:px-4 rounded-lg"
            >
              ⚡ 5-Min Demo
            </Button>
            <Button
              onClick={() => openWorkspace("admin", "/workspace")}
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white text-xs font-semibold h-9 sm:h-10 px-3 sm:px-4 rounded-lg hidden sm:inline-flex"
            >
              Enter Workspace
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 overflow-hidden">
        {/* 1. Above-the-Fold Hero Section */}
        <section className="relative isolate overflow-hidden border-b border-white/10 px-5 pt-8 pb-16 sm:px-8 sm:pt-14 sm:pb-20 lg:px-12 lg:pt-18 lg:pb-24">
          <div className="grid-noise absolute inset-0 -z-10 opacity-70" />
          <div className="absolute -right-40 top-10 -z-10 h-[34rem] w-[34rem] rounded-full bg-[#1e6e71]/35 blur-3xl" />
          <div className="absolute -left-32 bottom-0 -z-10 h-80 w-80 rounded-full bg-[#4c64a0]/25 blur-3xl" />

          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[#bcff6b] text-xs font-bold">
                  <ShieldCheck className="h-4 w-4 text-[#bcff6b]" /> Statutory Lien & Cyber Dispute Governance
                </div>

                <h1 className="font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl lg:text-[4.2rem]">
                  A case should never <span className="text-[#bcff6b]">disappear</span> into the process.
                </h1>

                <p className="text-base sm:text-lg leading-relaxed text-[#c4cedd] max-w-xl">
                  LienGuard gives citizens, nodal banks, and police authorities a structured, compliance-aware workflow for statutory bank account liens—with official authority routing, verified two-way communication, deadline enforcement, and review-only RTI generation.
                </p>

                {/* Primary & Secondary Above-the-Fold CTAs */}
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                  <Button
                    size="lg"
                    onClick={() => navigate("/cases")}
                    className="h-13 sm:h-14 rounded-xl bg-[#bcff6b] px-7 font-extrabold text-[#0b1627] hover:bg-[#aef558] text-base shadow-lg shadow-[#bcff6b]/20"
                  >
                    <FileCheck2 className="h-5 w-5 mr-2" /> Register a Case <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => navigate("/demo")}
                    variant="outline"
                    className="h-13 sm:h-14 rounded-xl border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 px-6 font-bold text-sm sm:text-base"
                  >
                    <Zap className="h-4 w-4 mr-2 text-amber-400" /> Explore 5-Min Demo
                  </Button>
                </div>

                {/* Trust & Capability Pills */}
                <div className="pt-4 flex flex-wrap items-center gap-2 text-xs text-[#aab7cc]">
                  <span className="flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-1 rounded-md">
                    ✓ Case-Level Audit Trail
                  </span>
                  <span className="flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-1 rounded-md">
                    ✓ 36 State/UT Cyber Routing
                  </span>
                  <span className="flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-1 rounded-md">
                    ✓ Verified Two-Way Email
                  </span>
                  <span className="flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-1 rounded-md">
                    ✓ 48-Hour Deadline Tracking
                  </span>
                  <span className="flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-1 rounded-md">
                    ✓ Review-Only RTI Drafts
                  </span>
                </div>
              </div>

              {/* Right Hero Card: Live Case Posture Preview */}
              <div className="relative mx-auto w-full max-w-lg overflow-hidden rounded-3xl border border-white/15 bg-[#122138] p-4 shadow-2xl">
                <div className="rounded-2xl bg-[#f6f7f0] p-5 sm:p-6 text-[#11243b] space-y-4">
                  <div className="flex items-start justify-between gap-3 border-b border-[#dbe1d8] pb-3">
                    <div>
                      <p className="eyebrow text-[#6a7b90]">Live Case Telemetry</p>
                      <h3 className="font-display text-xl font-bold text-[#11243b] mt-0.5">LG-2026-883921004211</h3>
                    </div>
                    <Badge className="bg-[#fff2d9] text-[#926019] border-none font-bold">AWAITING_RESPONSE</Badge>
                  </div>

                  <div className="space-y-2.5 text-xs text-[#38495f]">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-[#dbe1d8]">
                      <span className="font-semibold flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-[#124b79]" /> Routed Authority</span>
                      <span className="font-bold text-[#124b79]">Haryana Cyber Police PHQ</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-[#dbe1d8]">
                      <span className="font-semibold flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-amber-600" /> Statutory Grace Window</span>
                      <span className="font-bold text-amber-700">48h Active Countdown</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-[#dbe1d8]">
                      <span className="font-semibold flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-emerald-600" /> Inbound Intelligence</span>
                      <span className="font-bold text-emerald-700">AI Checklist Extracted</span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#0f2b4b] p-3 text-white text-xs space-y-1">
                    <p className="font-bold text-[#bcff6b]">✓ Point-in-Time Snapshot Isolation</p>
                    <p className="text-[0.72rem] text-[#c7d9ec] leading-relaxed">
                      Officer designation, official email, and verification timestamps remain permanently attached to this case.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Four Focused Workspaces */}
        <section className="bg-[#f6f7f0] px-5 py-16 text-[#11243b] sm:px-8 lg:px-12 lg:py-24">
          <div className="mx-auto max-w-7xl space-y-12">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div className="max-w-2xl space-y-3">
                <p className="eyebrow text-[#20736c]">Four Focused Workspaces</p>
                <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl leading-tight">
                  The interface adapts to the institutional role.
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-relaxed text-[#647187]">
                Every participant accesses an authorized, role-defined path through the statutory workflow without exposure of unrelated records.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {rolePaths.map((role, index) => (
                <article
                  key={role.name}
                  onClick={() => openWorkspace(role.role)}
                  className="group flex min-h-64 cursor-pointer flex-col rounded-3xl border border-[#dce2da] bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-[#8faaa0] hover:shadow-xl justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e7f4eb] text-[#23675f]">
                        <role.icon className="h-5 w-5" />
                      </span>
                      <span className="eyebrow text-[0.56rem] text-[#80908d]">0{index + 1}</span>
                    </div>
                    <div>
                      <p className="eyebrow text-[#4f7f79] text-xs font-bold">{role.tag}</p>
                      <h3 className="mt-1 text-xl font-extrabold text-[#11243b]">{role.name}</h3>
                    </div>
                    <p className="text-xs sm:text-sm leading-relaxed text-[#657188]">{role.note}</p>
                  </div>
                  <span className="mt-6 flex items-center gap-1.5 text-xs font-bold text-[#213b55] pt-4 border-t border-[#eef2f6]">
                    Enter as {role.name} <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <StickyMobileCTA onRegister={() => navigate("/cases")} />
      <Footer />
    </div>
  );
}
