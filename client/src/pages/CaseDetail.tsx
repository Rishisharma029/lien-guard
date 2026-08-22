import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, ArrowLeft, Clock3, FileText, Mail, Send, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";

const health = {
  ON_TRACK: ["On track", "bg-[#e5f4ec] text-[#2b735f]"], RESPONSE_PENDING: ["Response pending", "bg-[#fff2d9] text-[#926019]"], DEADLINE_APPROACHING: ["Deadline approaching", "bg-[#fff0d5] text-[#9a5e15]"], ESCALATION_REQUIRED: ["Escalation required", "bg-[#fee8e4] text-[#aa463d]"], UNDER_REVIEW: ["Under review", "bg-[#eeeafd] text-[#6651a0]"], RESOLVED: ["Resolved", "bg-[#e5f4ec] text-[#2b735f]"],
} as const;
const display = (value: string | null) => value || "Not recorded";
const dateTime = (value: Date | string | null) => value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Not recorded";
const nextStatuses = { OPEN: ["UNDER_REVIEW"], UNDER_REVIEW: ["AWAITING_RESPONSE", "ESCALATED", "RESOLVED", "CLOSED"], AWAITING_RESPONSE: ["UNDER_REVIEW", "ESCALATED"], ESCALATED: ["UNDER_REVIEW", "RESOLVED", "CLOSED"], RESOLVED: [], CLOSED: [] } as const;
const readableStatus = (value: string) => value.split("_").map(word => word[0] + word.slice(1).toLowerCase()).join(" ");

