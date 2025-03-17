import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSession } from "../../../../../../lib/auth";
import { listFiles } from "../../../../../../lib/google-drive";

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Get the volume ID from the URL params
    const volumeId = context.params.id;
    console.log("Counting pages for volume:", volumeId);

    // Get access token from session
    const session = await getAuthenticatedSession();
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Fetch all image files in the folder
    const files = await listFiles(session.accessToken, volumeId);

    // Return the total count of files
    console.log(`Total pages for volume ${volumeId}: ${files.length}`);

    return NextResponse.json({
      count: files.length,
    });
  } catch (error) {
    console.error("Error counting comic pages:", error);
    return NextResponse.json(
      { error: "Failed to count comic pages" },
      { status: 500 }
    );
  }
} 