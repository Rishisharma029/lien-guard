import { ArrowLeft, Bell, CheckCircle2, Clock3, FileText, Gavel, Landmark, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { SEO } from "@/components/SEO";

const cases = [
  { reference: "LG-DEMO-ESC-001", title: "Authority response overdue", bank: "Demo Bank", amount: "₹250,000", status: "Escalated", deadline: "Overdue", tone: "bg-rose-50 text-rose-700" },
  { reference: "LG-DEMO-REV-002", title: "Lien verification under review", bank: "Demo Bank", amount: "₹98,500", status: "Under Review", deadline: "Sep 02, 2026", tone: "bg-violet-50 text-violet-700" },
  { reference: "LG-DEMO-AWAIT-003", title: "Authority follow-up awaiting response", bank: "Demo Bank", amount: "₹143,750", status: "Awaiting Response", deadline: "Aug 25, 2026", tone: "bg-amber-50 text-amber-700" },
];

export default function StaticPreview() {
  const [, navigate] = useLocation();

  return <main className="min-h-screen bg-[#f4f6f8] text-[#132f4d]">
    <SEO title="LienGuard Static Preview" description="Static interface preview" noindex={true} />
    <header className="flex min-h-16 items-center justify-between border-b border-[#dce3eb] bg-white px-4 sm:px-7">
      <button onClick={() => navigate("/")} className="flex items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f2b4b]">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0f2b4b] text-white"><ShieldCheck className="h-4 w-4" /></span>
        <span><span className="block text-sm font-extrabold tracking-tight">LienGuard</span><span className="eyebrow block text-[0.48rem] text-[#7b8b9c]">Static frontend preview</span></span>
      </button>
      <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800"><Clock3 className="h-3.5 w-3.5" />Backend not connected</span>
    </header>

    <div className="mx-auto grid max-w-7xl gap-6 p-4 sm:p-7 lg:grid-cols-[15rem_1fr]">
      <aside className="rounded-2xl border border-[#dce3eb] bg-white p-4 shadow-sm lg:min-h-[42rem]">
        <p className="eyebrow px-2 pt-1 text-[#8290a0]">Workspace preview</p>
        <nav className="mt-4 space-y-1 text-sm font-semibold">
          {["Dashboard", "My Cases", "Timeline", "Communications", "Documents", "Escalations", "RTI Assistant"].map((item, index) => <div key={item} className={`flex h-10 items-center gap-3 rounded-lg px-3 ${index === 1 ? "bg-[#e8f0fa] text-[#124b79]" : "text-[#5a6c80]"}`}>{index === 0 ? <Landmark className="h-4 w-4" /> : index === 2 || index === 5 ? <Gavel className="h-4 w-4" /> : <FileText className="h-4 w-4" />}{item}</div>)}
        </nav>
        <div className="mt-8 rounded-xl bg-[#0f2b4b] p-4 text-white"><p className="eyebrow text-[#bed8f4]">Preview boundary</p><p className="mt-2 text-xs leading-5 text-[#dce9f6]">This is the deployed interface only. Sign-in, data, documents, email, and automation require the full server deployment.</p></div>
      </aside>

      <section className="min-w-0 space-y-6">
        <div className="rounded-2xl bg-[#0f2b4b] p-6 text-white shadow-[0_18px_45px_rgba(15,43,75,0.18)] sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="eyebrow text-[#bed8f4]">Case intelligence</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">A visible workflow for every lien case.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#d7e3f1]">This frontend preview demonstrates the register, status language, escalation posture, and timeline patterns that are available in the complete application.</p></div><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10"><Bell className="h-5 w-5" /></span></div>
          <div className="mt-7 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="eyebrow text-[#bed8f4]">Open matters</p><p className="mt-2 text-2xl font-extrabold">03</p></div><div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="eyebrow text-[#bed8f4]">Response risk</p><p className="mt-2 text-2xl font-extrabold">01</p></div><div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="eyebrow text-[#bed8f4]">Audit events</p><p className="mt-2 text-2xl font-extrabold">11</p></div></div>
        </div>

        <div className="rounded-2xl border border-[#dce3eb] bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-[#e6ebf0] p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="eyebrow text-[#688096]">Case register</p><h2 className="mt-1 text-xl font-extrabold">My Cases</h2></div><span className="rounded-lg border border-[#dce3eb] px-3 py-2 text-xs font-bold text-[#698095]">Static preview records</span></div><div className="overflow-x-auto"><table className="min-w-full text-left"><thead className="border-b border-[#edf0f4] bg-[#fafbfd] text-[0.65rem] uppercase tracking-[0.16em] text-[#8290a0]"><tr><th className="px-5 py-3 font-bold">Case</th><th className="px-5 py-3 font-bold">Bank</th><th className="px-5 py-3 font-bold">Lien amount</th><th className="px-5 py-3 font-bold">Status</th><th className="px-5 py-3 font-bold">Deadline</th></tr></thead><tbody className="divide-y divide-[#edf0f4]">{cases.map(item => <tr key={item.reference} className="text-sm"><td className="px-5 py-4"><p className="font-mono text-xs font-bold text-[#28618d]">{item.reference}</p><p className="mt-1 font-bold text-[#304d67]">{item.title}</p></td><td className="px-5 py-4 text-[#60758a]">{item.bank}</td><td className="px-5 py-4 font-semibold text-[#415c73]">{item.amount}</td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${item.tone}`}>{item.status}</span></td><td className="px-5 py-4 text-[#60758a]">{item.deadline}</td></tr>)}</tbody></table></div></div>

        <div className="grid gap-5 lg:grid-cols-2"><div className="rounded-2xl border border-[#dce3eb] bg-white p-5 shadow-sm"><p className="eyebrow text-[#688096]">Escalation workflow</p><h2 className="mt-1 text-xl font-extrabold">Recorded, never assumed.</h2><div className="mt-5 space-y-4">{["Authority routing recorded", "Deadline follow-up queued", "Inbound response associated", "Escalation and RTI review enabled"].map((item, index) => <div key={item} className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#e7f4eb] text-[#23675f]"><CheckCircle2 className="h-4 w-4" /></span><span className="text-sm font-semibold text-[#4c647b]">{index === 2 ? `${item} — demonstration state` : item}</span></div>)}</div></div><div className="rounded-2xl border border-[#dce3eb] bg-white p-5 shadow-sm"><p className="eyebrow text-[#688096]">Next deployment step</p><h2 className="mt-1 text-xl font-extrabold">Connect the secure runtime.</h2><p className="mt-4 text-sm leading-6 text-[#63778c]">Deploy the Express server with its MySQL database and server-side environment variables to make these controls live. The interface should never be used to represent live case data before that connection exists.</p><button onClick={() => navigate("/")} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#0f2b4b] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#183c63]"><ArrowLeft className="h-4 w-4" />Back to overview</button></div></div>
      </section>
    </div>
  </main>;
}
