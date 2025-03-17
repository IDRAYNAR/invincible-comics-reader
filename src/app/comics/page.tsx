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
        <h1 className="text-2xl invincible-title mb-4">PAS DE BD TROUVÉE</h1>
        <div className="invincible-card bg-white dark:bg-gray-800 p-6 rounded-lg inline-block">
          <p className="mb-4">Impossible de trouver le dossier &quot;INVINCIBLE&quot; dans votre Google Drive.</p>
          <p>Veuillez vous assurer que le dossier correct est partagé avec votre compte.</p>
        </div>
      </div>
    );
  }

  // List all volumes (folders) inside the Invincible folder
  const volumes = await listFolders(accessToken, invincibleFolder.id);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] text-center px-4 py-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl invincible-title mb-2">BD INVINCIBLE</h1>
        <p className="text-xl font-bold mt-2">Sélectionnez un volume pour commencer la lecture</p>
      </div>

      <ComicGrid folders={volumes} />
    </div>
  );
} 