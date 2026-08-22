import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowUpRight, Building2, CheckCircle2, FileCheck2, Landmark, Scale, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";

const roleDetails = {
  citizen: { eyebrow: "Personal workspace", icon: UserRound, accent: "bg-[#dff4ef] text-[#1d6971]", action: "Review my position", items: ["Property position overview", "Document readiness", "Guided next steps"] },
  bank: { eyebrow: "Institution workspace", icon: Landmark, accent: "bg-[#e6edfb] text-[#385b98]", action: "Open portfolio review", items: ["Secured-interest review", "Evidence coordination", "Institution-level requests"] },
  authority: { eyebrow: "Authority workspace", icon: Scale, accent: "bg-[#f4eadc] text-[#86622e]", action: "Open review queue", items: ["Verified record review", "Operational queue", "Decision traceability"] },
  admin: { eyebrow: "Governance workspace", icon: ShieldCheck, accent: "bg-[#f0e6f7] text-[#6d3f8f]", action: "Manage user access", items: ["Access governance", "Role assignment", "Change history"] },
} as const;

export default function Workspace() {
  const { user } = useAuth();
  const role = user?.role ?? "citizen";
  const detail = roleDetails[role];
  const Icon = detail.icon;
  const { data: overview } = trpc.workspace.overview.useQuery(undefined, { enabled: Boolean(user) });

  return <div className="mx-auto max-w-6xl space-y-7">
    <section className="relative overflow-hidden rounded-[2rem] bg-[#20314c] px-6 py-8 text-white shadow-[0_20px_60px_rgba(31,48,75,0.18)] sm:px-10 sm:py-11">
      <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_80%_10%,rgba(159,226,211,0.22),transparent_50%)]" />
      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-2xl"><p className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[#a9e5d8]">{detail.eyebrow}</p><h1 className="font-display mt-4 text-4xl leading-tight sm:text-5xl">{overview?.title ?? "Your protected workspace"}</h1><p className="mt-4 max-w-xl leading-7 text-slate-300">{overview?.description ?? "Your workspace is matched to the access level assigned to you."}</p></div><div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 backdrop-blur"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#9fe2d3] text-[#20314c]"><Icon className="h-5 w-5" /></span><div><p className="text-sm font-semibold">{user?.name || "LienGuard user"}</p><p className="mt-0.5 text-xs text-slate-400">Session is securely authenticated</p></div></div></div>
    </section>
    <section className="grid gap-5 lg:grid-cols-[1.45fr_0.85fr]"><Card className="border-[#dfe3e7] bg-white shadow-sm"><CardContent className="p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[#6b7c92]">Role-specific entry point</p><h2 className="font-display mt-2 text-3xl text-[#20314c]">Proceed with confidence.</h2></div><Badge className={`${detail.accent} border-0 px-3 py-1`}>{role.charAt(0).toUpperCase() + role.slice(1)} access</Badge></div><div className="mt-7 grid gap-3 sm:grid-cols-3">{detail.items.map((item, index) => <div key={item} className="rounded-2xl border border-[#e2e8e8] bg-[#fbfcfb] p-4"><span className="font-mono text-xs text-[#5e8b8a]">0{index + 1}</span><p className="mt-6 text-sm font-medium leading-5 text-[#29405b]">{item}</p></div>)}</div><Button onClick={() => toast.info("This workspace action is ready for the next LienGuard module.")} className="mt-7 bg-[#20314c] hover:bg-[#2d4568]">{detail.action}<ArrowUpRight className="ml-2 h-4 w-4" /></Button></CardContent></Card>
      <Card className="border-[#dfe3e7] bg-[#f1f8f7] shadow-sm"><CardContent className="p-6 sm:p-8"><div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[#1f7478] shadow-sm"><CheckCircle2 className="h-5 w-5" /></div><p className="mt-7 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[#4a7978]">Access integrity</p><h2 className="font-display mt-2 text-3xl text-[#1b4950]">Clear by design.</h2><p className="mt-3 text-sm leading-6 text-[#497177]">Your role governs what is available here. Role changes are made by administrators and communicated through your notification center.</p><div className="mt-6 border-t border-[#cfe4df] pt-5"><div className="flex items-center gap-3 text-sm text-[#315a60]"><FileCheck2 className="h-4 w-4" /><span>Server-enforced permissions</span></div><div className="mt-3 flex items-center gap-3 text-sm text-[#315a60]"><Building2 className="h-4 w-4" /><span>Traceable access changes</span></div></div></CardContent></Card>
    </section>
  </div>;
}
