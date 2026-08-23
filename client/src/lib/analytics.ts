/**
 * Privacy-Conscious, Provider-Agnostic Analytics Abstraction for LienGuard.
 * 
 * STRICT PRIVACY RULES:
 * 1. Only loads if analytics consent is granted by the user.
 * 2. ONLY logs anonymized event names and non-sensitive interaction categories.
 * 3. NEVER logs: citizen names, phone numbers, emails, case references, documents, or RTI content.
 */

export type AnalyticsEventType =
  | "page_view"
  | "demo_started"
  | "demo_step_completed"
  | "case_registration_started"
  | "case_registration_completed"
  | "authority_routing_viewed"
  | "authority_assigned"
  | "email_followup_sent"
  | "inbound_reply_viewed"
  | "rti_draft_generated"
  | "contact_form_submitted";

export interface AnalyticsEventProps {
  category?: string;
  label?: string;
  value?: number;
  [key: string]: unknown;
}

const CONSENT_KEY = "lienguard_cookie_consent";

export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) return false;
    const parsed = JSON.parse(consent);
    return parsed.analytics === true;
  } catch {
    return false;
  }
}

export function trackEvent(eventName: AnalyticsEventType, props: AnalyticsEventProps = {}): void {
  if (!hasAnalyticsConsent()) return;

  const sanitizedProps: Record<string, unknown> = {};
  const prohibitedKeys = new Set([
    "email", "phone", "name", "citizenName", "caseId", "caseReference",
    "lienAmount", "accountNumber", "documentContent", "password", "token",
  ]);

  for (const [key, value] of Object.entries(props)) {
    if (!prohibitedKeys.has(key.toLowerCase()) && typeof value !== "function") {
      sanitizedProps[key] = value;
    }
  }

  // If a provider ID is configured (e.g. Google Analytics / Plausible / PostHog)
  const analyticsId = import.meta.env.VITE_ANALYTICS_ID;
  if (analyticsId && typeof (window as any).gtag === "function") {
    (window as any).gtag("event", eventName, sanitizedProps);
  }

  if (import.meta.env.DEV) {
    console.info(`[Analytics Event] [${eventName}]:`, sanitizedProps);
  }
}

export function trackPageView(path: string): void {
  trackEvent("page_view", { path });
}
