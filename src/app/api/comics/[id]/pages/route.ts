import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth";
import { listFiles } from "@/lib/google-drive";
import { drive_v3 } from "googleapis";

// Extended file interface for processed files
interface ExtendedFile extends drive_v3.Schema$File {
  thumbnailUrl: string;
  directUrl: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the volume ID from the URL params - no need for React.use() in API routes
    const volumeId = params.id;
    
    // Extraire les paramètres de pagination de l'URL (optionnel)
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '350', 10); // Maximum 350 pages par tome
    
    console.log(`Fetching pages for volume: ${volumeId}, page: ${page}, pageSize: ${pageSize}`);

    // Get access token from session
    const accessToken = await getAccessToken();

    // Fetch all image files in the folder
    const files = await listFiles(accessToken, volumeId);
    
    console.log(`Retrieved ${files.length} total files from Google Drive for volume ${volumeId}`);

    // Sort files by name (which should be in numeric order)
    const sortedFiles = files.sort((a: drive_v3.Schema$File, b: drive_v3.Schema$File) => {
      if (!a.name || !b.name) return 0;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
    
    // Si la pagination est demandée, appliquer la pagination aux résultats
    // Sinon, retourner tous les fichiers (en s'assurant qu'il n'y a pas de limite arbitraire)
    const paginatedFiles = page > 0 && pageSize > 0
      ? sortedFiles.slice((page - 1) * pageSize, page * pageSize)
      : sortedFiles;
    
    console.log(`Processing ${paginatedFiles.length} files after pagination (page ${page} of ${Math.ceil(sortedFiles.length / pageSize)})`);

    // Process files to add multiple URL formats that work with Google Drive images
    const processedFiles = paginatedFiles.map((file: drive_v3.Schema$File): ExtendedFile => {
      if (file.id) {
        // Create multiple URL formats for each image to handle potential access issues
        // Primary format: using export=view which tends to work better for direct viewing
        const directUrl = `https://drive.google.com/uc?export=view&id=${file.id}`;
        // Thumbnail format: smaller version for faster loading
        const thumbnailUrl = `https://lh3.googleusercontent.com/d/${file.id}=w800`;

        return {
          ...file,
          thumbnailUrl,
          directUrl
        };
      }
      return {
        ...file,
        thumbnailUrl: '',
        directUrl: ''
      };
    });

    console.log(`Processed ${processedFiles.length} files for comic pages`);

    // Inclure les métadonnées de pagination dans la réponse pour informer le client
    return NextResponse.json({
      files: processedFiles,
      pagination: {
        totalFiles: sortedFiles.length,
        totalPages: Math.ceil(sortedFiles.length / pageSize),
        currentPage: page,
        pageSize: pageSize,
        hasNextPage: page * pageSize < sortedFiles.length,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error("Error fetching comic pages:", error);
    return NextResponse.json(
      { error: "Failed to fetch comic pages" },
      { status: 500 }
    );
  }
} 