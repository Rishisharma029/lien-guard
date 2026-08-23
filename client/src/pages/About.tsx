import { SEO } from "@/components/SEO";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Landmark, Scale, FileText, CheckCircle2, ArrowRight, Building2, ShieldAlert, Cpu } from "lucide-react";
import { useLocation } from "wouter";

export default function About() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#132f4d] flex flex-col justify-between">
      <SEO
        title="About LienGuard — Civic Technology for Statutory Lien Governance"
        description="LienGuard is an independent civic technology platform engineered to bridge the statutory communication gap between citizens, banks, and cybercrime police authorities."
        canonical="https://lienguard.org/about"
      />

      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#dce3eb] bg-white px-4 md:px-8">
        <button onClick={() => navigate("/")} className="flex items-center gap-3 text-left">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0f2b4b] text-white">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <span className="block text-sm font-extrabold tracking-tight">LienGuard</span>
            <span className="eyebrow block text-[0.48rem] text-[#7b8b9c]">Case intelligence</span>
          </div>
        </button>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate("/directory")} className="text-xs font-semibold h-9 border-[#dce3eb]">
            🏛️ Cyber Directory
          </Button>
          <Button onClick={() => navigate("/workspace")} className="text-xs font-bold h-9 bg-[#0f2b4b] hover:bg-[#163b63]">
            Open Workspace <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 space-y-12">
        {/* Hero Section */}
        <section className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e8f0fa] text-[#124b79] text-xs font-bold">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Independent Civic Technology Platform
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0f2b4b] tracking-tight">
            Bridging the Statutory Communication Gap
          </h1>
          <p className="text-base sm:text-lg text-[#556980] leading-relaxed">
            When bank accounts are frozen under statutory cyber inquiry holds (Section 91/102 CrPC or UPI dispute hold notices), citizens and institutions face fragmented offline hurdles. LienGuard brings structure, accountability, and traceability to the entire resolution process.
          </p>
        </section>

        {/* Pillars Grid */}
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="p-6 rounded-2xl bg-white border border-[#dce3eb] shadow-sm space-y-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8f0fa] text-[#124b79]">
              <Scale className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-[#0f2b4b]">Rule-Driven Governance</h3>
            <p className="text-xs sm:text-sm text-[#556980] leading-relaxed">
              Enforces clear state transitions, immutable audit events, and statutory response deadlines so cases cannot languish or be prematurely escalated.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#dce3eb] shadow-sm space-y-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8f0fa] text-[#124b79]">
              <Building2 className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-[#0f2b4b]">Official Authority Routing</h3>
            <p className="text-xs sm:text-sm text-[#556980] leading-relaxed">
              Connects directly with verified State & UT Cyber Crime Police Stations across all 36 Indian jurisdictions sourced from the National Cyber Crime Reporting Portal.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#dce3eb] shadow-sm space-y-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8f0fa] text-[#124b79]">
              <Cpu className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-[#0f2b4b]">Two-Way Email Intelligence</h3>
            <p className="text-xs sm:text-sm text-[#556980] leading-relaxed">
              Integrates Maileroo for SPF/DKIM/DMARC verified dispatches and automated AI reply analysis to instantly extract required evidence checklists for citizens.
            </p>
          </div>
        </section>

        {/* Architecture & Role Separation */}
        <section className="rounded-2xl bg-white border border-[#dce3eb] p-6 sm:p-8 shadow-sm space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-[#0f2b4b]">
              Four-Party Institutional Architecture
            </h2>
            <p className="text-sm text-[#556980]">
              LienGuard implements strict Role-Based Access Control (RBAC) across the civic ecosystem:
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#eef2f6] space-y-1.5">
              <span className="text-xs font-extrabold text-[#124b79] uppercase tracking-wider">Citizens</span>
              <p className="text-xs text-[#556980] leading-relaxed">
                Submit lien details, track statutory grace countdowns, securely upload evidence, and review RTI drafts.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#eef2f6] space-y-1.5">
              <span className="text-xs font-extrabold text-[#124b79] uppercase tracking-wider">Nodal Banks</span>
              <p className="text-xs text-[#556980] leading-relaxed">
                Review secured interests, verify account lien holds against police requests, and coordinate clearance instructions.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#eef2f6] space-y-1.5">
              <span className="text-xs font-extrabold text-[#124b79] uppercase tracking-wider">Police & Cyber Authorities</span>
              <p className="text-xs text-[#556980] leading-relaxed">
                Receive structured inquiries, request specific investigative documents, and issue formal revoke/clearance orders.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#eef2f6] space-y-1.5">
              <span className="text-xs font-extrabold text-[#124b79] uppercase tracking-wider">System Administrators</span>
              <p className="text-xs text-[#556980] leading-relaxed">
                Oversee role governance with immutable audit logs, maintain verified authority directory records, and monitor security posture.
              </p>
            </div>
          </div>
        </section>

        {/* Civic Disclosure */}
        <section className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs sm:text-sm text-[#784614] leading-relaxed">
          <p className="font-bold mb-1">⚖️ Statutory Notice & Independent Platform Disclosure</p>
          <p>
            LienGuard is an independent software application designed to facilitate lawful procedural case coordination. It does not provide legal representation, nor is it a substitute for formal judicial or statutory police proceedings.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
