import { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Étend l'interface Session de next-auth pour inclure le token d'accès
   */
  interface Session extends DefaultSession {
    accessToken?: string;
  }

  /**
   * Étend l'interface User de next-auth
   */
  interface User {
    email: string;
  }
}

declare module "next-auth/jwt" {
  /**
   * Étend l'interface JWT de next-auth pour inclure le token d'accès
   */
  interface JWT {
    accessToken?: string;
  }
} 