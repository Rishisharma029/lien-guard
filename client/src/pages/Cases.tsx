import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AlertCircle, FilePlus2, Filter, Plus, RotateCw } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const statuses = ["OPEN", "UNDER_REVIEW", "AWAITING_RESPONSE", "ESCALATED", "RESOLVED", "CLOSED"] as const;
type Status = (typeof statuses)[number];
const statusClass: Record<Status, string> = { OPEN: "bg-[#e8f0fa] text-[#245e94]", UNDER_REVIEW: "bg-[#eeeafd] text-[#6651a0]", AWAITING_RESPONSE: "bg-[#fff2d9] text-[#926019]", ESCALATED: "bg-[#fee8e4] text-[#aa463d]", RESOLVED: "bg-[#e5f4ec] text-[#2b735f]", CLOSED: "bg-[#eef1f3] text-[#607285]" };
const readable = (value: string) => value.split("_").map(word => word[0] + word.slice(1).toLowerCase()).join(" ");
const formatDate = (date: Date | string | null) => date ? new Date(date).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—";
const cleanOptional = (value: string) => value.trim() || undefined;
const cleanAmount = (value: string) => value.replace(/[₹,\s]/g, "").trim() || undefined;

function CreateCase() {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ title: "", description: "", caseType: "Bank lien / Cybercrime", bankName: "", lienAmount: "", lienDate: "", lienReference: "", transactionReference: "", authorityName: "", responseDeadline: "" });
  const reset = () => { setForm({ title: "", description: "", caseType: "Bank lien / Cybercrime", bankName: "", lienAmount: "", lienDate: "", lienReference: "", transactionReference: "", authorityName: "", responseDeadline: "" }); setFormError(""); };
  const create = trpc.cases.create.useMutation({
    onSuccess: result => { utils.cases.list.invalidate(); setOpen(false); reset(); toast.success(`${result.caseId} was created and added to your case register.`); },
    onError: error => {
      const fieldErrors = (error.data as { zodError?: { fieldErrors?: Record<string, string[] | undefined> } } | undefined)?.zodError?.fieldErrors;
      const firstFieldError = fieldErrors ? Object.values(fieldErrors).flat().find(Boolean) : undefined;
      const message = firstFieldError || "We could not create this case. Check the required details and try again.";
      setFormError(message);
      toast.error("Case was not created. Please review the highlighted details.");
    },
  });
  const set = (key: keyof typeof form, value: string) => { setForm(prev => ({ ...prev, [key]: value })); setFormError(""); };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const amount = cleanAmount(form.lienAmount);
    if (amount && !/^\d+(?:\.\d{1,2})?$/.test(amount)) { setFormError("Lien amount must be a number with up to two decimal places."); return; }
    create.mutate({
      title: form.title.trim(),
      description: form.description.trim(),
      caseType: form.caseType.trim(),
      priority: "NORMAL",
      ...(cleanOptional(form.bankName) ? { bankName: cleanOptional(form.bankName) } : {}),
      ...(amount ? { lienAmount: amount } : {}),
      ...(form.lienDate ? { lienDate: new Date(`${form.lienDate}T12:00:00.000Z`) } : {}),
      ...(cleanOptional(form.lienReference) ? { lienReference: cleanOptional(form.lienReference) } : {}),
      ...(cleanOptional(form.transactionReference) ? { transactionReference: cleanOptional(form.transactionReference) } : {}),
      ...(cleanOptional(form.authorityName) ? { authorityName: cleanOptional(form.authorityName) } : {}),
      ...(form.responseDeadline ? { responseDeadline: new Date(form.responseDeadline) } : {}),
    });
  };
  return <Dialog open={open} onOpenChange={value => { setOpen(value); if (!value) setFormError(""); }}><DialogTrigger asChild><Button className="h-10 rounded-lg bg-[#0f2b4b] hover:bg-[#183c63]"><Plus className="mr-2 h-4 w-4" />Create new case</Button></DialogTrigger><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl"><form onSubmit={submit} noValidate><DialogHeader><p className="eyebrow text-[#617f99]">Create new case</p><DialogTitle className="mt-1 text-2xl font-extrabold text-[#132f4d]">Start with the essentials.</DialogTitle></DialogHeader>{formError && <div role="alert" className="mt-5 rounded-xl border border-[#f1d3cb] bg-[#fff8f5] px-4 py-3 text-sm text-[#8c493e]">{formError}</div>}<div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Case type</Label><Select value={form.caseType} onValueChange={value => set("caseType", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Bank lien / Cybercrime">Bank lien / Cybercrime</SelectItem><SelectItem value="Lien review">Lien review</SelectItem><SelectItem value="Registration question">Registration question</SelectItem><SelectItem value="Document request">Document request</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Bank <span className="text-[#8895a4]">optional</span></Label><Input value={form.bankName} onChange={event => set("bankName", event.target.value)} placeholder="Bank name" /></div><div className="space-y-2"><Label>Lien amount <span className="text-[#8895a4]">optional</span></Label><Input inputMode="decimal" value={form.lienAmount} onChange={event => set("lienAmount", event.target.value)} placeholder="e.g. 15000 or ₹15,000" /></div><div className="space-y-2"><Label>Lien date <span className="text-[#8895a4]">optional</span></Label><Input type="date" value={form.lienDate} onChange={event => set("lienDate", event.target.value)} /></div><div className="space-y-2"><Label>Reference number <span className="text-[#8895a4]">optional</span></Label><Input value={form.lienReference} onChange={event => set("lienReference", event.target.value)} placeholder="Lien or complaint reference" /></div><div className="space-y-2"><Label>Authority <span className="text-[#8895a4]">optional</span></Label><Input value={form.authorityName} onChange={event => set("authorityName", event.target.value)} placeholder="Authority or department" /></div><div className="space-y-2 sm:col-span-2"><Label>Transaction reference <span className="text-[#8895a4]">optional</span></Label><Input value={form.transactionReference} onChange={event => set("transactionReference", event.target.value)} placeholder="Transaction or bank reference" /></div><div className="space-y-2 sm:col-span-2"><Label>Case title <span className="text-[#b25143]">required</span></Label><Input value={form.title} onChange={event => set("title", event.target.value)} placeholder="A clear summary of the matter" /></div><div className="space-y-2 sm:col-span-2"><Label>What do you need reviewed? <span className="text-[#b25143]">required</span></Label><Textarea value={form.description} onChange={event => set("description", event.target.value)} className="min-h-28" placeholder="Describe the problem and the outcome you need." /></div></div><DialogFooter className="mt-6"><Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={create.isPending}>Cancel</Button><Button type="submit" disabled={create.isPending} className="bg-[#0f2b4b] hover:bg-[#183c63]">{create.isPending ? "Creating…" : "Create case"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

export default function Cases() {
  const { user } = useAuth(); const [, navigate] = useLocation(); const [filter, setFilter] = useState<Status | "ALL">("ALL");
  const query = trpc.cases.list.useQuery(undefined, { enabled: Boolean(user) }); const hasFailure = import.meta.env.DEV && new URLSearchParams(window.location.search).has("simulateCaseListError"); const cases = query.data || [];
  const visible = useMemo(() => filter === "ALL" ? cases : cases.filter(item => item.status === filter), [cases, filter]); const retry = () => { if (hasFailure) { const url = new URL(window.location.href); url.searchParams.delete("simulateCaseListError"); window.location.assign(url); } else query.refetch(); };
  const filters: { label: string; value: Status | "ALL" }[] = [{ label: "All", value: "ALL" }, { label: "Active", value: "OPEN" }, { label: "Awaiting", value: "AWAITING_RESPONSE" }, { label: "Escalated", value: "ESCALATED" }, { label: "Resolved", value: "RESOLVED" }];
  return <div className="mx-auto max-w-7xl space-y-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow text-[#688096]">Case register</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#132f4d]">My Cases</h1><p className="mt-2 text-sm text-[#718196]">A clear record of every matter, deadline, and next step.</p></div><CreateCase /></div><Card className="border-[#dce3eb] shadow-sm"><CardContent className="p-0"><div className="flex flex-wrap items-center gap-2 border-b border-[#e6ebf0] p-4"><Filter className="mr-1 h-4 w-4 text-[#718196]" />{filters.map(item => <button key={item.label} onClick={() => setFilter(item.value)} className={`rounded-lg px-3 py-2 text-xs font-bold ${filter === item.value ? "bg-[#0f2b4b] text-white" : "bg-[#f3f6f8] text-[#65788d] hover:bg-[#e9eff4]"}`}>{item.label}</button>)}</div>{query.isLoading ? <div className="space-y-3 p-5">{[1, 2, 3].map(item => <Skeleton key={item} className="h-16 w-full" />)}</div> : (query.isError || hasFailure) ? <div className="p-12 text-center"><AlertCircle className="mx-auto h-8 w-8 text-[#bd574a]" /><h2 className="mt-4 text-xl font-extrabold text-[#56312d]">The case register is unavailable.</h2><p className="mt-2 text-sm text-[#805d56]">Your case data has not changed. Please try again.</p><Button onClick={retry} className="mt-5 bg-[#56312d] hover:bg-[#70423b]"><RotateCw className="mr-2 h-4 w-4" />Try again</Button></div> : visible.length ? <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left"><thead className="bg-[#f7f9fb] text-[0.65rem] uppercase tracking-[0.1em] text-[#6d7f92]"><tr><th className="px-5 py-3 font-semibold">Case</th><th className="px-4 py-3 font-semibold">Bank</th><th className="px-4 py-3 font-semibold">Lien amount</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold">Deadline</th><th className="px-5 py-3 font-semibold">Priority</th></tr></thead><tbody>{visible.map(record => <tr key={record.caseId} onClick={() => navigate(`/cases/${record.caseId}`)} className="cursor-pointer border-t border-[#edf0f4] hover:bg-[#f8fbff]"><td className="px-5 py-4"><p className="font-mono text-xs font-bold text-[#2c638d]">{record.caseId}</p><p className="mt-1 max-w-52 truncate text-sm font-semibold text-[#243f5b]">{record.title}</p></td><td className="px-4 py-4 text-sm text-[#5f7286]">{record.bankName || "—"}</td><td className="px-4 py-4 text-sm font-semibold text-[#425d75]">{record.lienAmount ? `₹${Number(record.lienAmount).toLocaleString()}` : "—"}</td><td className="px-4 py-4"><Badge className={`border-0 ${statusClass[record.status]}`}>{readable(record.status)}</Badge></td><td className="px-4 py-4 text-sm text-[#5f7286]">{formatDate(record.responseDeadline)}</td><td className="px-5 py-4 text-sm font-semibold text-[#5f7286]">{readable(record.priority)}</td></tr>)}</tbody></table></div> : <div className="p-12 text-center"><FilePlus2 className="mx-auto h-9 w-9 text-[#6a99a0]" /><h2 className="mt-4 text-xl font-extrabold text-[#24445d]">No cases to show.</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#728297]">Create a focused record with only the facts needed to get the review moving.</p><div className="mt-6"><CreateCase /></div></div>}</CardContent></Card></div>;
}
