import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from './db';
import { verifyPassword } from './crypto';

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
      const isPasswordValid = verifyPassword(
        credentials.password,
        user?.passwordHash ?? DUMMY_PASSWORD_HASH
      );

      if (!user || !user.passwordHash || !isPasswordValid) {
        throw new Error(INVALID_CREDENTIALS);
      }

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        memberId: user.memberId || null,
        name: user.member?.names || user.email.split('@')[0],
      };
    },
  }),
];

export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.memberId = (user as any).memberId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.memberId = token.memberId as string | null;
      }
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
    user: {
      id: string;
      email: string;
      role: string;
      memberId: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}
