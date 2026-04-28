import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Only allow these email addresses to log in
const ALLOWED_EMAILS = process.env.ALLOWED_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ?? [];

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  session: {
    maxAge: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60, // Refresh token daily
  },
  callbacks: {
    signIn({ profile }) {
      const email = profile?.email?.toLowerCase();
      if (!email || (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(email))) {
        return false;
      }
      return true;
    },
    session({ session }) {
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
