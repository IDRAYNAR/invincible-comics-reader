"use client";

import React, { use } from "react";
import { useSession } from "next-auth/react";
import { useState, useEffect, Suspense } from "react";
import { drive_v3 } from "googleapis";
import Link from "next/link";
import dynamic from "next/dynamic";
import { FaArrowLeft } from "react-icons/fa";

// Chargement dynamique du ComicReader pour réduire la taille du bundle initial
const DynamicComicReader = dynamic(() => import("@/components/ComicReader").then((mod) => ({ default: mod.ComicReader })), {
  loading: () => (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  ),
  ssr: false // Désactiver le SSR pour ce composant spécifique car il dépend fortement de l'API client
});

// Define extended type for processed files
interface ExtendedFile extends drive_v3.Schema$File {
  thumbnailUrl: string;
  directUrl: string;
}

interface PageParams {
  id: string;
}

interface ComicPagesResponse {
  files: ExtendedFile[];
}

export default function ComicPage({ params }: { params: Promise<PageParams> }) {
  // Properly unwrap params promise with React.use()
  const unwrappedParams = use(params);
  const { data: session, status } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [currentVolumeTitle, setCurrentVolumeTitle] = useState<string>("");
  const [comicPages, setComicPages] = useState<ExtendedFile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const volumeId = unwrappedParams.id;
  
  console.log("ComicPage mounted with unwrapped params:", unwrappedParams);

  // Fetch comic details from the API
  async function getComicPages(): Promise<ComicPagesResponse> {
    try {
      const response = await fetch(`/api/comics/${volumeId}/pages`, {
        // Enable caching for performance optimization
        next: { 
          revalidate: 3600 // Revalidate every 1 hour
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error:", errorData);
        throw new Error(`Failed to fetch comic pages: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Fetched comic pages:", data.files?.length || 0);
      return data;
    } catch (error) {
      console.error("Error fetching comic pages:", error);
      throw error;
    }
  }

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    // Utiliser AbortController pour éviter les fuites de mémoire
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchData = async () => {
      try {
        // Fetch comic pages
        setLoading(true);
        const pagesData = await getComicPages();
        
        // Vérifier si le composant est toujours monté
        if (!signal.aborted) {
          setComicPages(pagesData.files || []);
        }

        // Fetch comic details
        if (session?.accessToken && !signal.aborted) {
          try {
            const response = await fetch(`/api/comics/${volumeId}`, {
              // Enable caching for details as well
              next: { 
                revalidate: 3600 // Revalidate hourly
              },
            });
            
            if (!response.ok) {
              throw new Error("Failed to fetch comic details");
            }
            
            const data = await response.json();
            if (!signal.aborted) {
              setCurrentVolumeTitle(data.name || "Tome inconnu");
            }
          } catch (err) {
            console.error("Error fetching comic details:", err);
            if (!signal.aborted) {
              setError("Impossible de charger les détails de la BD");
            }
          }
        }
      } catch (err) {
        console.error("Error in data fetching:", err);
        if (!signal.aborted) {
          setError("Impossible de charger la BD. Veuillez vous reconnecter.");
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    if (status === "authenticated") {
      fetchData();
    }

    // Cleanup function pour éviter les fuites de mémoire
    return () => {
      controller.abort();
    };
  }, [volumeId, session, status]);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <p className="text-gray-500 dark:text-gray-400">Veuillez vous connecter pour voir les BD</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Link href="/api/auth/signin" className="text-blue-500 hover:underline">
            Se reconnecter
          </Link>
        </div>
      </div>
    );
  }

  if (!comicPages || comicPages.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <p className="text-gray-500 dark:text-gray-400">Aucune page trouvée pour cette BD</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] text-center px-4 pt-2">
      <div className="mb-1 w-full flex flex-wrap justify-between items-center">
        <Link
          href="/comics"
          className="invincible-button px-2 py-1 sm:px-4 sm:py-2 rounded-md flex items-center gap-1 sm:gap-2 transform transition-all duration-200 shadow-md text-sm sm:text-base flex-shrink-0"
        >
          <FaArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
          <span>Retour</span>
        </Link>
        
        <h1 className="text-xl sm:text-2xl font-bold hidden md:block">{currentVolumeTitle}</h1>
        
        <div id="pageSelector" className="invisible flex-shrink-0 mt-0 sm:mt-0">
          {/* Ce div sera remplacé par le sélecteur dans le composant ComicReader */}
        </div>
      </div>
      <h1 className="text-xl sm:text-2xl font-bold mb-3 md:hidden">{currentVolumeTitle}</h1>
      
      {/* Utiliser Suspense pour montrer un fallback pendant le chargement des pages */}
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      }>
        <DynamicComicReader 
          files={comicPages} 
          volumeId={volumeId}
          pagination={comicPages?.length > 0 ? {
            totalFiles: comicPages?.length || 0,
            totalPages: 1, // Valeur par défaut qui sera mise à jour par l'API
            currentPage: 1,
            pageSize: 350,
            hasNextPage: false,
            hasPrevPage: false
          } : undefined}
        />
      </Suspense>
    </div>
  );
} 