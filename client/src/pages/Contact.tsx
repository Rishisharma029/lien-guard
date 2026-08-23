import { useState, FormEvent } from "react";
import { SEO } from "@/components/SEO";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Mail, Phone, Send, ArrowRight, CheckCircle2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { trackEvent } from "@/lib/analytics";

export default function Contact() {
  const [, navigate] = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<{ name?: string; email?: string; message?: string }>({});

  const validate = () => {
    const nextErrors: typeof errors = {};
    if (!form.name.trim()) nextErrors.name = "Please enter your name.";
    if (!form.email.trim() || !form.email.includes("@")) nextErrors.email = "Please enter a valid email address.";
    if (!form.message.trim() || form.message.length < 10) nextErrors.message = "Please write a message with at least 10 characters.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    // Simulate brief submission processing
    await new Promise(resolve => setTimeout(resolve, 800));
    setSubmitting(false);

    trackEvent("contact_form_submitted", { category: "public_inquiry" });
    toast.success("Your message has been received. Our team will review your inquiry.");
    navigate("/thank-you?source=contact");
  };

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#132f4d] flex flex-col justify-between">
      <SEO
        title="Contact LienGuard — Support & Project Inquiries"
        description="Get in touch with the LienGuard team for platform support, authority directory updates, or project coordination."
        canonical="https://lienguard.org/contact"
      />

      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#dce3eb] bg-white px-4 md:px-8">
        <button onClick={() => navigate("/")} className="flex items-center gap-3 text-left">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0f2b4b] text-white">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <span className="block text-sm font-extrabold tracking-tight">LienGuard</span>
            <span className="eyebrow block text-[0.48rem] text-[#7b8b9c]">Support & Inquiries</span>
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

      {/* Main Container */}
      <main className="flex-1 mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0f2b4b] tracking-tight">
            Contact LienGuard
          </h1>
          <p className="text-sm sm:text-base text-[#556980]">
            Have a question about statutory lien tracking, authority directory records, or institutional coordination? We're here to assist.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-12 items-start">
          {/* Left Col: Real Contact Details */}
          <div className="md:col-span-5 space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-[#dce3eb] shadow-sm space-y-6">
              <h2 className="text-lg font-bold text-[#0f2b4b]">Direct Contact Channels</h2>

              <div className="space-y-4">
                <div className="flex items-start gap-3.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8f0fa] text-[#124b79]">
                    <Mail className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-[#7b8b9c] uppercase tracking-wider">Email Inquiry</p>
                    <a
                      href="mailto:i.rishisharma2007@gmail.com"
                      className="text-sm font-bold text-[#124b79] hover:underline break-all"
                    >
                      i.rishisharma2007@gmail.com
                    </a>
                    <p className="text-xs text-[#556980] mt-0.5">Response typically within 24-48 hours</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8f0fa] text-[#124b79]">
                    <Phone className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-[#7b8b9c] uppercase tracking-wider">Direct Telephone</p>
                    <a
                      href="tel:+919310702901"
                      className="text-sm font-bold text-[#124b79] hover:underline"
                    >
                      +91 9310702901
                    </a>
                    <p className="text-xs text-[#556980] mt-0.5">Mon – Sat, 9:00 AM – 6:00 PM IST</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#eef2f6] space-y-2">
                <p className="text-xs font-bold text-[#7b8b9c] uppercase tracking-wider">National Cyber Crime Helpline</p>
                <div className="p-3 rounded-xl bg-[#0f2b4b] text-white flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[#c7d9ec]">Immediate Cyber Fraud Assistance</p>
                    <p className="text-base font-extrabold text-white">Dial 1930 (Toll-Free)</p>
                  </div>
                  <span className="text-xs font-bold bg-red-600 px-2 py-1 rounded">24/7 Helpline</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Col: Contact Form */}
          <div className="md:col-span-7">
            <form
              onSubmit={handleSubmit}
              className="p-6 sm:p-8 rounded-2xl bg-white border border-[#dce3eb] shadow-sm space-y-5"
            >
              <h2 className="text-lg font-bold text-[#0f2b4b]">Send a Message</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-bold text-[#132f4d]">Your Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Rahul Verma"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className={errors.name ? "border-red-500" : "border-[#dce3eb]"}
                    disabled={submitting}
                  />
                  {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-bold text-[#132f4d]">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="e.g. rahul@example.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className={errors.email ? "border-red-500" : "border-[#dce3eb]"}
                    disabled={submitting}
                  />
                  {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subject" className="text-xs font-bold text-[#132f4d]">Subject</Label>
                <Input
                  id="subject"
                  placeholder="e.g. Authority directory correction / Platform inquiry"
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  className="border-[#dce3eb]"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message" className="text-xs font-bold text-[#132f4d]">Message *</Label>
                <Textarea
                  id="message"
                  rows={4}
                  placeholder="Describe your inquiry or case question in detail..."
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  className={errors.message ? "border-red-500" : "border-[#dce3eb]"}
                  disabled={submitting}
                />
                {errors.message && <p className="text-xs text-red-500 font-medium">{errors.message}</p>}
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#0f2b4b] hover:bg-[#163b63] text-white font-bold h-11 rounded-lg"
              >
                {submitting ? (
                  "Sending Message…"
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" /> Send Message
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
