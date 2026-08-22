import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AdminUsers from "@/pages/AdminUsers";
import Cases from "@/pages/Cases";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";
import Workspace from "@/pages/Workspace";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/workspace" component={WorkspaceRoute} />
      <Route path="/cases" component={CasesRoute} />
      <Route path="/admin/users" component={UserManagementRoute} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