export default function CaseDetail() {
  const [, params] = useRoute("/cases/:caseId");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [note, setNote] = useState("");
  const detailQuery = trpc.cases.detail.useQuery({ caseId: params?.caseId || "" }, { enabled: Boolean(params?.caseId) });
  const detail = detailQuery.data;
  const communications = trpc.communications.list.useQuery({ caseId: params?.caseId || "" }, { enabled: Boolean(detail) });
  const followUp = trpc.communications.recordFollowUp.useMutation({
    onSuccess: () => {
            utils.communications.list.invalidate({ caseId: params?.caseId || "" });
      utils.cases.detail.invalidate({ caseId: params?.caseId || "" });
      setNote("");
      toast.success("Follow-up recorded in this case.");
    },
    onError: error => toast.error(error.message),
  });
  const updateStatus = trpc.cases.updateStatus.useMutation({
    onSuccess: () => {
      utils.cases.list.invalidate();
      utils.cases.detail.invalidate({ caseId: params?.caseId || "" });
      toast.success("Case lifecycle status updated and recorded in the audit timeline.");
    },
    onError: error => toast.error(error.message),
  });

  if (detailQuery.isLoading) return <div className="space-y-5">{[1, 2, 3].map(item => <Skeleton key={item} className="h-36 w-full" />)}</div>;
  if (!detail) return <div className="rounded-2xl border border-[#f0d9d4] bg-[#fff9f7] p-10 text-center"><ShieldAlert className="mx-auto h-8 w-8 text-[#b95649]" /><h1 className="mt-4 text-xl font-extrabold">Case unavailable</h1><p className="mt-2 text-sm text-[#7d5a54]">This case cannot be opened from your current workspace.</p><Button onClick={() => navigate("/cases")} className="mt-5">Back to cases</Button></div>;

  const { case: record, timeline, health: healthCode } = detail;
  const [healthLabel, healthClass] = health[healthCode];
  const communicationEntries = communications.data || [];

  return <div className="mx-auto max-w-7xl space-y-5"><button onClick={() => navigate("/cases")} className="flex items-center gap-2 text-sm font-semibold text-[#43637d] hover:text-[#143e65]"><ArrowLeft className="h-4 w-4" />Back to cases</button><section className="overflow-hidden rounded-2xl border border-[#d7e0e8] bg-white shadow-sm"><div className="border-b border-[#e7edf2] bg-[#f7f9fc] px-6 py-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-xs font-bold text-[#2e6794]">{record.caseId}</p><h1 className="mt-2 text-2xl font-extrabold text-[#153653] sm:text-3xl">{record.title}</h1><p className="mt-2 text-sm text-[#6c7e92]">{record.caseType}</p></div><Badge className={`border-0 px-3 py-1.5 ${healthClass}`}>{healthLabel}</Badge></div></div><div className="grid gap-px bg-[#e5ebf0] md:grid-cols-4"><div className="bg-white p-5"><p className="eyebrow text-[#78899b]">Lien amount</p><p className="mt-2 text-xl font-extrabold text-[#243f5c]">{record.lienAmount ? `₹${Number(record.lienAmount).toLocaleString()}` : "Not recorded"}</p></div><div className="bg-white p-5"><p className="eyebrow text-[#78899b]">Response deadline</p><p className="mt-2 text-sm font-bold text-[#243f5c]">{dateTime(record.responseDeadline)}</p></div><div className="bg-white p-5"><p className="eyebrow text-[#78899b]">Bank</p><p className="mt-2 text-sm font-bold text-[#243f5c]">{display(record.bankName)}</p></div><div className="bg-white p-5"><p className="eyebrow text-[#78899b]">Authority</p><p className="mt-2 text-sm font-bold text-[#243f5c]">{display(record.authorityName)}</p></div></div></section><div className="grid gap-5 xl:grid-cols-[1.02fr_0.98fr]"><div className="space-y-5"><Card className="border-[#dce3eb]"><CardContent className="p-6"><p className="eyebrow text-[#71859a]">Case information</p><dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">{[["Case reference", record.caseId], ["Lien reference", display(record.lienReference)], ["Date reported", dateTime(record.createdAt)], ["Transaction reference", display(record.transactionReference)], ["Description", record.description]].map(([label, value]) => <div key={label} className={label === "Description" ? "sm:col-span-2" : ""}><dt className="text-xs font-semibold text-[#748498]">{label}</dt><dd className="mt-1 text-sm leading-6 text-[#26425e]">{value}</dd></div>)}</dl></CardContent></Card><Card className="border-[#dce3eb]"><CardContent className="p-6"><div className="flex items-center gap-3"><Clock3 className="h-5 w-5 text-[#397295]" /><div><p className="eyebrow text-[#71859a]">Case timeline</p><h2 className="mt-1 text-lg font-extrabold">Recorded lifecycle</h2></div></div><ol className="mt-6 space-y-0">{timeline.map((event, index) => <li key={event.id} className="relative flex gap-4 pb-7 last:pb-0"><span className={`relative z-10 mt-1.5 h-3 w-3 rounded-full ${event.tone === "danger" ? "bg-[#c7493a]" : event.tone === "success" ? "bg-[#3b9575]" : event.tone === "warning" ? "bg-[#d59027]" : "bg-[#2e6794]"}`} />{index < timeline.length - 1 && <span className="absolute left-[5px] top-5 h-[calc(100%-0.25rem)] w-px bg-[#dbe3ea]" />}<div><p className="text-sm font-bold text-[#24425f]">{event.title}</p><p className="mt-1 text-xs leading-5 text-[#708196]">{event.detail}</p><time className="mt-1.5 block text-[0.68rem] text-[#8695a6]">{dateTime(event.occurredAt)}</time></div></li>)}</ol></CardContent></Card></div><div className="space-y-5"><Card className="border-[#dce3eb]"><CardContent className="p-6"><div className="flex items-center gap-3"><Mail className="h-5 w-5 text-[#397295]" /><div><p className="eyebrow text-[#71859a]">Communications</p><h2 className="mt-1 text-lg font-extrabold">Case correspondence</h2></div></div><div className="mt-5 divide-y divide-[#e6ebf0] rounded-xl border border-[#dce3eb]">{communications.isLoading ? <p className="p-5 text-sm text-[#718196]">Loading correspondence…</p> : communicationEntries.length ? communicationEntries.map(entry => <article key={entry.id} className="p-4"><div className="flex items-center justify-between gap-2"><p className="text-sm font-bold text-[#304d67]">{entry.subject}</p><span className="text-[0.65rem] font-bold uppercase tracking-wide text-[#2f7098]">{entry.state}</span></div><p className="mt-2 text-sm leading-6 text-[#65778b]">{entry.body}</p><p className="mt-2 text-xs text-[#8390a0]">{entry.counterparty || "No counterparty recorded"} · {dateTime(entry.createdAt)}</p></article>) : <p className="p-5 text-center text-sm text-[#718196]">No communications are recorded yet.</p>}</div><Textarea value={note} onChange={event => setNote(event.target.value)} maxLength={1200} className="mt-4 min-h-24" placeholder="Record a follow-up note for this case" /><Button disabled={followUp.isPending} onClick={() => followUp.mutate({ caseId: record.caseId, note: note || undefined })} className="mt-3 bg-[#0f2b4b] hover:bg-[#183c63]"><Send className="mr-2 h-3.5 w-3.5" />{followUp.isPending ? "Recording…" : "Record follow-up"}</Button></CardContent></Card><Card className="border-[#dce3eb]"><CardContent className="p-6"><div className="flex items-center gap-3"><AlertTriangle className="h-5 w-5 text-[#a86c21]" /><div><p className="eyebrow text-[#71859a]">Escalation status</p><h2 className="mt-1 text-lg font-extrabold">Current path</h2></div></div><p className="mt-4 text-sm leading-6 text-[#61758a]">The case health above is calculated from the recorded lifecycle and response deadline. Use the escalation workspace when an action is required.</p>{(user?.role === "authority" || user?.role === "admin") && nextStatuses[record.status].length > 0 ? <div className="mt-4 rounded-xl border border-[#e0e6eb] bg-[#f8fafc] p-3"><Label className="text-xs font-bold text-[#526b82]">Operational lifecycle control</Label><div className="mt-2 flex gap-2"><Select onValueChange={status => updateStatus.mutate({ caseId: record.caseId, status: status as typeof record.status })} disabled={updateStatus.isPending}><SelectTrigger className="bg-white"><SelectValue placeholder="Move case to…" /></SelectTrigger><SelectContent>{nextStatuses[record.status].map(status => <SelectItem key={status} value={status}>{readableStatus(status)}</SelectItem>)}</SelectContent></Select></div></div> : null}<Button variant="outline" onClick={() => navigate("/escalations")} className="mt-4">View escalation workspace</Button></CardContent></Card><Card className="border-[#dce3eb] bg-[#f7f9fc]"><CardContent className="p-6"><p className="eyebrow text-[#71859a]">RTI assistant</p><h2 className="mt-2 text-xl font-extrabold">Prepare a document from case state.</h2><p className="mt-2 text-sm leading-6 text-[#63768a]">RTI drafting is available only after the recorded case status or deadline makes it appropriate.</p><Button onClick={() => navigate("/rti")} className="mt-4 bg-[#0f2b4b] hover:bg-[#183c63]"><FileText className="mr-2 h-4 w-4" />Open RTI assistant</Button></CardContent></Card></div></div></div>;
}
