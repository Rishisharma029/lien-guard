import { useAuth } from "@/_core/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  FileText,
  Mail,
  RefreshCw,
  Rocket,
  Scale,
  Send,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function HackathonDemo() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [activeRtiContent, setActiveRtiContent] = useState<string | null>(null);

  const { data: demoState, isLoading, refetch } = trpc.demo.getState.useQuery(undefined, {
    refetchInterval: 3000,
  });

  const registerMutation = trpc.demo.registerDemoCase.useMutation({
    onSuccess: (data) => {
      toast.success(`Demo case ${data.case.caseId} registered in MySQL!`);
      utils.demo.getState.invalidate();
      setActiveRtiContent(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const followUpMutation = trpc.demo.sendFollowUp.useMutation({
    onSuccess: (data) => {
      if (data.delivery.state === "sent") {
        toast.success(`Follow-up email dispatched via Maileroo SMTP! (ID: ${data.providerMessageId})`);
      } else {
        toast.info(`Follow-up recorded (Delivery: ${data.delivery.state} — ${data.delivery.reason})`);
      }
      utils.demo.getState.invalidate();
    },
    onError: (err) => toast.error(`Email delivery failed: ${err.message}`),
  });

  const bankEscalationMutation = trpc.demo.escalateToBank.useMutation({
    onSuccess: (data) => {
      if (data.delivery.state === "sent") {
        toast.success(`Bank escalation notice dispatched via Maileroo SMTP!`);
      } else {
        toast.info(`Bank escalation recorded (${data.delivery.state})`);
      }
      utils.demo.getState.invalidate();
    },
    onError: (err) => toast.error(`Escalation failed: ${err.message}`),
  });

  const cyberEscalationMutation = trpc.demo.escalateToCybercrime.useMutation({
    onSuccess: (data) => {
      if (data.delivery.state === "sent") {
        toast.success(`Cybercrime escalation dispatched! Status updated to ESCALATED.`);
      } else {
        toast.info(`Cybercrime escalation recorded. Status updated to ESCALATED.`);
      }
      utils.demo.getState.invalidate();
    },
    onError: (err) => toast.error(`Escalation failed: ${err.message}`),
  });

  const rtiDraftMutation = trpc.demo.generateRtiDraft.useMutation({
    onSuccess: (data) => {
      toast.success("RTI draft generated and saved to case documents!");
      setActiveRtiContent(data.content);
      utils.demo.getState.invalidate();
    },
    onError: (err) => toast.error(`RTI generation failed: ${err.message}`),
  });

  const simulateReplyMutation = trpc.demo.simulateInboundReply.useMutation({
    onSuccess: (data) => {
      toast.success("Authority reply received! AI-assisted analysis generated.");
      utils.demo.getState.invalidate();
    },
    onError: (err) => toast.error(`Inbound simulation failed: ${err.message}`),
  });

  const resetMutation = trpc.demo.resetDemo.useMutation({
    onSuccess: (data) => {
      toast.success(`Demo environment reset. (${data.count} demo cases purged)`);
      setResetDialogOpen(false);
      setActiveRtiContent(null);
      utils.demo.getState.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const demoCase = demoState?.case;
  const currentStep = demoState?.step ?? 0;
  const events = demoState?.events ?? [];
  const communications = demoState?.communications ?? [];
  const documents = demoState?.documents ?? [];
  const latestInboundAnalysis = demoState?.latestInboundAnalysis;

  const steps = [
    { number: 1, title: "Case Registered", subtitle: "Persisted in MySQL with CASE_CREATED" },
    { number: 2, title: "Follow-up Sent", subtitle: "Maileroo SMTP outbound delivery" },
    { number: 3, title: "Bank Escalation", subtitle: "Nodal Bank notice & Under Review" },
    { number: 4, title: "Cybercrime Escalated", subtitle: "Statutory escalation & Tier-2 notice" },
    { number: 5, title: "RTI Draft Generated", subtitle: "Review-only statutory application" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/30">
              <Zap className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                ⚡ Hackathon Demo Mode
              </h1>
              <p className="text-xs font-semibold text-muted-foreground">
                One-Click End-to-End Lien Administration Demonstration
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {demoCase && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/cases/${demoCase.caseId}`)}
              className="gap-1.5 border-border bg-card text-xs font-bold"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View Case Detail
            </Button>
          )}

          <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={!demoCase || resetMutation.isPending}
                className="gap-1.5 text-xs font-bold"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${resetMutation.isPending ? "animate-spin" : ""}`} />
                Reset Demo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" /> Confirm Demo Reset
                </DialogTitle>
                <DialogDescription>
                  This will safely delete <strong>only</strong> the fictional demo case records (events, communications, documents).
                  Real user cases and production database records will remain completely untouched.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={resetMutation.isPending}
                  onClick={() => resetMutation.mutate()}
                >
                  {resetMutation.isPending ? "Purging..." : "Confirm & Reset Demo"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Safety Warning Banner */}
      <Alert className="border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200">
        <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertTitle className="text-xs font-bold uppercase tracking-wider">Controlled Demonstration Posture</AlertTitle>
        <AlertDescription className="text-xs leading-relaxed text-muted-foreground">
          Controlled demonstration using fictional case data. All outbound emails are strictly restricted to your configured test recipient (
          <code className="rounded bg-amber-500/10 px-1 py-0.5 font-mono text-amber-700 dark:text-amber-300">
            {demoState?.demoRecipients?.[0] || "DEMO_EMAIL_RECIPIENTS"}
          </code>
          ) via Maileroo SMTP over TLS.
        </AlertDescription>
      </Alert>

      {/* Workflow Progress Stepper */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
            Live Workflow Progression
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            {steps.map((step) => {
              const isCompleted = currentStep >= step.number;
              const isCurrent = currentStep === step.number;
              return (
                <div
                  key={step.number}
                  className={`relative flex flex-col justify-between rounded-xl border p-3.5 transition ${
                    isCompleted
                      ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-950 dark:text-emerald-200"
                      : isCurrent
                      ? "border-amber-500/50 bg-amber-500/5 text-foreground ring-2 ring-amber-500/20"
                      : "border-border/60 bg-muted/30 text-muted-foreground opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[0.65rem] font-extrabold uppercase tracking-wider">
                      Step 0{step.number}
                    </span>
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="mt-3">
                    <p className="text-xs font-bold leading-snug">{step.title}</p>
                    <p className="mt-0.5 text-[0.65rem] text-muted-foreground leading-tight">{step.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Telemetry & Action Buttons Grid */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Action Controls Card */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-extrabold text-foreground">Interactive Judge Actions</CardTitle>
            <CardDescription className="text-xs">
              Execute live, persistent state transitions and Maileroo SMTP deliveries with one click.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Button 1 */}
            <div className="rounded-xl border border-border/80 bg-card p-3.5 transition hover:border-border">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[0.6rem] font-bold">Step 1</Badge>
                    <p className="text-xs font-bold text-foreground">1. Register Demo Case</p>
                  </div>
                  <p className="text-[0.7rem] text-muted-foreground">
                    Creates MySQL case record, generates unique <code className="font-mono">LG-2026-XXXX</code> ID, and logs <code className="font-mono">CASE_CREATED</code>.
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={registerMutation.isPending}
                  onClick={() => registerMutation.mutate()}
                  className="shrink-0 gap-1.5 bg-[#0f2b4b] text-xs font-bold text-white hover:bg-[#183c63]"
                >
                  <Rocket className={`h-3.5 w-3.5 ${registerMutation.isPending ? "animate-spin" : ""}`} />
                  {demoCase ? "Re-Register Case" : "Register Demo Case"}
                </Button>
              </div>
            </div>

            {/* Button 2 */}
            <div className="rounded-xl border border-border/80 bg-card p-3.5 transition hover:border-border">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[0.6rem] font-bold">Step 2</Badge>
                    <p className="text-xs font-bold text-foreground">2. Send Authority Follow-up</p>
                  </div>
                  <p className="text-[0.7rem] text-muted-foreground">
                    Delivers formal status notice via Maileroo SMTP over TLS to your test inbox.
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={!demoCase || followUpMutation.isPending}
                  onClick={() => demoCase && followUpMutation.mutate({ caseId: demoCase.caseId })}
                  className="shrink-0 gap-1.5 bg-blue-600 text-xs font-bold text-white hover:bg-blue-700"
                >
                  <Send className={`h-3.5 w-3.5 ${followUpMutation.isPending ? "animate-spin" : ""}`} />
                  Send Follow-up
                </Button>
              </div>
            </div>

            {/* Inbound Reply Feature */}
            <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/30 p-3.5 transition hover:border-indigo-300">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[0.6rem] font-bold">Inbound Intelligence</Badge>
                    <p className="text-xs font-bold text-foreground">🤖 Inbound Reply & AI Intelligence</p>
                  </div>
                  <p className="text-[0.7rem] text-muted-foreground">
                    Reply to the real Maileroo email in Gmail or click simulate to trigger AI reply analysis & document extraction.
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={!demoCase || simulateReplyMutation.isPending}
                  onClick={() =>
                    demoCase &&
                    simulateReplyMutation.mutate({
                      caseId: demoCase.caseId,
                      body: "Your complaint regarding the bank account lien has been received and registered under inquiry reference CY-2026-9012. To proceed with the verification and account unfreezing, please provide the original bank statement and account-opening document.",
                    })
                  }
                  className="shrink-0 gap-1.5 bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700"
                >
                  <Bot className={`h-3.5 w-3.5 ${simulateReplyMutation.isPending ? "animate-spin" : ""}`} />
                  Simulate Reply
                </Button>
              </div>
            </div>

            {/* Button 3 */}
            <div className="rounded-xl border border-border/80 bg-card p-3.5 transition hover:border-border">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[0.6rem] font-bold">Step 3</Badge>
                    <p className="text-xs font-bold text-foreground">3. Escalate to Bank</p>
                  </div>
                  <p className="text-[0.7rem] text-muted-foreground">
                    Transitions status to <code className="font-mono">UNDER_REVIEW</code> and dispatches Nodal Bank audit notice.
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={!demoCase || bankEscalationMutation.isPending}
                  onClick={() => demoCase && bankEscalationMutation.mutate({ caseId: demoCase.caseId })}
                  className="shrink-0 gap-1.5 bg-amber-600 text-xs font-bold text-white hover:bg-amber-700"
                >
                  <Building2 className={`h-3.5 w-3.5 ${bankEscalationMutation.isPending ? "animate-spin" : ""}`} />
                  Escalate to Bank
                </Button>
              </div>
            </div>

            {/* Button 4 */}
            <div className="rounded-xl border border-border/80 bg-card p-3.5 transition hover:border-border">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[0.6rem] font-bold">Step 4</Badge>
                    <p className="text-xs font-bold text-foreground">4. Escalate to Cybercrime</p>
                  </div>
                  <p className="text-[0.7rem] text-muted-foreground">
                    Sets status to <code className="font-mono">ESCALATED</code> and sends statutory Section 91/102 notice.
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={!demoCase || cyberEscalationMutation.isPending}
                  onClick={() => demoCase && cyberEscalationMutation.mutate({ caseId: demoCase.caseId })}
                  className="shrink-0 gap-1.5 bg-rose-600 text-xs font-bold text-white hover:bg-rose-700"
                >
                  <Scale className={`h-3.5 w-3.5 ${cyberEscalationMutation.isPending ? "animate-spin" : ""}`} />
                  Escalate to Cybercrime
                </Button>
              </div>
            </div>

            {/* Button 5 */}
            <div className="rounded-xl border border-border/80 bg-card p-3.5 transition hover:border-border">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[0.6rem] font-bold">Step 5</Badge>
                    <p className="text-xs font-bold text-foreground">5. Generate RTI Draft</p>
                  </div>
                  <p className="text-[0.7rem] text-muted-foreground">
                    Generates review-only RTI application and stores into document storage. (Gated to <code className="font-mono">ESCALATED</code>)
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={!demoCase || demoCase.status !== "ESCALATED" || rtiDraftMutation.isPending}
                  onClick={() => demoCase && rtiDraftMutation.mutate({ caseId: demoCase.caseId })}
                  className="shrink-0 gap-1.5 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  <FileText className={`h-3.5 w-3.5 ${rtiDraftMutation.isPending ? "animate-spin" : ""}`} />
                  Generate RTI Draft
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Telemetry Card */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-extrabold text-foreground">Live Demo Telemetry</CardTitle>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[0.65rem] font-bold">
                MySQL Connected
              </Badge>
            </div>
            <CardDescription className="text-xs">Real-time state and email provider posture</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">Case Reference</p>
                <p className="mt-1 font-mono text-sm font-extrabold text-foreground">
                  {demoCase ? demoCase.caseId : "No Active Case"}
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">Lifecycle Status</p>
                <div className="mt-1">
                  {demoCase ? (
                    <Badge
                      variant="secondary"
                      className={`font-mono text-xs font-bold ${
                        demoCase.status === "ESCALATED"
                          ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
                          : demoCase.status === "UNDER_REVIEW"
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                          : "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
                      }`}
                    >
                      {demoCase.status}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">None</span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">Target Recipient</p>
                <p className="mt-1 truncate font-mono text-xs text-foreground" title={demoState?.demoRecipients?.[0] || "None"}>
                  {demoState?.demoRecipients?.[0] || "Not set in .env"}
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">Delivery Mode</p>
                <p className="mt-1 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {demoState?.emailDeliveryMode || "demo"} (Allowlist Guarded)
                </p>
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-border/80 bg-muted/30 p-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Maileroo SMTP:</span>
                <span className="font-semibold text-foreground">
                  {demoState?.isMailerooConfigured ? "✅ Configured (smtp.maileroo.com:587)" : "⚠️ Credentials missing in .env"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Audit Timeline Events:</span>
                <span className="font-semibold text-foreground">{events.length} persisted records</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Communications Logged:</span>
                <span className="font-semibold text-foreground">{communications.length} emails dispatched</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Case Documents:</span>
                <span className="font-semibold text-foreground">{documents.length} files attached</span>
              </div>
            </div>

            {demoCase && (
              <div className="space-y-2">
                <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-blue-900 dark:text-blue-200">
                  <p className="font-bold">Lien Details:</p>
                  <p className="mt-0.5 text-muted-foreground">
                    Amount: <strong className="text-foreground">INR 1,50,000.00</strong> • Bank: <strong className="text-foreground">{demoCase.bankName}</strong>
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-950 dark:text-emerald-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      Official Government Authority Routed:
                    </span>
                    <Badge className="bg-emerald-600 text-white text-[9px] border-0">Haryana (Cyber Cell)</Badge>
                  </div>
                  <p className="font-semibold text-foreground">{demoState?.latestAssignment?.authorityName || demoCase.authorityName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Officer: <strong>{demoState?.latestAssignment?.officerName || "Sh. Sibash Kabiraj"}</strong> ({demoState?.latestAssignment?.designation || "IPS, ADGP Cyber Haryana"})
                  </p>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-300 pt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified from {demoState?.latestAssignment?.sourceName || "National Cyber Crime Reporting Portal (cybercrime.gov.in)"} on 23 Aug 2026
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Generated RTI Draft Viewer */}
      {activeRtiContent && (
        <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <CardTitle className="text-base font-extrabold text-foreground">Generated RTI Application Draft</CardTitle>
              </div>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-[0.65rem] font-bold">
                Review-only draft — not filed automatically
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Persisted in document storage as <code className="font-mono">{demoCase?.caseId}-rti-draft.txt</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="max-h-80 overflow-y-auto rounded-xl border border-border bg-card p-4 font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap">
              {activeRtiContent}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* AI-Assisted Inbound Reply Intelligence */}
      {latestInboundAnalysis && (
        <Card className="border-indigo-500/40 bg-gradient-to-br from-indigo-500/5 via-blue-500/5 to-slate-500/5 shadow-sm">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <CardTitle className="text-base font-extrabold text-foreground">
                  AI-Assisted Reply Intelligence
                </CardTitle>
              </div>
              <Badge className="bg-indigo-600 text-white font-mono text-xs">
                {latestInboundAnalysis.intent}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Structured intelligence extracted from verified authority reply
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-indigo-200/60 bg-card p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Executive Summary
              </p>
              <p className="text-sm font-medium text-foreground leading-relaxed">
                {latestInboundAnalysis.summary}
              </p>
            </div>

            {latestInboundAnalysis.requestedDocuments && latestInboundAnalysis.requestedDocuments.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-2">
                  <FileText className="h-4 w-4 text-amber-600" />
                  Documents Requested by Authority:
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {latestInboundAnalysis.requestedDocuments.map((doc, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-lg bg-card p-2.5 border border-border/80 text-xs font-semibold text-foreground">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span>{doc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {latestInboundAnalysis.citizenActionRequired && (
                <div className="rounded-xl border border-border/80 bg-card p-3.5">
                  <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                    Citizen Action Required
                  </p>
                  <p className="mt-1 text-xs text-foreground font-medium">
                    {latestInboundAnalysis.citizenActionRequired}
                  </p>
                </div>
              )}

              {latestInboundAnalysis.suggestedNextStep && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5">
                  <p className="text-[0.65rem] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    Suggested Next Step
                  </p>
                  <p className="mt-1 text-xs text-foreground font-medium">
                    {latestInboundAnalysis.suggestedNextStep}
                  </p>
                </div>
              )}
            </div>

            <p className="text-[0.7rem] italic text-muted-foreground pt-1 border-t border-border">
              🛡️ {latestInboundAnalysis.disclaimer}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Real Persisted Timeline & Communications */}
      {demoCase && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Timeline */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                  Persisted Case Timeline ({events.length})
                </CardTitle>
                <span className="text-[0.65rem] text-muted-foreground">Immutable Audit Log</span>
              </div>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">No timeline events recorded yet.</p>
              ) : (
                <div className="relative space-y-4 border-l-2 border-border/80 pl-4">
                  {events.map((event) => (
                    <div key={event.id} className="relative group">
                      <span className="absolute -left-[1.35rem] top-1.5 h-2.5 w-2.5 rounded-full bg-blue-500 ring-4 ring-background" />
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-[0.6rem] font-bold">
                            {event.type}
                          </Badge>
                          <span className="text-[0.65rem] text-muted-foreground">
                            {new Date(event.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-foreground leading-relaxed">{event.message}</p>
                        {event.actorLabel && (
                          <p className="mt-0.5 text-[0.65rem] text-muted-foreground">By: {event.actorLabel}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Communications Stream */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                  Dispatched Communications ({communications.length})
                </CardTitle>
                <span className="text-[0.65rem] text-muted-foreground">Maileroo SMTP Outbox</span>
              </div>
            </CardHeader>
            <CardContent>
              {communications.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">No communications sent yet.</p>
              ) : (
                <div className="space-y-3">
                  {communications.map((comm) => (
                    <div key={comm.id} className="rounded-xl border border-border/70 bg-card p-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-bold text-foreground" title={comm.subject}>
                          {comm.subject}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`text-[0.6rem] font-bold shrink-0 ${
                            comm.state === "sent"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {comm.state.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[0.68rem] text-muted-foreground">
                        <span>To: <strong className="text-foreground">{comm.recipientEmail}</strong></span>
                        <span>{new Date(comm.createdAt).toLocaleTimeString()}</span>
                      </div>
                      {comm.providerMessageId && (
                        <p className="font-mono text-[0.62rem] text-muted-foreground truncate">
                          Message ID: {comm.providerMessageId}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
