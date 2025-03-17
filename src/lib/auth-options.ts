import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Configuration d'authentification isolée dans un fichier séparé
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive.readonly",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Vous pouvez restreindre l'accès à certains emails uniquement
      const allowedEmail = "rayan.idri.dev@gmail.com";
      return user.email === allowedEmail;
    },
    async jwt({ token, account }) {
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      session.accessToken = token.accessToken;
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error", // Redirection en cas d'erreur d'authentification
  },
  // Utiliser JWT pour conserver le token d'accès Google
  session: {
    strategy: "jwt",
  },
  // Sécuriser les cookies en production
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
}; 