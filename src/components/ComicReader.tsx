"use client";

import { useState, useEffect, useCallback } from 'react';
import { drive_v3 } from 'googleapis';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

// Extended file interface to include the URLs added in the API
interface ExtendedFile extends drive_v3.Schema$File {
  thumbnailUrl?: string;
  directUrl?: string;
}

interface ComicReaderProps {
  files: ExtendedFile[];
}

export function ComicReader({ files }: ComicReaderProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fallbackAttempts, setFallbackAttempts] = useState(0);

  // Calculate the actual total pages from the files array
  const totalPages = files.length;
  const currentFile = files[currentPage];

  useEffect(() => {
    console.log("Current file:", currentFile);
    setLoading(true);
    setImageUrl(null);
    setFallbackAttempts(0);
    
    if (currentFile && currentFile.id) {
      // Try direct access with Google Drive's direct access format
      const directUrl = `https://lh3.googleusercontent.com/d/${currentFile.id}=w2000`;
      console.log("Using direct image URL:", directUrl);
      setImageUrl(directUrl);
    } else {
      console.warn("No usable image URL available for this file");
      setLoading(false);
    }
  }, [currentPage, currentFile]);

  // Handle image load error and try alternative URL formats
  const handleImageError = useCallback(() => {
    console.error("Error loading image, trying alternate URL format");
    
    if (currentFile && currentFile.id) {
      // Try different URL formats in sequence
      const urlFormats = [
        // Format 1: Standard thumbnail URL
        `https://lh3.googleusercontent.com/d/${currentFile.id}`,
        // Format 2: With view parameter
        `https://drive.google.com/uc?export=view&id=${currentFile.id}`,
        // Format 3: With download parameter
        `https://drive.google.com/uc?export=download&id=${currentFile.id}`,
        // Format 4: Original webContentLink if available
        currentFile.webContentLink || null,
        // Format 5: Another googleusercontent format
        `https://lh3.googleusercontent.com/d/${currentFile.id}=s2000`
      ].filter((url): url is string => url !== null && url !== undefined); // Filter out null/undefined
      
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

  if (!files.length) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <p className="text-gray-500 dark:text-gray-400">No pages found for this comic</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-6xl mx-auto">
      <div className="flex items-center justify-center min-h-[70vh] relative">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={`Page ${currentPage + 1}`}
            className="object-contain max-h-[70vh] max-w-full"
            onLoad={() => {
              console.log("Image loaded successfully");
              setLoading(false);
            }}
            onError={() => {
              handleImageError();
            }}
          />
        )}
        {loading && (
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
          aria-label="Previous page"
        >
          <FaChevronLeft className="w-6 h-6" />
        </button>

        <div className="text-center">
          <p>
            Page {currentPage + 1} of {totalPages}
          </p>
        </div>

        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages - 1}
          className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 disabled:opacity-30"
          aria-label="Next page"
        >
          <FaChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
} 