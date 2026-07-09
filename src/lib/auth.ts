import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { db } from './db';
import { verifyPassword } from './crypto';

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

      if (!user || !user.passwordHash) {
        throw new Error('No user found with this email');
      }

      const isPasswordValid = verifyPassword(credentials.password, user.passwordHash);
      if (!isPasswordValid) {
        throw new Error('Incorrect password');
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

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      async profile(profile) {
        // Find or create user via Gmail
        const email = profile.email.toLowerCase();
        let user = await db.user.findUnique({
          where: { email },
          include: { member: true },
        });

        if (!user) {
          // Check if this Gmail matches a Member record phone/names or if we need to auto-link
          // During first signup via Google, we'll try to find a member with this email address
          const member = await db.member.findFirst({
            where: {
              user: {
                email: email
              }
            }
          });

          // Create standard user account
          user = await db.user.create({
            data: {
              email,
              role: 'MEMBER',
              memberId: member?.id || null,
            },
            include: { member: true },
          });
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          memberId: user.memberId || null,
          name: user.member?.names || profile.name || email.split('@')[0],
        };
      },
    })
  );
}

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
  secret: process.env.NEXTAUTH_SECRET || 'tsa-website-super-secret-key-12345',
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
