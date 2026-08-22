import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { casePriorities, caseStatuses, userRoles } from "../drizzle/schema";
import { canAccessCase, canUpdateCaseDetails, canUpdateCaseStatus, createCaseTimeline, getCaseHealth, isCaseStatusTransitionAllowed } from "./cases";
import {
  changeUserRoleWithAudit,
  createCase,
  getCaseByReference,
  getNotificationsForUser,
  getRoleChangeAudits,
  listCaseCommunications,
  listCasesForUser,
  listUsersForAdmin,
  markNotificationRead,
  recordCaseFollowUp,
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
    detail: protectedProcedure
      .input(z.object({ caseId: z.string().min(4).max(32) }))
      .query(async ({ ctx, input }) => {
        const caseRecord = await getCaseByReference(input.caseId);
        if (!caseRecord) throw new TRPCError({ code: "NOT_FOUND", message: "Case was not found." });
        if (!canAccessCase(ctx.user.role, ctx.user.id, caseRecord.userId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this case." });
        }
        return {
          case: caseRecord,
          health: getCaseHealth(caseRecord),
          timeline: createCaseTimeline(caseRecord),
        };
      }),
    create: protectedProcedure
      .input(z.object({
        title: z.string().trim().min(4).max(180),
        description: z.string().trim().min(10).max(5000),
        caseType: z.string().trim().min(2).max(80),
        priority: z.enum(casePriorities).default("NORMAL"),
        bankName: z.string().trim().min(2).max(160).optional(),
        lienAmount: z.string().trim().regex(/^\d+(?:\.\d{1,2})?$/, "Enter a valid lien amount.").optional(),
        lienDate: z.coerce.date().optional(),
        lienReference: z.string().trim().min(2).max(96).optional(),
        transactionReference: z.string().trim().min(2).max(96).optional(),
        authorityName: z.string().trim().min(2).max(160).optional(),
        responseDeadline: z.coerce.date().optional(),
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
        bankName: z.string().trim().min(2).max(160).optional(),
        lienAmount: z.string().trim().regex(/^\d+(?:\.\d{1,2})?$/, "Enter a valid lien amount.").optional(),
        lienDate: z.coerce.date().optional(),
        lienReference: z.string().trim().min(2).max(96).optional(),
        transactionReference: z.string().trim().min(2).max(96).optional(),
        authorityName: z.string().trim().min(2).max(160).optional(),
        responseDeadline: z.coerce.date().optional(),
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
      .input(z.object({ caseId: z.string().min(4).max(32), status: z.enum(caseStatuses) }))
      .mutation(async ({ ctx, input }) => {
        if (!canUpdateCaseStatus(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only authorities and administrators can update case status." });
        }
        const current = await getCaseByReference(input.caseId);
        if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Case was not found." });
        if (!isCaseStatusTransitionAllowed(current.status, input.status)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This case has reached a terminal status and cannot be reopened." });
        }
        const updated = await setCaseStatus(input.caseId, input.status);
        if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Case status could not be updated." });
        return updated;
      }),
  }),
  communications: router({
    list: protectedProcedure
      .input(z.object({ caseId: z.string().min(4).max(32) }))
      .query(async ({ ctx, input }) => {
        const caseRecord = await getCaseByReference(input.caseId);
        if (!caseRecord) throw new TRPCError({ code: "NOT_FOUND", message: "Case was not found." });
        if (!canAccessCase(ctx.user.role, ctx.user.id, caseRecord.userId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this case." });
        }
        return listCaseCommunications(caseRecord.id);
      }),
    recordFollowUp: protectedProcedure
      .input(z.object({ caseId: z.string().min(4).max(32), note: z.string().trim().max(1200).optional() }))
      .mutation(async ({ ctx, input }) => {
        const caseRecord = await getCaseByReference(input.caseId);
        if (!caseRecord) throw new TRPCError({ code: "NOT_FOUND", message: "Case was not found." });
        if (!canUpdateCaseDetails({ role: ctx.user.role, currentUserId: ctx.user.id, caseOwnerId: caseRecord.userId, status: caseRecord.status })) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to record a follow-up for this case." });
        }
        const entry = await recordCaseFollowUp({ caseRecordId: caseRecord.id, authorityName: caseRecord.authorityName, note: input.note });
        if (!entry) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Follow-up could not be recorded." });
        return entry;
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
