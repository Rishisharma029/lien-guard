import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { ArrowRight, Building2, Landmark, Scale, ShieldCheck, UserRound } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

const roles = [
  { name: "Citizen", description: "A clear, protected view of your property position.", icon: UserRound },
  { name: "Bank", description: "A deliberate workspace for secured-interest teams.", icon: Landmark },
  { name: "Authority", description: "Controlled access to verified operational records.", icon: Scale },
  { name: "Administrator", description: "Governance tools for access, assignments, and auditability.", icon: ShieldCheck },
];

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => { if (isAuthenticated) navigate("/workspace"); }, [isAuthenticated, navigate]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#101b31] text-white">
      <section className="relative isolate min-h-screen px-5 pb-12 pt-5 sm:px-8 lg:px-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_16%,rgba(69,153,151,0.22),transparent_27%),radial-gradient(circle_at_89%_78%,rgba(64,85,134,0.32),transparent_35%)]" />
        <nav className="mx-auto flex max-w-7xl items-center justify-between py-3">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#9fe2d3] text-[#101b31]"><ShieldCheck className="h-5 w-5" /></span><div><p className="font-display text-xl leading-none">LienGuard</p><p className="mt-1 font-mono text-[0.56rem] uppercase tracking-[0.18em] text-slate-400">Secure access</p></div></div>
          <Button variant="ghost" onClick={() => startLogin()} className="hidden text-slate-200 hover:bg-white/10 hover:text-white sm:inline-flex">Sign in</Button>
        </nav>
        <div className="mx-auto grid max-w-7xl gap-14 pb-8 pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pt-28">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#9fe2d3]">Lien administration, considered</p>
            <h1 className="font-display mt-6 max-w-3xl text-5xl leading-[0.98] sm:text-6xl lg:text-7xl">The right access,<br /><i className="text-[#a9e5d8]">at the right moment.</i></h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">LienGuard brings identity, role clarity, and access accountability into a single protected environment.</p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row"><Button size="lg" disabled={loading} onClick={() => startLogin()} className="h-13 bg-[#9fe2d3] px-6 text-[#101b31] hover:bg-[#c5f2e6]">Access my workspace <ArrowRight className="ml-2 h-4 w-4" /></Button><p className="flex items-center text-sm text-slate-400"><ShieldCheck className="mr-2 h-4 w-4 text-[#9fe2d3]" />Secure Manus OAuth sign-in</p></div>
          </div>
          <div className="relative mx-auto w-full max-w-md rounded-[2rem] border border-white/12 bg-white/[0.07] p-4 shadow-2xl backdrop-blur sm:p-5">
            <div className="rounded-[1.45rem] bg-[#f7f6f2] p-6 text-[#20314c] sm:p-8"><div className="flex items-center justify-between"><div><p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[#638092]">Access governance</p><h2 className="font-display mt-2 text-3xl">Built for clarity.</h2></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#dff4ef] text-[#1d6971]"><Building2 className="h-5 w-5" /></span></div><div className="mt-8 space-y-3">{["Authenticated identity", "Role-aware workspace", "Traceable access changes"].map((item, index) => <div key={item} className="flex items-center gap-3 rounded-xl border border-[#e1e6e5] bg-white px-4 py-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#e8f8f4] font-mono text-[0.64rem] text-[#1d6971]">0{index + 1}</span><span className="text-sm font-medium">{item}</span></div>)}</div><div className="mt-8 rounded-xl bg-[#20314c] p-4 text-slate-100"><p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#a9e5d8]">Transparent by design</p><p className="mt-2 text-sm leading-5 text-slate-300">When an administrator changes access, the affected user receives an in-app notification.</p></div></div>
          </div>
        </div>
        <div className="mx-auto mt-10 grid max-w-7xl gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">{roles.map(role => <div key={role.name} className="bg-[#142039]/80 p-5"><role.icon className="h-4 w-4 text-[#9fe2d3]" /><p className="mt-5 text-sm font-semibold">{role.name}</p><p className="mt-2 text-sm leading-5 text-slate-400">{role.description}</p></div>)}</div>
      </section>
    </main>
  );
}
