import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth";
import { imageCache, generateCacheKey } from "@/lib/caching";

// Cache control headers - maintenir le cache 24h pour les images statiques
const CACHE_CONTROL_HEADER = 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800';

// Durée du cache statique côté serveur Next.js
export const revalidate = 86400; // 24 heures

export async function GET(request: NextRequest) {
  try {
    // Get the file ID from the request
    const fileId = request.nextUrl.searchParams.get('id');
    const format = request.nextUrl.searchParams.get('format') || 'default';
    
    if (!fileId) {
      return NextResponse.json(
        { error: "File ID is required" },
        { status: 400 }
      );
    }
    
    // Générer une clé unique pour le cache
    const cacheKey = generateCacheKey(fileId, format);
    
    // Vérifier si l'image est dans le cache
    const cachedImage = imageCache.get(cacheKey) as ArrayBuffer | null;
    if (cachedImage) {
      console.log(`Using cached image for file: ${fileId}, format: ${format}`);
      
      // Créer une réponse avec l'image mise en cache
      return new NextResponse(cachedImage, {
        status: 200,
        headers: {
          'Content-Type': 'image/jpeg', // Assume JPEG for cached images
          'Cache-Control': CACHE_CONTROL_HEADER,
          'ETag': `"${fileId}"`,
          'X-Cache': 'HIT'
        }
      });
    }
    
    // Get access token from session for authentication
    const accessToken = await getAccessToken();

    // Determine the source URL based on the requested format
    let sourceUrl = "";
    switch (format) {
      case 'view':
        sourceUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
        break;
      case 'download':
        sourceUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        break;
      default:
        // Default format uses the direct Google Drive URL - most efficace pour le cache
        sourceUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
        break;
    }
    
    console.log(`Proxying image request for file: ${fileId}, format: ${format}, URL: ${sourceUrl}`);
    
    // Fetch the image directly from Google Drive with caching options
    const response = await fetch(sourceUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'image/jpeg, image/png, image/webp, image/*'
      },
      // Utiliser le cache interne de fetch pour les requêtes répétées
      cache: 'force-cache',
      next: { 
        // Réutiliser la réponse mise en cache jusqu'à 24h
        revalidate: 86400 
      }
    });
    
    if (!response.ok) {
      console.error(`Error proxying image: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.statusText}` },
        { status: response.status }
      );
    }
    
    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Mettre l'image en cache pour les futures requêtes
    imageCache.set(cacheKey, imageBuffer);
    
    // Create a new response with the image data and appropriate headers for caching
    const imageResponse = new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': CACHE_CONTROL_HEADER,
        'ETag': `"${fileId}"`, // Utiliser l'ID comme ETag pour la validation du cache
        'X-Cache': 'MISS'
      }
    });
    
    return imageResponse;
  } catch (error) {
    console.error("Error in proxy-image:", error);
    return NextResponse.json(
      { error: "Failed to proxy image" },
      { status: 500 }
    );
  }
} 