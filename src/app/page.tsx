"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Redirect to comics page if authenticated
  useEffect(() => {
    if (session) {
      setLoading(true);
      router.push("/comics");
    }
  }, [session, router]);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] text-center px-4 pt-2">
      <div className="mb-8">
        <Image
          src="/img/invincible-logo.png"
          alt="Logo Invincible"
          width={300}
          height={75}
          className="mb-4"
        />
      </div>

      <div className="invincible-card bg-white dark:bg-gray-800 p-8 mb-8 rounded-lg max-w-2xl">
        <p className="text-xl mb-6">
          Accédez et lisez votre collection de BD Invincible stockée sur Google Drive
        </p>

        {!session && (
          <button
            onClick={() => signIn("google")}
            className="invincible-button px-6 py-3 rounded-md text-lg"
          >
            Se connecter avec Google
          </button>
        )}
      </div>

      <div className="text-sm opacity-75 mt-8">
        Basé sur la BD de Robert Kirkman, Cory Walker et Ryan Ottley
      </div>
    </div>
  );
}
