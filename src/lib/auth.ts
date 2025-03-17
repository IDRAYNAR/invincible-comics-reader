import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth-options";
import { redirect } from "next/navigation";

/**
 * Récupérer la session utilisateur côté serveur
 * Utile pour les composants serveur et les API routes
 */
export async function getSession() {
  return await getServerSession(authOptions);
}

/**
 * Vérifier si l'utilisateur est authentifié côté serveur
 * Renvoie le token d'accès si l'utilisateur est authentifié
 */
export async function getAuthenticatedSession() {
  const session = await getSession();
  
  if (!session || !session.accessToken) {
    return null;
  }
  
  return {
    ...session,
    accessToken: session.accessToken as string
  };
}

export async function getCurrentUser() {
  const session = await getSession();
  
  if (!session?.user?.email) {
    redirect("/auth/signin");
  }
  
  return session.user;
}

export async function getAccessToken() {
  try {
    const session = await getSession();
    
    if (!session?.accessToken) {
      console.error("No access token found in session");
      redirect("/api/auth/signin");
    }

    return session.accessToken;
  } catch (error) {
    console.error("Error getting access token:", error);
    redirect("/api/auth/signin");
  }
} 