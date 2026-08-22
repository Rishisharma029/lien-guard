import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowRight, ArrowUpRight, BadgeCheck, Building2, FileCheck2, Landmark, Scale, ShieldCheck, UserRound } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

const rolePaths = [
  { name: "Citizen", note: "Submit a case, follow each decision, and keep a personal record.", icon: UserRound, tag: "Personal record" },
  { name: "Bank", note: "Bring secured-interest questions into one precise, traceable queue.", icon: Landmark, tag: "Institutional review" },
  { name: "Authority", note: "Review verified case information and advance the lifecycle with clarity.", icon: Scale, tag: "Decision workflow" },
  { name: "Administrator", note: "Control access, document changes, and keep permission decisions visible.", icon: ShieldCheck, tag: "Access governance" },
];

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const demoAvailability = trpc.auth.demoAvailable.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const demoLogin = trpc.auth.demoLogin.useMutation({
    onSuccess: () => { window.location.assign("/cases"); },
  });
  const localDemoAvailable = demoAvailability.data === true;
  const staticPreview = import.meta.env.VITE_STATIC_PREVIEW === "true";
  const openWorkspace = () => {
    if (staticPreview) {
      navigate("/preview");
      return;
    }
    if (localDemoAvailable) {
      demoLogin.mutate();
      return;
    }
    startLogin();
  };

  useEffect(() => { if (isAuthenticated) navigate("/workspace"); }, [isAuthenticated, navigate]);

  return <main className="min-h-screen overflow-hidden bg-[#0b1627] text-[#f7f8f1]">
    <section className="relative isolate overflow-hidden border-b border-white/10 px-5 pb-16 pt-5 sm:px-8 lg:px-12 lg:pb-24">
      <div className="grid-noise absolute inset-0 -z-10 opacity-70" />
      <div className="absolute -right-40 top-10 -z-10 h-[34rem] w-[34rem] rounded-full bg-[#1e6e71]/35 blur-3xl" />
      <div className="absolute -left-32 bottom-0 -z-10 h-80 w-80 rounded-full bg-[#4c64a0]/25 blur-3xl" />
      <nav className="mx-auto flex max-w-7xl items-center justify-between py-3">
        <button onClick={() => navigate("/")} className="flex items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bcff6b]">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#bcff6b] text-[#0b1627]"><ShieldCheck className="h-5 w-5" /></span>
          <span><span className="block text-lg font-extrabold tracking-tight">LienGuard</span><span className="eyebrow mt-0.5 block text-[0.51rem] text-[#aab7cc]">Case intelligence</span></span>
        </button>
        <div className="flex items-center gap-3"><span className="hidden text-xs text-[#aab7cc] sm:block">{staticPreview ? "Interface preview. Secure backend not connected." : localDemoAvailable ? "Local records. External delivery disabled." : "Secure by role. Clear by record."}</span><Button disabled={loading || demoLogin.isPending} onClick={openWorkspace} variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">{staticPreview ? "View preview" : localDemoAvailable ? "Open local demo" : "Sign in"}</Button></div>
      </nav>
      <div className="mx-auto grid max-w-7xl gap-14 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:pt-28">
        <div className="max-w-3xl"><p className="eyebrow text-[#bcff6b]">A considered system for lien administration</p><h1 className="font-display mt-7 text-5xl leading-[0.96] tracking-tight sm:text-6xl lg:text-[5.7rem]">A case should never <span className="text-[#bcff6b]">disappear</span> into the process.</h1><p className="mt-8 max-w-xl text-lg leading-8 text-[#c4cedd]">LienGuard makes the status, responsibility, and access behind every case legible—from the first request to the final resolution.</p><div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center"><Button size="lg" disabled={loading || demoLogin.isPending} onClick={openWorkspace} className="h-14 rounded-xl bg-[#bcff6b] px-6 font-semibold text-[#11200d] hover:bg-[#d2ff9d]">{demoLogin.isPending ? "Opening workspace…" : staticPreview ? "View frontend preview" : localDemoAvailable ? "Open local demo workspace" : "Enter secure workspace"} <ArrowRight className="ml-2 h-4 w-4" /></Button><div className="flex items-center gap-2 text-sm text-[#aab7cc]"><BadgeCheck className="h-4 w-4 text-[#bcff6b]" />{staticPreview ? "Static interface · no sign-in or case data" : localDemoAvailable ? "Seeded records · email delivery disabled" : "Manus OAuth authentication"}</div></div></div>
        <div className="relative mx-auto w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/15 bg-[#122138] p-4 shadow-[0_40px_100px_rgba(0,0,0,0.35)]">
          <div className="rounded-[1.35rem] bg-[#f6f7f0] p-5 text-[#11243b] sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow text-[#6a7b90]">Live case posture</p><h2 className="font-display mt-2 text-3xl">One source of truth.</h2></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#dff7e0] text-[#215c55]"><FileCheck2 className="h-5 w-5" /></span></div><div className="mt-8 divide-y divide-[#dbe1d8] border-y border-[#dbe1d8]"><div className="flex items-center justify-between py-4"><span className="text-sm font-semibold">Identity verified</span><span className="rounded-full bg-[#dff7e0] px-2.5 py-1 text-xs font-bold text-[#226150]">Complete</span></div><div className="flex items-center justify-between py-4"><span className="text-sm font-semibold">Role-defined workspace</span><span className="text-sm text-[#536277]">Assigned at sign-in</span></div><div className="flex items-center justify-between py-4"><span className="text-sm font-semibold">Case lifecycle</span><span className="text-sm text-[#536277]">Always visible</span></div></div><div className="mt-5 rounded-2xl bg-[#11243b] p-4 text-white"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#bcff6b] text-[#11243b]"><Building2 className="h-4 w-4" /></span><div><p className="eyebrow text-[0.55rem] text-[#bcff6b]">Designed for accountability</p><p className="mt-1 text-sm text-[#d8e0ee]">Role changes are recorded and shared with the affected person.</p></div></div></div></div>
        </div>
      </div>
    </section>
    <section className="bg-[#f6f7f0] px-5 py-16 text-[#11243b] sm:px-8 lg:px-12 lg:py-24"><div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div className="max-w-2xl"><p className="eyebrow text-[#20736c]">Four focused workspaces</p><h2 className="font-display mt-4 text-4xl leading-tight sm:text-5xl">The interface changes with the responsibility.</h2></div><p className="max-w-sm text-sm leading-6 text-[#647187]">Every role sees a tailored path through the same controlled system—without exposing work that does not belong to them.</p></div><div className="mt-11 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{rolePaths.map((role, index) => <article key={role.name} className="group flex min-h-64 flex-col rounded-3xl border border-[#dce2da] bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-[#8faaa0] hover:shadow-xl"><div className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e7f4eb] text-[#23675f]"><role.icon className="h-5 w-5" /></span><span className="eyebrow text-[0.56rem] text-[#80908d]">0{index + 1}</span></div><p className="eyebrow mt-8 text-[#4f7f79]">{role.tag}</p><h3 className="mt-2 text-xl font-extrabold">{role.name}</h3><p className="mt-3 text-sm leading-6 text-[#657188]">{role.note}</p><span className="mt-auto flex items-center gap-2 pt-7 text-sm font-bold text-[#213b55]">View experience <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span></article>)}</div></div></section>
  </main>;
}
