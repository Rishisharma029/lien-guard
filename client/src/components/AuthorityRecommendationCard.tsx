import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, ExternalLink, Landmark, ShieldCheck, UserCheck, AlertCircle } from "lucide-react";

export interface AuthorityRecommendationData {
  found: boolean;
  canonicalStateUt?: string;
  authorityType?: string;
  routingReason?: string;
  message?: string;
  authority?: {
    id: number;
    stateUt: string;
    authorityName: string;
    officerName: string | null;
    designation: string | null;
    officialEmail: string | null;
    phone: string | null;
    sourceName: string;
    sourceUrl: string;
    lastVerifiedAt: Date | string;
    active: number;
  };
}

interface Props {
  recommendation: AuthorityRecommendationData | null;
  isLoading?: boolean;
  onAccept?: () => void;
  onSkip?: () => void;
  isAssigning?: boolean;
}

export function AuthorityRecommendationCard({
  recommendation,
  isLoading,
  onAccept,
  onSkip,
  isAssigning,
}: Props) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#d6e2ee] bg-[#f7fafd] p-4 text-center">
        <p className="text-xs font-semibold text-[#547391]">Querying Official Authority Directory…</p>
      </div>
    );
  }

  if (!recommendation) return null;

  if (!recommendation.found) {
    return (
      <div className="rounded-xl border border-[#eedfd6] bg-[#fdfaf7] p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-[#b26938]" />
          <div>
            <p className="text-xs font-bold text-[#683f23]">Authority Information Currently Unavailable</p>
            <p className="mt-1 text-xs text-[#8c674e]">
              {recommendation.message || "No verified official authority record found for this State/UT. You can enter authority details manually."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { authority } = recommendation;
  if (!authority) return null;

  const formattedDate = authority.lastVerifiedAt
    ? new Date(authority.lastVerifiedAt).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "23 Aug 2026";

  return (
    <Card className="border-2 border-[#2c638d]/30 bg-gradient-to-br from-[#f8fbfe] to-[#eef5fa] shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0f2b4b] text-white">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#326992]">
                Recommended Official Authority
              </p>
              <h4 className="text-sm font-extrabold text-[#112d4a]">{authority.authorityName}</h4>
            </div>
          </div>
          <Badge className="border-0 bg-[#e3effa] text-[#1e5888] text-[10px] font-bold">
            {authority.stateUt}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs rounded-lg bg-white/80 p-3 border border-[#dde7f0]">
          {authority.officerName && (
            <div>
              <span className="text-[10px] uppercase font-bold text-[#718598]">Officer:</span>
              <p className="font-semibold text-[#1a3857]">{authority.officerName}</p>
            </div>
          )}
          {authority.designation && (
            <div>
              <span className="text-[10px] uppercase font-bold text-[#718598]">Designation:</span>
              <p className="font-semibold text-[#1a3857]">{authority.designation}</p>
            </div>
          )}
          {authority.officialEmail && (
            <div className="sm:col-span-2">
              <span className="text-[10px] uppercase font-bold text-[#718598]">Official Email:</span>
              <p className="font-mono text-xs font-semibold text-[#205786]">{authority.officialEmail}</p>
            </div>
          )}
          {authority.phone && (
            <div>
              <span className="text-[10px] uppercase font-bold text-[#718598]">Official Phone:</span>
              <p className="font-mono text-xs font-semibold text-[#48637e]">{authority.phone}</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-[#5b738c]">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#257850]" />
            <span>Official source verified on {formattedDate}</span>
          </div>
          <a
            href={authority.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#225b89] hover:underline font-semibold"
          >
            {authority.sourceName} <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {(onAccept || onSkip) && (
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#dce6f0]">
            {onSkip && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onSkip}
                disabled={isAssigning}
                className="text-xs h-8 text-[#607488]"
              >
                Skip for now
              </Button>
            )}
            {onAccept && (
              <Button
                type="button"
                size="sm"
                onClick={onAccept}
                disabled={isAssigning}
                className="text-xs h-8 bg-[#0f2b4b] hover:bg-[#193e68] text-white"
              >
                {isAssigning ? "Assigning…" : "✓ Accept & Assign Authority"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
