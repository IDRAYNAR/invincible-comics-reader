"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-4xl font-bold mb-6">Welcome to Invincible Comics Reader</h1>
      <p className="text-xl mb-8 max-w-2xl">
        Access and read your Invincible comics stored in Google Drive
      </p>

      {!session && (
        <button
          onClick={() => signIn("google")}
          className="px-6 py-3 bg-blue-600 text-white rounded-md shadow-md hover:bg-blue-700 transition"
        >
          Sign in with Google
        </button>
      )}
    </div>
  );
}
