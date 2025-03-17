"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { drive_v3 } from 'googleapis';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

// Extended file interface to include the URLs added in the API
interface ExtendedFile extends drive_v3.Schema$File {
  thumbnailUrl?: string;
  directUrl?: string;
}

// Interface pour les métadonnées de pagination
interface PaginationMeta {
  totalFiles: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface ComicReaderProps {
  files: ExtendedFile[];
  pagination?: PaginationMeta;
  volumeId?: string; // ID du tome pour charger plus de pages si nécessaire
}

// Optimisé et typé map de cache pour les images préchargées
type ImageCache = Map<string, { loaded: boolean; element: HTMLImageElement }>;

export function ComicReader({ files, pagination, volumeId }: ComicReaderProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fallbackAttempts, setFallbackAttempts] = useState(0);
  const [allComicPages, setAllComicPages] = useState<ExtendedFile[]>(files);
  const [loadingMorePages, setLoadingMorePages] = useState(false);
  
  // Référence persistante au cache d'images
  const imageCacheRef = useRef<ImageCache>(new Map());
  
  // Nombre de pages à précharger dans chaque direction
  const preloadAmount = 2;

  // Calculer le nombre total de pages disponibles
  const totalPages = pagination?.totalFiles || allComicPages.length;
  const currentFile = allComicPages[currentPage];
  
  // Référence pour suivre les pages déjà chargées depuis l'API
  const loadedPagesRef = useRef<Set<number>>(new Set([1])); // Page 1 est déjà chargée
  
