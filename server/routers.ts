import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { userRoles } from "../drizzle/schema";
import {
  changeUserRoleWithAudit,
  getNotificationsForUser,
  getRoleChangeAudits,
  listUsersForAdmin,
  markNotificationRead,
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
