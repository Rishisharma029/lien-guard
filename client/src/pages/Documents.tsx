import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Download, FileText, FolderOpen, Upload, WandSparkles } from "lucide-react";
import { ChangeEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { SEO } from "@/components/SEO";

const formatDate = (value: Date | string) => new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
const formatBytes = (value: number) => value < 1024 * 1024 ? `${Math.max(1, Math.ceil(value / 1024))} KB` : `${(value / (1024 * 1024)).toFixed(1)} MB`;

async function fileToBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunkSize = 32 * 1024;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(offset, offset + chunkSize)));
  }
  return btoa(binary);
}

export default function Documents() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const fileInput = useRef<HTMLInputElement>(null);
  const { data: cases = [], isLoading: casesLoading } = trpc.cases.list.useQuery();
  const [caseId, setCaseId] = useState("");
  const selected = cases.find(record => record.caseId === caseId);
  const documents = trpc.documents.list.useQuery({ caseId }, { enabled: Boolean(caseId) });
  const upload = trpc.documents.upload.useMutation({
    onSuccess: () => {
      utils.documents.list.invalidate({ caseId });
      utils.cases.detail.invalidate({ caseId });
      toast.success("Document added to the protected case record.");
    },
    onError: error => toast.error(error.message),
  });
  const download = trpc.documents.download.useMutation({
    onSuccess: result => {
      window.open(result.url, "_blank", "noopener,noreferrer");
    },
    onError: error => toast.error(error.message),
  });
  const canDraftRti = Boolean(selected && (selected.status === "ESCALATED" || (selected.status === "AWAITING_RESPONSE" && selected.responseDeadline && new Date(selected.responseDeadline) < new Date())));

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selected) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Choose a document no larger than 10 MB.");
      return;
    }
    const allowed = ["application/pdf", "image/jpeg", "image/png", "text/plain"];
    if (!allowed.includes(file.type)) {
      toast.error("Use a PDF, JPEG, PNG, or text document.");
      return;
    }
    try {
      upload.mutate({ caseId: selected.caseId, kind: "EVIDENCE", fileName: file.name, contentType: file.type, base64: await fileToBase64(file) });
    } catch {
      toast.error("The selected document could not be read.");
    }
  };

  return <div className="mx-auto max-w-5xl space-y-6"><SEO title="Protected Documents — LienGuard" description="Evidence and drafts" noindex={true} /><section><p className="eyebrow text-[#688096]">Documents</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#132f4d]">Evidence and drafts, tied to the case record.</h1><p className="mt-2 text-sm text-[#718196]">Upload supporting material, review the protected document register, and retrieve files only through your authorized case access.</p></section><Card className="border-[#dce3eb] shadow-sm"><CardContent className="p-6"><div className="max-w-xl space-y-2"><Label htmlFor="document-case">Case</Label><Select value={caseId} onValueChange={setCaseId}><SelectTrigger id="document-case"><SelectValue placeholder="Select a case" /></SelectTrigger><SelectContent>{cases.map(record => <SelectItem key={record.caseId} value={record.caseId}>{record.caseId} — {record.title}</SelectItem>)}</SelectContent></Select></div>{casesLoading ? <div className="mt-8 space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-20 w-full" /></div> : selected ? <div className="mt-7 space-y-5"><div className="grid gap-5 md:grid-cols-2"><section className="rounded-xl border border-[#dce3eb] p-5"><div className="flex items-center gap-3"><FolderOpen className="h-5 w-5 text-[#397295]" /><div><p className="text-sm font-extrabold text-[#2b4963]">Case record</p><p className="text-xs text-[#75879a]">{selected.caseId}</p></div></div><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-[#718196]">Lien reference</dt><dd className="font-semibold text-[#34516c]">{selected.lienReference || "Not recorded"}</dd></div><div className="flex justify-between gap-4"><dt className="text-[#718196]">Authority</dt><dd className="font-semibold text-[#34516c]">{selected.authorityName || "Not recorded"}</dd></div></dl></section><section className="rounded-xl bg-[#f5f8fb] p-5"><div className="flex items-center gap-3"><FileText className="h-5 w-5 text-[#397295]" /><div><p className="text-sm font-extrabold text-[#2b4963]">RTI draft</p><p className="text-xs text-[#75879a]">Prepared from case posture</p></div></div><p className="mt-5 text-sm leading-6 text-[#66798d]">{canDraftRti ? "This case is eligible for a reviewable RTI draft because of its recorded escalation or deadline state." : "An RTI draft becomes available when this case is escalated or an awaiting-response deadline has passed."}</p><Button disabled={!canDraftRti} onClick={() => navigate("/rti")} className="mt-5 bg-[#0f2b4b] hover:bg-[#183c63]"><WandSparkles className="mr-2 h-4 w-4" />Prepare RTI draft</Button></section></div><section className="rounded-xl border border-[#dce3eb]"><div className="flex flex-col justify-between gap-3 border-b border-[#e6ebf0] p-5 sm:flex-row sm:items-center"><div><p className="text-sm font-extrabold text-[#2b4963]">Protected documents</p><p className="mt-1 text-xs text-[#75879a]">PDF, JPEG, PNG, or text files up to 10 MB.</p></div><input ref={fileInput} className="hidden" type="file" accept="application/pdf,image/jpeg,image/png,text/plain,.pdf,.jpg,.jpeg,.png,.txt" onChange={handleFile} /><Button disabled={upload.isPending} onClick={() => fileInput.current?.click()} className="bg-[#0f2b4b] hover:bg-[#183c63]"><Upload className="mr-2 h-4 w-4" />{upload.isPending ? "Uploading…" : "Add document"}</Button></div>{documents.isLoading ? <div className="space-y-3 p-5"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div> : documents.isError ? <div className="p-6 text-sm text-[#9a4439]">The document register could not be loaded. <Button variant="link" className="h-auto p-0" onClick={() => documents.refetch()}>Try again</Button></div> : documents.data?.length ? <div className="divide-y divide-[#edf0f4]">{documents.data.map(document => <article key={document.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-bold text-[#304d67]">{document.fileName}</p><p className="mt-1 text-xs text-[#7b8b9c]">{document.kind.replace("_", " ")} · {formatBytes(document.sizeBytes)} · Added {formatDate(document.createdAt)}</p></div><Button variant="outline" size="sm" disabled={download.isPending} onClick={() => download.mutate({ caseId: selected.caseId, documentId: document.id })}><Download className="mr-2 h-3.5 w-3.5" />Open</Button></article>)}</div> : <div className="p-8 text-center text-sm text-[#718196]">No documents are recorded for this case yet.</div>}</section></div> : <div className="py-14 text-center"><FileText className="mx-auto h-8 w-8 text-[#7a9fa3]" /><p className="mt-4 text-sm font-semibold text-[#506b83]">{cases.length ? "Select a case to manage its protected documents." : "No case records yet."}</p></div>}</CardContent></Card></div>;
}
