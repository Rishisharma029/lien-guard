import { SEO } from "@/components/SEO";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowRight, Lock, Eye, FileCheck2, Server, Database } from "lucide-react";
import { useLocation } from "wouter";

export default function Privacy() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#132f4d] flex flex-col justify-between">
      <SEO
        title="Privacy Policy — LienGuard"
        description="Learn how LienGuard collects, processes, and protects case records, evidence documents, authority communications, and audit trails."
        canonical="https://lienguard.org/privacy"
      />

      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#dce3eb] bg-white px-4 md:px-8">
        <button onClick={() => navigate("/")} className="flex items-center gap-3 text-left">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0f2b4b] text-white">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <span className="block text-sm font-extrabold tracking-tight">LienGuard</span>
            <span className="eyebrow block text-[0.48rem] text-[#7b8b9c]">Data Governance</span>
          </div>
        </button>
        <Button onClick={() => navigate("/workspace")} className="text-xs font-bold h-9 bg-[#0f2b4b] hover:bg-[#163b63]">
          Open Workspace <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-10">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e8f0fa] text-[#124b79] text-xs font-bold">
            <Lock className="h-3.5 w-3.5 text-emerald-600" /> Data Protection & Privacy Governance
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0f2b4b]">
            LienGuard Privacy Policy
          </h1>
          <p className="text-xs text-[#7b8b9c]">
            Last updated: August 23, 2026 • Effective Date: August 23, 2026
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-[#dce3eb] p-6 sm:p-10 shadow-sm space-y-8 text-sm sm:text-base leading-relaxed text-[#3a4f66]">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0f2b4b]">1. Overview & Commitment</h2>
            <p>
              LienGuard ("we", "our", or "the Platform") operates an auditable statutory lien and dispute governance software system. We take data protection, evidence confidentiality, and case privacy seriously. This policy explains what information we collect, how it is processed, and your rights regarding your case records.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0f2b4b]">2. Information We Process</h2>
            <p>To provide rule-driven case management, LienGuard processes the following categories of data:</p>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li><strong>Account & Authentication:</strong> Name, email address, OpenID identity token, and role assignment (`citizen`, `bank`, `authority`, `admin`).</li>
              <li><strong>Case Information:</strong> Case title, description, bank name, dispute amount, lien reference, transaction IDs, State/UT, and assigned authority details.</li>
              <li><strong>Evidence Documents:</strong> Uploaded evidence files (PDFs, bank statements, police acknowledgments, identity proof). Files are stored securely with generated storage keys and magic-byte inspection.</li>
              <li><strong>Communications:</strong> Outbound statutory notices and inbound authority replies dispatched through Maileroo with cryptographic SPF/DKIM/DMARC verification.</li>
              <li><strong>Immutable Audit Events:</strong> Case timeline history (`case_events`) and administrative role alterations (`role_change_audits`) recorded with timestamps for transparent procedural accountability.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0f2b4b]">3. AI-Assisted Email Intelligence</h2>
            <p>
              When an authority replies to a case notice, our system performs automated natural language classification to identify requested documents and status intents. Inbound email content is treated strictly as untrusted data, passed through prompt injection quarantine filters, and used solely to assist the user with document checklists. AI outputs are advisory and cannot alter legal state independently.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0f2b4b]">4. Third-Party Service Providers</h2>
            <p>We work with trusted technical service providers to deliver the platform:</p>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li><strong>Maileroo:</strong> Used for transactional email delivery over TLS and secure inbound webhook ingestion.</li>
              <li><strong>Protected Cloud Storage:</strong> Used to store case evidence documents with signed, time-limited URL access.</li>
              <li><strong>MySQL Database:</strong> Persists case records, user identities, and immutable audit trails.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0f2b4b]">5. Cookies & Tracking</h2>
            <p>
              LienGuard uses strictly necessary session cookies (`HttpOnly`, `SameSite=Lax`, `Secure` over HTTPS) to keep your session authenticated and prevent CSRF attacks. Optional anonymous telemetry requires explicit user consent via our cookie banner. We do not use third-party advertising cookies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0f2b4b]">6. Data Security</h2>
            <p>
              We implement comprehensive defense-in-depth measures including HSTS, strict CORS origin controls, CSRF protection, multi-tier rate limiting, file magic-byte validation, and encrypted storage in transit and at rest.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0f2b4b]">7. Contact & Privacy Inquiries</h2>
            <p>For questions or privacy requests regarding your data, contact our data protection team directly:</p>
            <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#eef2f6] text-xs sm:text-sm space-y-1.5 font-medium">
              <p><strong>Email:</strong> <a href="mailto:i.rishisharma2007@gmail.com" className="text-[#124b79] hover:underline">i.rishisharma2007@gmail.com</a></p>
              <p><strong>Phone:</strong> <a href="tel:+919310702901" className="text-[#124b79] hover:underline">+91 9310702901</a></p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
