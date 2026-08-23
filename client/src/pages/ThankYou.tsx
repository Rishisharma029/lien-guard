import { SEO } from "@/components/SEO";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ShieldCheck, CheckCircle2, ArrowRight, FolderKanban, Landmark } from "lucide-react";
import { useLocation } from "wouter";

export default function ThankYou() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#132f4d] flex flex-col justify-between">
      <SEO
        title="Thank You — LienGuard"
        description="Your submission has been received successfully."
        noindex={true}
      />

      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#dce3eb] bg-white px-4 md:px-8">
        <button onClick={() => navigate("/")} className="flex items-center gap-3 text-left">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0f2b4b] text-white">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <span className="block text-sm font-extrabold tracking-tight">LienGuard</span>
            <span className="eyebrow block text-[0.48rem] text-[#7b8b9c]">Confirmation</span>
          </div>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 grid place-items-center px-4 py-16">
        <div className="w-full max-w-lg rounded-2xl border border-[#dce3eb] bg-white p-8 sm:p-10 shadow-xl text-center space-y-6">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle2 className="h-9 w-9" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f2b4b]">
              Thank You.
            </h1>
            <p className="text-sm text-[#556980] leading-relaxed">
              Your request or inquiry has been received and logged in our system. If this inquiry relates to a case record, you can track its progress directly from your secure workspace.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => navigate("/workspace")}
              className="bg-[#0f2b4b] hover:bg-[#163b63] text-white font-bold h-11 px-6 rounded-xl"
            >
              <FolderKanban className="h-4 w-4 mr-2" /> Open Case Workspace
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="border-[#dce3eb] text-[#132f4d] font-semibold h-11 px-6 rounded-xl"
            >
              Return Home
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
