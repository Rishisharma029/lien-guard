import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShieldCheck,
  Search,
  Mail,
  Phone,
  User,
  ExternalLink,
  Copy,
  Check,
  Building2,
  AlertCircle,
  FilePlus2,
  Landmark,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { SEO } from "@/components/SEO";

export default function CyberDirectory() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedState, setSelectedState] = useState<string>("ALL");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { data: authorities = [], isLoading } = trpc.authorityDirectory.browse.useQuery({
    search: search || undefined,
  });

  const stateOptions = useMemo(() => {
    const states = Array.from(new Set(authorities.map(a => a.stateUt))).sort();
    return ["ALL", ...states];
  }, [authorities]);

  const filteredAuthorities = useMemo(() => {
    if (selectedState === "ALL") return authorities;
    return authorities.filter(a => a.stateUt === selectedState);
  }, [authorities, selectedState]);

  const handleCopy = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-8">
      <SEO
        title="Official State & UT Cyber Crime Directory — LienGuard"
        description="Official directory of Cyber Crime Police Stations, Nodal Officers & State Cyber Cells across all 36 Indian States and Union Territories sourced from cybercrime.gov.in."
        canonical="https://lienguard.org/directory"
      />
      {/* 1. Header & Emergency Banner */}
      <div className="rounded-2xl border border-[#dce3eb] bg-gradient-to-r from-[#0f2b4b] via-[#163b63] to-[#1c4777] p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-[#245380] text-[#c7e0fc] hover:bg-[#245380] border-none font-semibold px-3 py-1">
                🇮🇳 Official Government Directory
              </Badge>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-2.5 py-0.5">
                ✓ Sourced: cybercrime.gov.in
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              State & UT Cyber Crime Directory
            </h1>
            <p className="text-sm sm:text-base text-[#c7d9ec] max-w-2xl leading-relaxed">
              Official contact records for designated Cyber Crime Police Stations, Nodal Officers, and State Cyber Crime Headquarters across all 36 Indian States and Union Territories.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/15 min-w-64">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-600 text-white font-bold">
                1930
              </div>
              <div>
                <p className="text-[0.68rem] font-bold text-red-200 uppercase tracking-wider">National Cyber Helpline</p>
                <p className="text-sm font-bold text-white">Dial 1930 (Toll-Free)</p>
              </div>
            </div>
            <div className="border-t border-white/10 pt-2 flex items-center justify-between text-xs text-[#c7d9ec]">
              <span>National Reporting Portal:</span>
              <a
                href="https://cybercrime.gov.in/"
                target="_blank"
                rel="noreferrer"
                className="font-bold text-white hover:underline flex items-center gap-1"
              >
                cybercrime.gov.in <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="grid gap-4 sm:grid-cols-12 items-center bg-white p-4 rounded-xl border border-[#dce3eb] shadow-sm">
        <div className="sm:col-span-7 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7b8b9c]" />
          <Input
            placeholder="Search by state, officer name, rank, email, or telephone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-10 border-[#dce3eb] rounded-lg"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={selectedState}
            onChange={e => setSelectedState(e.target.value)}
            className="w-full h-10 px-3 border border-[#dce3eb] rounded-lg text-sm bg-white font-medium text-[#132f4d] focus:outline-none focus:ring-2 focus:ring-[#0f2b4b]"
          >
            <option value="ALL">All States & UTs ({authorities.length})</option>
            {stateOptions.filter(s => s !== "ALL").map(state => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2 text-right">
          <Badge variant="outline" className="h-9 px-3 border-[#dce3eb] text-xs font-semibold text-[#5a6c80] w-full justify-center">
            {filteredAuthorities.length} {filteredAuthorities.length === 1 ? "Record" : "Records"}
          </Badge>
        </div>
      </div>

      {/* 3. Authorities Grid */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl border border-[#dce3eb] bg-white animate-pulse p-5 space-y-4">
              <div className="h-5 bg-slate-200 rounded w-1/2" />
              <div className="h-4 bg-slate-100 rounded w-3/4" />
              <div className="h-4 bg-slate-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filteredAuthorities.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#dce3eb] p-8">
          <Building2 className="mx-auto h-12 w-12 text-[#94a3b8]" />
          <h3 className="mt-4 text-base font-bold text-[#132f4d]">No official authorities matched your filter</h3>
          <p className="mt-1 text-sm text-[#65758a]">Try searching with a different state name or keyword.</p>
          <Button
            variant="outline"
            onClick={() => {
              setSearch("");
              setSelectedState("ALL");
            }}
            className="mt-4 border-[#dce3eb]"
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAuthorities.map(authority => (
            <Card
              key={authority.id}
              className="border-[#dce3eb] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between bg-white rounded-xl overflow-hidden"
            >
              <CardHeader className="bg-[#f8fafc] border-b border-[#eef2f6] pb-3 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge className="bg-[#e8f0fa] text-[#124b79] hover:bg-[#e8f0fa] border-none font-bold text-[0.7rem] px-2.5 py-0.5">
                      {authority.stateUt}
                    </Badge>
                    <CardTitle className="text-base font-bold text-[#132f4d] mt-2 leading-snug">
                      {authority.authorityName}
                    </CardTitle>
                  </div>
                  <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-4 text-sm flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  {/* Officer Info */}
                  <div className="flex items-start gap-2.5">
                    <User className="h-4 w-4 text-[#7b8b9c] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-[#132f4d]">
                        {authority.officerName || "Designated Nodal Officer"}
                      </p>
                      {authority.designation && (
                        <p className="text-xs font-medium text-[#65758a]">
                          {authority.designation}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  {authority.officialEmail && (
                    <div className="flex items-center justify-between gap-2 bg-[#f8fafc] p-2 rounded-lg border border-[#eef2f6]">
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail className="h-3.5 w-3.5 text-[#124b79] shrink-0" />
                        <a
                          href={`mailto:${authority.officialEmail}`}
                          className="text-xs font-semibold text-[#124b79] hover:underline truncate"
                          title={authority.officialEmail}
                        >
                          {authority.officialEmail}
                        </a>
                      </div>
                      <button
                        onClick={() => handleCopy(authority.officialEmail!, `email-${authority.id}`, "Email address")}
                        className="p-1 text-[#7b8b9c] hover:text-[#132f4d] rounded transition"
                        title="Copy email"
                      >
                        {copiedKey === `email-${authority.id}` ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Phone */}
                  {authority.phone && (
                    <div className="flex items-center justify-between gap-2 bg-[#f8fafc] p-2 rounded-lg border border-[#eef2f6]">
                      <div className="flex items-center gap-2 min-w-0">
                        <Phone className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <a
                          href={`tel:${authority.phone.replace(/\s+/g, "")}`}
                          className="text-xs font-semibold text-[#132f4d] hover:underline truncate"
                          title={authority.phone}
                        >
                          {authority.phone}
                        </a>
                      </div>
                      <button
                        onClick={() => handleCopy(authority.phone!, `phone-${authority.id}`, "Phone number")}
                        className="p-1 text-[#7b8b9c] hover:text-[#132f4d] rounded transition"
                        title="Copy telephone"
                      >
                        {copiedKey === `phone-${authority.id}` ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Source & Actions */}
                <div className="pt-3 border-t border-[#eef2f6] space-y-3">
                  <div className="flex items-center justify-between text-[0.7rem] text-[#7b8b9c]">
                    <span className="flex items-center gap-1 font-medium">
                      ✓ {authority.sourceName}
                    </span>
                    {authority.sourceUrl && (
                      <a
                        href={authority.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#124b79] hover:underline flex items-center gap-0.5 font-semibold"
                      >
                        Source <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  <Button
                    size="sm"
                    onClick={() => navigate(`/cases?stateUt=${encodeURIComponent(authority.stateUt)}`)}
                    className="w-full bg-[#0f2b4b] hover:bg-[#183c63] text-white text-xs font-semibold h-8 rounded-lg"
                  >
                    <FilePlus2 className="h-3.5 w-3.5 mr-1.5" /> Route Case to this Authority
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
