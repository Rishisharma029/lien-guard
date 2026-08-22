import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowRight, FileText, Gavel, MessageSquareText } from "lucide-react";
import { useLocation } from "wouter";

type WorklistMode = "timeline" | "communications" | "documents";
const content = {
  timeline: { eyebrow: "Case timeline", title: "Follow the record, step by step.", copy: "Open a case to view the chronological lifecycle generated from its recorded status and deadlines.", icon: Gavel, action: "Open timeline" },
  communications: { eyebrow: "Communications", title: "Keep correspondence attached to the case.", copy: "Open a case to review recorded follow-ups and add a new follow-up note through the protected case record.", icon: MessageSquareText, action: "Open communications" },
  documents: { eyebrow: "Documents", title: "Prepare a precise request from the case facts.", copy: "Open a case to generate and edit a fact-based RTI draft using the reference and authority held in its record.", icon: FileText, action: "Open documents" },
} as const;

export default function CaseWorklist({ mode }: { mode: WorklistMode }) {
  const [, navigate] = useLocation();
  const { data: cases = [], isLoading } = trpc.cases.list.useQuery();
  const detail = content[mode];
  const Icon = detail.icon;
  return <div className="mx-auto max-w-5xl space-y-6"><section><p className="eyebrow text-[#688096]">{detail.eyebrow}</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#132f4d]">{detail.title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#718196]">{detail.copy}</p></section><Card className="border-[#dce3eb] shadow-sm"><CardContent className="p-0">{isLoading ? <div className="p-10 text-center text-sm text-[#718196]">Loading case records…</div> : cases.length ? <div className="divide-y divide-[#edf0f4]">{cases.map(record => <button key={record.caseId} onClick={() => navigate(`/cases/${record.caseId}`)} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left hover:bg-[#f8fbff]"><div className="flex items-center gap-4"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[#e8f0fa] text-[#2a638f]"><Icon className="h-4 w-4" /></span><div><p className="font-mono text-xs font-bold text-[#2e6794]">{record.caseId}</p><p className="mt-1 text-sm font-semibold text-[#243f5b]">{record.title}</p><p className="mt-1 text-xs text-[#75869a]">{record.status.split("_").join(" ").toLowerCase()}</p></div></div><span className="flex items-center gap-2 text-xs font-bold text-[#426783]">{detail.action}<ArrowRight className="h-3.5 w-3.5" /></span></button>)}</div> : <div className="p-12 text-center"><Icon className="mx-auto h-8 w-8 text-[#729aa2]" /><h2 className="mt-4 text-lg font-extrabold text-[#25445e]">No case records yet.</h2><p className="mt-2 text-sm text-[#718196]">Create a case first, then return here to follow its lifecycle.</p><Button onClick={() => navigate("/cases")} className="mt-5 bg-[#0f2b4b] hover:bg-[#183c63]">Go to My Cases</Button></div>}</CardContent></Card></div>;
}
