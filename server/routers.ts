import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { caseDocumentKinds, casePriorities, caseStatuses, userRoles } from "../drizzle/schema";
import { canAccessCase, canUpdateCaseDetails, canUpdateCaseStatus, createCaseTimeline, getCaseHealth, isCaseStatusTransitionAllowed } from "./cases";
import {
  changeUserRoleWithAudit,
  createCase,
  createCaseDocument,
  createOutboundEmail,
  getCaseByReference,
  getNotificationsForUser,
  getRoleChangeAudits,
  listCaseCommunications,
  listCaseDocuments,
  listCaseEvents,
  listCasesForUser,
  listUsersForAdmin,
  markNotificationRead,
  recordCaseFollowUp,
  setCaseStatus,
  updateCaseDetails,
} from "./db";
import { decodeCaseDocument } from "./documents";
import { deliverQueuedCommunication } from "./automation";
import { isValidEmailAddress } from "./maileroo";
import { storageGetSignedUrl, storagePut } from "./storage";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
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

function requireCaseAccess(user: { id: number; role: (typeof userRoles)[number] }, caseRecord: { userId: number }) {
  if (!canAccessCase(user.role, user.id, caseRecord.userId)) {
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
    demoAvailable: publicProcedure.query(() => true),
    demoLogin: publicProcedure
      .input(z.object({ role: z.enum(userRoles).default("citizen") }).optional())
      .mutation(async ({ ctx, input }) => {
        const role = input?.role || "citizen";
        const roleNames: Record<string, string> = {
          citizen: "Citizen User",
          bank: "Nodal Bank Officer",
          authority: "Designated Police Authority",
          admin: "LienGuard System Administrator",
        };
        const openId = `demo-${role}`;
        const name = roleNames[role] || "LienGuard User";

        await db.upsertUser({
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

        return { success: true, role } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
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
        const created = await createCase({ userId: ctx.user.id, ...input });
        if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Case could not be created." });
        return created;
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

        const document = decodeCaseDocument(input);
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
          return await changeUserRoleWithAudit({
            targetUserId: input.userId,
            changedByUserId: ctx.user.id,
            newRole: input.role,
          });
        } catch (error) {
          if (error instanceof Error && error.message === "User was not found") {
            throw new TRPCError({ code: "NOT_FOUND", message: error.message });
          }
          throw error;
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
