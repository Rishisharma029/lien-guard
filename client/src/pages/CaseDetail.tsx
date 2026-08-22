import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BellRing,
  Building2,
  CheckCircle2,
  Clock,
  Clock3,
  Copy,
  FileCheck2,
  FileDown,
  FileQuestion,
  FileSpreadsheet,
  FileText,
  History,
  Info,
  Landmark,
  Mail,
  MailPlus,
  MessageSquareReply,
  Printer,
  Scale,
  Send,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";

const statusStyle: Record<string, string> = {
  OPEN: "bg-[#e6edfb] text-[#385b98] border-[#c0d4f9]",
  UNDER_REVIEW: "bg-[#eee9fb] text-[#654aa1] border-[#d8cbf7]",
  AWAITING_RESPONSE: "bg-[#fef3c7] text-[#92400e] border-[#fde68a]",
  REMINDER_SENT: "bg-[#fee2e2] text-[#991b1b] border-[#fecaca]",
  ESCALATED: "bg-[#f9e0db] text-[#ae5140] border-[#f4c2b7]",
  RESOLVED: "bg-[#dff4ef] text-[#1d6971] border-[#bfe8de]",
  CLOSED: "bg-[#e8ecec] text-[#596777] border-[#d1dada]",
};

const readable = (value?: string | null) =>
  value ? value.split("_").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" ") : "N/A";

const formatCurrency = (amount?: string | null) => {
  if (!amount) return "₹0";
  const num = Number(amount.replace(/[^0-9.-]+/g, ""));
  if (isNaN(num)) return `₹${amount}`;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
};