  // Charger plus de pages depuis l'API si nécessaire
  const loadMorePages = useCallback(async (pageNumber: number) => {
    if (!volumeId || !pagination || loadedPagesRef.current.has(pageNumber) || loadingMorePages) {
      return;
    }
    
    try {
      setLoadingMorePages(true);
      console.log(`Loading page ${pageNumber} from API...`);
      
      const response = await fetch(`/api/comics/${volumeId}/pages?page=${pageNumber}&pageSize=${pagination.pageSize}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch additional pages: ${response.status}`);
      }
      
      const data = await response.json();
      const newFiles = data.files as ExtendedFile[];
      
      console.log(`Loaded ${newFiles.length} additional pages from API`);
      
      // Ajouter les nouvelles pages au tableau existant sans duplications
      setAllComicPages(prevPages => {
        // Créer un index des IDs existants pour éviter les doublons
        const existingIds = new Set(prevPages.map(file => file.id));
        // Filtrer les nouvelles pages pour n'ajouter que celles qui n'existent pas déjà
        const uniqueNewFiles = newFiles.filter(file => file.id && !existingIds.has(file.id));
        // Retourner un nouveau tableau combiné et trié
        const combinedFiles = [...prevPages, ...uniqueNewFiles];
        // Trier par nom pour assurer l'ordre correct
        return combinedFiles.sort((a, b) => {
          if (!a.name || !b.name) return 0;
          return a.name.localeCompare(b.name, undefined, { numeric: true });
        });
      });
      
      // Marquer cette page comme chargée
      loadedPagesRef.current.add(pageNumber);
      
    } catch (error) {
      console.error("Error fetching additional pages:", error);
    } finally {
      setLoadingMorePages(false);
    }
  }, [volumeId, pagination, loadingMorePages]);
  
  // Vérifier si nous approchons de la fin des pages chargées et charger plus si nécessaire
  useEffect(() => {
    if (!pagination || !volumeId) return;
    
    // Calculer à quelle page API appartient la page actuelle
    const apiPage = Math.floor(currentPage / pagination.pageSize) + 1;
    const nextApiPage = apiPage + 1;
    
    // Si nous sommes dans le dernier tiers de la page actuelle, précharger la suivante
    const isNearPageEnd = (currentPage % pagination.pageSize) >= (pagination.pageSize * 0.7);
    
    if (isNearPageEnd && nextApiPage <= pagination.totalPages) {
      loadMorePages(nextApiPage);
    }
  }, [currentPage, pagination, volumeId, loadMorePages]);

  // Génère l'URL optimale pour une image en fonction de son ID
  const getOptimalImageUrl = useCallback((fileId: string | null | undefined): string => {
    if (!fileId) return '';
    return `/api/proxy-image?id=${fileId}`;
  }, []);

  // Précharge une image et la stocke dans le cache
  const preloadImage = useCallback((fileId: string | null | undefined) => {
    if (!fileId || imageCacheRef.current.has(fileId)) return;

    const url = getOptimalImageUrl(fileId);
    
    const img = new Image();
    imageCacheRef.current.set(fileId, { loaded: false, element: img });
    
    img.onload = () => {
      // Mettre à jour le statut dans le cache
      if (imageCacheRef.current.has(fileId)) {
        imageCacheRef.current.set(fileId, { loaded: true, element: img });
      }
      console.log(`Preloaded image for fileId: ${fileId}`);
    };
    
    img.src = url;
  }, [getOptimalImageUrl]);

  // Précharge les images environnantes pour une navigation fluide
  const preloadSurroundingImages = useCallback(() => {
    // Précharger les pages suivantes
    for (let i = 1; i <= preloadAmount; i++) {
      const nextPageIndex = currentPage + i;
      if (nextPageIndex < allComicPages.length) {
        const fileToPreload = allComicPages[nextPageIndex];
        if (fileToPreload && fileToPreload.id) {
          preloadImage(fileToPreload.id);
        }
      }
    }
    
    // Précharger les pages précédentes
    for (let i = 1; i <= preloadAmount; i++) {
      const prevPageIndex = currentPage - i;
      if (prevPageIndex >= 0) {
        const fileToPreload = allComicPages[prevPageIndex];
        if (fileToPreload && fileToPreload.id) {
          preloadImage(fileToPreload.id);
        }
      }
    }
  }, [currentPage, allComicPages, preloadImage, preloadAmount]);

  useEffect(() => {
    console.log("Current file:", currentFile);
    setLoading(true);
    setImageUrl(null);
    setFallbackAttempts(0);

    if (currentFile && currentFile.id) {
      // Vérifier si l'image est déjà dans le cache
      if (imageCacheRef.current.has(currentFile.id) && 
          imageCacheRef.current.get(currentFile.id)?.loaded) {
        console.log("Using cached image");
        setLoading(false);
      }
      
      // Use a proxy via our own API to avoid CORS issues
      const proxyUrl = getOptimalImageUrl(currentFile.id);
      console.log("Using proxied image URL:", proxyUrl);
      setImageUrl(proxyUrl);
      
      // Précharger les images environnantes
      preloadSurroundingImages();
    } else {
      console.warn("No usable image URL available for this file");
      setLoading(false);
    }
  }, [currentPage, currentFile, preloadSurroundingImages, getOptimalImageUrl]);

  // Handle image load error and try alternative URL formats
  const handleImageError = useCallback(() => {
    console.error("Error loading image, trying alternate URL format");

    if (currentFile && currentFile.id) {
      // Try different approaches using our proxy with different source URLs
      const urlFormats = [
        // Format 1: Proxy with export=view parameter
        `/api/proxy-image?id=${currentFile.id}&format=view`,
        // Format 2: Proxy with download parameter
        `/api/proxy-image?id=${currentFile.id}&format=download`,
        // Format 3: Try the webContentLink directly if available
        currentFile.webContentLink || null
      ].filter((url): url is string => url !== null && url !== undefined);

      const nextAttempt = fallbackAttempts + 1;

      if (nextAttempt < urlFormats.length) {
        const alternateUrl = urlFormats[nextAttempt];
        console.log(`Attempt ${nextAttempt + 1}/${urlFormats.length}: Using URL format:`, alternateUrl);
        setFallbackAttempts(nextAttempt);
        setImageUrl(alternateUrl);
      } else {
        console.error("All URL formats failed for this image");
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [currentFile, fallbackAttempts]);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      handlePrevPage();
    } else if (event.key === 'ArrowRight') {
      handleNextPage();
    }
  }, [handlePrevPage, handleNextPage]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Précharger les premières images au chargement initial du composant
  useEffect(() => {
    // Charger la première image
    if (allComicPages.length > 0 && allComicPages[0].id) {
      preloadImage(allComicPages[0].id);
    }
    
    // Précharger quelques images suivantes
    const initialPreloadCount = Math.min(preloadAmount, allComicPages.length - 1);
    for (let i = 1; i <= initialPreloadCount; i++) {
      if (allComicPages[i] && allComicPages[i].id) {
        preloadImage(allComicPages[i].id);
      }
    }
  }, [allComicPages, preloadImage, preloadAmount]);

  // Mettre à jour les pages disponibles lorsque les fichiers changent
  useEffect(() => {
    if (files.length > 0 && files !== allComicPages) {
      setAllComicPages(files);
    }
  }, [files]);

  if (!allComicPages.length) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <p className="text-gray-500 dark:text-gray-400">Aucune page trouvée pour cette BD</p>      
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-6xl mx-auto">
      <div className="flex items-center justify-center min-h-[60vh] relative">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={`Page ${currentPage + 1}`}
            className="object-contain max-h-[70vh] max-w-full transition-opacity duration-300"
            style={{ opacity: loading ? 0.3 : 1 }}
            onLoad={() => {
              console.log("Image loaded successfully");
              setLoading(false);
            }}
            onError={handleImageError}
            loading="eager"
            fetchPriority="high"
          />
        )}
        {(loading || loadingMorePages) && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 opacity-70">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-4">
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 0}
          className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 disabled:opacity-30"        
          aria-label="Page précédente"
        >
          <FaChevronLeft className="w-6 h-6" />
        </button>

        <div className="text-center">
          <p>
            Page {currentPage + 1} sur {totalPages}
          </p>
        </div>

        <button
          onClick={handleNextPage}
          disabled={currentPage >= totalPages - 1}
          className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 disabled:opacity-30"        
          aria-label="Page suivante"
        >
          <FaChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
} 