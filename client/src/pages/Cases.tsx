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
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleDot,
  Clock,
  Clock3,
  ExternalLink,
  FilePlus2,
  FolderKanban,
  Landmark,
  Scale,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const statuses = [
  "OPEN",
  "UNDER_REVIEW",
  "AWAITING_RESPONSE",
  "REMINDER_SENT",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
] as const;
const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
type CaseStatus = (typeof statuses)[number];
type CasePriority = (typeof priorities)[number];

const statusStyle: Record<string, string> = {
  OPEN: "bg-[#e6edfb] text-[#385b98] border-[#c0d4f9]",
  UNDER_REVIEW: "bg-[#eee9fb] text-[#654aa1] border-[#d8cbf7]",
  AWAITING_RESPONSE: "bg-[#fef3c7] text-[#92400e] border-[#fde68a]",
  REMINDER_SENT: "bg-[#fee2e2] text-[#991b1b] border-[#fecaca]",
  ESCALATED: "bg-[#f9e0db] text-[#ae5140] border-[#f4c2b7]",
  RESOLVED: "bg-[#dff4ef] text-[#1d6971] border-[#bfe8de]",
  CLOSED: "bg-[#e8ecec] text-[#596777] border-[#d1dada]",
};

const priorityStyle: Record<CasePriority, string> = {
  LOW: "bg-[#edf1f2] text-[#607083]",
  NORMAL: "bg-[#e6edfb] text-[#385b98]",
  HIGH: "bg-[#fef3c7] text-[#92400e]",
  URGENT: "bg-[#fee2e2] text-[#991b1b]",
};

const readable = (value?: string | null) =>
  value ? value.split("_").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" ") : "N/A";

const formatCurrency = (amount?: string | null) => {
  if (!amount) return "₹0";
  const num = Number(amount.replace(/[^0-9.-]+/g, ""));
  if (isNaN(num)) return `₹${amount}`;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
};

const timestamp = (value: Date | string) =>
  new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

