export type ClientRole = "citizen" | "bank" | "authority" | "admin";

/** Keeps administrator-only navigation and page gates consistent on the client. */
export function isAdministrator(role: ClientRole | undefined | null) {
  return role === "admin";
}
