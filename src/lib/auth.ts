import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from './db';
import { verifyPassword } from './crypto';
import { isDemoMode, isDemoPersona, DEMO_PERSONAS } from './demo';

// Fail loudly rather than falling back to a hardcoded secret. A predictable
// secret makes every session JWT — including admin sessions — forgeable.
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
if (!NEXTAUTH_SECRET) {
  throw new Error(
    'NEXTAUTH_SECRET is not set. Refusing to start with a predictable session secret.'
  );
}

// A throwaway hash with the same cost as a real one. Verified against whenever
// the email is unknown, so a missing account and a wrong password take the same
// amount of time and return the same message — no user-existence oracle.
const DUMMY_PASSWORD_HASH =
  '0000000000000000000000000000000000000000000000000000000000000000:' +
  '0'.repeat(128);

const INVALID_CREDENTIALS = 'Invalid email or password';

const providers: any[] = [
  CredentialsProvider({
    name: 'Credentials',
    credentials: {
      email: { label: 'Email', type: 'text' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error('Please enter an email and password');
      }

      const user = await db.user.findUnique({
        where: { email: credentials.email.toLowerCase() },
        include: { member: true },
      });

      // Always run a verification, even when there is no user, so response
      // timing does not reveal whether the address is registered.
      const { valid, needsRehash } = await verifyPassword(
        credentials.password,
        user?.passwordHash ?? DUMMY_PASSWORD_HASH
      );

      if (!user || !user.passwordHash || !valid) {
        throw new Error(INVALID_CREDENTIALS);
      }

      // Silently upgrade hashes still using the old weak parameters.
      if (needsRehash) {
        const { hashPassword } = await import('./crypto');
        await db.user.update({
          where: { id: user.id },
          data: { passwordHash: await hashPassword(credentials.password) },
        });
      }

      await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        memberId: user.memberId || null,
        name: user.member?.names || user.email?.split('@')[0] || 'TSA member',
        sessionVersion: user.sessionVersion,
      };
    },
  }),

  /**
   * Phone sign-in.
   *
   * Takes a ticket the server minted after checking a code, plus which of the
   * accounts that ticket permits. It never sees the code: by the time this
   * runs, possession of the number is already proved.
   */
  CredentialsProvider({
    id: 'phone-otp',
    name: 'Phone code',
    credentials: {
      ticket: { label: 'Ticket', type: 'text' },
      selectionId: { label: 'Account', type: 'text' },
      selectionKind: { label: 'Kind', type: 'text' },
    },
    async authorize(credentials) {
      const ticket = credentials?.ticket;
      const selectionId = credentials?.selectionId;
      const selectionKind = credentials?.selectionKind;

      if (!ticket || !selectionId || (selectionKind !== 'user' && selectionKind !== 'claim')) {
        throw new Error('Your sign-in request has expired. Please start again.');
      }

      const { completePhoneLogin, PhoneLoginError } = await import('./phone-login');
      try {
        return await completePhoneLogin(ticket, selectionId, selectionKind);
      } catch (err) {
        if (err instanceof PhoneLoginError) throw new Error(err.message);
        console.error('[auth:phone-otp] failed', err);
        throw new Error('Sign-in failed. Please try again.');
      }
    },
  }),
];

/**
 * Demo sign-in for the leaders' test environment.
 *
 * Registered only when DEMO_MODE is on, and `isDemoMode()` refuses to return
 * true on a production hostname — so this provider does not exist on the live
 * site. It takes a persona name, never a credential: demo accounts are seeded
 * with no password hash, so this is the only way into one.
 */
if (isDemoMode()) {
  providers.push(
    CredentialsProvider({
      id: 'demo',
      name: 'Demo persona',
      credentials: { persona: { label: 'Persona', type: 'text' } },
      async authorize(credentials) {
        // Re-check inside the handler: the provider list is built once at module
        // load, so this is the guard that holds if the process is long-lived.
        if (!isDemoMode()) throw new Error('Demo sign-in is not available.');

        const persona = credentials?.persona;
        if (!isDemoPersona(persona)) throw new Error('Unknown demo persona.');

        const user = await db.user.findUnique({
          where: { email: DEMO_PERSONAS[persona].email },
          include: { member: true },
        });
        if (!user) {
          throw new Error('Demo data has not been seeded. Run `npm run seed:demo`.');
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          memberId: user.memberId || null,
          name: user.member?.names || DEMO_PERSONAS[persona].labelEn,
        };
      },
    })
  );
}

/**
 * Confirm an acting-session id really belongs to this user and is still open,
 * before it is written into the token. Returns null if not.
 */
async function validateActingSessionId(
  actingSessionId: string,
  userId: string
): Promise<string | null> {
  const acting = await db.actingSession.findUnique({
    where: { id: actingSessionId },
    include: { delegation: { select: { status: true, expiresAt: true } } },
  });

  const valid =
    acting &&
    acting.actorUserId === userId &&
    acting.endedAt === null &&
    acting.expiresAt > new Date() &&
    acting.delegation.status === 'ACTIVE' &&
    (acting.delegation.expiresAt === null || acting.delegation.expiresAt > new Date());

  return valid ? acting.id : null;
}

export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.memberId = (user as any).memberId;
        token.ver = (user as any).sessionVersion ?? 0;
        token.actingSessionId = null;
      }

      // Switching into or out of acting-on-behalf-of. The value from the client
      // is untrusted: it is re-checked against the database before being
      // written to the token, and re-checked again on every request in
      // getEffectiveContext().
      if (trigger === 'update') {
        const requested = (session as { actingSessionId?: string | null } | undefined)
          ?.actingSessionId;
        token.actingSessionId = requested
          ? await validateActingSessionId(String(requested), token.id as string)
          : null;
      }

      return token;
    },
    async session({ session, token }) {
      if (!token?.id) return session;

      // Read role, member link and session version from the database rather
      // than trusting a token that may be up to 30 days old. Without this, a
      // role change or a revoked account stays live until the token expires.
      const user = await db.user.findUnique({
        where: { id: token.id as string },
        select: {
          id: true,
          email: true,
          role: true,
          memberId: true,
          sessionVersion: true,
          member: { select: { names: true, archivedAt: true } },
        },
      });

      // A deleted account, an archived member, or a bumped session version all
      // invalidate the session immediately.
      if (!user || user.member?.archivedAt || user.sessionVersion !== (token.ver ?? 0)) {
        return { ...session, user: undefined } as unknown as typeof session;
      }

      session.user.id = user.id;
      session.user.email = user.email;
      session.user.role = user.role;
      session.user.memberId = user.memberId;
      session.user.name = user.member?.names ?? user.email ?? null;
      (session as { actingSessionId?: string | null }).actingSessionId =
        (token.actingSessionId as string | null) ?? null;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: NEXTAUTH_SECRET,
};

declare module 'next-auth' {
  interface Session {
    /** Open acting-on-behalf-of session, re-validated on every request. */
    actingSessionId?: string | null;
    user: {
      id: string;
      // Nullable: members who sign in by phone may never supply an email.
      email: string | null;
      role: string;
      memberId: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}
