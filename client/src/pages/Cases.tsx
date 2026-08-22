import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AlertCircle, ArrowRight, CheckCircle2, CircleDot, Clock3, FilePlus2, FolderKanban, SlidersHorizontal } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

const statuses = ["OPEN", "UNDER_REVIEW", "AWAITING_RESPONSE", "ESCALATED", "RESOLVED", "CLOSED"] as const;
const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
type CaseStatus = (typeof statuses)[number];
type CasePriority = (typeof priorities)[number];

const statusStyle: Record<CaseStatus, string> = {
  OPEN: "bg-[#e6edfb] text-[#385b98]",
  UNDER_REVIEW: "bg-[#eee9fb] text-[#654aa1]",
  AWAITING_RESPONSE: "bg-[#f4eadc] text-[#86622e]",
  ESCALATED: "bg-[#f9e0db] text-[#ae5140]",
  RESOLVED: "bg-[#dff4ef] text-[#1d6971]",
  CLOSED: "bg-[#e8ecec] text-[#596777]",
};

const priorityStyle: Record<CasePriority, string> = {
  LOW: "bg-[#edf1f2] text-[#607083]",
  NORMAL: "bg-[#e6edfb] text-[#385b98]",
  HIGH: "bg-[#f4eadc] text-[#86622e]",
  URGENT: "bg-[#f9e0db] text-[#ae5140]",
};

const readable = (value: string) => value.split("_").map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(" ");
const timestamp = (value: Date | string) => new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

