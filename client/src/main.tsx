import { trpc } from "@/lib/trpc";
import { COOKIE_NAME, UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { startLogin } from "./const";
import "./index.css";

const analyticsEndpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT?.replace(/\/$/, "");
const analyticsWebsiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID;
if (analyticsEndpoint && analyticsWebsiteId) {
  const analyticsScript = document.createElement("script");
  analyticsScript.defer = true;
  analyticsScript.src = `${analyticsEndpoint}/umami`;
  analyticsScript.dataset.websiteId = analyticsWebsiteId;
  document.head.appendChild(analyticsScript);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  startLogin();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

import { handleStaticTrpcRequest } from "./lib/staticMockEngine";

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        try {
          const raw = sessionStorage.getItem("manus-cookie");
          if (raw) {
            const prefix = `${COOKIE_NAME}=`;
            const pair = raw.split(";").find(s => s.trim().startsWith(prefix));
            const token = pair?.trim().slice(prefix.length);
            if (token) {
              return { Authorization: `Bearer ${token}` };
            }
          }
        } catch {
          // sessionStorage unavailable
        }
        return {};
      },
      async fetch(input, init) {
        const isStaticHost =
          typeof window !== "undefined" &&
          (window.location.hostname.includes("github.io") || window.location.pathname.startsWith("/lien-guard"));

        if (!isStaticHost) {
          try {
            const res = await globalThis.fetch(input, {
              ...(init ?? {}),
              credentials: "include",
            });

            const contentType = res.headers.get("content-type") || "";
            if (res.ok && (contentType.includes("application/json") || contentType.includes("text/json"))) {
              return res;
            }
          } catch {
            // Backend offline, fall through to static mock engine
          }
        }

        // Parse tRPC request and execute with staticMockEngine
        try {
          const urlStr = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
          const url = new URL(urlStr, window.location.origin);
          const trpcPath = url.pathname.replace(/^\/api\/trpc\/?/, "");
          const paths = trpcPath.split(",").filter(Boolean);

          let inputMap: Record<string, any> = {};
          if (init?.body) {
            try {
              const bodyParsed = JSON.parse(init.body as string);
              inputMap = bodyParsed;
            } catch {}
          } else if (url.searchParams.has("input")) {
            try {
              const queryInput = JSON.parse(url.searchParams.get("input") || "{}");
              inputMap = queryInput;
            } catch {}
          }

          const results = paths.map((pathKey, idx) => {
            const rawItem = inputMap[String(idx)] ?? inputMap;
            const cleanInput = rawItem?.json ?? rawItem;
            const data = handleStaticTrpcRequest(pathKey, cleanInput);
            return {
              result: {
                data: {
                  json: data,
                },
              },
            };
          });

          return new Response(JSON.stringify(results.length === 1 && !url.searchParams.has("batch") ? results[0] : results), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (engineErr) {
          return new Response(JSON.stringify([{ result: { data: { json: null } } }]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
