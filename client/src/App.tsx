import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Router as WouterRouter } from "wouter";
import { lazy, Suspense } from "react";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import ThemeToggle from "./components/ThemeToggle";
import { ThemeProvider } from "./contexts/ThemeContext";

const AdminUsers = lazy(() => import("@/pages/AdminUsers"));
const CaseDetail = lazy(() => import("@/pages/CaseDetail"));
const Cases = lazy(() => import("@/pages/Cases"));
const Communications = lazy(() => import("@/pages/Communications"));
const Documents = lazy(() => import("@/pages/Documents"));
const Escalations = lazy(() => import("@/pages/Escalations"));
const Home = lazy(() => import("@/pages/Home"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const StaticPreview = lazy(() => import("@/pages/StaticPreview"));
const Workspace = lazy(() => import("@/pages/Workspace"));
const RtiAssistant = lazy(() => import("@/pages/RtiAssistant"));
const Timeline = lazy(() => import("@/pages/Timeline"));
const HackathonDemo = lazy(() => import("@/pages/HackathonDemo"));

const AuthorityDirectory = lazy(() => import("@/pages/AuthorityDirectory"));
const CyberDirectory = lazy(() => import("@/pages/CyberDirectory"));
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const ThankYou = lazy(() => import("@/pages/ThankYou"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
import { CookieBanner } from "./components/CookieBanner";

function PageLoading() {
  return <main className="grid min-h-screen place-items-center bg-background text-sm font-medium text-muted-foreground">Loading secure workspace…</main>;
}

function WorkspaceRoute() {
  return <DashboardLayout><Workspace /></DashboardLayout>;
}

function UserManagementRoute() {
  return <DashboardLayout><AdminUsers /></DashboardLayout>;
}

function AuthorityDirectoryRoute() {
  return <DashboardLayout><AuthorityDirectory /></DashboardLayout>;
}

function CyberDirectoryRoute() {
  return <DashboardLayout><CyberDirectory /></DashboardLayout>;
}

function CasesRoute() {
  const isFailureProbe = import.meta.env.DEV && new URLSearchParams(window.location.search).has("simulateCaseListError");
  if (isFailureProbe) return <Cases />;
  return <DashboardLayout><Cases /></DashboardLayout>;
}

function CaseDetailRoute() {
  return <DashboardLayout><CaseDetail /></DashboardLayout>;
}

function TimelineRoute() { return <DashboardLayout><Timeline /></DashboardLayout>; }
function CommunicationsRoute() { return <DashboardLayout><Communications /></DashboardLayout>; }
function DocumentsRoute() { return <DashboardLayout><Documents /></DashboardLayout>; }
function EscalationsRoute() { return <DashboardLayout><Escalations /></DashboardLayout>; }
function RtiRoute() { return <DashboardLayout><RtiAssistant /></DashboardLayout>; }
function DemoRoute() { return <DashboardLayout><HackathonDemo /></DashboardLayout>; }

const basePath = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

function Router() {
  return (
    <WouterRouter base={basePath}>
      <Suspense fallback={<PageLoading />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/about" component={About} />
          <Route path="/contact" component={Contact} />
          <Route path="/thank-you" component={ThankYou} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/terms" component={Terms} />
          <Route path="/preview" component={StaticPreview} />
          <Route path="/workspace" component={WorkspaceRoute} />
          <Route path="/demo" component={DemoRoute} />
          <Route path="/directory" component={CyberDirectoryRoute} />
          <Route path="/cybercrime-directory" component={CyberDirectoryRoute} />
          <Route path="/cases" component={CasesRoute} />
          <Route path="/cases/:caseId" component={CaseDetailRoute} />
          <Route path="/timeline" component={TimelineRoute} />
          <Route path="/communications" component={CommunicationsRoute} />
          <Route path="/documents" component={DocumentsRoute} />
          <Route path="/escalations" component={EscalationsRoute} />
          <Route path="/rti" component={RtiRoute} />
          <Route path="/admin/users" component={UserManagementRoute} />
          <Route path="/admin/authority-directory" component={AuthorityDirectoryRoute} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </WouterRouter>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
          <CookieBanner />
          <ThemeToggle />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