function CaseCreateDialog() {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [caseType, setCaseType] = useState("Lien review");
  const [priority, setPriority] = useState<CasePriority>("NORMAL");
  const createCase = trpc.cases.create.useMutation({
    onSuccess: created => {
      utils.cases.list.invalidate();
      setOpen(false);
      setTitle("");
      setDescription("");
      setCaseType("Lien review");
      setPriority("NORMAL");
      toast.success(`Case ${created.caseId} has been opened.`);
    },
    onError: error => toast.error(error.message),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createCase.mutate({ title, description, caseType, priority });
  };

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button className="bg-[#20314c] hover:bg-[#2d4568]"><FilePlus2 className="mr-2 h-4 w-4" />Open a case</Button></DialogTrigger>
    <DialogContent className="max-w-xl rounded-3xl p-0 overflow-hidden">
      <form onSubmit={submit}>
        <DialogHeader className="bg-[#20314c] px-6 py-6 text-white"><p className="font-mono text-[0.64rem] uppercase tracking-[0.18em] text-[#9fe2d3]">New Case</p><DialogTitle className="font-display mt-2 text-3xl text-white">Start with the facts.</DialogTitle><DialogDescription className="mt-2 text-slate-300">Give the LienGuard team enough context to route your case responsibly.</DialogDescription></DialogHeader>
        <div className="space-y-5 px-6 py-6">
          <div className="space-y-2"><Label htmlFor="case-title">Title</Label><Input id="case-title" value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Request to review a registered lien" required minLength={4} maxLength={180} /></div>
          <div className="space-y-2"><Label htmlFor="case-description">Description</Label><Textarea id="case-description" value={description} onChange={event => setDescription(event.target.value)} placeholder="Describe the property, issue, or information you need reviewed." required minLength={10} maxLength={5000} className="min-h-32 resize-y" /></div>
          <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label>Case type</Label><Select value={caseType} onValueChange={setCaseType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Lien review">Lien review</SelectItem><SelectItem value="Registration question">Registration question</SelectItem><SelectItem value="Dispute">Dispute</SelectItem><SelectItem value="Document request">Document request</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Priority</Label><Select value={priority} onValueChange={value => setPriority(value as CasePriority)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{priorities.map(item => <SelectItem key={item} value={item}>{readable(item)}</SelectItem>)}</SelectContent></Select></div></div>
        </div>
        <DialogFooter className="border-t border-[#e4e9e9] px-6 py-4"><Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={createCase.isPending}>Cancel</Button><Button type="submit" disabled={createCase.isPending} className="bg-[#20314c] hover:bg-[#2d4568]">{createCase.isPending ? "Opening…" : "Open case"}<ArrowRight className="ml-2 h-4 w-4" /></Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

export default function Cases() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<CaseStatus | "ALL">("ALL");
  const utils = trpc.useUtils();
  const { data: cases = [], isLoading, isError, error, refetch } = trpc.cases.list.useQuery(undefined, { enabled: Boolean(user) });
  const hasSimulatedListFailure = import.meta.env.DEV && new URLSearchParams(window.location.search).has("simulateCaseListError");
  const showListFailure = isError || hasSimulatedListFailure;
  const retryList = () => {
    if (hasSimulatedListFailure) {
      const url = new URL(window.location.href);
      url.searchParams.delete("simulateCaseListError");
      window.location.replace(url.toString());
      return;
    }
    refetch();
  };
  const updateStatus = trpc.cases.updateStatus.useMutation({
    onSuccess: updated => { utils.cases.list.invalidate(); toast.success(`${updated.caseId} moved to ${readable(updated.status)}.`); },
    onError: error => toast.error(error.message),
  });
  const visibleCases = useMemo(() => statusFilter === "ALL" ? cases : cases.filter(caseRecord => caseRecord.status === statusFilter), [cases, statusFilter]);
  const isCaseManager = user?.role === "authority" || user?.role === "admin";
  const activeCount = cases.filter(caseRecord => !["RESOLVED", "CLOSED"].includes(caseRecord.status)).length;
  const escalatedCount = cases.filter(caseRecord => caseRecord.status === "ESCALATED").length;

  return <div className="mx-auto max-w-6xl space-y-7">
    <section className="relative overflow-hidden rounded-[2rem] bg-[#20314c] px-6 py-8 text-white shadow-[0_20px_60px_rgba(31,48,75,0.18)] sm:px-10 sm:py-10"><div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_85%_20%,rgba(159,226,211,0.22),transparent_52%)]" /><div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-2xl"><p className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[#a9e5d8]">P0 Case management</p><h1 className="font-display mt-3 text-4xl sm:text-5xl">Every question has a clear path.</h1><p className="mt-4 max-w-xl leading-7 text-slate-300">Open cases, keep their lifecycle visible, and move the right work to the right reviewer.</p></div><div className="flex flex-wrap gap-3"><div className="rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 backdrop-blur"><p className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-slate-400">Active</p><p className="mt-1 text-2xl font-semibold">{activeCount}</p></div><div className="rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 backdrop-blur"><p className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-slate-400">Escalated</p><p className="mt-1 text-2xl font-semibold">{escalatedCount}</p></div></div></div></section>
    <section className="flex flex-col gap-4 rounded-3xl border border-[#dfe3e7] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8f8f4] text-[#1f7478]"><FolderKanban className="h-5 w-5" /></span><div><h2 className="font-display text-2xl text-[#20314c]">Case register</h2><p className="text-xs text-[#718095]">{user?.role === "citizen" ? "Your submitted cases" : "Cases visible to your assigned workspace"}</p></div></div><div className="flex flex-wrap gap-3"><Select value={statusFilter} onValueChange={value => setStatusFilter(value as CaseStatus | "ALL")}><SelectTrigger className="w-44 rounded-xl"><SlidersHorizontal className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All statuses</SelectItem>{statuses.map(status => <SelectItem key={status} value={status}>{readable(status)}</SelectItem>)}</SelectContent></Select><CaseCreateDialog /></div></section>
    {isLoading ? <div className="space-y-4">{[1, 2, 3].map(item => <Skeleton key={item} className="h-32 w-full rounded-3xl" />)}</div> : showListFailure ? <Card className="border-[#ecd9d2] bg-[#fff9f7] shadow-sm"><CardContent className="p-12 text-center"><AlertCircle className="mx-auto h-8 w-8 text-[#bd654a]" /><h2 className="font-display mt-5 text-3xl text-[#4d2d28]">The case register is temporarily unavailable.</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#7c5b54]">{error?.message || "We could not load your case records. Please try again."}</p><Button onClick={retryList} className="mt-6 bg-[#4d2d28] hover:bg-[#683d36]">Try again</Button></CardContent></Card> : visibleCases.length === 0 ? <Card className="border-[#dfe3e7] shadow-sm"><CardContent className="p-12 text-center"><CircleDot className="mx-auto h-8 w-8 text-[#73a5a2]" /><h2 className="font-display mt-5 text-3xl text-[#20314c]">Nothing is waiting here.</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#718095]">Open a case when you need a review, a document, or a decision. Its status will remain visible throughout the process.</p><div className="mt-6"><CaseCreateDialog /></div></CardContent></Card> : <div className="space-y-4">{visibleCases.map(caseRecord => <Card key={caseRecord.caseId} className="border-[#dfe3e7] shadow-sm transition-shadow hover:shadow-md"><CardContent className="p-5 sm:p-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-[#5e8b8a]">{caseRecord.caseId}</span><Badge className={`${statusStyle[caseRecord.status]} border-0`}>{readable(caseRecord.status)}</Badge><Badge className={`${priorityStyle[caseRecord.priority]} border-0`}>{readable(caseRecord.priority)}</Badge></div><h3 className="mt-3 text-lg font-semibold text-[#263d59]">{caseRecord.title}</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-[#64748a]">{caseRecord.description}</p><div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#718095]"><span className="flex items-center gap-1.5"><FilePlus2 className="h-3.5 w-3.5" />{caseRecord.caseType}</span><span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />Updated {timestamp(caseRecord.updatedAt)}</span>{user?.role !== "citizen" && <span className="flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" />Owner #{caseRecord.userId}</span>}</div></div>{isCaseManager ? <div className="w-full shrink-0 lg:w-52"><Label className="text-xs text-[#718095]">Lifecycle status</Label><Select value={caseRecord.status} disabled={updateStatus.isPending} onValueChange={value => updateStatus.mutate({ caseId: caseRecord.caseId, status: value as CaseStatus })}><SelectTrigger className="mt-2 rounded-xl bg-[#fbfcfb]"><SelectValue /></SelectTrigger><SelectContent>{statuses.map(status => <SelectItem key={status} value={status}>{readable(status)}</SelectItem>)}</SelectContent></Select></div> : <div className="flex items-center gap-2 text-xs text-[#5c7c7e]"><CheckCircle2 className="h-4 w-4 text-[#53a895]" />Status is managed by LienGuard.</div>}</div></CardContent></Card>)}</div>}
  </div>;
}
