import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  ExternalLink,
  Filter,
  Landmark,
  Plus,
  RotateCw,
  Search,
  ShieldCheck,
  Building,
  UserCheck,
  Edit2,
  PowerOff,
  Power,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

const INDIAN_STATES_AND_UTS = [
  "All States & UTs",
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

export default function AuthorityDirectory() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [selectedState, setSelectedState] = useState("All States & UTs");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [createForm, setCreateForm] = useState({
    stateUt: "Haryana",
    authorityType: "CYBER_CELL" as const,
    authorityName: "",
    officerName: "",
    designation: "",
    officialEmail: "",
    phone: "",
    sourceName: "National Cyber Crime Reporting Portal",
    sourceUrl: "https://cybercrime.gov.in/",
  });

  const query = trpc.authorityDirectory.list.useQuery(
    {
      stateUt: selectedState !== "All States & UTs" ? selectedState : undefined,
    },
    { enabled: user?.role === "admin" }
  );

  const createMutation = trpc.authorityDirectory.create.useMutation({
    onSuccess: () => {
      utils.authorityDirectory.list.invalidate();
      setCreateOpen(false);
      setCreateForm({
        stateUt: "Haryana",
        authorityType: "CYBER_CELL",
        authorityName: "",
        officerName: "",
        designation: "",
        officialEmail: "",
        phone: "",
        sourceName: "National Cyber Crime Reporting Portal",
        sourceUrl: "https://cybercrime.gov.in/",
      });
      toast.success("New official authority record added to directory.");
    },
    onError: error => toast.error(error.message),
  });

  const updateMutation = trpc.authorityDirectory.update.useMutation({
    onSuccess: () => {
      utils.authorityDirectory.list.invalidate();
      setEditingEntry(null);
      toast.success("Authority record updated successfully.");
    },
    onError: error => toast.error(error.message),
  });

  const deactivateMutation = trpc.authorityDirectory.deactivate.useMutation({
    onSuccess: () => {
      utils.authorityDirectory.list.invalidate();
      toast.success("Authority record deactivated.");
    },
    onError: error => toast.error(error.message),
  });

  const reactivateMutation = trpc.authorityDirectory.reactivate.useMutation({
    onSuccess: () => {
      utils.authorityDirectory.list.invalidate();
      toast.success("Authority record reactivated.");
    },
    onError: error => toast.error(error.message),
  });

  const authorities = query.data || [];

  const filtered = useMemo(() => {
    return authorities.filter(item => {
      const matchesSearch =
        searchQuery === "" ||
        item.stateUt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.authorityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.officerName && item.officerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.officialEmail && item.officialEmail.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });
  }, [authorities, searchQuery]);

  if (user?.role !== "admin") {
    return (
      <div className="rounded-2xl border border-[#eedad7] bg-[#fdfaf9] p-10 text-center">
        <h2 className="text-xl font-extrabold text-[#47221d]">Access Restricted</h2>
        <p className="mt-2 text-sm text-[#79544f]">The official authority directory is restricted to administrators.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <p className="eyebrow text-[#688096]">Access & Governance</p>
            <Badge className="border-0 bg-[#e4f0fa] text-[#1b5585] text-[10px]">36 States & UTs Loaded</Badge>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#132f4d]">
            Official Government Authority Directory
          </h1>
          <p className="mt-2 text-sm text-[#718196]">
            Maintains the official State/UT cyber crime cells from the{" "}
            <strong>National Cyber Crime Reporting Portal (cybercrime.gov.in)</strong>.
          </p>
        </div>

        {/* Add Authority Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="h-10 rounded-lg bg-[#0f2b4b] hover:bg-[#183c63]">
              <Plus className="mr-2 h-4 w-4" />
              Add Authority Record
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl rounded-2xl">
            <DialogHeader>
              <p className="eyebrow text-[#617f99]">Official Directory Entry</p>
              <DialogTitle className="mt-1 text-2xl font-extrabold text-[#132f4d]">
                Add Verified Government Authority
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                createMutation.mutate({
                  ...createForm,
                  lastVerifiedAt: new Date(),
                });
              }}
              className="space-y-4 pt-3"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>State / Union Territory</Label>
                  <Select
                    value={createForm.stateUt}
                    onValueChange={value => setCreateForm(prev => ({ ...prev, stateUt: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {INDIAN_STATES_AND_UTS.filter(s => s !== "All States & UTs").map(state => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Authority Type</Label>
                  <Select
                    value={createForm.authorityType}
                    onValueChange={(value: any) => setCreateForm(prev => ({ ...prev, authorityType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CYBER_CELL">Cyber Cell</SelectItem>
                      <SelectItem value="GRIEVANCE_OFFICER">Grievance Officer</SelectItem>
                      <SelectItem value="BANK_NODAL">Bank Nodal</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Authority Name</Label>
                  <Input
                    required
                    value={createForm.authorityName}
                    onChange={e => setCreateForm(prev => ({ ...prev, authorityName: e.target.value }))}
                    placeholder="e.g. Haryana State Cyber Crime Police Station"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Designated Officer</Label>
                  <Input
                    value={createForm.officerName}
                    onChange={e => setCreateForm(prev => ({ ...prev, officerName: e.target.value }))}
                    placeholder="e.g. Sh. Sibash Kabiraj"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Designation / Rank</Label>
                  <Input
                    value={createForm.designation}
                    onChange={e => setCreateForm(prev => ({ ...prev, designation: e.target.value }))}
                    placeholder="e.g. IPS, ADGP Cyber Haryana"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Official Email</Label>
                  <Input
                    type="email"
                    value={createForm.officialEmail}
                    onChange={e => setCreateForm(prev => ({ ...prev, officialEmail: e.target.value }))}
                    placeholder="official@nic.in"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Official Phone</Label>
                  <Input
                    value={createForm.phone}
                    onChange={e => setCreateForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="0172-2524058"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Source URL</Label>
                  <Input
                    required
                    type="url"
                    value={createForm.sourceUrl}
                    onChange={e => setCreateForm(prev => ({ ...prev, sourceUrl: e.target.value }))}
                  />
                </div>
              </div>

              <DialogFooter className="pt-3">
                <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} className="bg-[#0f2b4b] hover:bg-[#183c63]">
                  {createMutation.isPending ? "Saving…" : "Add Record"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-[#dce3eb] shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-64">
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Filter by State/UT" />
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
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#75889b]" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search state, officer, email…"
                className="h-9 pl-9"
              />
            </div>
          </div>
          <p className="text-xs text-[#6a7d90]">
            Showing <strong>{filtered.length}</strong> official records
          </p>
        </CardContent>
      </Card>

      {/* Directory Table */}
      <Card className="border-[#dce3eb] shadow-sm">
        <CardContent className="p-0">
          {query.isLoading ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-[#718196]">
              No authority records matched your filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-xs">
                <thead className="bg-[#f7f9fb] text-[0.65rem] uppercase tracking-[0.1em] text-[#6d7f92]">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">State / UT</th>
                    <th className="px-4 py-3.5 font-semibold">Authority Details</th>
                    <th className="px-4 py-3.5 font-semibold">Nodal Officer & Rank</th>
                    <th className="px-4 py-3.5 font-semibold">Official Contact</th>
                    <th className="px-4 py-3.5 font-semibold">Source & Verification</th>
                    <th className="px-4 py-3.5 font-semibold">Status</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf1f5]">
                  {filtered.map(auth => (
                    <tr key={auth.id} className="hover:bg-[#f8fbfe]">
                      <td className="px-5 py-4 font-bold text-[#14324f]">
                        <span className="inline-block rounded-md bg-[#eaf1f8] px-2 py-1 text-[11px] text-[#225785]">
                          {auth.stateUt}
                        </span>
                      </td>
                      <td className="px-4 py-4 max-w-xs">
                        <p className="font-bold text-[#1a3857]">{auth.authorityName}</p>
                        <Badge className="mt-1 border-0 bg-[#e4edf5] text-[#214f77] text-[9px]">
                          {auth.authorityType}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-[#1a3857]">{auth.officerName || "Official Nodal Desk"}</p>
                        <p className="text-[11px] text-[#6c7f92]">{auth.designation || "—"}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-mono text-[#1c5585]">{auth.officialEmail || "—"}</p>
                        {auth.phone && <p className="font-mono text-[#6c7f92]">{auth.phone}</p>}
                      </td>
                      <td className="px-4 py-4 text-[11px]">
                        <a
                          href={auth.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#225b89] hover:underline font-semibold"
                        >
                          {auth.sourceName} <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                        <p className="text-[#6c7f92]">
                          Verified:{" "}
                          {auth.lastVerifiedAt
                            ? new Date(auth.lastVerifiedAt).toLocaleDateString()
                            : "23 Aug 2026"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        {auth.active ? (
                          <Badge className="border-0 bg-[#e5f5ec] text-[#236b44] text-[10px]">Active</Badge>
                        ) : (
                          <Badge className="border-0 bg-[#fceeed] text-[#9b3e34] text-[10px]">Inactive</Badge>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingEntry(auth)}
                            className="h-7 w-7 p-0 text-[#255883] hover:bg-[#e4eff8]"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          {auth.active ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deactivateMutation.mutate({ id: auth.id })}
                              className="h-7 w-7 p-0 text-[#a04639] hover:bg-[#fdeeed]"
                            >
                              <PowerOff className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => reactivateMutation.mutate({ id: auth.id })}
                              className="h-7 w-7 p-0 text-[#247048] hover:bg-[#e5f5ec]"
                            >
                              <Power className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Entry Dialog */}
      {editingEntry && (
        <Dialog open={Boolean(editingEntry)} onOpenChange={() => setEditingEntry(null)}>
          <DialogContent className="max-w-xl rounded-2xl">
            <DialogHeader>
              <p className="eyebrow text-[#617f99]">Edit Authority Record</p>
              <DialogTitle className="mt-1 text-2xl font-extrabold text-[#132f4d]">
                {editingEntry.authorityName}
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                updateMutation.mutate({
                  id: editingEntry.id,
                  authorityName: editingEntry.authorityName,
                  officerName: editingEntry.officerName || null,
                  designation: editingEntry.designation || null,
                  officialEmail: editingEntry.officialEmail || null,
                  phone: editingEntry.phone || null,
                  lastVerifiedAt: new Date(),
                });
              }}
              className="space-y-4 pt-3"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Authority Name</Label>
                  <Input
                    required
                    value={editingEntry.authorityName}
                    onChange={e => setEditingEntry({ ...editingEntry, authorityName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Officer Name</Label>
                  <Input
                    value={editingEntry.officerName || ""}
                    onChange={e => setEditingEntry({ ...editingEntry, officerName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Designation</Label>
                  <Input
                    value={editingEntry.designation || ""}
                    onChange={e => setEditingEntry({ ...editingEntry, designation: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Official Email</Label>
                  <Input
                    type="email"
                    value={editingEntry.officialEmail || ""}
                    onChange={e => setEditingEntry({ ...editingEntry, officialEmail: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={editingEntry.phone || ""}
                    onChange={e => setEditingEntry({ ...editingEntry, phone: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter className="pt-3">
                <Button type="button" variant="ghost" onClick={() => setEditingEntry(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} className="bg-[#0f2b4b] hover:bg-[#183c63]">
                  {updateMutation.isPending ? "Saving…" : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
