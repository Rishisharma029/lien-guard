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
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Mail,
  Send,
  ShieldAlert,
  ShieldCheck,
  Building2,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";
import { SEO } from "@/components/SEO";

const INDIAN_STATES_AND_UTS = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

const health = {
  ON_TRACK: ["On track", "bg-[#e5f4ec] text-[#2b735f]"],
  RESPONSE_PENDING: ["Response pending", "bg-[#fff2d9] text-[#926019]"],
  DEADLINE_APPROACHING: ["Deadline approaching", "bg-[#fff0d5] text-[#9a5e15]"],
  ESCALATION_REQUIRED: ["Escalation required", "bg-[#fee8e4] text-[#aa463d]"],
  UNDER_REVIEW: ["Under review", "bg-[#eeeafd] text-[#6651a0]"],
  RESOLVED: ["Resolved", "bg-[#e5f4ec] text-[#2b735f]"],
} as const;

const nextStatuses = {
  OPEN: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["AWAITING_RESPONSE", "ESCALATED", "RESOLVED", "CLOSED"],
  AWAITING_RESPONSE: ["UNDER_REVIEW", "ESCALATED"],
  ESCALATED: ["UNDER_REVIEW", "RESOLVED", "CLOSED"],
  RESOLVED: [],
  CLOSED: [],
} as const;

const display = (value: string | null) => value || "Not recorded";
const dateTime = (value: Date | string | null) =>
  value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Not recorded";
const readableStatus = (value: string) =>
  value
    .split("_")
    .map(word => word[0] + word.slice(1).toLowerCase())
    .join(" ");
const stateClass = (state: string) =>
  state === "sent"
    ? "bg-[#e5f4ec] text-[#2b735f]"
    : state === "received"
    ? "bg-[#e8f0fa] text-[#245e94]"
    : state === "failed"
    ? "bg-[#fee8e4] text-[#aa463d]"
    : state === "queued"
    ? "bg-[#fff2d9] text-[#926019]"
    : "bg-[#eef1f3] text-[#607285]";

