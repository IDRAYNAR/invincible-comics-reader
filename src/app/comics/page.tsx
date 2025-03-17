import { getAccessToken } from "@/lib/auth";
import { searchFolderByName, listFolders } from "@/lib/google-drive";
import { ComicGrid } from "@/components/ComicGrid";

export default async function ComicsPage() {
  // Get access token from the session
  const accessToken = await getAccessToken();

  // Find the "Invincible" folder in Google Drive
  const invincibleFolder = await searchFolderByName(accessToken, "INVINCIBLE");

  if (!invincibleFolder || !invincibleFolder.id) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold mb-4">No Comics Found</h1>
        <p className="mb-4">Could not find the &quot;INVINCIBLE&quot; folder in your Google Drive.</p>
        <p>Please make sure you have the correct folder shared with your account.</p>
      </div>
    );
  }

  // List all volumes (folders) inside the Invincible folder
  const volumes = await listFolders(accessToken, invincibleFolder.id);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Invincible Comics</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">Select a volume to start reading</p>
      </div>
      
      <ComicGrid folders={volumes} />
    </div>
  );
} 