const formatTime = (value?: Date | string | null) => {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

function RecordResponseModal({ caseId, onDone }: { caseId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [sender, setSender] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [nextStatus, setNextStatus] = useState<"UNDER_REVIEW" | "RESOLVED" | "CLOSED">("UNDER_REVIEW");
  const [notes, setNotes] = useState("");

  const recordResponse = trpc.cases.recordResponse.useMutation({
    onSuccess: () => {
      toast.success("Incoming communication recorded successfully.");
      setOpen(false);
      setSender("");
      setSubject("");
      setBody("");
      setNotes("");
      onDone();
    },
    onError: err => toast.error(err.message),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    recordResponse.mutate({
      caseId,
      sender,
      subject,
      body,
      nextStatus,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-[#9fe2d3] text-[#101b31] hover:bg-[#e8f8f4]">
          <MessageSquareReply className="mr-2 h-4 w-4 text-[#1d6971]" />
          Record Authority Reply
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="bg-[#20314c] px-6 py-6 text-white">
            <p className="font-mono text-[0.64rem] uppercase tracking-[0.18em] text-[#9fe2d3]">Inbound Communication</p>
            <DialogTitle className="font-display mt-2 text-2xl text-white">Log Bank / Police Response</DialogTitle>
            <DialogDescription className="mt-1 text-slate-300">
              Record incoming written communication from the bank or investigating agency to update the case timeline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5 max-h-[70vh] overflow-y-auto">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="resp-sender">Sender (Officer / Branch / Email)</Label>
                <Input
                  id="resp-sender"
                  placeholder="e.g. IO Cyber Cell / branch.mgr@sbi.co.in"
                  value={sender}
                  onChange={e => setSender(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resp-status">Update Case Status To</Label>
                <Select value={nextStatus} onValueChange={v => setNextStatus(v as any)}>
                  <SelectTrigger id="resp-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNDER_REVIEW">Under Review (Findings received)</SelectItem>
                    <SelectItem value="RESOLVED">Resolved (Lien Revoked / NOC Issued)</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resp-subject">Subject / Reference</Label>
              <Input
                id="resp-subject"
                placeholder="e.g. In reply to Ref: LG-CYB-XXXX regarding de-freeze order"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resp-body">Response Content / Excerpt</Label>
              <Textarea
                id="resp-body"
                placeholder="Paste the received email body, letter text, or summary of phone communication..."
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={4}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resp-notes">Action Items / Resolution Remarks (Optional)</Label>
              <Input
                id="resp-notes"
                placeholder="e.g. NOC submitted to branch, awaiting system update in 48 hours"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="border-t border-[#e4e9e9] px-6 py-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={recordResponse.isPending} className="bg-[#20314c] hover:bg-[#2d4568]">
              {recordResponse.isPending ? "Recording..." : "Save Communication"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function CaseDetail() {
  const [, params] = useRoute("/cases/:caseId");
  const caseId = params?.caseId || "";
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data, isLoading, isError, error, refetch } = trpc.cases.getDetailed.useQuery(
    { caseId },
    { enabled: Boolean(caseId) }
  );

  const [activeTab, setActiveTab] = useState("overview");
  const [rtiAddress, setRtiAddress] = useState("");
  const [rtiFacts, setRtiFacts] = useState("");
  const [rtiQueries, setRtiQueries] = useState("");

  const sendInitialNotice = trpc.cases.sendInitialNotice.useMutation({
    onSuccess: () => {
      utils.cases.getDetailed.invalidate({ caseId });
      utils.cases.list.invalidate();
      utils.cases.metrics.invalidate();
      toast.success("Official representation notice dispatched to authority.");
    },
    onError: err => toast.error(err.message),
  });

  const sendReminder = trpc.cases.sendFollowUpReminder.useMutation({
    onSuccess: () => {
      utils.cases.getDetailed.invalidate({ caseId });
      utils.cases.list.invalidate();
      utils.cases.metrics.invalidate();
      toast.success("Follow-up reminder sent. Response deadline updated.");
    },
    onError: err => toast.error(err.message),
  });

  const triggerEscalate = trpc.cases.escalate.useMutation({
    onSuccess: () => {
      utils.cases.getDetailed.invalidate({ caseId });
      utils.cases.list.invalidate();
      utils.cases.metrics.invalidate();
      toast.success("Case escalated with formal dossier dispatched.");
    },
    onError: err => toast.error(err.message),
  });

  const generateRti = trpc.cases.generateRtiDraft.useMutation({
    onSuccess: () => {
      utils.cases.getDetailed.invalidate({ caseId });
      toast.success("Section 6(1) RTI draft generated successfully.");
      setActiveTab("rti");
    },
    onError: err => toast.error(err.message),
  });

  const updateStatus = trpc.cases.updateStatus.useMutation({
    onSuccess: updated => {
      utils.cases.getDetailed.invalidate({ caseId });
      utils.cases.list.invalidate();
      utils.cases.metrics.invalidate();
      toast.success(`Case moved to ${readable(updated?.status)}.`);
    },
    onError: err => toast.error(err.message),
  });

  const caseRecord = data?.caseRecord;
  const timelineEvents = data?.timelineEvents || [];
  const communications = data?.communications || [];
  const rtiDraft = data?.rtiDraft;

  // Calculate deadline countdown
  const deadlineInfo = useMemo(() => {
    if (!caseRecord?.responseDeadline) return null;
    const now = new Date().getTime();
    const target = new Date(caseRecord.responseDeadline).getTime();
    const diffMs = target - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const isOverdue = diffDays < 0;
    return {
      diffDays: Math.abs(diffDays),
      isOverdue,
      dateFormatted: new Date(caseRecord.responseDeadline).toLocaleDateString("en-IN", {
        dateStyle: "medium",
      }),
    };
  }, [caseRecord?.responseDeadline]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard.`);
  };

  const printRti = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-44 w-full rounded-3xl" />
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    );
  }

  if (isError || !caseRecord) {
    return (
      <div className="mx-auto max-w-6xl">
        <Card className="border-[#ecd9d2] bg-[#fff9f7] p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-[#bd654a]" />
          <h2 className="font-display mt-4 text-2xl text-[#4d2d28]">Case Not Found</h2>
          <p className="mt-2 text-sm text-[#7c5b54]">{error?.message || "The requested case could not be retrieved."}</p>
          <Button onClick={() => navigate("/cases")} className="mt-6 bg-[#20314c] hover:bg-[#2d4568]">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Case Register
          </Button>
        </Card>
      </div>
    );
  }

  const isCaseManager = user?.role === "authority" || user?.role === "admin";
  const isTerminal = caseRecord.status === "RESOLVED" || caseRecord.status === "CLOSED";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Top Breadcrumb / Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => navigate("/cases")}
          className="flex items-center gap-2 text-sm font-medium text-[#4a6382] transition hover:text-[#101b31]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Case Register
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Record Inbound Response Button */}
          <RecordResponseModal caseId={caseRecord.caseId} onDone={() => refetch()} />

          {/* Quick Action: Initial Notice */}
          {caseRecord.status === "OPEN" && (
            <Button
              onClick={() => sendInitialNotice.mutate({ caseId: caseRecord.caseId })}
              disabled={sendInitialNotice.isPending}
              className="bg-[#1d6971] text-white hover:bg-[#28848d]"
            >
              <Send className="mr-2 h-4 w-4" />
              {sendInitialNotice.isPending ? "Dispatching..." : "Dispatch Notice to Bank & Police"}
            </Button>
          )}

          {/* Quick Action: Send Follow-up Reminder */}
          {(caseRecord.status === "AWAITING_RESPONSE" || caseRecord.status === "REMINDER_SENT") && (
            <Button
              onClick={() => sendReminder.mutate({ caseId: caseRecord.caseId })}
              disabled={sendReminder.isPending}
              variant="outline"
              className="border-[#dd6e54] text-[#ae5140] hover:bg-[#fef2f0]"
            >
              <BellRing className="mr-2 h-4 w-4" />
              {sendReminder.isPending ? "Sending..." : `Send Follow-up Reminder (${caseRecord.reminderCount + 1})`}
            </Button>
          )}

          {/* Quick Action: Generate RTI */}
          <Button
            onClick={() => generateRti.mutate({ caseId: caseRecord.caseId })}
            disabled={generateRti.isPending}
            variant="outline"
            className="border-[#20314c] text-[#20314c] hover:bg-[#edf1f5]"
          >
            <FileQuestion className="mr-2 h-4 w-4 text-[#1d6971]" />
            {generateRti.isPending ? "Generating..." : "RTI Section 6(1) Draft"}
          </Button>
        </div>
      </div>

      {/* Hero Header Card */}
      <section className="relative overflow-hidden rounded-[2rem] bg-[#20314c] p-6 text-white shadow-xl sm:p-8">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_85%_20%,rgba(159,226,211,0.2),transparent_55%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm uppercase tracking-widest text-[#9fe2d3] font-bold">
                {caseRecord.caseId}
              </span>
              <Badge className={`${statusStyle[caseRecord.status]} border text-xs px-2.5 py-0.5 font-medium`}>
                {readable(caseRecord.status)}
              </Badge>
              {caseRecord.priority && (
                <Badge variant="outline" className="border-white/20 text-slate-200 text-xs">
                  {caseRecord.priority} Priority
                </Badge>
              )}
              {caseRecord.escalationTier > 1 && (
                <Badge className="bg-[#ae5140] text-white border-0 text-xs">
                  Tier {caseRecord.escalationTier} Escalated
                </Badge>
              )}
            </div>

            <h1 className="font-display text-2xl sm:text-3xl text-white">{caseRecord.title}</h1>
            <p className="text-sm leading-relaxed text-slate-300">{caseRecord.description}</p>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-slate-300 font-mono">
              <span className="flex items-center gap-1.5">
                <Landmark className="h-4 w-4 text-[#9fe2d3]" />
                {caseRecord.bankName || "Unspecified Bank"} {caseRecord.branchName ? `(${caseRecord.branchName})` : ""}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-[#9fe2d3]" />
                Registered: {formatTime(caseRecord.createdAt)}
              </span>
              {caseRecord.ncrpAckNumber && (
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-[#9fe2d3]" />
                  NCRP: {caseRecord.ncrpAckNumber}
                </span>
              )}
            </div>
          </div>

          {/* Amount & Status Card */}
          <div className="shrink-0 flex flex-col gap-3 rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur min-w-64">
            <div>
              <p className="font-mono text-[0.62rem] uppercase tracking-widest text-[#9fe2d3]">Affected Lien Amount</p>
              <p className="mt-1 text-3xl font-bold text-white tracking-tight">
                {formatCurrency(caseRecord.lienAmount)}
              </p>
            </div>

            {deadlineInfo && !isTerminal && (
              <div className="border-t border-white/15 pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-mono uppercase text-[0.6rem]">Response Deadline</span>
                  <span
                    className={`font-semibold ${deadlineInfo.isOverdue ? "text-[#f87171]" : "text-[#9fe2d3]"}`}
                  >
                    {deadlineInfo.isOverdue
                      ? `${deadlineInfo.diffDays} Days Overdue`
                      : `${deadlineInfo.diffDays} Days Remaining`}
                  </span>
                </div>
                <p className="mt-1 text-[0.7rem] text-slate-400">Due by {deadlineInfo.dateFormatted}</p>
              </div>
            )}

            {isCaseManager && (
              <div className="border-t border-white/15 pt-3">
                <Label className="text-[0.65rem] uppercase text-slate-300 font-mono">Authority Status Control</Label>
                <Select
                  value={caseRecord.status}
                  disabled={updateStatus.isPending}
                  onValueChange={v => updateStatus.mutate({ caseId: caseRecord.caseId, status: v as any })}
                >
                  <SelectTrigger className="mt-1 h-8 bg-white/15 border-white/20 text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                    <SelectItem value="AWAITING_RESPONSE">Awaiting Response</SelectItem>
                    <SelectItem value="REMINDER_SENT">Reminder Sent</SelectItem>
                    <SelectItem value="ESCALATED">Escalated</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Interactive Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 h-auto p-1.5 bg-[#e8ecef] rounded-2xl">
          <TabsTrigger value="overview" className="rounded-xl py-2.5 text-xs font-semibold data-[state=active]:bg-white">
            <Info className="mr-1.5 h-4 w-4" /> Overview & Facts
          </TabsTrigger>
          <TabsTrigger value="timeline" className="rounded-xl py-2.5 text-xs font-semibold data-[state=active]:bg-white">
            <History className="mr-1.5 h-4 w-4" /> Case Timeline ({timelineEvents.length})
          </TabsTrigger>
          <TabsTrigger value="comms" className="rounded-xl py-2.5 text-xs font-semibold data-[state=active]:bg-white">
            <Mail className="mr-1.5 h-4 w-4" /> Communications ({communications.length})
          </TabsTrigger>
          <TabsTrigger value="escalation" className="rounded-xl py-2.5 text-xs font-semibold data-[state=active]:bg-white">
            <TrendingUp className="mr-1.5 h-4 w-4" /> Escalation Matrix
          </TabsTrigger>
          <TabsTrigger value="rti" className="rounded-xl py-2.5 text-xs font-semibold data-[state=active]:bg-white">
            <FileQuestion className="mr-1.5 h-4 w-4" /> RTI Assistant
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW & FACTS */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Bank & Account Facts */}
            <Card className="border-[#dfe3e7] shadow-sm">
              <CardHeader className="pb-3 border-b border-[#f0f3f5]">
                <div className="flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-[#1d6971]" />
                  <CardTitle className="text-lg text-[#20314c]">Bank & Account Details</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2 py-1.5 border-b border-[#f0f3f5]">
                  <span className="text-[#607089]">Bank Name</span>
                  <span className="font-semibold text-[#20314c]">{caseRecord.bankName || "Not provided"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 py-1.5 border-b border-[#f0f3f5]">
                  <span className="text-[#607089]">Account Number</span>
                  <span className="font-mono text-[#20314c] font-medium">{caseRecord.accountNumber || "Not provided"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 py-1.5 border-b border-[#f0f3f5]">
                  <span className="text-[#607089]">Branch Name</span>
                  <span className="text-[#20314c]">{caseRecord.branchName || "Not provided"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 py-1.5 border-b border-[#f0f3f5]">
                  <span className="text-[#607089]">IFSC Code</span>
                  <span className="font-mono text-[#20314c]">{caseRecord.ifscCode || "Not provided"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 py-1.5">
                  <span className="text-[#607089]">Dispute Ref / UTR</span>
                  <span className="font-mono text-[#20314c] text-xs">{caseRecord.disputeRefNumber || "Not provided"}</span>
                </div>
              </CardContent>
            </Card>

            {/* Cybercrime & Authority Facts */}
            <Card className="border-[#dfe3e7] shadow-sm">
              <CardHeader className="pb-3 border-b border-[#f0f3f5]">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-[#ae5140]" />
                  <CardTitle className="text-lg text-[#20314c]">Cybercrime & Police Details</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2 py-1.5 border-b border-[#f0f3f5]">
                  <span className="text-[#607089]">NCRP Ack No. (1930)</span>
                  <span className="font-mono text-[#20314c] font-medium">{caseRecord.ncrpAckNumber || "Not provided"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 py-1.5 border-b border-[#f0f3f5]">
                  <span className="text-[#607089]">FIR / Police Diary No.</span>
                  <span className="font-mono text-[#20314c]">{caseRecord.firNumber || "Not provided"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 py-1.5 border-b border-[#f0f3f5]">
                  <span className="text-[#607089]">Freezing Police Unit</span>
                  <span className="text-[#20314c]">{caseRecord.freezingAuthority || "Not provided"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 py-1.5 border-b border-[#f0f3f5]">
                  <span className="text-[#607089]">Cyber Cell Email</span>
                  <span className="font-mono text-xs text-[#20314c]">{caseRecord.authorityEmail || "Not provided"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 py-1.5">
                  <span className="text-[#607089]">Bank Nodal Officer Email</span>
                  <span className="font-mono text-xs text-[#20314c]">{caseRecord.nodalOfficerEmail || "Not provided"}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Workflow Guidance & Next Steps */}
          <Card className="border-[#bfe8de] bg-[#f1f9f7] shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#dff4ef] text-[#1d6971]">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-[#1b4950]">Lien Resolution Lifecycle Guide</h3>
                  <p className="text-sm text-[#497177] leading-relaxed">
                    1. <strong>Formal Representation:</strong> Dispatch the structured legal representation with unique ID {caseRecord.caseId} to the Bank & Cyber Cell.<br />
                    2. <strong>7-Day Deadline:</strong> LienGuard monitors the response window. If non-responsive, automated follow-up reminders are triggered.<br />
                    3. <strong>Escalation / RTI:</strong> If unanswered, escalate to Tier-2 (Bank Nodal Officer / SP Cyber) or file a Section 6(1) RTI application to obtain the official Section 102/106 requisition order copy.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: CHRONOLOGICAL TIMELINE */}
        <TabsContent value="timeline" className="space-y-4">
          <Card className="border-[#dfe3e7] shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-[#20314c]">Chronological Case History</CardTitle>
              <CardDescription>
                Every notice, deadline, reminder, escalation, and inbound response recorded with an immutable audit trail.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {timelineEvents.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-8">No timeline events logged yet.</p>
              ) : (
                <div className="relative pl-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#dfe3e7] space-y-8">
                  {timelineEvents.map((evt, idx) => (
                    <div key={evt.id || idx} className="relative flex items-start gap-4">
                      {/* Stepper Dot */}
                      <span className="absolute -left-6 top-1 grid h-5 w-5 place-items-center rounded-full bg-[#1d6971] text-white shadow-sm ring-4 ring-white">
                        <span className="h-2 w-2 rounded-full bg-white" />
                      </span>

                      <div className="w-full rounded-2xl border border-[#e2e8e8] bg-[#fbfcfb] p-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eff2f2] pb-2">
                          <span className="font-semibold text-sm text-[#20314c]">{evt.title}</span>
                          <span className="text-xs text-[#718095] font-mono">{formatTime(evt.createdAt)}</span>
                        </div>
                        <p className="mt-2 text-sm text-[#4a5568] leading-relaxed">{evt.description}</p>
                        <div className="mt-3 flex items-center gap-2 text-xs text-[#718095]">
                          <Badge variant="outline" className="text-[0.68rem] uppercase font-mono border-[#cbd5e1]">
                            Actor: {evt.actorRole}
                          </Badge>
                          <span className="text-[0.68rem] text-slate-400">Event: {evt.eventType}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: COMMUNICATIONS HUB */}
        <TabsContent value="comms" className="space-y-4">
          <Card className="border-[#dfe3e7] shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-xl text-[#20314c]">Communications Repository</CardTitle>
                <CardDescription>
                  Full records of official representations, reminders, and incoming correspondence.
                </CardDescription>
              </div>
              <RecordResponseModal caseId={caseRecord.caseId} onDone={() => refetch()} />
            </CardHeader>
            <CardContent className="space-y-4">
              {communications.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <Mail className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="text-sm text-slate-500">No communications have been dispatched yet.</p>
                  {caseRecord.status === "OPEN" && (
                    <Button
                      onClick={() => sendInitialNotice.mutate({ caseId: caseRecord.caseId })}
                      disabled={sendInitialNotice.isPending}
                      className="bg-[#20314c] hover:bg-[#2d4568]"
                    >
                      <Send className="mr-2 h-4 w-4" /> Dispatch Initial Notice
                    </Button>
                  )}
                </div>
              ) : (
                communications.map(comm => (
                  <Card key={comm.id} className="border-[#e2e8e8] bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between bg-[#f6f8f9] px-5 py-3 border-b border-[#e2e8e8]">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            comm.direction === "OUTBOUND"
                              ? "bg-[#e6edfb] text-[#385b98] border-0"
                              : "bg-[#dff4ef] text-[#1d6971] border-0"
                          }
                        >
                          {comm.direction === "OUTBOUND" ? "Outbound Notice" : "Inbound Response"}
                        </Badge>
                        <span className="text-xs font-mono text-[#607089]">{comm.communicationType}</span>
                      </div>
                      <span className="text-xs text-[#718095] font-mono">{formatTime(comm.createdAt)}</span>
                    </div>

                    <CardContent className="p-5 space-y-3">
                      <div>
                        <p className="text-xs font-mono text-[#718095]">
                          {comm.direction === "OUTBOUND" ? "To:" : "From:"} {comm.recipientOrSender}
                        </p>
                        <h4 className="font-semibold text-base text-[#20314c] mt-1">{comm.subject}</h4>
                      </div>

                      <pre className="p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8e8] text-xs text-[#334155] font-mono whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                        {comm.body}
                      </pre>

                      <div className="flex justify-end pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(comm.body, "Message content")}
                          className="text-xs text-[#1d6971] hover:bg-[#e8f8f4]"
                        >
                          <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy Message Text
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: ESCALATION MATRIX */}
        <TabsContent value="escalation" className="space-y-6">
          <Card className="border-[#dfe3e7] shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-[#20314c]">Multi-Tier Escalation Framework</CardTitle>
              <CardDescription>
                When designated authorities do not reply within statutory SLA periods, LienGuard provides structured escalation tiers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tier 1 */}
              <div className="rounded-2xl border border-[#dfe3e7] bg-[#fbfcfb] p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[#e6edfb] text-[#385b98] border-0">Tier 1: Branch & Cyber Cell</Badge>
                      <span className="text-xs text-[#718095]">SLA: 7 Business Days</span>
                    </div>
                    <h4 className="font-semibold text-base text-[#20314c] mt-2">
                      Initial Representation & Grounds Request
                    </h4>
                    <p className="text-xs text-[#607089] mt-1">
                      Addressed to Branch Manager ({caseRecord.bankName || "Bank"}) and Investigating Officer ({caseRecord.freezingAuthority || "Cyber Cell"}).
                    </p>
                  </div>
                  <div className="shrink-0">
                    <Badge variant="outline" className="border-[#9fe2d3] text-[#1d6971]">
                      {caseRecord.noticeSentAt ? "Dispatched" : "Ready to Send"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Tier 2 */}
              <div className="rounded-2xl border border-[#f4c2b7] bg-[#fff9f7] p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[#fee2e2] text-[#991b1b] border-0">Tier 2: Principal Nodal Officer & SP</Badge>
                      <span className="text-xs text-[#ae5140]">SLA: 7 Business Days</span>
                    </div>
                    <h4 className="font-semibold text-base text-[#20314c] mt-2">
                      Executive Escalation for Prolonged Inaction
                    </h4>
                    <p className="text-xs text-[#7c5b54] mt-1">
                      Escalates to Bank Chief Grievance Redressal / Principal Nodal Officer and Superintendent of Police (SP Cyber Crime).
                    </p>
                  </div>
                  <div className="shrink-0">
                    <Button
                      onClick={() => triggerEscalate.mutate({ caseId: caseRecord.caseId, tier: 2 })}
                      disabled={triggerEscalate.isPending || caseRecord.escalationTier >= 2}
                      className="bg-[#ae5140] text-white hover:bg-[#c55d4b]"
                    >
                      <TrendingUp className="mr-2 h-4 w-4" />
                      {caseRecord.escalationTier >= 2 ? "Tier 2 Escalated" : "Escalate to Tier 2"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tier 3 */}
              <div className="rounded-2xl border border-[#d8cbf7] bg-[#f9f7ff] p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[#eee9fb] text-[#654aa1] border-0">Tier 3: Banking Ombudsman & Appellate</Badge>
                      <span className="text-xs text-[#654aa1]">Statutory Regulatory Appeal</span>
                    </div>
                    <h4 className="font-semibold text-base text-[#20314c] mt-2">
                      RBI Integrated Ombudsman Scheme Complaint
                    </h4>
                    <p className="text-xs text-[#5f488e] mt-1">
                      Formal complaint before the Reserve Bank of India Ombudsman for deficiency of service and unjustified lien.
                    </p>
                  </div>
                  <div className="shrink-0">
                    <Button
                      onClick={() => triggerEscalate.mutate({ caseId: caseRecord.caseId, tier: 3 })}
                      disabled={triggerEscalate.isPending || caseRecord.escalationTier >= 3}
                      variant="outline"
                      className="border-[#654aa1] text-[#654aa1] hover:bg-[#f3effd]"
                    >
                      <Scale className="mr-2 h-4 w-4" />
                      {caseRecord.escalationTier >= 3 ? "Tier 3 Filed" : "Escalate to Ombudsman"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: RTI ASSISTANT */}
        <TabsContent value="rti" className="space-y-6">
          <Card className="border-[#dfe3e7] shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#dff4ef] text-[#1d6971] border-0">RTI Act, 2005</Badge>
                  <span className="text-xs text-[#607089]">Section 6(1) Information Application</span>
                </div>
                <CardTitle className="text-xl text-[#20314c] mt-2">
                  Structured Right to Information (RTI) Dossier
                </CardTitle>
                <CardDescription>
                  LienGuard auto-compiles your case facts into a ready-to-file RTI application. Review and submit via rtionline.gov.in.
                </CardDescription>
              </div>

              <div className="flex flex-wrap gap-2">
                {rtiDraft && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() =>
                        copyToClipboard(
                          `FORM 'A' - APPLICATION UNDER SECTION 6(1) OF THE RTI ACT, 2005\n\nTo: ${rtiDraft.pioDesignation}\nPublic Authority: ${rtiDraft.publicAuthority}\n\nFacts:\n${rtiDraft.factsSummary}\n\nInformation Requested:\n${rtiDraft.queriesRequested}\n\nDeclaration:\n${rtiDraft.statutoryDeclaration}`,
                          "RTI Draft text"
                        )
                      }
                      className="border-[#20314c] text-[#20314c]"
                    >
                      <Copy className="mr-2 h-4 w-4" /> Copy RTI Text
                    </Button>
                    <Button onClick={printRti} className="bg-[#20314c] hover:bg-[#2d4568]">
                      <Printer className="mr-2 h-4 w-4" /> Print Form
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {!rtiDraft ? (
                <div className="text-center py-10 space-y-4">
                  <FileQuestion className="mx-auto h-12 w-12 text-[#1d6971]" />
                  <h3 className="font-display text-2xl text-[#20314c]">Generate Your RTI Application</h3>
                  <p className="max-w-lg mx-auto text-sm text-[#607089]">
                    When banks or cybercrime cells fail to supply Section 102/106 notice copies, filing an RTI request under Section 6(1) obligates public authorities to provide certified records within 30 days.
                  </p>
                  <Button
                    onClick={() => generateRti.mutate({ caseId: caseRecord.caseId })}
                    disabled={generateRti.isPending}
                    className="bg-[#20314c] hover:bg-[#2d4568]"
                  >
                    <FileCheck2 className="mr-2 h-4 w-4" />
                    {generateRti.isPending ? "Compiling RTI..." : "Generate Section 6(1) RTI Draft"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* RTI Form Display Box */}
                  <div className="rounded-2xl border border-[#d1dada] bg-white p-6 sm:p-8 space-y-6 text-[#20314c] font-serif shadow-inner">
                    <div className="text-center border-b border-[#e2e8e8] pb-4">
                      <p className="font-mono text-xs uppercase tracking-widest text-[#1d6971]">
                        Right to Information Act, 2005
                      </p>
                      <h2 className="text-xl font-bold mt-1">
                        APPLICATION FOR OBTAINING INFORMATION UNDER SECTION 6(1)
                      </h2>
                    </div>

                    <div className="space-y-1 text-sm">
                      <p><strong>To,</strong></p>
                      <p>{rtiDraft.pioDesignation}</p>
                      <p>{rtiDraft.publicAuthority}</p>
                    </div>

                    <div className="space-y-2 text-sm">
                      <p className="font-bold">1. Background Facts & Account Summary:</p>
                      <p className="text-slate-700 bg-slate-50 p-4 rounded-xl font-sans text-xs leading-relaxed">
                        {rtiDraft.factsSummary}
                      </p>
                    </div>

                    <div className="space-y-2 text-sm">
                      <p className="font-bold">2. Specific Information / Certified Records Sought:</p>
                      <div className="text-slate-700 bg-slate-50 p-4 rounded-xl font-sans text-xs leading-relaxed whitespace-pre-wrap">
                        {rtiDraft.queriesRequested}
                      </div>
                    </div>

                    <div className="space-y-1 text-sm border-t border-[#e2e8e8] pt-4">
                      <p className="font-bold">3. Statutory Declaration:</p>
                      <p className="text-xs text-slate-600 font-sans">{rtiDraft.statutoryDeclaration}</p>
                    </div>

                    <div className="flex justify-between items-end border-t border-[#e2e8e8] pt-4 text-xs font-sans text-slate-500">
                      <span>LienGuard Reference: {caseRecord.caseId}</span>
                      <span className="text-right">
                        Applicant: <strong>{user?.name || "Bonafide Citizen"}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Submission Instructions */}
                  <div className="rounded-2xl border border-[#cfe4df] bg-[#eef7f5] p-5 space-y-2 text-xs text-[#2e5d62]">
                    <p className="font-bold text-sm text-[#1d6971] flex items-center gap-1.5">
                      <Info className="h-4 w-4" /> How to Submit This RTI Request
                    </p>
                    <p>
                      1. Visit the central RTI portal: <a href="https://rtionline.gov.in" target="_blank" rel="noreferrer" className="underline font-semibold text-[#1d6971]">rtionline.gov.in</a> (or the relevant State RTI Online portal).
                    </p>
                    <p>2. Select the Public Authority (e.g. Ministry of Home Affairs / Delhi Police / State Police / Public Sector Bank).</p>
                    <p>3. Copy & paste the text generated above into the text box and remit the prescribed fee of ₹10.</p>
                    <p>4. Public authorities are bound under Section 7(1) to furnish information within 30 calendar days.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
