import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { authorityTypes, caseDocumentKinds, casePriorities, caseStatuses, userRoles } from "../drizzle/schema";
import { canAccessCase, canUpdateCaseDetails, canUpdateCaseStatus, createCaseTimeline, getCaseHealth, isCaseStatusTransitionAllowed } from "./cases";
import {
  changeUserRoleWithAudit,
  createAuthorityRecord,
  createCase,
  createCaseDocument,
  createOutboundEmail,
  createUserNotification,
  findActiveAuthorityForRouting,
  getAuthorityById,
  getCaseById,
  getCaseByReference,
  getCaseCommunicationById,
  getLatestAuthorityAssignment,
  getLatestDemoCase,
  getNotificationsForUser,
  getRoleChangeAudits,
  listAuthorityDirectory,
  listCaseCommunications,
  listCaseDocuments,
  listCaseEvents,
  listCasesForUser,
  listUsersForAdmin,
  markNotificationRead,
  purgeDemoCases,
  recordAuthorityAssignment,
  recordCaseFollowUp,
  recordInboundEmail,
  recordSystemCaseEvent,
  setCaseStatus,
  updateAuthorityRecord,
  updateCaseAuthorityDirectoryId,
  updateCaseDetails,
  upsertUser,
} from "./db";
import { getRecommendedAuthority, getCaseTypeAuthorityType, normalizeStateUt } from "./authorityRouting";
import { analyzeInboundReply } from "./replyIntelligence";
import { logSecurityEvent } from "./securityLog";
import { decodeCaseDocument } from "./documents";
import { deliverQueuedCommunication, runDeadlineAutomation } from "./automation";
import { isValidEmailAddress } from "./maileroo";
import { storageGetSignedUrl, storagePut } from "./storage";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV, isMailerooConfigured } from "./_core/env";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";

const roleProcedure = (...roles: (typeof userRoles)[number][]) =>
  protectedProcedure.use(({ ctx, next }) => {
    if (!roles.includes(ctx.user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This workspace is not available for your access level.",
      });
    }
    return next({ ctx });
  });

const caseReferenceInput = z.object({ caseId: z.string().trim().min(4).max(32) });
const optionalDate = z.coerce.date().refine(value => !Number.isNaN(value.getTime()), "Enter a valid date.").optional();
const optionalNullableDate = z.coerce.date().refine(value => !Number.isNaN(value.getTime()), "Enter a valid date.").nullable().optional();
const optionalNullableText = (min: number, max: number) => z.string().trim().min(min).max(max).nullable().optional();

const createCaseInput = z.object({
  title: z.string().trim().min(4).max(180),
  description: z.string().trim().min(10).max(5000),
  caseType: z.string().trim().min(2).max(80),
  priority: z.enum(casePriorities).default("NORMAL"),
  stateUt: z.string().trim().min(2).max(100).optional(),
  district: z.string().trim().min(2).max(100).optional(),
  bankName: z.string().trim().min(2).max(160).optional(),
  lienAmount: z.string().trim().regex(/^\d+(?:\.\d{1,2})?$/, "Enter a valid lien amount.").optional(),
  lienDate: optionalDate,
  lienReference: z.string().trim().min(2).max(96).optional(),
  transactionReference: z.string().trim().min(2).max(96).optional(),
  authorityName: z.string().trim().min(2).max(160).optional(),
  authorityEmail: z.string().trim().email("Enter a valid authority email address.").max(320).optional(),
  responseDeadline: optionalDate,
});

const updateCaseInput = z.object({
  caseId: z.string().trim().min(4).max(32),
  title: z.string().trim().min(4).max(180).optional(),
  description: z.string().trim().min(10).max(5000).optional(),
  caseType: z.string().trim().min(2).max(80).optional(),
  priority: z.enum(casePriorities).optional(),
  bankName: optionalNullableText(2, 160),
  lienAmount: z.string().trim().regex(/^\d+(?:\.\d{1,2})?$/, "Enter a valid lien amount.").nullable().optional(),
  lienDate: optionalNullableDate,
  lienReference: optionalNullableText(2, 96),
  transactionReference: optionalNullableText(2, 96),
  authorityName: optionalNullableText(2, 160),
  authorityEmail: z.string().trim().email("Enter a valid authority email address.").max(320).nullable().optional(),
  responseDeadline: optionalNullableDate,
}).superRefine((input, context) => {
  const hasField = Object.entries(input).some(([key, value]) => key !== "caseId" && value !== undefined);
  if (!hasField) {
    context.addIssue({ code: "custom", message: "Provide at least one case field to update." });
  }
});

function requireCaseAccess(user: { id: number; role: (typeof userRoles)[number] }, caseRecord: { userId: number; caseId?: string }) {
  if (!canAccessCase(user.role, user.id, caseRecord.userId)) {
    logSecurityEvent({
      type: "UNAUTHORIZED_ACCESS_ATTEMPT",
      userId: user.id,
      caseId: caseRecord.caseId,
      details: { role: user.role, caseOwnerId: caseRecord.userId, reason: "Case access authorization check failed" },
      result: "BLOCKED",
    });
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this case." });
  }
}

function rtiReason(caseRecord: { status: (typeof caseStatuses)[number] }) {
  if (caseRecord.status === "ESCALATED") return "The case has been marked escalated in its recorded lifecycle.";
  return null;
}

