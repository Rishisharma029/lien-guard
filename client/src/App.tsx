import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AdminUsers from "@/pages/AdminUsers";
import CaseDetail from "@/pages/CaseDetail";
import CaseWorklist from "@/pages/CaseWorklist";
import Cases from "@/pages/Cases";
import Communications from "@/pages/Communications";
import Documents from "@/pages/Documents";
import Escalations from "@/pages/Escalations";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";
import Workspace from "@/pages/Workspace";
import RtiAssistant from "@/pages/RtiAssistant";
import Timeline from "@/pages/Timeline";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import ThemeToggle from "./components/ThemeToggle";
import { ThemeProvider } from "./contexts/ThemeContext";

function WorkspaceRoute() {
  return <DashboardLayout><Workspace /></DashboardLayout>;
}

function UserManagementRoute() {
  return <DashboardLayout><AdminUsers /></DashboardLayout>;
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/workspace" component={WorkspaceRoute} />
      <Route path="/cases" component={CasesRoute} />
      <Route path="/cases/:caseId" component={CaseDetailRoute} />
      <Route path="/timeline" component={TimelineRoute} />
      <Route path="/communications" component={CommunicationsRoute} />
      <Route path="/documents" component={DocumentsRoute} />
      <Route path="/escalations" component={EscalationsRoute} />
      <Route path="/rti" component={RtiRoute} />
      <Route path="/admin/users" component={UserManagementRoute} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
          <ThemeToggle />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
