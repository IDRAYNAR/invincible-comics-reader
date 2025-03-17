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
    console.log("Fetching pages for volume:", volumeId);

    // Get access token from session
    const accessToken = await getAccessToken();

    // Fetch all image files in the folder
    const files = await listFiles(accessToken, volumeId);

    // Sort files by name (which should be in numeric order)
    const sortedFiles = files.sort((a: drive_v3.Schema$File, b: drive_v3.Schema$File) => {
      if (!a.name || !b.name) return 0;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });

    // Process files to add multiple URL formats that work with Google Drive images
    const processedFiles = sortedFiles.map((file: drive_v3.Schema$File): ExtendedFile => {
      if (file.id) {
        // For each file, log what we're processing
        console.log("Processing file:", file.name);
        
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
    
    return NextResponse.json({
      files: processedFiles,
    });
  } catch (error) {
    console.error("Error fetching comic pages:", error);
    return NextResponse.json(
      { error: "Failed to fetch comic pages" },
      { status: 500 }
    );
  }
} 