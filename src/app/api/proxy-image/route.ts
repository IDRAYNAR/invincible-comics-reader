import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth";

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
        // Default format uses the direct Google Drive URL
        sourceUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
        break;
    }
    
    console.log(`Proxying image request for file: ${fileId}, format: ${format}, URL: ${sourceUrl}`);
    
    // Fetch the image directly from Google Drive
    const response = await fetch(sourceUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'image/jpeg, image/png, image/webp, image/*'
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
    
    // Create a new response with the image data and appropriate headers
    const imageResponse = new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600'
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