import NextAuth from "next-auth";
import { authOptions } from "../../../../lib/auth-options";

// Créer le gestionnaire d'API route pour NextAuth
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 