"use client";

import React, { use } from "react";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { drive_v3 } from "googleapis";
import { ComicReader } from "@/components/ComicReader";
import Link from "next/link";

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
        // Use cache: 'no-store' to always get fresh data
        cache: 'no-store',
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

    const fetchData = async () => {
      try {
        // Fetch comic pages
        setLoading(true);
        const pagesData = await getComicPages();
        setComicPages(pagesData.files || []);

        // Fetch comic details
        if (session?.accessToken) {
          try {
            const response = await fetch(`/api/comics/${volumeId}`);
            
            if (!response.ok) {
              throw new Error("Failed to fetch comic details");
            }
            
            const data = await response.json();
            setCurrentVolumeTitle(data.name || "Unknown Volume");
          } catch (err) {
            console.error("Error fetching comic details:", err);
            setError("Failed to load comic details");
          }
        }
      } catch (err) {
        console.error("Error in data fetching:", err);
        setError("Failed to load comic. Please try signing in again.");
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchData();
    }
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
        <p className="text-gray-500 dark:text-gray-400">Please sign in to view comics</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Link href="/api/auth/signin" className="text-blue-500 hover:underline">
            Sign in again
          </Link>
        </div>
      </div>
    );
  }

  if (!comicPages || comicPages.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <p className="text-gray-500 dark:text-gray-400">No pages found for this comic</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center">
        <Link href="/comics" className="text-blue-500 hover:underline mr-4">
          ← Back to Comics
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-6">{currentVolumeTitle}</h1>
      <ComicReader files={comicPages} />
    </div>
  );
} 