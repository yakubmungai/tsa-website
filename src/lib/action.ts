import 'server-only';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from './auth';
import { writeAudit, type AuditAction } from './audit';

/**
 * One wrapper for every server action.
 *
 * Server actions are public HTTP endpoints. Anyone who can discover the action
 * id can call one with any payload, so authorisation and validation have to
 * live in the action itself — not in the page that renders the button.
 *
 * Routing every action through here fixes three classes of problem at once:
 *
 *  1. Unvalidated input. Actions previously took `data: any` and spread it
 *     straight into Prisma.
 *  2. Leaked internals. Actions returned `err.message` from raw exceptions, so
 *     Prisma errors were rendered in the browser.
 *  3. Unattributed changes. Nothing recorded who changed a member or posted a
 *     transaction.
 */

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export interface ActionContext {
  userId: string;
  role: 'MEMBER' | 'ADMIN';
  memberId: string | null;
  email: string | null;
}

type Guard = 'public' | 'auth' | 'admin';

class ActionError extends Error {
  constructor(
    message: string,
    readonly fieldErrors?: Record<string, string[]>
  ) {
    super(message);
  }
}

/**
 * Throw from inside a handler to return a specific message to the user.
 * Anything else that throws becomes a generic message, so internals never leak.
 */
export function actionError(message: string, fieldErrors?: Record<string, string[]>): never {
  throw new ActionError(message, fieldErrors);
}

async function resolveContext(): Promise<ActionContext | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return {
    userId: session.user.id,
    role: session.user.role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
    memberId: session.user.memberId ?? null,
    email: session.user.email ?? null,
  };
}

interface DefineActionOptions<TIn, TOut> {
  /** Shown in logs and audit entries. */
  name: string;
  schema: z.ZodType<TIn, z.ZodTypeDef, unknown>;
  guard: Guard;
  /**
   * Handlers write their own audit entries with `writeAudit`, rather than the
   * wrapper doing it from the return value. Two reasons: only the handler can
   * pass its transaction client, which anything moving money must do so the
   * audit row and the change commit together; and only the handler knows what
   * is worth recording.
   */
  handler: (input: TIn, ctx: ActionContext) => Promise<TOut>;
}

/**
 * Build a server action.
 *
 * The returned function accepts `unknown` on purpose: it is reachable from the
 * network, so the payload is untrusted until the schema has parsed it.
 */
export function defineAction<TIn, TOut>(opts: DefineActionOptions<TIn, TOut>) {
  return async function run(raw: unknown): Promise<ActionResult<TOut>> {
    // 1. Authorise before doing anything else, so an unauthorised caller cannot
    //    use validation errors to probe the shape of our data.
    let ctx: ActionContext | null = null;
    if (opts.guard !== 'public') {
      ctx = await resolveContext();
      if (!ctx) {
        return { success: false, error: 'You need to sign in to do that.' };
      }
      if (opts.guard === 'admin' && ctx.role !== 'ADMIN') {
        await writeAudit({
          action: 'LOGIN_FAILED',
          entityType: 'ServerAction',
          entityId: opts.name,
          summary: `Non-admin attempted admin action ${opts.name}`,
          success: false,
          failureReason: 'FORBIDDEN',
        });
        return { success: false, error: 'You do not have permission to do that.' };
      }
    }
    const context: ActionContext = ctx ?? {
      userId: 'anonymous',
      role: 'MEMBER',
      memberId: null,
      email: null,
    };

    // 2. Validate.
    const parsed = opts.schema.safeParse(raw);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      return {
        success: false,
        error: 'Please check the highlighted fields and try again.',
        fieldErrors: flat.fieldErrors as Record<string, string[]>,
      };
    }

    // 3. Run.
    try {
      const output = await opts.handler(parsed.data, context);
      return { success: true, data: output };
    } catch (err) {
      if (err instanceof ActionError) {
        return { success: false, error: err.message, fieldErrors: err.fieldErrors };
      }
      // Never surface the raw message: it carries Prisma internals, table names
      // and sometimes row contents.
      console.error(`[action:${opts.name}] failed`, err);
      return {
        success: false,
        error: 'Something went wrong. Please try again, or contact a TSA leader if it keeps happening.',
      };
    }
  };
}
