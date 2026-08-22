import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { isAdministrator } from "@/lib/roleAccess";
import { trpc } from "@/lib/trpc";
import { Bell, Building2, ChevronRight, LayoutDashboard, LogOut, PanelLeft, ShieldCheck, Users } from "lucide-react";
import { useLocation } from "wouter";

const roleName = { citizen: "Citizen", bank: "Bank", authority: "Authority", admin: "Administrator" } as const;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { data: notifications = [] } = trpc.notifications.list.useQuery(undefined, { enabled: Boolean(user) });
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#101b31] px-6 text-white" aria-label="Loading protected workspace">
        <div className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#9fe2d3] text-[#101b31] shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
            <ShieldCheck className="h-6 w-6 animate-pulse" />
          </div>
          <p className="mt-6 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[#9fe2d3]">Verifying access</p>
          <p className="mt-2 text-sm text-slate-400">Establishing your protected LienGuard session.</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#101b31] px-6 py-10 text-white grid place-items-center">
        <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.07] p-8 text-center shadow-2xl backdrop-blur">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#9fe2d3] text-[#101b31]"><ShieldCheck className="h-6 w-6" /></div>
          <p className="mt-6 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[#9fe2d3]">Protected workspace</p>
          <h1 className="font-display mt-3 text-4xl">Sign in to continue.</h1>
          <p className="mt-4 leading-7 text-slate-300">Use your secure Manus account to access the LienGuard workspace assigned to you.</p>
          <Button onClick={() => startLogin()} className="mt-8 w-full bg-[#9fe2d3] text-[#101b31] hover:bg-[#c0f0e4]">Continue with Manus <ChevronRight className="ml-1 h-4 w-4" /></Button>
        </section>
      </main>
    );
  }

  const navItems = [
    { label: "Workspace", icon: LayoutDashboard, href: "/workspace" },
    ...(isAdministrator(user.role) ? [{ label: "User access", icon: Users, href: "/admin/users" }] : []),
  ];
  const unreadCount = notifications.filter(notification => !notification.readAt).length;

  return (
    <SidebarProvider>
      <Sidebar className="border-r-0 bg-[#101b31] text-slate-100">
        <SidebarHeader className="h-[5.5rem] px-4 pt-5">
          <button onClick={() => navigate("/workspace")} className="flex items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9fe2d3]">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#9fe2d3] text-[#101b31] shadow-lg shadow-black/20"><ShieldCheck className="h-5 w-5" /></span>
            <span className="min-w-0 group-data-[collapsible=icon]:hidden"><span className="block font-display text-xl leading-none">LienGuard</span><span className="mt-1 block font-mono text-[0.56rem] uppercase tracking-[0.18em] text-slate-400">Secure access</span></span>
          </button>
        </SidebarHeader>
        <SidebarContent className="px-3 pt-3">
          <p className="px-3 pb-2 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-slate-500 group-data-[collapsible=icon]:hidden">Navigation</p>
          <SidebarMenu>
            {navItems.map(item => <SidebarMenuItem key={item.href}>
              <SidebarMenuButton onClick={() => navigate(item.href)} isActive={location.pathname === item.href} tooltip={item.label} className="h-11 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white data-[active=true]:bg-[#9fe2d3] data-[active=true]:text-[#101b31]">
                <item.icon className="h-4 w-4" /><span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>)}
          </SidebarMenu>
          <div className="mx-2 mt-8 rounded-2xl border border-white/10 bg-white/[0.045] p-4 group-data-[collapsible=icon]:hidden">
            <Building2 className="h-4 w-4 text-[#9fe2d3]" />
            <p className="mt-4 text-sm font-medium">Access with accountability.</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">Permission changes are recorded and shared with the affected user.</p>
          </div>
        </SidebarContent>
        <SidebarFooter className="p-3">
          <div className="rounded-2xl bg-white/[0.07] p-2 group-data-[collapsible=icon]:bg-transparent">
            <div className="flex items-center gap-3 px-1 py-1 group-data-[collapsible=icon]:justify-center">
              <Avatar className="h-9 w-9 border border-white/10"><AvatarFallback className="bg-[#264261] text-xs text-white">{user.name?.charAt(0).toUpperCase() ?? "U"}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-medium">{user.name || "LienGuard user"}</p><p className="mt-0.5 truncate text-xs text-slate-400">{roleName[user.role]}</p></div>
            </div>
            <Button variant="ghost" onClick={logout} className="mt-1 h-9 w-full justify-start px-2 text-slate-400 hover:bg-white/10 hover:text-white group-data-[collapsible=icon]:hidden"><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-[#f7f6f2]">
        <header className="flex h-[5.5rem] items-center justify-between border-b border-[#dfe3e7] bg-[#f7f6f2]/90 px-5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3"><SidebarTrigger className="rounded-xl text-[#20314c] hover:bg-[#e8ecec]" /><div className="hidden sm:block"><p className="font-mono text-[0.61rem] uppercase tracking-[0.18em] text-[#607089]">Access level</p><p className="mt-1 text-sm font-medium text-[#20314c]">{roleName[user.role]}</p></div></div>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild><button className="relative grid h-10 w-10 place-items-center rounded-xl border border-[#d7dee3] bg-white text-[#20314c] transition hover:border-[#9ab7c1] hover:bg-[#f1f8f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#377a8e]" aria-label="Open notifications"><Bell className="h-4 w-4" />{unreadCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#dd6e54] px-1 text-[0.65rem] font-bold text-white">{unreadCount}</span>}</button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[22rem] rounded-2xl p-2 shadow-xl">
                <DropdownMenuLabel className="px-3 py-2 text-sm">Access notifications</DropdownMenuLabel><DropdownMenuSeparator />
                {notifications.length === 0 ? <p className="px-3 py-6 text-center text-sm text-muted-foreground">No access notifications yet.</p> : notifications.slice(0, 5).map(notification => <DropdownMenuItem key={notification.id} onSelect={() => { if (!notification.readAt) markRead.mutate({ notificationId: notification.id }); }} className="flex cursor-pointer flex-col items-start gap-1 rounded-xl px-3 py-3 whitespace-normal focus:bg-[#eef7f6]"><span className="flex w-full items-center justify-between gap-3 font-medium"><span>{notification.title}</span>{!notification.readAt && <Badge className="border-0 bg-[#cfeee7] text-[#1d5d62]">New</Badge>}</span><span className="text-xs leading-5 text-muted-foreground">{notification.message}</span></DropdownMenuItem>)}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="hidden h-10 items-center gap-2 rounded-xl border border-[#d7dee3] bg-white px-3 sm:flex"><span className="h-2 w-2 rounded-full bg-[#4d9d8c]" /><span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[#52627a]">Verified session</span></div>
          </div>
        </header>
        <main className="min-h-[calc(100vh-5.5rem)] p-5 sm:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
