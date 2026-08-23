import { ShieldCheck, Phone, Mail, Landmark, ExternalLink } from "lucide-react";
import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="border-t border-[#dce3eb] bg-[#0b1627] text-white">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
        <div className="grid gap-10 md:grid-cols-12">
          {/* Col 1: Brand & Purpose */}
          <div className="md:col-span-5 space-y-4">
            <Link href="/" className="flex items-center gap-3 text-left w-fit">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#bcff6b] text-[#0b1627]">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <span className="block text-lg font-extrabold tracking-tight text-white">LienGuard</span>
                <span className="eyebrow block text-[0.52rem] text-[#9eb6ce]">Statutory Lien & Dispute Governance</span>
              </div>
            </Link>
            <p className="text-sm text-[#aab7cc] leading-relaxed max-w-sm">
              An auditable, compliance-aware platform for statutory bank account liens, police inquiry notices, and dispute resolution with two-way communication and review-only RTI assistance.
            </p>
            <div className="pt-2 text-xs text-[#7d8fa9]">
              <p>Independent Civic Technology Platform</p>
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#bcff6b]">Platform Navigation</h4>
            <ul className="space-y-2 text-sm text-[#c7d9ec]">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Home & Overview
                </Link>
              </li>
              <li>
                <Link href="/demo" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <span>⚡ 5-Minute Demo</span>
                </Link>
              </li>
              <li>
                <Link href="/directory" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <span>🏛️ 36 State/UT Cyber Directory</span>
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About LienGuard
                </Link>
              </li>
              <li>
                <Link href="/workspace" className="hover:text-white transition-colors">
                  Case Workspace
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Legal & Governance */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#bcff6b]">Governance</h4>
            <ul className="space-y-2 text-sm text-[#c7d9ec]">
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact Support
                </Link>
              </li>
              <li>
                <a
                  href="https://cybercrime.gov.in/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1 text-xs text-[#9eb6ce]"
                >
                  cybercrime.gov.in <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Verified Contact */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#bcff6b]">Direct Contact</h4>
            <div className="space-y-2.5 text-xs text-[#c7d9ec]">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#bcff6b] shrink-0" />
                <a
                  href="mailto:i.rishisharma2007@gmail.com"
                  className="hover:text-white hover:underline truncate"
                  title="i.rishisharma2007@gmail.com"
                >
                  i.rishisharma2007@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#bcff6b] shrink-0" />
                <a
                  href="tel:+919310702901"
                  className="hover:text-white hover:underline"
                >
                  +91 9310702901
                </a>
              </div>
            </div>

            <div className="pt-2">
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-[0.7rem] text-[#9eb6ce] leading-normal">
                <span className="font-bold text-white block">Emergency Helpline:</span>
                Cyber Fraud Toll-Free: <span className="font-bold text-[#bcff6b]">1930</span>
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer & Copyright */}
        <div className="mt-12 border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7d8fa9]">
          <p className="max-w-2xl leading-relaxed text-center sm:text-left">
            Disclaimer: LienGuard is a rule-driven case management and assistive communication software platform. It does not provide legal advice or represent designated statutory authorities. All RTI drafts and AI summaries require human review.
          </p>
          <p className="shrink-0">
            © {new Date().getFullYear()} LienGuard. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
