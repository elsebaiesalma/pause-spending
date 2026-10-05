import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

// "Sign in with Google" for the app itself - who's using it. Deliberately
// separate from the gmail.readonly Gmail-connect flow (src/lib/oauth/google.ts,
// src/app/api/auth/gmail/*), which is its own, larger-scoped consent for
// reading receipt emails and keeps its own encrypted-at-rest token storage
// in EmailConnection. Reuses the same Google OAuth client (client id/secret)
// but requests only the default minimal login scope (openid/email/profile).
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      // The add_real_auth migration set the pre-existing single user's
      // `email` directly via raw SQL (to preserve their purchases/wardrobe/
      // budget under the same row), but never created the matching Account
      // row - so on first real sign-in, the PrismaAdapter finds a User with
      // that email but no linked Google Account and refuses to auto-link it
      // (OAuthAccountNotLinked), bouncing back to /login. This app has
      // exactly one legitimate account, with an email already known and
      // verified by Google - safe to auto-link here. Revisit if this app
      // ever accepts real signups from untrusted emails.
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