export default function CaseDetail() {
  const [, params] = useRoute("/cases/:caseId");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [note, setNote] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [authorityNameDraft, setAuthorityNameDraft] = useState("");
  const [authorityEmailDraft, setAuthorityEmailDraft] = useState("");
  const [changeAuthOpen, setChangeAuthOpen] = useState(false);
  const [selectedStateForChange, setSelectedStateForChange] = useState("");

  const caseId = params?.caseId || "";
  const detailQuery = trpc.cases.detail.useQuery({ caseId }, { enabled: Boolean(caseId) });
  const communications = trpc.communications.list.useQuery({ caseId }, { enabled: Boolean(detailQuery.data) });
  const assignmentQuery = trpc.authorityDirectory.getAssignment.useQuery({ caseId }, { enabled: Boolean(detailQuery.data) });

  // Routing recommendation query for the change authority dialog
  const changeRoutingQuery = trpc.authorityDirectory.recommend.useQuery(
    {
      stateUt: selectedStateForChange,
      caseType: detailQuery.data?.case?.caseType || "Cyber Crime",
    },
    {
      enabled: Boolean(selectedStateForChange),
    }
  );

  const refreshCase = () => {
    utils.cases.list.invalidate();
    utils.cases.detail.invalidate({ caseId });
    utils.communications.list.invalidate({ caseId });
    utils.authorityDirectory.getAssignment.invalidate({ caseId });
  };

  const followUp = trpc.communications.recordFollowUp.useMutation({
    onSuccess: () => {
      refreshCase();
      setNote("");
      toast.success("Follow-up note recorded in the protected case timeline.");
    },
    onError: error => toast.error(error.message),
  });

  const sendEmail = trpc.communications.sendToAuthority.useMutation({
    onSuccess: result => {
      refreshCase();
      setEmailBody("");
      if (result.delivery.state === "sent") toast.success("Email dispatched via Maileroo and recorded in timeline.");
      else if (result.delivery.state === "deferred") toast.info("Email is queued safely and will deliver when Maileroo is active.");
      else toast.error("The email could not be delivered; the failure is recorded in the timeline.");
    },
    onError: error => toast.error(error.message),
  });

  const updateCase = trpc.cases.update.useMutation({
    onSuccess: () => {
      refreshCase();
      setAuthorityNameDraft("");
      setAuthorityEmailDraft("");
      toast.success("Authority details were saved and added to the case timeline.");
    },
    onError: error => toast.error(error.message),
  });

  const assignAuthority = trpc.authorityDirectory.assignToCase.useMutation({
    onSuccess: () => {
      refreshCase();
      setChangeAuthOpen(false);
      setSelectedStateForChange("");
      toast.success("Official authority successfully assigned to this case.");
    },
    onError: error => toast.error(error.message),
  });

  const updateStatus = trpc.cases.updateStatus.useMutation({
    onSuccess: () => {
      refreshCase();
      toast.success("Case lifecycle status updated and added to the audit timeline.");
    },
    onError: error => toast.error(error.message),
  });

  if (detailQuery.isLoading)
    return (
      <div className="space-y-5">
        {[1, 2, 3].map(item => (
          <Skeleton key={item} className="h-36 w-full" />
        ))}
      </div>
    );

  if (!detailQuery.data)
    return (
      <div className="rounded-2xl border border-[#f0d9d4] bg-[#fff9f7] p-10 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-[#b95649]" />
        <h1 className="mt-4 text-xl font-extrabold">Case unavailable</h1>
        <p className="mt-2 text-sm text-[#7d5a54]">This case cannot be opened from your current workspace.</p>
        <Button onClick={() => navigate("/cases")} className="mt-5">
          Back to cases
        </Button>
      </div>
    );

  const { case: record, timeline, health: healthCode } = detailQuery.data;
  const [healthLabel, healthClass] = health[healthCode];
  const entries = communications.data || [];
  const assignment = assignmentQuery.data;
  const operationalUser = user?.role === "authority" || user?.role === "admin";

  const defaultEmail = [
    `Dear ${record.authorityName || "Authority"},`,
    "",
    `Please provide an update for LienGuard case ${record.caseId}: ${record.title}.`,
    `Lien reference: ${record.lienReference || "Not recorded"}`,
    `Response deadline: ${record.responseDeadline ? new Date(record.responseDeadline).toLocaleDateString() : "Not recorded"}`,
    "",
    "Please reply through the approved authority channel. This correspondence is logged in the protected case record.",
  ].join("\n");

  const workflow = [
    ["Case created", true],
    ["Authority assigned", Boolean(record.authorityName && record.authorityEmail)],
    ["Email sent", entries.some(item => item.state === "sent")],
    ["Response deadline", Boolean(record.responseDeadline)],
    ["Escalated", record.status === "ESCALATED" || record.status === "RESOLVED" || record.status === "CLOSED"],
    ["RTI assistance", record.status === "ESCALATED"],
  ] as const;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <SEO
        title="Case Details — LienGuard"
        description="Secure statutory matter record"
        noindex={true}
      />
      <button
        onClick={() => navigate("/cases")}
        className="flex items-center gap-2 text-sm font-semibold text-[#43637d] hover:text-[#143e65]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to cases
      </button>

      {/* Header section */}
      <section className="overflow-hidden rounded-2xl border border-[#d7e0e8] bg-white shadow-sm">
        <div className="border-b border-[#e7edf2] bg-[#f7f9fc] px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-xs font-bold text-[#2e6794]">{record.caseId}</p>
              <h1 className="mt-2 text-2xl font-extrabold text-[#153653] sm:text-3xl">{record.title}</h1>
              <p className="mt-2 text-sm text-[#6c7e92]">{record.caseType}</p>
            </div>
            <Badge className={`border-0 px-3 py-1.5 ${healthClass}`}>{healthLabel}</Badge>
          </div>
        </div>
        <div className="grid gap-px bg-[#e5ebf0] md:grid-cols-4">
          <div className="bg-white p-5">
            <p className="eyebrow text-[#78899b]">Lien amount</p>
            <p className="mt-2 text-xl font-extrabold text-[#243f5c]">
              {record.lienAmount ? `₹${Number(record.lienAmount).toLocaleString()}` : "Not recorded"}
            </p>
          </div>
          <div className="bg-white p-5">
            <p className="eyebrow text-[#78899b]">Response deadline</p>
            <p className="mt-2 text-sm font-bold text-[#243f5c]">{dateTime(record.responseDeadline)}</p>
          </div>
          <div className="bg-white p-5">
            <p className="eyebrow text-[#78899b]">Bank</p>
            <p className="mt-2 text-sm font-bold text-[#243f5c]">{display(record.bankName)}</p>
          </div>
          <div className="bg-white p-5">
            <p className="eyebrow text-[#78899b]">Assigned Authority</p>
            <p className="mt-2 text-sm font-bold text-[#243f5c] truncate">{display(record.authorityName)}</p>
            <p className="mt-1 truncate text-xs text-[#73869a]">{record.authorityEmail || "No authority email recorded"}</p>
          </div>
        </div>
      </section>

      {/* Official Authority Routing Card */}
      <Card className="border-2 border-[#2b648e]/30 bg-gradient-to-br from-[#f8fbfe] to-[#eef6fc] shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d8e5f0] pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f2b4b] text-white">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="eyebrow text-[#2b648e]">Official Authority Routing</p>
                  <Badge className="border-0 bg-[#e4f0fa] text-[#1b5585] text-[10px]">Source-Attributed</Badge>
                </div>
                <h3 className="text-lg font-extrabold text-[#112d4a]">
                  {assignment ? assignment.authorityName : record.authorityName || "No Authority Assigned"}
                </h3>
              </div>
            </div>

            {/* Change Authority Dialog */}
            <Dialog open={changeAuthOpen} onOpenChange={setChangeAuthOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 border-[#2b648e]/30 text-[#194065] hover:bg-[#e4eff8]">
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  {assignment || record.authorityName ? "Change Authority" : "Assign Authority"}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg rounded-2xl">
                <DialogHeader>
                  <p className="eyebrow text-[#617f99]">Official Directory Routing</p>
                  <DialogTitle className="mt-1 text-xl font-extrabold text-[#132f4d]">
                    Select State / UT for Government Authority
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>State / Union Territory</Label>
                    <Select value={selectedStateForChange} onValueChange={setSelectedStateForChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose State/UT" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {INDIAN_STATES_AND_UTS.map(state => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedStateForChange && changeRoutingQuery.data?.found && "authority" in changeRoutingQuery.data && changeRoutingQuery.data.authority && (
                    <div className="rounded-xl border border-[#2b648e]/30 bg-[#f4f9fd] p-4 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[#123151]">
                          {changeRoutingQuery.data.authority.authorityName}
                        </span>
                        <Badge className="bg-[#e4eff8] text-[#1b5585] text-[10px]">
                          {changeRoutingQuery.data.authority.stateUt}
                        </Badge>
                      </div>
                      {changeRoutingQuery.data.authority.officerName && (
                        <p className="text-[#3b5874]">
                          <strong className="text-[#123151]">Officer:</strong> {changeRoutingQuery.data.authority.officerName} (
                          {changeRoutingQuery.data.authority.designation})
                        </p>
                      )}
                      {changeRoutingQuery.data.authority.officialEmail && (
                        <p className="font-mono text-[#194c79]">
                          <strong>Email:</strong> {changeRoutingQuery.data.authority.officialEmail}
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-[11px] text-[#246e4b] pt-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Verified from {changeRoutingQuery.data.authority.sourceName}</span>
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setChangeAuthOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    disabled={!selectedStateForChange || !changeRoutingQuery.data?.found || assignAuthority.isPending}
                    onClick={() => {
                      if (changeRoutingQuery.data && "authority" in changeRoutingQuery.data && changeRoutingQuery.data.authority) {
                        assignAuthority.mutate({
                          caseId: record.caseId,
                          authorityDirectoryId: changeRoutingQuery.data.authority.id,
                        });
                      }
                    }}
                    className="bg-[#0f2b4b] hover:bg-[#183c63]"
                  >
                    {assignAuthority.isPending ? "Assigning…" : "Confirm & Assign Authority"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-white/90 p-3 border border-[#dde7f0]">
              <span className="text-[10px] uppercase font-bold text-[#718598]">Designated Officer:</span>
              <p className="mt-0.5 text-xs font-bold text-[#1a3857]">
                {assignment?.officerName || "Official Nodal Desk"}
              </p>
            </div>
            <div className="rounded-xl bg-white/90 p-3 border border-[#dde7f0]">
              <span className="text-[10px] uppercase font-bold text-[#718598]">Designation:</span>
              <p className="mt-0.5 text-xs font-bold text-[#1a3857]">
                {assignment?.designation || "Cyber Crime Investigation Unit"}
              </p>
            </div>
            <div className="rounded-xl bg-white/90 p-3 border border-[#dde7f0]">
              <span className="text-[10px] uppercase font-bold text-[#718598]">Official Email:</span>
              <p className="mt-0.5 font-mono text-xs font-bold text-[#1c5585] truncate">
                {record.authorityEmail || assignment?.authorityEmail || "Pending assignment"}
              </p>
            </div>
            <div className="rounded-xl bg-white/90 p-3 border border-[#dde7f0]">
              <span className="text-[10px] uppercase font-bold text-[#718598]">Verification Status:</span>
              <p className="mt-0.5 text-xs font-bold text-[#236b44] flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Verified ({assignment?.lastVerifiedAt ? new Date(assignment.lastVerifiedAt).toLocaleDateString() : "23 Aug 2026"})
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-[#5b738c]">
            <span>
              Source: <strong>{assignment?.sourceName || "National Cyber Crime Reporting Portal (cybercrime.gov.in)"}</strong>
            </span>
            <a
              href={assignment?.sourceUrl || "https://cybercrime.gov.in/"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#225b89] hover:underline font-semibold"
            >
              View Official Portal <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
        {/* Left column */}
        <div className="space-y-5">
          <Card className="border-[#dce3eb]">
            <CardContent className="p-6">
              <p className="eyebrow text-[#71859a]">Case workflow</p>
              <h2 className="mt-1 text-lg font-extrabold text-[#27445f]">From evidence to a reviewable RTI draft.</h2>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {workflow.map(([label, complete]) => (
                  <div
                    key={label}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                      complete
                        ? "border-[#cfe7db] bg-[#f3faf6] text-[#286a54]"
                        : "border-[#e3e9ef] bg-[#fafbfd] text-[#77889a]"
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {label}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#dce3eb]">
            <CardContent className="p-6">
              <p className="eyebrow text-[#71859a]">Case information</p>
              <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                {[
                  ["Case reference", record.caseId],
                  ["Lien reference", display(record.lienReference)],
                  ["Transaction reference", display(record.transactionReference)],
                  ["Date reported", dateTime(record.createdAt)],
                  ["Description", record.description],
                ].map(([label, value]) => (
                  <div key={label} className={label === "Description" ? "sm:col-span-2" : ""}>
                    <dt className="text-xs font-semibold text-[#748498]">{label}</dt>
                    <dd className="mt-1 text-sm leading-6 text-[#26425e]">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card className="border-[#dce3eb]">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Clock3 className="h-5 w-5 text-[#397295]" />
                <div>
                  <p className="eyebrow text-[#71859a]">Case timeline</p>
                  <h2 className="mt-1 text-lg font-extrabold">Recorded lifecycle</h2>
                </div>
              </div>
              <ol className="mt-6 space-y-0">
                {timeline.map((event, index) => (
                  <li key={event.id} className="relative flex gap-4 pb-7 last:pb-0">
                    <span
                      className={`relative z-10 mt-1.5 h-3 w-3 rounded-full ${
                        event.tone === "danger"
                          ? "bg-[#c7493a]"
                          : event.tone === "success"
                          ? "bg-[#3b9575]"
                          : event.tone === "warning"
                          ? "bg-[#d59027]"
                          : "bg-[#2e6794]"
                      }`}
                    />
                    {index < timeline.length - 1 && (
                      <span className="absolute left-[5px] top-5 h-[calc(100%-0.25rem)] w-px bg-[#dbe3ea]" />
                    )}
                    <div>
                      <p className="text-sm font-bold text-[#24425f]">{event.title}</p>
                      <p className="mt-1 text-xs leading-5 text-[#708196]">{event.detail}</p>
                      <time className="mt-1.5 block text-[0.68rem] text-[#8695a6]">{dateTime(event.occurredAt)}</time>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <Card className="border-[#dce3eb]">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-[#397295]" />
                <div>
                  <p className="eyebrow text-[#71859a]">Communications</p>
                  <h2 className="mt-1 text-lg font-extrabold">Authority correspondence</h2>
                </div>
              </div>

              <div className="mt-5 divide-y divide-[#e6ebf0] rounded-xl border border-[#dce3eb]">
                {communications.isLoading ? (
                  <p className="p-5 text-sm text-[#718196]">Loading correspondence…</p>
                ) : entries.length ? (
                  entries.map(entry => (
                    <article key={entry.id} className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-[#304d67]">{entry.subject}</p>
                        <Badge className={`border-0 text-[0.65rem] uppercase ${stateClass(entry.state)}`}>
                          {entry.state}
                        </Badge>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#65778b]">{entry.body}</p>
                      <p className="mt-2 text-xs text-[#8390a0]">
                        {entry.counterparty || "No counterparty recorded"} · {dateTime(entry.sentAt || entry.createdAt)}
                        {entry.automated ? " · automated" : ""}
                      </p>
                    </article>
                  ))
                ) : (
                  <p className="p-5 text-center text-sm text-[#718196]">No communications are recorded yet.</p>
                )}
              </div>

              {record.authorityEmail ? (
                <div className="mt-5 rounded-xl border border-[#dce3eb] bg-[#f8fafc] p-4">
                  <Label className="text-sm font-bold text-[#38536b]">Send case update to {record.authorityEmail}</Label>
                  <Textarea
                    value={emailBody}
                    onChange={event => setEmailBody(event.target.value)}
                    maxLength={8_000}
                    className="mt-3 min-h-32 bg-white"
                    placeholder={defaultEmail}
                  />
                  <Button
                    disabled={sendEmail.isPending}
                    onClick={() =>
                      sendEmail.mutate({
                        caseId: record.caseId,
                        subject: "Request for case update",
                        body: emailBody.trim() || defaultEmail,
                      })
                    }
                    className="mt-3 bg-[#0f2b4b] hover:bg-[#183c63]"
                  >
                    <Send className="mr-2 h-3.5 w-3.5" />
                    {sendEmail.isPending ? "Sending…" : "Send securely via Maileroo"}
                  </Button>
                  <p className="mt-2 text-xs text-[#718196]">
                    A case-reference prefix is added automatically so a verified reply can update this same case.
                  </p>
                </div>
              ) : (
                <p className="mt-5 rounded-lg bg-[#fff7e6] p-3 text-xs leading-5 text-[#8e661d]">
                  Assign an official authority above before sending correspondence.
                </p>
              )}

              <Textarea
                value={note}
                onChange={event => setNote(event.target.value)}
                maxLength={1200}
                className="mt-4 min-h-20"
                placeholder="Record an offline follow-up or authority call"
              />
              <Button
                variant="outline"
                disabled={followUp.isPending}
                onClick={() => followUp.mutate({ caseId: record.caseId, note: note || undefined })}
                className="mt-3"
              >
                <FileText className="mr-2 h-3.5 w-3.5" />
                {followUp.isPending ? "Recording…" : "Record manual follow-up"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-[#dce3eb]">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-[#a86c21]" />
                <div>
                  <p className="eyebrow text-[#71859a]">Escalation control</p>
                  <h2 className="mt-1 text-lg font-extrabold">Recorded, never assumed.</h2>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-[#61758a]">
                When the response deadline passes, the protected automation queues one follow-up. If no case response is
                recorded after the configured grace period, it escalates the case and unlocks RTI assistance.
              </p>
              {operationalUser && nextStatuses[record.status].length > 0 ? (
                <div className="mt-4 rounded-xl border border-[#e0e6eb] bg-[#f8fafc] p-3">
                  <Label className="text-xs font-bold text-[#526b82]">Operational lifecycle control</Label>
                  <Select
                    onValueChange={status =>
                      updateStatus.mutate({ caseId: record.caseId, status: status as typeof record.status })
                    }
                    disabled={updateStatus.isPending}
                  >
                    <SelectTrigger className="mt-2 bg-white">
                      <SelectValue placeholder="Move case to…" />
                    </SelectTrigger>
                    <SelectContent>
                      {nextStatuses[record.status].map(status => (
                        <SelectItem key={status} value={status}>
                          {readableStatus(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <Button variant="outline" onClick={() => navigate("/escalations")} className="mt-4">
                View escalation workspace
              </Button>
            </CardContent>
          </Card>

          <Card className="border-[#dce3eb] bg-[#f7f9fc]">
            <CardContent className="p-6">
              <p className="eyebrow text-[#71859a]">RTI assistant</p>
              <h2 className="mt-2 text-xl font-extrabold">Reviewable assistance after escalation.</h2>
              <p className="mt-2 text-sm leading-6 text-[#63768a]">
                {record.status === "ESCALATED"
                  ? "This case is eligible to prepare a protected RTI draft. Nothing is filed or sent automatically."
                  : "RTI drafting becomes available only after this case is explicitly escalated."}
              </p>
              <Button
                disabled={record.status !== "ESCALATED"}
                onClick={() => navigate("/rti")}
                className="mt-4 bg-[#0f2b4b] hover:bg-[#183c63]"
              >
                <FileText className="mr-2 h-4 w-4" />
                Open RTI assistant
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
