import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";

const secret = () => new TextEncoder().encode(ENV.cookieSecret);

describe("session security", () => {
  it("creates a verifiable session bound to this LienGuard application", async () => {
    const token = await sdk.createSessionToken("user-open-id", { name: "Case owner", expiresInMs: 60_000 });
    await expect(sdk.verifySession(token)).resolves.toEqual({
      openId: "user-open-id",
      appId: ENV.appId,
      name: "Case owner",
    });
  });

  it("rejects a correctly signed token issued for another application", async () => {
    const foreignAppId = `${ENV.appId}-other`;
    const token = await new SignJWT({ openId: "user-open-id", appId: foreignAppId, name: "Case owner" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(`lienguard:${foreignAppId}`)
      .setAudience(foreignAppId)
      .setIssuedAt()
      .setExpirationTime("1m")
      .sign(secret());

    await expect(sdk.verifySession(token)).resolves.toBeNull();
  });
});
