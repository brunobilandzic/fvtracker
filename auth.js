import { cache } from "react";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { handleCredentials, getSessionIdentity } from "@/lib/auth/handlers";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  secret: process.env.AUTH_SECRET,
  debug: false,
  logger: {
    error() {
      console.error("Authentication request failed");
    },
    warn() {},
    debug() {},
  },
  providers: [
    Credentials({
      credentials: {
        login: { label: "Email ili username", type: "text" },
        password: { label: "Lozinka", type: "password" },
      },
      async authorize(credentials) {
        try {
          return await handleCredentials(credentials);
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) return { sub: user.id, appUserId: user.id };
      return token.appUserId ? { sub: token.appUserId, appUserId: token.appUserId } : null;
    },
    async session({ session, token }) {
      session.user = await getSessionIdentity(token.appUserId);
      return session;
    },
  },
});

// Share the validated identity within one server render.
export const getServerSession = cache(async () => {
  const session = await auth();
  return session?.user?.appUserId ? { user: session.user, expires: session.expires } : null;
});
