import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth";
import { getFolderById } from "@/lib/google-drive";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the volume ID from the URL params
    const volumeId = params.id;
    console.log("Fetching details for volume:", volumeId);

    // Get access token from session
    const accessToken = await getAccessToken();

    // Fetch the folder details
    const folderDetails = await getFolderById(accessToken, volumeId);

    if (!folderDetails) {
      return NextResponse.json(
        { error: "Comic volume not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(folderDetails);
  } catch (error) {
    console.error("Error fetching comic details:", error);
    return NextResponse.json(
      { error: "Failed to fetch comic details" },
      { status: 500 }
    );
  }
} 