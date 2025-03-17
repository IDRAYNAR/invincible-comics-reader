"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";

export function Nav() {
  const { data: session, status } = useSession();
  const loading = status === "loading";

  return (
    <header className="invincible-header shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              <Image
                src="/img/invincible-logo.png"
                alt="Logo Invincible"
                width={150}
                height={35}
                className="max-h-8 w-auto"
              />
            </Link>
          </div>
          <div className="flex items-center">
            {loading ? (
              <div className="h-8 w-8 animate-pulse bg-gray-200 rounded-full" />
            ) : session ? (
              <div className="flex items-center space-x-4">
                {session.user?.image && (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || "Utilisateur"}
                    width={32}
                    height={32}
                    className="rounded-full border-2 border-black"
                  />
                )}
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="invincible-button px-4 py-2 rounded-md hover:cursor-pointer"
                >
                  Déconnexion
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn("google")}
                className="invincible-button px-4 py-2 rounded-md hover:cursor-pointer"
              >
                Connexion
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 