const workspaceCopy = {
  citizen: {
    title: "My property position",
    description: "Review your lien status, required documents, and next steps in one protected place.",
  },
  bank: {
    title: "Portfolio review",
    description: "Coordinate secured interests, evidence, and validation steps across your institution.",
  },
  authority: {
    title: "Authority workspace",
    description: "Review verified records and manage the operational queue with a clear audit trail.",
  },
  admin: {
    title: "Access governance",
    description: "Manage user permissions and keep every access change transparent and traceable.",
  },
} as const;

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    demoAvailable: publicProcedure.query(() => !ENV.isProduction || ENV.localDemoMode),
    demoLogin: publicProcedure
      .input(z.object({ role: z.enum(userRoles).default("citizen") }).optional())
      .mutation(async ({ ctx, input }) => {
        if (ENV.isProduction && !ENV.localDemoMode) {
          logSecurityEvent({
            type: "LOGIN_FAILED",
            ip: ctx.req.ip,
            userAgent: ctx.req.get("user-agent"),
            details: { reason: "Demo authentication requested in production" },
            result: "BLOCKED",
          });
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Demo authentication is disabled in production.",
          });
        }
        const role = input?.role || "citizen";
        const roleNames: Record<string, string> = {
          citizen: "Citizen User",
          bank: "Nodal Bank Officer",
          authority: "Designated Police Authority",
          admin: "LienGuard System Administrator",
        };
        const openId = `demo-${role}`;
        const name = roleNames[role] || "LienGuard User";

        const user = await upsertUser({
          openId,
          name,
          email: `${role}@lienguard.dev`,
          role,
          loginMethod: "demo_auth",
          lastSignedIn: new Date(),
        });

        const token = await sdk.createSessionToken(openId, {
          name,
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        logSecurityEvent({
          type: "LOGIN_SUCCESS",
          userId: openId,
          ip: ctx.req?.ip,
          userAgent: (typeof ctx.req?.get === "function" ? ctx.req.get("user-agent") : ctx.req?.headers?.["user-agent"] as string) || undefined,
          details: { role, method: "demo_auth" },
          result: "SUCCESS",
        });

        return { success: true, role } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      logSecurityEvent({
        type: "SESSION_REVOKED",
        userId: ctx.user?.id,
        ip: ctx.req?.ip,
        userAgent: (typeof ctx.req?.get === "function" ? ctx.req.get("user-agent") : ctx.req?.headers?.["user-agent"] as string) || undefined,
        details: { action: "user_logout" },
        result: "SUCCESS",
      });
      return { success: true } as const;
    }),
  }),
  workspace: router({
    overview: protectedProcedure.query(({ ctx }) => ({
      role: ctx.user.role,
      ...workspaceCopy[ctx.user.role],
    })),
    citizen: roleProcedure("citizen").query(() => workspaceCopy.citizen),
    bank: roleProcedure("bank").query(() => workspaceCopy.bank),
    authority: roleProcedure("authority").query(() => workspaceCopy.authority),
    admin: roleProcedure("admin").query(() => workspaceCopy.admin),
  }),
  notifications: router({
    list: protectedProcedure.query(({ ctx }) => getNotificationsForUser(ctx.user.id)),
    markRead: protectedProcedure
      .input(z.object({ notificationId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const changed = await markNotificationRead(input.notificationId, ctx.user.id);
        if (!changed) throw new TRPCError({ code: "NOT_FOUND", message: "Notification was not found." });
        return { changed };
      }),
  }),
  cases: router({
    list: protectedProcedure.query(({ ctx }) => listCasesForUser(ctx.user)),
    get: protectedProcedure
      .input(caseReferenceInput)
      .query(async ({ ctx, input }) => {
        const caseRecord = await getCaseByReference(input.caseId);
        if (!caseRecord) throw new TRPCError({ code: "NOT_FOUND", message: "Case was not found." });
        requireCaseAccess(ctx.user, caseRecord);
        return caseRecord;
      }),
    detail: protectedProcedure
      .input(caseReferenceInput)
      .query(async ({ ctx, input }) => {
        const caseRecord = await getCaseByReference(input.caseId);
        if (!caseRecord) throw new TRPCError({ code: "NOT_FOUND", message: "Case was not found." });
        requireCaseAccess(ctx.user, caseRecord);
        const events = await listCaseEvents(caseRecord.id);
        return {
          case: caseRecord,
          health: getCaseHealth(caseRecord),
          timeline: createCaseTimeline(caseRecord, events),
        };
      }),
    create: protectedProcedure
      .input(createCaseInput)
      .mutation(async ({ ctx, input }) => {
        const { stateUt, district, ...caseInput } = input;
        const created = await createCase({ userId: ctx.user.id, ...caseInput });
        if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Case could not be created." });

        // Run deterministic authority routing if state/UT provided
        let routingRecommendation: Awaited<ReturnType<typeof getRecommendedAuthority>> = null;
        if (stateUt) {
          try {
            routingRecommendation = await getRecommendedAuthority(
              { stateUt, caseType: input.caseType, district },
              (st, at) => findActiveAuthorityForRouting(st, at),
            );
            if (routingRecommendation) {
              await recordSystemCaseEvent({
                caseRecordId: created.id,
                type: "AUTHORITY_RECOMMENDED",
                message: `Authority recommended: ${routingRecommendation.authority.authorityName} (${routingRecommendation.canonicalStateUt})`,
              });
            }
          } catch {
            // Routing failure must never block case creation
          }
        }

        return { ...created, routingRecommendation };
      }),
    update: protectedProcedure
      .input(updateCaseInput)
      .mutation(async ({ ctx, input }) => {
        const current = await getCaseByReference(input.caseId);
        if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Case was not found." });
        if (!canUpdateCaseDetails({
          role: ctx.user.role,
          currentUserId: ctx.user.id,
          caseOwnerId: current.userId,
          status: current.status,
        })) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to update this case." });
        }
        const updated = await updateCaseDetails({ ...input, actorUserId: ctx.user.id });
        if (!updated) throw new TRPCError({ code: "CONFLICT", message: "The case changed before your update could be saved. Refresh and try again." });
        return updated;
      }),
    updateStatus: protectedProcedure
      .input(z.object({ caseId: z.string().trim().min(4).max(32), status: z.enum(caseStatuses) }))
      .mutation(async ({ ctx, input }) => {
        if (!canUpdateCaseStatus(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only authorities and administrators can update case status." });
        }
        const current = await getCaseByReference(input.caseId);
        if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Case was not found." });
        if (!isCaseStatusTransitionAllowed(current.status, input.status)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This lifecycle transition is not allowed from the current case status." });
        }
        const updated = await setCaseStatus({
          caseId: input.caseId,
          previousStatus: current.status,
          nextStatus: input.status,
          actorUserId: ctx.user.id,
        });
        if (!updated) throw new TRPCError({ code: "CONFLICT", message: "The case status changed before your update could be saved. Refresh and try again." });
        return updated;
      }),
  }),
  communications: router({
    list: protectedProcedure
      .input(caseReferenceInput)
      .query(async ({ ctx, input }) => {
        const caseRecord = await getCaseByReference(input.caseId);
        if (!caseRecord) throw new TRPCError({ code: "NOT_FOUND", message: "Case was not found." });
        requireCaseAccess(ctx.user, caseRecord);
        return listCaseCommunications(caseRecord.id);
      }),
    recordFollowUp: protectedProcedure
      .input(z.object({ caseId: z.string().trim().min(4).max(32), note: z.string().trim().min(1).max(1200).optional() }))
      .mutation(async ({ ctx, input }) => {
        const caseRecord = await getCaseByReference(input.caseId);
        if (!caseRecord) throw new TRPCError({ code: "NOT_FOUND", message: "Case was not found." });
        if (!canUpdateCaseDetails({ role: ctx.user.role, currentUserId: ctx.user.id, caseOwnerId: caseRecord.userId, status: caseRecord.status })) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to record a follow-up for this case." });
        }
        const entry = await recordCaseFollowUp({ caseRecordId: caseRecord.id, actorUserId: ctx.user.id, authorityName: caseRecord.authorityName, note: input.note });
        if (!entry) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Follow-up could not be recorded." });
        return entry;
      }),
    sendToAuthority: protectedProcedure
      .input(z.object({
        caseId: z.string().trim().min(4).max(32),
        subject: z.string().trim().min(4).max(180),
        body: z.string().trim().min(10).max(8_000),
      }))
      .mutation(async ({ ctx, input }) => {
        const caseRecord = await getCaseByReference(input.caseId);
        if (!caseRecord) throw new TRPCError({ code: "NOT_FOUND", message: "Case was not found." });
        if (!canUpdateCaseDetails({ role: ctx.user.role, currentUserId: ctx.user.id, caseOwnerId: caseRecord.userId, status: caseRecord.status })) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to send case correspondence." });
        }
        if (!caseRecord.authorityEmail || !isValidEmailAddress(caseRecord.authorityEmail)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Record a valid authority email address before sending correspondence." });
        }
        const queued = await createOutboundEmail({
          caseRecordId: caseRecord.id,
          actorUserId: ctx.user.id,
          subject: input.subject.includes(caseRecord.caseId) ? input.subject : `[${caseRecord.caseId}] ${input.subject}`,
          body: input.body,
          recipientName: caseRecord.authorityName,
          recipientEmail: caseRecord.authorityEmail,
          eventMessage: `Case email queued for ${caseRecord.authorityEmail}.`,
        });
        if (!queued) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Email could not be queued." });
        const delivery = await deliverQueuedCommunication(queued);
        return { communicationId: queued.id, delivery };
      }),
    getReplyAnalysis: protectedProcedure
      .input(z.object({ communicationId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const comm = await getCaseCommunicationById(input.communicationId);
        if (!comm) throw new TRPCError({ code: "NOT_FOUND", message: "Communication not found" });
        const caseRecord = await getCaseById(comm.caseId);
        if (!caseRecord) throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
        requireCaseAccess(ctx.user, caseRecord);
        return analyzeInboundReply({
          subject: comm.subject,
          body: comm.body,
          senderEmail: comm.recipientEmail || undefined,
          caseId: caseRecord.caseId,
        });
      }),
  }),
  documents: router({
    list: protectedProcedure
      .input(caseReferenceInput)
      .query(async ({ ctx, input }) => {
        const caseRecord = await getCaseByReference(input.caseId);
        if (!caseRecord) throw new TRPCError({ code: "NOT_FOUND", message: "Case was not found." });
        requireCaseAccess(ctx.user, caseRecord);
        return listCaseDocuments(caseRecord.id);
      }),
    upload: protectedProcedure
      .input(z.object({
        caseId: z.string().trim().min(4).max(32),
        kind: z.enum(caseDocumentKinds).default("EVIDENCE"),
        fileName: z.string().min(1).max(255),
        contentType: z.string().min(1).max(127),
        base64: z.string().min(4).max(14_000_000),
      }))
      .mutation(async ({ ctx, input }) => {
        const caseRecord = await getCaseByReference(input.caseId);
        if (!caseRecord) throw new TRPCError({ code: "NOT_FOUND", message: "Case was not found." });
        if (!canUpdateCaseDetails({ role: ctx.user.role, currentUserId: ctx.user.id, caseOwnerId: caseRecord.userId, status: caseRecord.status })) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to add documents to this case." });
        }

        const document = decodeCaseDocument({
          ...input,
          userId: ctx.user.id,
          caseId: caseRecord.caseId,
        });
        const uploaded = await storagePut(`lienguard/cases/${caseRecord.id}/${document.fileName}`, document.bytes, document.contentType);
        const saved = await createCaseDocument({
          caseRecordId: caseRecord.id,
          uploadedByUserId: ctx.user.id,
          kind: input.kind,
          fileName: document.fileName,
          storageKey: uploaded.key,
          contentType: document.contentType,
          sizeBytes: document.bytes.length,
        });
        if (!saved) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Document metadata could not be saved." });
        return saved;
      }),
    createRtiDraft: protectedProcedure
      .input(z.object({ caseId: z.string().trim().min(4).max(32), content: z.string().trim().min(40).max(12_000) }))
      .mutation(async ({ ctx, input }) => {
        const caseRecord = await getCaseByReference(input.caseId);
        if (!caseRecord) throw new TRPCError({ code: "NOT_FOUND", message: "Case was not found." });
        if (!canUpdateCaseDetails({ role: ctx.user.role, currentUserId: ctx.user.id, caseOwnerId: caseRecord.userId, status: caseRecord.status })) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to prepare an RTI draft for this case." });
        }
        const reason = rtiReason(caseRecord);
        if (!reason) throw new TRPCError({ code: "BAD_REQUEST", message: "This case is not eligible for RTI drafting yet." });

        const fileName = `${caseRecord.caseId}-rti-draft.txt`;
        const uploaded = await storagePut(`lienguard/cases/${caseRecord.id}/rti/${fileName}`, input.content, "text/plain");
        const saved = await createCaseDocument({
          caseRecordId: caseRecord.id,
          uploadedByUserId: ctx.user.id,
          kind: "RTI_DRAFT",
          fileName,
          storageKey: uploaded.key,
          contentType: "text/plain",
          sizeBytes: Buffer.byteLength(input.content, "utf8"),
          eventType: "RTI_DRAFT_CREATED",
          eventMessage: `RTI draft prepared because: ${reason}`,
        });
        if (!saved) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "RTI draft metadata could not be saved." });
        return saved;
      }),
    download: protectedProcedure
      .input(z.object({ caseId: z.string().trim().min(4).max(32), documentId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const caseRecord = await getCaseByReference(input.caseId);
        if (!caseRecord) throw new TRPCError({ code: "NOT_FOUND", message: "Case was not found." });
        requireCaseAccess(ctx.user, caseRecord);
        const documents = await listCaseDocuments(caseRecord.id);
        const document = documents.find(item => item.id === input.documentId);
        if (!document) throw new TRPCError({ code: "NOT_FOUND", message: "Document was not found for this case." });
        return { fileName: document.fileName, url: await storageGetSignedUrl(document.storageKey) };
      }),
  }),
  users: router({
    list: adminProcedure.query(() => listUsersForAdmin()),
    roleHistory: adminProcedure.query(() => getRoleChangeAudits()),
    changeRole: adminProcedure
      .input(z.object({ userId: z.number().int().positive(), role: z.enum(userRoles) }))
      .mutation(async ({ ctx, input }) => {
        if (input.userId === ctx.user.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Administrators cannot change their own role from this workflow.",
          });
        }

        try {
          const result = await changeUserRoleWithAudit({
            targetUserId: input.userId,
            changedByUserId: ctx.user.id,
            newRole: input.role,
          });
          logSecurityEvent({
            type: "ADMIN_ACTION",
            userId: ctx.user.id,
            ip: ctx.req?.ip,
            userAgent: (typeof ctx.req?.get === "function" ? ctx.req.get("user-agent") : ctx.req?.headers?.["user-agent"] as string) || undefined,
            details: { action: "role_change", targetUserId: input.userId, newRole: input.role },
            result: "SUCCESS",
          });
          return result;
        } catch (error) {
          if (error instanceof Error && error.message === "User was not found") {
            throw new TRPCError({ code: "NOT_FOUND", message: error.message });
          }
          throw error;
        }
      }),
  }),
  authorityDirectory: router({
    /** Deterministic routing — find the best official authority for a State/UT + case type. */
    recommend: protectedProcedure
      .input(z.object({
        stateUt: z.string().trim().min(2).max(100),
        caseType: z.string().trim().min(2).max(80),
        district: z.string().trim().min(2).max(100).optional(),
      }))
      .query(async ({ input }) => {
        const result = await getRecommendedAuthority(
          { stateUt: input.stateUt, caseType: input.caseType, district: input.district },
          (st, at) => findActiveAuthorityForRouting(st, at),
        );
        if (!result) {
          return {
            found: false as const,
            canonicalStateUt: normalizeStateUt(input.stateUt),
            message: "Authority information is currently unavailable for this State/UT. Please select or enter an authority manually.",
          };
        }
        return { found: true as const, ...result };
      }),

    /** Assign a directory authority to a case — records immutable snapshot + timeline event. */
    assignToCase: protectedProcedure
      .input(z.object({
        caseId: z.string().trim().min(4).max(32),
        authorityDirectoryId: z.number().int().positive(),
        routingReason: z.string().trim().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const caseRecord = await getCaseByReference(input.caseId);
        if (!caseRecord) throw new TRPCError({ code: "NOT_FOUND", message: "Case was not found." });
        requireCaseAccess(ctx.user, caseRecord);

        const authority = await getAuthorityById(input.authorityDirectoryId);
        if (!authority || !authority.active) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Authority not found or is inactive." });
        }

        const previousAssignment = await getLatestAuthorityAssignment(caseRecord.id);
        const isChange = Boolean(previousAssignment);

        // Write point-in-time snapshot
        const assignment = await recordAuthorityAssignment({
          caseRecordId: caseRecord.id,
          authorityDirectoryId: authority.id,
          authorityName: authority.authorityName,
          authorityEmail: authority.officialEmail || undefined,
          officerName: authority.officerName || undefined,
          designation: authority.designation || undefined,
          sourceName: authority.sourceName,
          sourceUrl: authority.sourceUrl,
          lastVerifiedAt: authority.lastVerifiedAt,
          routingReason: input.routingReason || `Assigned from official directory: ${authority.sourceName}`,
          assignedByUserId: ctx.user.id,
        });

        // Update live case fields used by communications workflow
        await updateCaseDetails({
          caseId: caseRecord.caseId,
          actorUserId: ctx.user.id,
          authorityName: authority.authorityName,
          authorityEmail: authority.officialEmail || null,
        });
        await updateCaseAuthorityDirectoryId(caseRecord.id, authority.id);

        await recordSystemCaseEvent({
          caseRecordId: caseRecord.id,
          type: isChange ? "AUTHORITY_CHANGED" : "AUTHORITY_ASSIGNED",
          message: `${isChange ? "Authority changed" : "Authority assigned"}: ${authority.authorityName} (${authority.stateUt}) — Source: ${authority.sourceName}`,
        });

        return { success: true, assignment };
      }),

    /** Get the latest authority assignment snapshot for a case. */
    getAssignment: protectedProcedure
      .input(caseReferenceInput)
      .query(async ({ ctx, input }) => {
        const caseRecord = await getCaseByReference(input.caseId);
        if (!caseRecord) throw new TRPCError({ code: "NOT_FOUND", message: "Case was not found." });
        requireCaseAccess(ctx.user, caseRecord);
        const assignment = await getLatestAuthorityAssignment(caseRecord.id);
        return assignment || null;
      }),

    /** Admin: list all authority directory entries. */
    list: adminProcedure
      .input(z.object({
        stateUt: z.string().trim().min(1).max(100).optional(),
        authorityType: z.enum(authorityTypes).optional(),
        activeOnly: z.boolean().default(false),
      }).optional())
      .query(async ({ input }) => {
        return listAuthorityDirectory({
          stateUt: input?.stateUt,
          authorityType: input?.authorityType,
          activeOnly: input?.activeOnly ?? false,
        });
      }),

    /** Admin: get single authority record by ID. */
    get: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => {
        const entry = await getAuthorityById(input.id);
        if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Authority record not found." });
        return entry;
      }),

    /** Admin: create a new authority directory record. */
    create: adminProcedure
      .input(z.object({
        stateUt: z.string().trim().min(2).max(100),
        district: z.string().trim().min(2).max(100).optional(),
        authorityType: z.enum(authorityTypes),
        authorityName: z.string().trim().min(2).max(200),
        officerName: z.string().trim().min(2).max(200).optional(),
        designation: z.string().trim().min(2).max(200).optional(),
        officialEmail: z.string().trim().email().max(320).optional(),
        phone: z.string().trim().min(5).max(30).optional(),
        sourceName: z.string().trim().min(2).max(200),
        sourceUrl: z.string().trim().url().max(512),
        lastVerifiedAt: z.coerce.date(),
      }))
      .mutation(async ({ input }) => {
        const created = await createAuthorityRecord(input);
        if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Authority record could not be created." });
        return created;
      }),

    /** Admin: update an existing authority record. */
    update: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        stateUt: z.string().trim().min(2).max(100).optional(),
        district: z.string().trim().min(2).max(100).nullable().optional(),
        authorityType: z.enum(authorityTypes).optional(),
        authorityName: z.string().trim().min(2).max(200).optional(),
        officerName: z.string().trim().min(2).max(200).nullable().optional(),
        designation: z.string().trim().min(2).max(200).nullable().optional(),
        officialEmail: z.string().trim().email().max(320).nullable().optional(),
        phone: z.string().trim().min(5).max(30).nullable().optional(),
        sourceName: z.string().trim().min(2).max(200).optional(),
        sourceUrl: z.string().trim().url().max(512).optional(),
        lastVerifiedAt: z.coerce.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        const existing = await getAuthorityById(id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Authority record not found." });
        return updateAuthorityRecord(id, updates);
      }),

    /** Admin: deactivate (soft-delete) an authority record. */
    deactivate: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const existing = await getAuthorityById(input.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Authority record not found." });
        return updateAuthorityRecord(input.id, { active: 0 });
      }),

    /** Admin: reactivate a deactivated authority record. */
    reactivate: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const existing = await getAuthorityById(input.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Authority record not found." });
        return updateAuthorityRecord(input.id, { active: 1 });
      }),
  }),
  demo: router({
    isDemo: publicProcedure.query(() => !ENV.isProduction || ENV.localDemoMode),
    getState: protectedProcedure.query(async ({ ctx }) => {
      const demoCase = await getLatestDemoCase();
      if (!demoCase) {
        return {
          hasCase: false,
          case: null,
          events: [],
          communications: [],
          step: 0,
          emailDeliveryMode: ENV.emailDeliveryMode,
          demoRecipients: Array.from(ENV.demoEmailRecipients),
          isMailerooConfigured: isMailerooConfigured(),
        };
      }

      const [events, communications, documents, latestAssignment] = await Promise.all([
        listCaseEvents(demoCase.id),
        listCaseCommunications(demoCase.id),
        listCaseDocuments(demoCase.id),
        getLatestAuthorityAssignment(demoCase.id),
      ]);

      let step = 1; // 1: Registered
      const hasFollowUp = communications.some(c => c.subject.includes("Formal Status Follow-up") || c.subject.includes("Follow-up"));
      const hasBankEscalation = communications.some(c => c.subject.includes("Nodal Bank Escalation"));
      const hasCyberEscalation = communications.some(c => c.subject.includes("Cybercrime Authority Escalation")) || demoCase.status === "ESCALATED";
      const hasRtiDraft = documents.some(d => d.kind === "RTI_DRAFT");

      if (hasFollowUp) step = 2;
      if (hasBankEscalation) step = 3;
      if (hasCyberEscalation) step = 4;
      if (hasRtiDraft) step = 5;

      const latestInbound = communications.find(c => c.direction === "inbound" || c.state === "received");
      const latestInboundAnalysis = latestInbound
        ? analyzeInboundReply({
            subject: latestInbound.subject,
            body: latestInbound.body,
            senderEmail: latestInbound.recipientEmail || undefined,
            caseId: demoCase.caseId,
          })
        : null;

      return {
        hasCase: true,
        case: demoCase,
        events,
        communications,
        documents,
        latestAssignment: latestAssignment || null,
        step,
        latestInboundAnalysis,
        emailDeliveryMode: ENV.emailDeliveryMode,
        demoRecipients: Array.from(ENV.demoEmailRecipients),
        isMailerooConfigured: isMailerooConfigured(),
      };
    }),
    registerDemoCase: protectedProcedure.mutation(async ({ ctx }) => {
      if (ENV.isProduction && !ENV.localDemoMode) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Demo mode is disabled in production." });
      }

      // Purge any existing demo cases first for a clean slate
      await purgeDemoCases();

      const authorityEmail = Array.from(ENV.demoEmailRecipients)[0] || "demo-authority@local.invalid";
      const officialHaryana = await findActiveAuthorityForRouting("Haryana", "CYBER_CELL");

      const created = await createCase({
        userId: ctx.user.id,
        title: "[HACKATHON DEMO] Unauthorized Bank Account Lien — Case Investigation",
        description: "Fictional cybercrime investigation lien placed on primary checking account following simulated suspicious P2P transfer report. Demo case for hackathon judges.",
        caseType: "CYBER_CRIME_LIEN",
        priority: "HIGH",
        bankName: "Demo National Bank (Nodal Operations)",
        lienAmount: "150000.00",
        lienDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        lienReference: "LIEN-DEMO-2026-9812",
        transactionReference: "TXN-DEMO-88492014",
        authorityName: officialHaryana?.authorityName || "Haryana State Cyber Crime Police Station (PHQ Panchkula)",
        authorityEmail,
        responseDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
        initialStatus: "AWAITING_RESPONSE",
      });

      if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create demo case." });

      // Record official recommendation event
      await recordSystemCaseEvent({
        caseRecordId: created.id,
        type: "AUTHORITY_RECOMMENDED",
        message: `Official Authority Recommended: ${officialHaryana?.authorityName || "Haryana State Cyber Crime Police Station"} (Haryana) — Source: National Cyber Crime Reporting Portal`,
      });

      // Record point-in-time assignment snapshot
      await recordAuthorityAssignment({
        caseRecordId: created.id,
        authorityDirectoryId: officialHaryana?.id,
        authorityName: officialHaryana?.authorityName || "Haryana State Cyber Crime Police Station (PHQ Panchkula)",
        authorityEmail: officialHaryana?.officialEmail || "sp-cybercrimephq.pol@hry.gov.in",
        officerName: officialHaryana?.officerName || "Sh. Sibash Kabiraj",
        designation: officialHaryana?.designation || "IPS, ADGP Cyber Haryana",
        sourceName: "National Cyber Crime Reporting Portal",
        sourceUrl: "https://cybercrime.gov.in/",
        lastVerifiedAt: officialHaryana?.lastVerifiedAt || new Date("2026-08-23"),
        routingReason: "Deterministic match: State/UT = Haryana, Category = Cyber Crime Lien",
        assignedByUserId: ctx.user.id,
      });

      if (officialHaryana?.id) {
        await updateCaseAuthorityDirectoryId(created.id, officialHaryana.id);
      }

      await recordSystemCaseEvent({
        caseRecordId: created.id,
        type: "AUTHORITY_ASSIGNED",
        message: `Official Authority Assigned: ${officialHaryana?.authorityName || "Haryana State Cyber Crime Police Station"} — Officer: ${officialHaryana?.officerName || "Sh. Sibash Kabiraj (ADGP Cyber)"}`,
      });

      const updated = await getCaseByReference(created.caseId);
      return { success: true, case: updated || created };
    }),
    sendFollowUp: protectedProcedure
      .input(z.object({ caseId: z.string().trim().min(4).max(32) }))
      .mutation(async ({ ctx, input }) => {
        if (ENV.isProduction && !ENV.localDemoMode) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Demo mode is disabled in production." });
        }
        const caseRecord = await getCaseByReference(input.caseId);
        if (!caseRecord) throw new TRPCError({ code: "NOT_FOUND", message: "Case was not found." });
        if (!caseRecord.title.startsWith("[HACKATHON DEMO]")) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This operation is only permitted on demo cases." });
        }

        const recipientEmail = Array.from(ENV.demoEmailRecipients)[0] || caseRecord.authorityEmail || "demo-authority@local.invalid";
        const subject = `[${caseRecord.caseId}] [HACKATHON DEMO] Formal Status Follow-up on Lien Freezing Order`;
        const body = [
          "*** HACKATHON DEMONSTRATION NOTICE - CONTROLLED TEST ENVIRONMENT ***",
          "",
          `To: ${caseRecord.authorityName || "Cyber Crime Investigation Cell"}`,
          `From: LienGuard Case Protection Desk`,
          `Case Reference: ${caseRecord.caseId}`,
          `Lien Reference: ${caseRecord.lienReference || "LIEN-DEMO-2026-9812"}`,
          `Lien Amount: INR 1,50,000.00`,
          "",
          `Dear Officer,`,
          "",
          `This is a formal, recorded follow-up regarding LienGuard case ${caseRecord.caseId}: ${caseRecord.title}.`,
          `The scheduled response deadline is recorded as ${caseRecord.responseDeadline?.toISOString().slice(0, 10) || "active"}.`,
          `Please provide the current investigation status and confirmation of required compliance documentation.`,
          "",
          "This message was generated from the LienGuard audit workflow.",
          "*** END HACKATHON DEMONSTRATION ***",
        ].join("\n");

        const communication = await createOutboundEmail({
          caseRecordId: caseRecord.id,
          recipientEmail,
          subject,
          body,
          automated: true,
          actorUserId: ctx.user.id,
        });

        if (!communication) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to queue communication." });
        }

        const delivery = await deliverQueuedCommunication(communication);
        const updated = await getCaseByReference(caseRecord.caseId);

        return {
          success: true,
          delivery,
          providerMessageId: delivery.state === "sent" ? delivery.providerMessageId : undefined,
          case: updated,
        };
      }),
    escalateToBank: protectedProcedure
      .input(z.object({ caseId: z.string().trim().min(4).max(32) }))
      .mutation(async ({ ctx, input }) => {
        if (ENV.isProduction && !ENV.localDemoMode) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Demo mode is disabled in production." });
        }
        const caseRecord = await getCaseByReference(input.caseId);
        if (!caseRecord) throw new TRPCError({ code: "NOT_FOUND", message: "Case was not found." });
        if (!caseRecord.title.startsWith("[HACKATHON DEMO]")) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This operation is only permitted on demo cases." });
        }

        // Set status to UNDER_REVIEW
        await setCaseStatus({
          caseId: caseRecord.caseId,
          previousStatus: caseRecord.status,
          nextStatus: "UNDER_REVIEW",
          actorUserId: ctx.user.id,
        });

        const recipientEmail = Array.from(ENV.demoEmailRecipients)[0] || "demo-bank@local.invalid";
        const subject = `[${caseRecord.caseId}] [HACKATHON DEMO] Urgent Nodal Bank Escalation: Non-Compliance Review`;
        const body = [
          "*** HACKATHON DEMONSTRATION NOTICE - CONTROLLED TEST ENVIRONMENT ***",
          "",
          `To: Nodal Bank Officer (${caseRecord.bankName || "Demo National Bank"})`,
          `From: LienGuard Governance Desk`,
          `Case Reference: ${caseRecord.caseId}`,
          `Lien Amount: INR 1,50,000.00`,
          "",
          `Dear Nodal Officer,`,
          "",
          `The statutory response period for the cyber lien on account under case ${caseRecord.caseId} has elapsed without substantive authority clarification.`,
          `Pursuant to RBI Master Directions on customer account operations, we formally request immediate internal portfolio review and verification of freezing order provenance.`,
          "",
          "This message was generated from the LienGuard audit workflow.",
          "*** END HACKATHON DEMONSTRATION ***",
        ].join("\n");

        const communication = await createOutboundEmail({
          caseRecordId: caseRecord.id,
          recipientEmail,
          subject,
          body,
          automated: true,
          actorUserId: ctx.user.id,
        });

        await recordSystemCaseEvent({
          caseRecordId: caseRecord.id,
          type: "DEADLINE_FOLLOW_UP_QUEUED",
          message: "Nodal bank escalation notice queued for portfolio compliance audit.",
          actorLabel: "LienGuard Escalation Engine",
        });

        if (!communication) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to queue communication." });
        }

        const delivery = await deliverQueuedCommunication(communication);
        const updated = await getCaseByReference(caseRecord.caseId);

        return {
          success: true,
          delivery,
          providerMessageId: delivery.state === "sent" ? delivery.providerMessageId : undefined,
          case: updated,
        };
      }),
    escalateToCybercrime: protectedProcedure
      .input(z.object({ caseId: z.string().trim().min(4).max(32) }))
      .mutation(async ({ ctx, input }) => {
        if (ENV.isProduction && !ENV.localDemoMode) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Demo mode is disabled in production." });
        }
        const caseRecord = await getCaseByReference(input.caseId);
        if (!caseRecord) throw new TRPCError({ code: "NOT_FOUND", message: "Case was not found." });
        if (!caseRecord.title.startsWith("[HACKATHON DEMO]")) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This operation is only permitted on demo cases." });
        }

        // Set status to ESCALATED
        await setCaseStatus({
          caseId: caseRecord.caseId,
          previousStatus: caseRecord.status,
          nextStatus: "ESCALATED",
          actorUserId: ctx.user.id,
        });

        const recipientEmail = Array.from(ENV.demoEmailRecipients)[0] || caseRecord.authorityEmail || "demo-authority@local.invalid";
        const subject = `[${caseRecord.caseId}] [HACKATHON DEMO] Cybercrime Authority Escalation: Statutory Period Elapsed`;
        const body = [
          "*** HACKATHON DEMONSTRATION NOTICE - CONTROLLED TEST ENVIRONMENT ***",
          "",
          `To: Superintendent of Police / Cyber Crime Investigation Cell`,
          `From: LienGuard Statutory Escalation Desk`,
          `Case Reference: ${caseRecord.caseId}`,
          `Lien Amount: INR 1,50,000.00`,
          `Lien Reference: ${caseRecord.lienReference || "LIEN-DEMO-2026-9812"}`,
          "",
          `Dear Officer-in-Charge,`,
          "",
          `Formal escalation notice regarding Case ${caseRecord.caseId}. The initial 48-hour response window has expired without investigative response.`,
          `The matter has been escalated to Tier-2 supervisory review. An official RTI draft is now prepared for administrative record tracking.`,
          "",
          "This message was generated from the LienGuard audit workflow.",
          "*** END HACKATHON DEMONSTRATION ***",
        ].join("\n");

        const communication = await createOutboundEmail({
          caseRecordId: caseRecord.id,
          recipientEmail,
          subject,
          body,
          automated: true,
          actorUserId: ctx.user.id,
        });

        await recordSystemCaseEvent({
          caseRecordId: caseRecord.id,
          type: "DEADLINE_ESCALATED",
          message: "Statutory grace period elapsed. Case escalated to Cyber Crime Cell supervisory authority.",
          actorLabel: "LienGuard Escalation Engine",
        });

        if (!communication) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to queue communication." });
        }

        const delivery = await deliverQueuedCommunication(communication);
        const updated = await getCaseByReference(caseRecord.caseId);

        return {
          success: true,
          delivery,
          providerMessageId: delivery.state === "sent" ? delivery.providerMessageId : undefined,
          case: updated,
        };
      }),
    generateRtiDraft: protectedProcedure
      .input(z.object({ caseId: z.string().trim().min(4).max(32) }))
      .mutation(async ({ ctx, input }) => {
        if (ENV.isProduction && !ENV.localDemoMode) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Demo mode is disabled in production." });
        }
        const caseRecord = await getCaseByReference(input.caseId);
        if (!caseRecord) throw new TRPCError({ code: "NOT_FOUND", message: "Case was not found." });
        if (!caseRecord.title.startsWith("[HACKATHON DEMO]")) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This operation is only permitted on demo cases." });
        }
        if (caseRecord.status !== "ESCALATED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "RTI drafting is only permitted after a case has reached the ESCALATED status.",
          });
        }

        const fileName = `${caseRecord.caseId}-rti-draft.txt`;
        const content = [
          "APPLICATION UNDER SECTION 6(1) OF THE RIGHT TO INFORMATION ACT, 2005",
          "====================================================================",
          "",
          "To:",
          "The Central Public Information Officer (CPIO) / Public Information Officer,",
          "Office of the Superintendent of Police / Cyber Crime Investigation Cell.",
          "",
          `Subject: Request for Information regarding Bank Lien / Freezing Order on Case ${caseRecord.caseId}`,
          "",
          "1. PARTICULARS OF THE APPLICANT:",
          `   Name: ${ctx.user.name || "Citizen Applicant"}`,
          `   Email: ${ctx.user.email || "applicant@example.com"}`,
          "",
          "2. PARTICULARS OF THE INFORMATION SOUGHT:",
          `   a) Copy of the formal police requisition / notice issued under Section 91 / 102 CrPC pertaining to Lien Reference: ${caseRecord.lienReference || "LIEN-DEMO-2026-9812"}.`,
          `   b) Date of complaint registration, FIR/NCR number, and current investigative stage of the associated matter.`,
          `   c) Reasons recorded in writing for freezing the lien amount of INR ${caseRecord.lienAmount || "1,50,000.00"} on account.`,
          `   d) Name and designation of the Investigating Officer (IO) assigned to the case.`,
          `   e) Expected timeline for submitting clearance report / NOC to the bank.`,
          "",
          "3. DECLARATION:",
          "   The applicant is a citizen of India and the information sought is within the purview of the RTI Act, 2005.",
          "",
          "*** REVIEW-ONLY DRAFT — NOT SUBMITTED AUTOMATICALLY ***",
        ].join("\n");

        const uploaded = await storagePut(`lienguard/cases/${caseRecord.id}/rti/${fileName}`, content, "text/plain");
        const doc = await createCaseDocument({
          caseRecordId: caseRecord.id,
          uploadedByUserId: ctx.user.id,
          kind: "RTI_DRAFT",
          fileName,
          storageKey: uploaded.key,
          contentType: "text/plain",
          sizeBytes: Buffer.byteLength(content, "utf-8"),
          eventType: "RTI_DRAFT_CREATED",
          eventMessage: `RTI draft generated for escalated case ${caseRecord.caseId}. Saved for manual legal review.`,
        });

        const updated = await getCaseByReference(caseRecord.caseId);
        return {
          success: true,
          content,
          documentId: doc?.id,
          case: updated,
        };
      }),
    resetDemo: protectedProcedure.mutation(async ({ ctx }) => {
      if (ENV.isProduction && !ENV.localDemoMode) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Demo mode is disabled in production." });
      }
      const count = await purgeDemoCases();
      return { success: true, count };
    }),
    simulateInboundReply: protectedProcedure
      .input(z.object({
        caseId: z.string().trim().min(4).max(32),
        body: z.string().trim().min(5).max(8000).optional(),
        senderEmail: z.string().trim().email().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ENV.isProduction && !ENV.localDemoMode) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Demo actions are disabled in production." });
        }
        const caseRecord = await getCaseByReference(input.caseId);
        if (!caseRecord) throw new TRPCError({ code: "NOT_FOUND", message: "Case was not found." });
        requireCaseAccess(ctx.user, caseRecord);

        const senderEmail = input.senderEmail || caseRecord.authorityEmail || "authority-demo@local.invalid";
        const providerMessageId = `demo-inbound-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const body = input.body || `[LOCAL DEMO] Inbound authority response regarding case ${caseRecord.caseId}. The matter is under official review.`;

        const subject = `RE: [${caseRecord.caseId}] Authority Response`;
        const result = await recordInboundEmail({
          caseRecordId: caseRecord.id,
          providerMessageId,
          senderEmail,
          subject,
          body,
        });

        const analysis = analyzeInboundReply({
          subject,
          body,
          senderEmail,
          caseId: caseRecord.caseId,
        });

        if (!result.duplicate) {
          await createUserNotification({
            userId: caseRecord.userId,
            title: analysis.intent === "REQUESTING_DOCUMENTS"
              ? `Action Required: Documents requested for ${caseRecord.caseId}`
              : `New reply received for case ${caseRecord.caseId}`,
            message: `${senderEmail}: ${analysis.summary}`,
          });
        }

        return {
          success: true,
          caseId: caseRecord.caseId,
          duplicate: result.duplicate,
          communication: result.communication,
          analysis,
        };
      }),
    simulateDeadlineOverdue: protectedProcedure
      .input(z.object({
        caseId: z.string().trim().min(4).max(32),
        hoursOverdue: z.number().min(1).max(720).default(72),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ENV.isProduction && !ENV.localDemoMode) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Demo actions are disabled in production." });
        }
        const caseRecord = await getCaseByReference(input.caseId);
        if (!caseRecord) throw new TRPCError({ code: "NOT_FOUND", message: "Case was not found." });
        requireCaseAccess(ctx.user, caseRecord);

        const pastDeadline = new Date(Date.now() - input.hoursOverdue * 60 * 60 * 1000);
        await updateCaseDetails({
          caseId: caseRecord.caseId,
          actorUserId: ctx.user.id,
          responseDeadline: pastDeadline,
        });

        if (caseRecord.status === "OPEN" || caseRecord.status === "UNDER_REVIEW") {
          await setCaseStatus({
            caseId: caseRecord.caseId,
            previousStatus: caseRecord.status,
            nextStatus: "AWAITING_RESPONSE",
            actorUserId: ctx.user.id,
          });
        }

        const summary = await runDeadlineAutomation();
        const updated = await getCaseByReference(caseRecord.caseId);

        return { success: true, summary, case: updated };
      }),
  }),
});

export type AppRouter = typeof appRouter;