function CaseCreateDialog() {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [caseType, setCaseType] = useState("Cybercrime Bank Lien");
  const [priority, setPriority] = useState<CasePriority>("NORMAL");
  const [bankName, setBankName] = useState("State Bank of India");
  const [accountNumber, setAccountNumber] = useState("");
  const [branchName, setBranchName] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [lienAmount, setLienAmount] = useState("15000");
  const [disputeRefNumber, setDisputeRefNumber] = useState("");
  const [ncrpAckNumber, setNcrpAckNumber] = useState("");
  const [firNumber, setFirNumber] = useState("");
  const [freezingAuthority, setFreezingAuthority] = useState("");
  const [authorityEmail, setAuthorityEmail] = useState("");
  const [nodalOfficerEmail, setNodalOfficerEmail] = useState("");

  const createCase = trpc.cases.create.useMutation({
    onSuccess: created => {
      utils.cases.list.invalidate();
      utils.cases.metrics.invalidate();
      setOpen(false);
      setTitle("");
      setDescription("");
      setAccountNumber("");
      setLienAmount("15000");
      setDisputeRefNumber("");
      setNcrpAckNumber("");
      setFirNumber("");
      setFreezingAuthority("");
      setAuthorityEmail("");
      setNodalOfficerEmail("");
      toast.success(`Case ${created.caseId} registered in LienGuard with initial timeline.`);
    },
    onError: error => toast.error(error.message),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createCase.mutate({
      title: title || `Lien of ₹${lienAmount} on ${bankName} account`,
      description,
      caseType,
      priority,
      bankName,
      accountNumber: accountNumber || undefined,
      branchName: branchName || undefined,
      ifscCode: ifscCode || undefined,
      lienAmount: lienAmount || undefined,
      disputeRefNumber: disputeRefNumber || undefined,
      ncrpAckNumber: ncrpAckNumber || undefined,
      firNumber: firNumber || undefined,
      freezingAuthority: freezingAuthority || undefined,
      authorityEmail: authorityEmail || undefined,
      nodalOfficerEmail: nodalOfficerEmail || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#20314c] text-white hover:bg-[#2d4568]">
          <FilePlus2 className="mr-2 h-4 w-4" /> Register Lien / Cyber Case
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden">
        <form onSubmit={submit}>
          <DialogHeader className="bg-[#20314c] px-6 py-6 text-white">
            <p className="font-mono text-[0.64rem] uppercase tracking-[0.18em] text-[#9fe2d3]">Lien Resolution Platform</p>
            <DialogTitle className="font-display mt-2 text-2xl text-white">Register Bank Lien or Freeze Case</DialogTitle>
            <DialogDescription className="mt-1 text-slate-300">
              Provide incident details to generate a unique case ID, timeline, authority notices, and follow-up tracking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5 max-h-[70vh] overflow-y-auto">
            {/* Section 1: Basic & Issue */}
            <div className="space-y-3">
              <h3 className="font-mono text-xs uppercase tracking-wider text-[#1d6971] font-semibold">
                1. Case Summary & Affected Amount
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="case-title">Case Title</Label>
                  <Input
                    id="case-title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Unauthorized ₹15,000 lien marked on SBI savings account"
                    required
                    minLength={4}
                    maxLength={180}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="case-amount">Lien / Frozen Amount (₹ INR)</Label>
                  <Input
                    id="case-amount"
                    value={lienAmount}
                    onChange={e => setLienAmount(e.target.value)}
                    placeholder="15000"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={v => setPriority(v as CasePriority)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {priorities.map(p => <SelectItem key={p} value={p}>{readable(p)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="case-desc">Description of the Incident / Transaction</Label>
                  <Textarea
                    id="case-desc"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Explain when you noticed the freeze, transaction context, any messages received from the bank, etc."
                    required
                    minLength={10}
                    maxLength={5000}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Bank Details */}
            <div className="space-y-3 pt-2 border-t border-[#f0f3f5]">
              <h3 className="font-mono text-xs uppercase tracking-wider text-[#1d6971] font-semibold">
                2. Bank & Account Details
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="bank-name">Bank Name</Label>
                  <Input
                    id="bank-name"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    placeholder="e.g. State Bank of India, HDFC Bank, ICICI"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="account-num">Account Number</Label>
                  <Input
                    id="account-num"
                    value={accountNumber}
                    onChange={e => setAccountNumber(e.target.value)}
                    placeholder="e.g. 30891234567"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="branch-name">Branch Name</Label>
                  <Input
                    id="branch-name"
                    value={branchName}
                    onChange={e => setBranchName(e.target.value)}
                    placeholder="e.g. Connaught Place Branch"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ifsc-code">IFSC Code</Label>
                  <Input
                    id="ifsc-code"
                    value={ifscCode}
                    onChange={e => setIfscCode(e.target.value)}
                    placeholder="e.g. SBIN0000691"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Cybercrime References */}
            <div className="space-y-3 pt-2 border-t border-[#f0f3f5]">
              <h3 className="font-mono text-xs uppercase tracking-wider text-[#1d6971] font-semibold">
                3. Cybercrime & Authority Information (If known)
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ncrp-ack">NCRP Acknowledgement No. (1930)</Label>
                  <Input
                    id="ncrp-ack"
                    value={ncrpAckNumber}
                    onChange={e => setNcrpAckNumber(e.target.value)}
                    placeholder="e.g. 20261930018241"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fir-num">FIR / Police Diary No.</Label>
                  <Input
                    id="fir-num"
                    value={firNumber}
                    onChange={e => setFirNumber(e.target.value)}
                    placeholder="e.g. FIR 42/2026 PS Cyber Crime"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="freezing-auth">Freezing Police Authority / Cyber Cell Unit</Label>
                  <Input
                    id="freezing-auth"
                    value={freezingAuthority}
                    onChange={e => setFreezingAuthority(e.target.value)}
                    placeholder="e.g. Delhi Cyber Police / Gujarat CID Crime"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="auth-email">Authority / IO Email (Optional)</Label>
                  <Input
                    id="auth-email"
                    type="email"
                    value={authorityEmail}
                    onChange={e => setAuthorityEmail(e.target.value)}
                    placeholder="cybercell@police.gov.in"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nodal-email">Bank Nodal Officer Email (Optional)</Label>
                  <Input
                    id="nodal-email"
                    type="email"
                    value={nodalOfficerEmail}
                    onChange={e => setNodalOfficerEmail(e.target.value)}
                    placeholder="nodal.officer@bank.co.in"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="border-t border-[#e4e9e9] px-6 py-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={createCase.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCase.isPending} className="bg-[#20314c] hover:bg-[#2d4568]">
              {createCase.isPending ? "Creating Case…" : "Register Case & Start Tracking"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Cases() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState<CaseStatus | "ALL">("ALL");
  const utils = trpc.useUtils();
  const { data: cases = [], isLoading, isError, error, refetch } = trpc.cases.list.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const { data: metrics } = trpc.cases.metrics.useQuery(undefined, { enabled: Boolean(user) });

  const hasSimulatedListFailure =
    import.meta.env.DEV && new URLSearchParams(window.location.search).has("simulateCaseListError");
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

  const visibleCases = useMemo(
    () => (statusFilter === "ALL" ? cases : cases.filter(c => c.status === statusFilter)),
    [cases, statusFilter]
  );

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      {/* Top Banner */}
      <section className="relative overflow-hidden rounded-[2rem] bg-[#20314c] px-6 py-8 text-white shadow-xl sm:px-10 sm:py-10">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_85%_20%,rgba(159,226,211,0.22),transparent_52%)]" />
        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[#a9e5d8]">
              LienGuard Case Central
            </p>
            <h1 className="font-display text-3xl sm:text-4xl">Bank Lien & Cybercrime Resolution Queue</h1>
            <p className="max-w-xl text-sm leading-6 text-slate-300">
              Track frozen funds, automate authority communications, manage deadlines, and file RTI requests with full traceability.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 backdrop-blur min-w-28">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-slate-400">Total Under Lien</p>
              <p className="mt-1 text-xl font-bold text-[#9fe2d3]">
                {formatCurrency(String(metrics?.totalFrozenAmount || 0))}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 backdrop-blur min-w-24">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-slate-400">Active Cases</p>
              <p className="mt-1 text-xl font-semibold">{metrics?.activeCases ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 backdrop-blur min-w-24">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-slate-400">Overdue SLA</p>
              <p className="mt-1 text-xl font-semibold text-[#f87171]">{metrics?.overdueDeadlines ?? 0}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Control Bar */}
      <section className="flex flex-col gap-4 rounded-3xl border border-[#dfe3e7] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8f8f4] text-[#1f7478]">
            <FolderKanban className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-xl text-[#20314c]">Case Register</h2>
            <p className="text-xs text-[#718095]">
              {user?.role === "citizen" ? "Your registered lien & cybercrime cases" : "Operational case queue"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as CaseStatus | "ALL")}>
            <SelectTrigger className="w-48 rounded-xl">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {statuses.map(s => (
                <SelectItem key={s} value={s}>
                  {readable(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <CaseCreateDialog />
        </div>
      </section>

      {/* Case List Display */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(item => (
            <Skeleton key={item} className="h-32 w-full rounded-3xl" />
          ))}
        </div>
      ) : showListFailure ? (
        <Card className="border-[#ecd9d2] bg-[#fff9f7] shadow-sm">
          <CardContent className="p-12 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-[#bd654a]" />
            <h2 className="font-display mt-5 text-2xl text-[#4d2d28]">The case register is temporarily unavailable.</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#7c5b54]">
              {error?.message || "We could not load your case records. Please try again."}
            </p>
            <Button onClick={retryList} className="mt-6 bg-[#4d2d28] hover:bg-[#683d36]">
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : visibleCases.length === 0 ? (
        <Card className="border-[#dfe3e7] shadow-sm">
          <CardContent className="p-12 text-center space-y-4">
            <CircleDot className="mx-auto h-10 w-10 text-[#73a5a2]" />
            <h2 className="font-display text-2xl text-[#20314c]">No active cases in this view.</h2>
            <p className="mx-auto max-w-md text-sm text-[#718095]">
              Register a new case when funds or bank accounts are frozen to initiate timeline tracking, notices, and follow-ups.
            </p>
            <div>
              <CaseCreateDialog />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {visibleCases.map(caseRecord => (
            <Card
              key={caseRecord.caseId}
              onClick={() => navigate(`/cases/${caseRecord.caseId}`)}
              className="border-[#dfe3e7] shadow-sm transition-all hover:shadow-md cursor-pointer hover:border-[#9fe2d3]"
            >
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#1d6971] bg-[#e8f8f4] px-2 py-0.5 rounded-md">
                        {caseRecord.caseId}
                      </span>
                      <Badge className={`${statusStyle[caseRecord.status]} border text-xs px-2 py-0.5`}>
                        {readable(caseRecord.status)}
                      </Badge>
                      {caseRecord.priority && (
                        <Badge className={`${priorityStyle[caseRecord.priority]} border-0 text-xs`}>
                          {readable(caseRecord.priority)}
                        </Badge>
                      )}
                      {caseRecord.escalationTier > 1 && (
                        <Badge className="bg-[#ae5140] text-white border-0 text-xs">
                          Tier {caseRecord.escalationTier}
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-base font-semibold text-[#20314c] hover:text-[#1d6971] transition-colors">
                      {caseRecord.title}
                    </h3>
                    <p className="text-xs text-[#64748a] line-clamp-2">{caseRecord.description}</p>

                    <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-[#718095] font-mono pt-1">
                      <span className="flex items-center gap-1">
                        <Landmark className="h-3.5 w-3.5 text-[#1d6971]" />
                        {caseRecord.bankName || "Bank"}
                      </span>
                      {caseRecord.ncrpAckNumber && (
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5 text-[#1d6971]" />
                          NCRP: {caseRecord.ncrpAckNumber}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        Updated {timestamp(caseRecord.updatedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between lg:flex-col lg:items-end gap-3 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-[#f0f3f5]">
                    <div className="text-left lg:text-right">
                      <p className="font-mono text-[0.62rem] uppercase tracking-wider text-[#718095]">Lien Amount</p>
                      <p className="text-lg font-bold text-[#20314c]">{formatCurrency(caseRecord.lienAmount)}</p>
                    </div>

                    <Button
                      size="sm"
                      onClick={e => {
                        e.stopPropagation();
                        navigate(`/cases/${caseRecord.caseId}`);
                      }}
                      className="bg-[#20314c] text-white hover:bg-[#2d4568] text-xs h-8"
                    >
                      Open Case Workspace <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

