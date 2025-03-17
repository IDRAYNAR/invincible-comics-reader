"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { drive_v3 } from 'googleapis';
import { FaChevronLeft, FaChevronRight, FaExpand, FaCompress } from 'react-icons/fa';

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  
  // Référence au conteneur d'image pour le mode plein écran
  const imageContainerRef = useRef<HTMLDivElement>(null);
  
  // Référence persistante au cache d'images
  const imageCacheRef = useRef<ImageCache>(new Map());
  
  // Référence pour le timer d'inactivité
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  
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

  const handleImageClick = useCallback((event: React.MouseEvent<HTMLImageElement>) => {
    // Get the horizontal position of the click relative to the image
    const image = event.currentTarget;
    const imageRect = image.getBoundingClientRect();
    const clickX = event.clientX - imageRect.left;
    const imageWidth = imageRect.width;
    
    // Get references to the tap indicators
    const prevIndicator = image.parentElement?.querySelector('.tap-indicator-prev') as HTMLElement;
    const nextIndicator = image.parentElement?.querySelector('.tap-indicator-next') as HTMLElement;
    
    // If click is on the left side (first 40% of the width), go to previous page
    if (clickX < imageWidth * 0.4) {
      // Show the previous page indicator briefly
      if (prevIndicator) {
        prevIndicator.style.opacity = '1';
        setTimeout(() => {
          prevIndicator.style.opacity = '0';
        }, 300);
      }
      handlePrevPage();
    } else {
      // Show the next page indicator briefly
      if (nextIndicator) {
        nextIndicator.style.opacity = '1';
        setTimeout(() => {
          nextIndicator.style.opacity = '0';
        }, 300);
      }
      handleNextPage();
    }
  }, [handlePrevPage, handleNextPage]);

  // Placer le sélecteur de page dans la barre de navigation
  useEffect(() => {
    const pageSelectorContainer = document.getElementById('pageSelector');
    if (pageSelectorContainer) {
      // Rendre le conteneur visible
      pageSelectorContainer.classList.remove('invisible');
      
      // Écouter les changements de taille d'écran
      const handleResize = () => {
        updateSelector();
      };
      
      // Fonction pour créer et mettre à jour le sélecteur
      const updateSelector = () => {
        // Déterminer si l'écran est petit (mobile)
        const isMobile = window.innerWidth < 640;
        const isVerySmall = window.innerWidth < 360;
        
        // Créer le sélecteur
        const selectElement = document.createElement('select');
        
        // Appliquer des styles adaptés à la taille de l'écran
        selectElement.className = 'invincible-button px-2 py-1 sm:px-4 sm:py-2 rounded-md appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 shadow-md transform transition-all duration-200 text-sm sm:text-base';
        selectElement.style.backgroundImage = "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")";
        selectElement.style.backgroundRepeat = "no-repeat";
        selectElement.style.backgroundPosition = "right 0.3rem center";
        selectElement.style.backgroundSize = isMobile ? "1em 1em" : "1.5em 1.5em";
        selectElement.style.paddingRight = isMobile ? "1.8rem" : "2.5rem";
        
        // Déterminer s'il faut grouper les options pour réduire la hauteur du menu
        const shouldGroupOptions = isMobile; // Toujours grouper sur mobile
        
        if (shouldGroupOptions) {
          // Créer d'abord une option pour la page actuelle
          const currentOption = document.createElement('option');
          currentOption.value = currentPage.toString();
          currentOption.text = isVerySmall ? 
            `Page ${currentPage + 1}` : 
            `Page ${currentPage + 1}/${totalPages}`;
          currentOption.selected = true;
          selectElement.appendChild(currentOption);
          
          // Groupes de navigation - diviser en sections logiques
          // Premier groupe: Pages rapprochées de la page actuelle
          if (currentPage > 0 || currentPage < totalPages - 1) {
            const nearbyGroup = document.createElement('optgroup');
            nearbyGroup.label = "Pages proches";
            
            // Pages précédentes (max 2)
            for (let i = Math.max(0, currentPage - 2); i < currentPage; i++) {
              const option = document.createElement('option');
              option.value = i.toString();
              option.text = `← Page ${i + 1}`;
              nearbyGroup.appendChild(option);
            }
            
            // Pages suivantes (max 2)
            for (let i = currentPage + 1; i <= Math.min(totalPages - 1, currentPage + 2); i++) {
              const option = document.createElement('option');
              option.value = i.toString();
              option.text = `→ Page ${i + 1}`;
              nearbyGroup.appendChild(option);
            }
            
            if (nearbyGroup.children.length > 0) {
              selectElement.appendChild(nearbyGroup);
            }
          }
          
          // Groupe de navigation par dizaines
          if (totalPages > 10) {
            const jumpGroup = document.createElement('optgroup');
            jumpGroup.label = "Aller à...";
            
            // Ajouter des options pour sauter directement à certaines pages
            const intervals = [1, 10, 25, 50, 75, 100, 125];
            
            for (const pageNum of intervals) {
              if (pageNum < totalPages && Math.abs(pageNum - (currentPage + 1)) > 5) {
                const option = document.createElement('option');
                option.value = (pageNum - 1).toString();
                option.text = `Page ${pageNum}`;
                jumpGroup.appendChild(option);
              }
            }
            
            // Ajouter également la dernière page si elle est assez éloignée
            if (currentPage < totalPages - 5) {
              const lastOption = document.createElement('option');
              lastOption.value = (totalPages - 1).toString();
              lastOption.text = `Dernière p. ${totalPages}`;
              jumpGroup.appendChild(lastOption);
            }
            
            if (jumpGroup.children.length > 0) {
              selectElement.appendChild(jumpGroup);
            }
          }
        } else {
          // Version standard pour desktop: ajouter toutes les options individuellement
          for (let i = 0; i < totalPages; i++) {
            const option = document.createElement('option');
            option.value = i.toString();
            option.text = `Page ${i + 1}/${totalPages}`;
            if (i === currentPage) {
              option.selected = true;
            }
            selectElement.appendChild(option);
          }
        }
        
        // Ajouter l'écouteur d'événements
        const handleChange = (e: Event) => {
          const target = e.target as HTMLSelectElement;
          setCurrentPage(Number(target.value));
        };
        
        selectElement.addEventListener('change', handleChange);
        
        // Vider et ajouter
        pageSelectorContainer.innerHTML = '';
        pageSelectorContainer.appendChild(selectElement);
        
        return handleChange;
      };
      
      // Initialiser le sélecteur
      const handleChange = updateSelector();
      
      // Ajouter l'écouteur pour le redimensionnement
      window.addEventListener('resize', handleResize);
      
      // Nettoyer quand le composant est démonté
      return () => {
        window.removeEventListener('resize', handleResize);
        const selectElement = pageSelectorContainer.querySelector('select');
        if (selectElement) {
          selectElement.removeEventListener('change', handleChange);
        }
        if (pageSelectorContainer) {
          pageSelectorContainer.innerHTML = '';
          pageSelectorContainer.classList.add('invisible');
        }
      };
    }
  }, [currentPage, totalPages]);

  // Gérer le basculement du mode plein écran
  const toggleFullscreen = useCallback(async () => {
    if (!imageContainerRef.current) return;
    
    try {
      if (!isFullscreen) {
        // Entrer en mode plein écran
        if (imageContainerRef.current.requestFullscreen) {
          await imageContainerRef.current.requestFullscreen();
        } else if ((imageContainerRef.current as HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
          await (imageContainerRef.current as HTMLDivElement & { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
        } else if ((imageContainerRef.current as HTMLDivElement & { msRequestFullscreen?: () => Promise<void> }).msRequestFullscreen) {
          await (imageContainerRef.current as HTMLDivElement & { msRequestFullscreen: () => Promise<void> }).msRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        // Sortir du mode plein écran
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as Document & { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
          await (document as Document & { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen();
        } else if ((document as Document & { msExitFullscreen?: () => Promise<void> }).msExitFullscreen) {
          await (document as Document & { msExitFullscreen: () => Promise<void> }).msExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error("Erreur lors du basculement du mode plein écran:", error);
    }
  }, [isFullscreen]);

  // Écouteur pour les changements d'état de plein écran
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        !!document.fullscreenElement || 
        !!(document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement || 
        !!(document as Document & { msFullscreenElement?: Element }).msFullscreenElement
      );
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Fonction pour gérer l'inactivité de l'utilisateur
  const resetInactivityTimer = useCallback(() => {
    // Annuler le timer précédent si existant
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    // Afficher les contrôles
    setControlsVisible(true);
    
    // Définir un nouveau timer pour masquer les contrôles après 3 secondes
    inactivityTimerRef.current = setTimeout(() => {
      // Ne pas masquer les contrôles si on est en train de survoler le bouton
      const controlsElement = document.querySelector('.controls-hover-area');
      if (controlsElement && (controlsElement as HTMLElement).matches(':hover')) {
        // Si on est en train de survoler, réinitialiser le timer
        resetInactivityTimer();
        return;
      }
      setControlsVisible(false);
    }, 3000);
  }, []);

  // Démarrer le timer d'inactivité au montage et nettoyer au démontage
  useEffect(() => {
    // Attacher des écouteurs d'événements pour détecter l'activité de l'utilisateur
    const handleActivity = () => resetInactivityTimer();
    
    // Configurer les écouteurs d'événements
    document.addEventListener('mousemove', handleActivity);
    document.addEventListener('mousedown', handleActivity);
    document.addEventListener('keydown', handleActivity);
    document.addEventListener('touchstart', handleActivity);
    
    // Démarrer le timer initial
    resetInactivityTimer();
    
    // Nettoyer les écouteurs et le timer au démontage
    return () => {
      document.removeEventListener('mousemove', handleActivity);
      document.removeEventListener('mousedown', handleActivity);
      document.removeEventListener('keydown', handleActivity);
      document.removeEventListener('touchstart', handleActivity);
      
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [resetInactivityTimer]);

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
          <div 
            ref={imageContainerRef}
            className={`relative group p-2 bg-white dark:bg-gray-800 rounded-lg shadow-2xl ring-1 ring-gray-200 dark:ring-gray-700 ${isFullscreen ? 'fullscreen-container' : ''}`}
          >
            <img
              src={imageUrl}
              alt={`Page ${currentPage + 1}`}
              className={`object-contain transition-opacity duration-300 cursor-pointer ${isFullscreen ? 'max-h-screen max-w-screen' : 'max-h-[70vh] max-w-full'}`}
              style={{ opacity: loading ? 0.3 : 1 }}
              onLoad={() => {
                console.log("Image loaded successfully");
                setLoading(false);
              }}
              onError={handleImageError}
              onClick={handleImageClick}
              loading="eager"
              fetchPriority="high"
            />
            
            {/* Zone sensible pour le bouton plein écran - toujours présente même quand le bouton est invisible */}
            <div 
              className="absolute top-0 right-0 w-16 h-16 z-10 cursor-pointer controls-hover-area"
              onMouseEnter={() => resetInactivityTimer()}
            >
              <button 
                onClick={toggleFullscreen}
                className={`absolute top-2 right-2 z-10 bg-white dark:bg-gray-700 bg-opacity-70 dark:bg-opacity-70 p-2 rounded-full shadow-lg hover:bg-opacity-100 dark:hover:bg-opacity-100 transition-all duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                aria-label={isFullscreen ? "Sortir du plein écran" : "Plein écran"}
              >
                {isFullscreen ? <FaCompress className="w-5 h-5" /> : <FaExpand className="w-5 h-5" />}
              </button>
            </div>
            
            {/* Indicateurs qui apparaissent brièvement au clic sur toutes les plateformes */}
            <div className="absolute top-1/2 left-4 transform -translate-y-1/2 opacity-0 tap-indicator-prev pointer-events-none transition-opacity duration-300">
              <div className="bg-white bg-opacity-70 rounded-full p-2 shadow-lg">
                <FaChevronLeft className="w-5 h-5 text-black" />
              </div>
            </div>
            
            <div className="absolute top-1/2 right-4 transform -translate-y-1/2 opacity-0 tap-indicator-next pointer-events-none transition-opacity duration-300">
              <div className="bg-white bg-opacity-70 rounded-full p-2 shadow-lg">
                <FaChevronRight className="w-5 h-5 text-black" />
              </div>
            </div>
          </div>
        )}
        {(loading || loadingMorePages) && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 opacity-70">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {/* Ajouter des styles CSS pour le mode plein écran */}
      <style jsx global>{`
        .fullscreen-container {
          position: fixed !important;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100vw;
          height: 100vh;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0;
          padding: 0;
          border-radius: 0 !important;
        }
        
        .fullscreen-container img {
          max-height: 100vh !important;
          max-width: 100vw !important;
          height: auto;
          object-fit: contain;
        }
        
        /* Positionnement relatif des indicateurs en plein écran */
        .fullscreen-container .tap-indicator-prev,
        .fullscreen-container .tap-indicator-next {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
        }
        
        .fullscreen-container .tap-indicator-prev {
          left: 4%;
        }
        
        .fullscreen-container .tap-indicator-next {
          right: 4%;
        }
        
        /* Masquer certains éléments lorsqu'on est en plein écran natif */
        :fullscreen .fullscreen-container {
          background-color: black;
          padding: 0;
        }
        
        :-webkit-full-screen .fullscreen-container {
          background-color: black;
          padding: 0;
        }
        
        :-ms-fullscreen .fullscreen-container {
          background-color: black;
          padding: 0;
        }
      `}</style>
    </div>
  );
} 