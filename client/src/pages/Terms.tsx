import { SEO } from "@/components/SEO";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowRight, Scale, AlertTriangle, FileText } from "lucide-react";
import { useLocation } from "wouter";

export default function Terms() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#132f4d] flex flex-col justify-between">
      <SEO
        title="Terms of Use — LienGuard"
        description="Review the terms, conditions, and statutory disclaimers governing the use of the LienGuard case management platform."
        canonical="https://lienguard.org/terms"
      />

      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#dce3eb] bg-white px-4 md:px-8">
        <button onClick={() => navigate("/")} className="flex items-center gap-3 text-left">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0f2b4b] text-white">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <span className="block text-sm font-extrabold tracking-tight">LienGuard</span>
            <span className="eyebrow block text-[0.48rem] text-[#7b8b9c]">Terms & Conditions</span>
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
            <Scale className="h-3.5 w-3.5 text-emerald-600" /> Platform Governance & Terms
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0f2b4b]">
            LienGuard Terms of Use
          </h1>
          <p className="text-xs text-[#7b8b9c]">
            Last updated: August 23, 2026 • Effective Date: August 23, 2026
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-[#dce3eb] p-6 sm:p-10 shadow-sm space-y-8 text-sm sm:text-base leading-relaxed text-[#3a4f66]">
          {/* Critical Disclaimer Banner */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs sm:text-sm text-[#784614] space-y-1.5">
            <p className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Statutory Disclaimer & No Legal Advice
            </p>
            <p>
              LienGuard is an independent software tool designed for structured case tracking, authority directory navigation, and assistive communications. The platform does NOT provide legal advice, legal representation, or guarantee any specific investigative outcome or lien revocation.
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0f2b4b]">1. Acceptance of Terms</h2>
            <p>
              By accessing or using LienGuard, you agree to be bound by these Terms of Use and our Privacy Policy. If you are using the platform on behalf of a bank or law enforcement authority, you confirm that you have the requisite organizational authority.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0f2b4b]">2. Accuracy of Case Records & Uploads</h2>
            <p>
              Users are strictly responsible for the veracity and accuracy of information entered into cases, including bank names, lien reference identifiers, and uploaded evidence documents. Uploading falsified, forged, or malicious files is strictly prohibited and constitutes a violation of platform integrity.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0f2b4b]">3. AI-Assisted Intelligence & RTI Drafting</h2>
            <p>
              Features such as inbound reply classification and Right to Information (RTI Section 6(1)) draft preparation are assistive capabilities designed to save time. <strong>All generated RTI drafts and summaries require human citizen review.</strong> LienGuard never files legal documents or dispatches communications automatically without explicit user authorization or configured escalation rules.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0f2b4b]">4. Official Authority Directory</h2>
            <p>
              Directory records for State & UT Cyber Crime Police Stations are transcribed from authentic government sources (including the National Cyber Crime Reporting Portal at `cybercrime.gov.in`). While we strive for continuous verification, official jurisdictional assignments remain governed by the respective state police departments.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0f2b4b]">5. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, LienGuard and its maintainers shall not be liable for any indirect, incidental, or consequential damages resulting from authority delays, third-party email transmission latency, or banking hold decisions made by financial institutions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0f2b4b]">6. Contact Information</h2>
            <p>For questions or formal inquiries regarding these terms:</p>
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
