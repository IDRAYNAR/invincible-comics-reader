import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");
  
  if (!path) {
    return NextResponse.json(
      { error: "Path parameter is required" },
      { status: 400 }
    );
  }

  try {
    // Revalidate the path
    revalidatePath(path);
    
    return NextResponse.json({
      revalidated: true,
      path,
      now: Date.now()
    });
  } catch (error) {
    console.error("Error revalidating path:", error);
    return NextResponse.json(
      { error: "Failed to revalidate" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Reuse the GET handler
  return GET(request);
} 