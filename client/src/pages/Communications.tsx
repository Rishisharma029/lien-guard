import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  FileCheck,
  FileText,
  HelpCircle,
  Mail,
  MessageSquareText,
  Send,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const stamp = (date: Date | string) =>
  new Date(date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

function getIntentBadge(intent: string) {
  switch (intent) {
    case "REQUESTING_DOCUMENTS":
      return <Badge className="bg-amber-100 text-amber-800 border-amber-300">📄 Requesting Documents</Badge>;
    case "RESOLVED":
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">✅ Lien Resolved</Badge>;
    case "REJECTED":
      return <Badge className="bg-rose-100 text-rose-800 border-rose-300">❌ Request Rejected</Badge>;
    case "ACKNOWLEDGED":
      return <Badge className="bg-blue-100 text-blue-800 border-blue-300">✓ Acknowledged</Badge>;
    case "NEEDS_CLARIFICATION":
      return <Badge className="bg-purple-100 text-purple-800 border-purple-300">❓ Clarification Needed</Badge>;
    default:
      return <Badge variant="outline">ℹ️ Under Review</Badge>;
  }
}

function InboundIntelligenceCard({ communicationId }: { communicationId: number }) {
  const { data: analysis, isLoading } = trpc.communications.getReplyAnalysis.useQuery(
    { communicationId },
    { staleTime: 300_000 }
  );

  if (isLoading) {
    return (
      <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-indigo-700 flex items-center gap-2">
        <Sparkles className="h-4 w-4 animate-spin text-indigo-600" />
        Analyzing reply intelligence...
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="mt-3 rounded-xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 via-blue-50/40 to-slate-50 p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-2">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-indigo-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
            AI-Assisted Reply Analysis
          </span>
        </div>
        {getIntentBadge(analysis.intent)}
      </div>

      <p className="text-sm font-medium text-slate-800 leading-relaxed">
        {analysis.summary}
      </p>

      {analysis.requestedDocuments && analysis.requestedDocuments.length > 0 && (
        <div className="rounded-lg bg-white/80 p-3 border border-amber-200/60">
          <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-1.5">
            <FileText className="h-3.5 w-3.5 text-amber-700" />
            Documents Requested by Authority:
          </p>
          <ul className="space-y-1">
            {analysis.requestedDocuments.map((doc, idx) => (
              <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                <span className="text-amber-600 font-bold">•</span>
                <span>{doc}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.citizenActionRequired && (
        <div className="rounded-lg bg-white/80 p-2.5 border border-indigo-100 text-xs text-slate-700">
          <span className="font-bold text-indigo-950">Action Required: </span>
          {analysis.citizenActionRequired}
        </div>
      )}

      {analysis.suggestedNextStep && (
        <div className="rounded-lg bg-emerald-50/80 p-2.5 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Suggested Next Step: </span>
            {analysis.suggestedNextStep}
          </div>
        </div>
      )}

      <p className="text-[0.65rem] italic text-slate-500 pt-1 border-t border-indigo-100/60">
        🛡️ {analysis.disclaimer}
      </p>
    </div>
  );
}

export default function Communications() {
  const utils = trpc.useUtils();
  const { data: cases = [] } = trpc.cases.list.useQuery();
  const [caseId, setCaseId] = useState("");
  const [tab, setTab] = useState<"note" | "email">("email");

  // Email form state
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  // Note form state
  const [note, setNote] = useState("");

  const selected = cases.find((item) => item.caseId === caseId);
  const history = trpc.communications.list.useQuery(
    { caseId },
    { enabled: Boolean(caseId) }
  );

  const followUp = trpc.communications.recordFollowUp.useMutation({
    onSuccess: () => {
      utils.communications.list.invalidate({ caseId });
      setNote("");
      toast.success("Follow-up note recorded in this case.");
    },
    onError: (error) => toast.error(error.message),
  });

  const sendEmail = trpc.communications.sendToAuthority.useMutation({
    onSuccess: (res) => {
      utils.communications.list.invalidate({ caseId });
      setEmailSubject("");
      setEmailBody("");
      if (res.delivery?.state === "sent") {
        toast.success(`Formal email delivered to ${selected?.authorityEmail || "authority"}`);
      } else {
        toast.info(`Email recorded with delivery status: ${res.delivery?.state || "queued"}`);
      }
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          ⚖️ Compliance-Aware Workflow
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
          Inbound Email Intelligence & Case Communications
        </h1>
        <p className="mt-2 text-sm text-slate-600 max-w-3xl leading-relaxed">
          Maintain a complete, immutable communication trail for every statutory lien case. Outbound
          emails sent via Maileroo SMTP include unique case references, and verified inbound replies
          are automatically analyzed with AI to extract requested documents and recommend next actions.
        </p>
      </section>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6">
          <div className="max-w-lg space-y-2">
            <Label className="text-sm font-semibold text-slate-800">Select Case Record</Label>
            <Select value={caseId} onValueChange={setCaseId}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Choose a case to view thread & reply intelligence" />
              </SelectTrigger>
              <SelectContent>
                {cases.map((item) => (
                  <SelectItem key={item.caseId} value={item.caseId}>
                    <span className="font-mono font-semibold">{item.caseId}</span> — {item.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selected ? (
            <div className="mt-7 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
              {/* Left Column: Conversation Thread */}
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <Mail className="h-5 w-5 text-indigo-600" />
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">
                        Case Conversation & Correspondence
                      </p>
                      <p className="text-xs font-mono text-slate-500">{selected.caseId}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs bg-slate-50">
                    {history.data?.length || 0} messages
                  </Badge>
                </div>

                <div className="mt-4 space-y-4 max-h-[650px] overflow-y-auto pr-1">
                  {history.isLoading ? (
                    <div className="p-8 text-center text-sm text-slate-500">
                      Loading communications...
                    </div>
                  ) : history.data?.length ? (
                    history.data.map((entry) => {
                      const isInbound = entry.direction === "inbound" || entry.state === "received";

                      return (
                        <div
                          key={entry.id}
                          className={`rounded-xl border p-4 shadow-sm transition-all ${
                            isInbound
                              ? "border-emerald-200/80 bg-emerald-50/20"
                              : "border-slate-200 bg-white"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5 mb-2.5">
                            <div className="flex items-center gap-2">
                              {isInbound ? (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                                  <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />
                                  <span>Inbound Authority Reply</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                                  <ArrowUpRight className="h-3.5 w-3.5 text-blue-600" />
                                  <span>Outbound Follow-up</span>
                                </div>
                              )}
                              <span className="text-xs font-bold text-slate-800">
                                {entry.subject}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {isInbound && (
                                <span className="inline-flex items-center gap-1 text-[0.65rem] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                                  Verified ✓
                                </span>
                              )}
                              <span className="text-[0.7rem] text-slate-500">
                                {stamp(entry.createdAt)}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs font-mono text-slate-600 mb-2">
                            {isInbound ? "From" : "To"}: {entry.recipientEmail || entry.counterparty || "Recorded Contact"}
                          </p>

                          <div className="text-sm leading-relaxed text-slate-800 bg-white/70 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap">
                            {entry.body}
                          </div>

                          {/* AI Reply Intelligence Drawer for Inbound Messages */}
                          {isInbound && <InboundIntelligenceCard communicationId={entry.id} />}
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                      <MessageSquareText className="mx-auto h-8 w-8 text-slate-400" />
                      <p className="mt-3 text-sm font-semibold text-slate-700">
                        No correspondence recorded yet for this case.
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Send a formal notice or record an internal follow-up using the panel on the right.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Dispatch or Internal Note */}
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
                  <div className="flex gap-2 border-b border-slate-200 pb-3 mb-4">
                    <Button
                      variant={tab === "email" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTab("email")}
                      className="text-xs"
                    >
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      Send Maileroo Email
                    </Button>
                    <Button
                      variant={tab === "note" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTab("note")}
                      className="text-xs"
                    >
                      <FileCheck className="mr-1.5 h-3.5 w-3.5" />
                      Internal Note
                    </Button>
                  </div>

                  {tab === "email" ? (
                    <div className="space-y-3.5">
                      <div>
                        <Label className="text-xs font-semibold text-slate-700">
                          Target Recipient
                        </Label>
                        <p className="mt-1 text-xs font-mono text-slate-600 bg-white p-2 rounded border border-slate-200">
                          {selected.authorityEmail || "No authority email set"}
                        </p>
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-slate-700">Subject</Label>
                        <Input
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          placeholder={`[${selected.caseId}] Formal Inquiry regarding Lien Hold`}
                          className="mt-1 bg-white text-xs"
                        />
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-slate-700">
                          Notice Body
                        </Label>
                        <Textarea
                          value={emailBody}
                          onChange={(e) => setEmailBody(e.target.value)}
                          placeholder="State the statutory inquiry, transaction reference, and requested clarification..."
                          className="mt-1 min-h-[140px] bg-white text-xs leading-relaxed"
                        />
                      </div>

                      <Button
                        disabled={sendEmail.isPending || !emailSubject.trim() || !emailBody.trim()}
                        onClick={() =>
                          sendEmail.mutate({
                            caseId: selected.caseId,
                            subject: emailSubject,
                            body: emailBody,
                          })
                        }
                        className="w-full bg-indigo-900 hover:bg-indigo-800 text-xs font-bold"
                      >
                        <Send className="mr-2 h-4 w-4" />
                        {sendEmail.isPending ? "Dispatching via Maileroo..." : "Dispatch Formal Notice"}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Internal notes are appended to the immutable case history without sending an
                        external email.
                      </p>

                      <Textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        maxLength={1200}
                        placeholder="Log follow-up details, phone conversation notes, or branch visit outcome..."
                        className="min-h-[140px] bg-white text-xs leading-relaxed"
                      />

                      <Button
                        disabled={followUp.isPending || !note.trim()}
                        onClick={() =>
                          followUp.mutate({ caseId: selected.caseId, note: note || undefined })
                        }
                        className="w-full bg-slate-800 hover:bg-slate-900 text-xs font-bold"
                      >
                        <FileCheck className="mr-2 h-4 w-4" />
                        {followUp.isPending ? "Recording Note..." : "Save Internal Follow-up"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center">
              <MessageSquareText className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-4 text-sm font-semibold text-slate-700">
                Select a case record above to view its communication thread and AI reply intelligence.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
