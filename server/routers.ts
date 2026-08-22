import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { casePriorities, caseStatuses, userRoles } from "../drizzle/schema";
import { canAccessCase, canUpdateCaseDetails, canUpdateCaseStatus, isCaseStatusTransitionAllowed } from "./cases";
import {
  changeUserRoleWithAudit,
  createCase,
  dispatchEscalation,
  dispatchFollowUpReminder,
  dispatchInitialNotice,
  generateOrUpdateRtiDraft,
  getCaseByReference,
  getCaseWithDetails,
  getDashboardMetrics,
  getNotificationsForUser,
  getRoleChangeAudits,
  listCasesForUser,
  listUsersForAdmin,
  markNotificationRead,
  recordInboundResponse,
  setCaseStatus,
  updateCaseDetails,
} from "./db";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
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
      .mutation(({ ctx, input }) => markNotificationRead(input.notificationId, ctx.user.id)),
  }),
  cases: router({
    metrics: protectedProcedure.query(({ ctx }) => getDashboardMetrics(ctx.user)),
    list: protectedProcedure.query(({ ctx }) => listCasesForUser(ctx.user)),
    get: protectedProcedure
      .input(z.object({ caseId: z.string().min(4).max(32) }))
      .query(async ({ ctx, input }) => {
        const caseRecord = await getCaseByReference(input.caseId);
        if (!caseRecord) throw new TRPCError({ code: "NOT_FOUND", message: "Case was not found." });
        if (!canAccessCase(ctx.user.role, ctx.user.id, caseRecord.userId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this case." });
        }
        return caseRecord;
      }),
    getDetailed: protectedProcedure
      .input(z.object({ caseId: z.string().min(4).max(32) }))
      .query(async ({ ctx, input }) => {
        const details = await getCaseWithDetails(input.caseId);
        if (!details || !details.caseRecord) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Case was not found." });
        }
        if (!canAccessCase(ctx.user.role, ctx.user.id, details.caseRecord.userId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this case." });
        }
        return details;
      }),
    create: protectedProcedure
      .input(z.object({
        title: z.string().trim().min(4).max(180),
        description: z.string().trim().min(10).max(5000),
        caseType: z.string().trim().min(2).max(80),
        priority: z.enum(casePriorities).default("NORMAL"),
        bankName: z.string().trim().max(120).optional(),
        accountNumber: z.string().trim().max(40).optional(),
        branchName: z.string().trim().max(120).optional(),
        ifscCode: z.string().trim().max(20).optional(),
        lienAmount: z.string().trim().max(30).optional(),
        disputeRefNumber: z.string().trim().max(100).optional(),
        ncrpAckNumber: z.string().trim().max(100).optional(),
        firNumber: z.string().trim().max(100).optional(),
        freezingAuthority: z.string().trim().max(180).optional(),
        authorityEmail: z.string().trim().email().or(z.string().max(0)).optional(),
        nodalOfficerEmail: z.string().trim().email().or(z.string().max(0)).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const created = await createCase({ userId: ctx.user.id, ...input });
        if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Case could not be created." });
        return created;
      }),
    update: protectedProcedure
      .input(z.object({
        caseId: z.string().min(4).max(32),
        title: z.string().trim().min(4).max(180).optional(),
        description: z.string().trim().min(10).max(5000).optional(),
        caseType: z.string().trim().min(2).max(80).optional(),
        priority: z.enum(casePriorities).optional(),
        bankName: z.string().trim().max(120).optional(),
        accountNumber: z.string().trim().max(40).optional(),
        branchName: z.string().trim().max(120).optional(),
        ifscCode: z.string().trim().max(20).optional(),
        lienAmount: z.string().trim().max(30).optional(),
        disputeRefNumber: z.string().trim().max(100).optional(),
        ncrpAckNumber: z.string().trim().max(100).optional(),
        firNumber: z.string().trim().max(100).optional(),
        freezingAuthority: z.string().trim().max(180).optional(),
        authorityEmail: z.string().trim().email().or(z.string().max(0)).optional(),
        nodalOfficerEmail: z.string().trim().email().or(z.string().max(0)).optional(),
      }).refine(input => Object.keys(input).some(key => key !== "caseId"), {
        message: "Provide at least one case field to update.",
      }))
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
        const updated = await updateCaseDetails(input);
        if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Case could not be updated." });
        return updated;
      }),
    updateStatus: protectedProcedure
      .input(z.object({
        caseId: z.string().min(4).max(32),
        status: z.enum(caseStatuses),
        notes: z.string().trim().max(2000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!canUpdateCaseStatus(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only authorities and administrators can update case status." });
        }
        const current = await getCaseByReference(input.caseId);
        if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Case was not found." });
        if (!isCaseStatusTransitionAllowed(current.status, input.status)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This case has reached a terminal status and cannot be reopened." });
        }
        const updated = await setCaseStatus(input.caseId, input.status, ctx.user.role, input.notes);
        if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Case status could not be updated." });
        return updated;
      }),
    sendInitialNotice: protectedProcedure
      .input(z.object({ caseId: z.string().min(4).max(32) }))
      .mutation(async ({ ctx, input }) => {
        const current = await getCaseByReference(input.caseId);
        if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Case was not found." });
        if (!canAccessCase(ctx.user.role, ctx.user.id, current.userId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this case." });
        }
        const result = await dispatchInitialNotice({
          caseId: input.caseId,
          citizenName: ctx.user.name || "Bonafide Citizen",
          citizenEmail: ctx.user.email,
          actorRole: ctx.user.role,
        });
        return result;
      }),
    sendFollowUpReminder: protectedProcedure
      .input(z.object({ caseId: z.string().min(4).max(32) }))
      .mutation(async ({ ctx, input }) => {
        const current = await getCaseByReference(input.caseId);
        if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Case was not found." });
        if (!canAccessCase(ctx.user.role, ctx.user.id, current.userId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this case." });
        }
        const result = await dispatchFollowUpReminder({
          caseId: input.caseId,
          citizenName: ctx.user.name || "Bonafide Citizen",
          actorRole: ctx.user.role,
        });
        return result;
      }),
    escalate: protectedProcedure
      .input(z.object({
        caseId: z.string().min(4).max(32),
        tier: z.union([z.literal(2), z.literal(3)]),
      }))
      .mutation(async ({ ctx, input }) => {
        const current = await getCaseByReference(input.caseId);
        if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Case was not found." });
        if (!canAccessCase(ctx.user.role, ctx.user.id, current.userId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this case." });
        }
        const result = await dispatchEscalation({
          caseId: input.caseId,
          citizenName: ctx.user.name || "Bonafide Citizen",
          tier: input.tier,
          actorRole: ctx.user.role,
        });
        return result;
      }),
    recordResponse: protectedProcedure
      .input(z.object({
        caseId: z.string().min(4).max(32),
        sender: z.string().trim().min(3).max(320),
        subject: z.string().trim().min(3).max(300),
        body: z.string().trim().min(5).max(10000),
        nextStatus: z.enum(caseStatuses).optional(),
        notes: z.string().trim().max(2000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const current = await getCaseByReference(input.caseId);
        if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Case was not found." });
        if (!canAccessCase(ctx.user.role, ctx.user.id, current.userId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this case." });
        }
        const result = await recordInboundResponse({
          ...input,
          actorRole: ctx.user.role,
        });
        return result;
      }),
    generateRtiDraft: protectedProcedure
      .input(z.object({
        caseId: z.string().min(4).max(32),
        citizenAddress: z.string().trim().max(300).optional(),
        factsSummary: z.string().trim().max(3000).optional(),
        queriesRequested: z.string().trim().max(5000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const current = await getCaseByReference(input.caseId);
        if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Case was not found." });
        if (!canAccessCase(ctx.user.role, ctx.user.id, current.userId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this case." });
        }
        const result = await generateOrUpdateRtiDraft({
          ...input,
          citizenName: ctx.user.name || "Bonafide Citizen",
          actorRole: ctx.user.role,
        });
        return result;
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
