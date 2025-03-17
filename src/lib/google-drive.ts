import { google, drive_v3 } from "googleapis";

/**
 * Configure le client Google Drive avec un token d'accès
 */
export function getGoogleDriveClient(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

export async function getFolderById(accessToken: string, folderId: string) {
  console.log(`Getting folder by ID: ${folderId}`);
  try {
    const drive = getGoogleDriveClient(accessToken);
    const response = await drive.files.get({
      fileId: folderId,
      fields: "id,name,mimeType",
    });
    
    console.log("Folder data:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error getting folder by ID:", error);
    throw error;
  }
}

export async function searchFolderByName(accessToken: string, name: string, parentId?: string) {
  console.log(`Searching for folder: ${name}${parentId ? ` in parent ${parentId}` : ''}`);
  try {
    const drive = getGoogleDriveClient(accessToken);
    let query = `mimeType='application/vnd.google-apps.folder' and name='${name}'`;
    
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }
    
    const response = await drive.files.list({
      q: query,
      fields: "files(id,name,mimeType)",
    });
    
    console.log("Search results:", response.data.files);
    return response.data.files?.[0];
  } catch (error) {
    console.error("Error searching for folder:", error);
    throw error;
  }
}

export async function listFolders(accessToken: string, parentId: string) {
  console.log(`Listing folders in parent: ${parentId}`);
  try {
    const drive = getGoogleDriveClient(accessToken);
    const response = await drive.files.list({
      q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder'`,
      fields: "files(id,name,mimeType)",
      orderBy: "name",
    });
    
    console.log("Found folders:", response.data.files);
    return response.data.files || [];
  } catch (error) {
    console.error("Error listing folders:", error);
    throw error;
  }
}

/**
 * Liste tous les fichiers dans un dossier Google Drive avec pagination
 * pour récupérer tous les fichiers sans limitation
 */
export async function listFiles(accessToken: string, folderId: string): Promise<drive_v3.Schema$File[]> {
  const drive = getGoogleDriveClient(accessToken);
  const allFiles: drive_v3.Schema$File[] = [];
  let pageToken: string | undefined = undefined;
  
  try {
    console.log(`Fetching all files from folder ${folderId} with pagination...`);
    
    // Boucle de pagination pour récupérer tous les fichiers
    do {
      // Définir une taille de page élevée pour minimiser le nombre de requêtes
      const filesResponse: drive_v3.Schema$FileList = (await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'nextPageToken, files(id, name, mimeType, webContentLink)',
        orderBy: 'name',
        pageSize: 1000, // Valeur maximale autorisée par l'API Google Drive
        pageToken: pageToken || undefined
      })).data;
      
      // Ajouter les fichiers de cette page au tableau complet
      if (filesResponse.files && filesResponse.files.length > 0) {
        allFiles.push(...filesResponse.files);
      }
      
      // Mettre à jour le token pour la prochaine page
      pageToken = filesResponse.nextPageToken || undefined;
      
      console.log(`Fetched ${filesResponse.files?.length || 0} files, total so far: ${allFiles.length}`);
      
    } while (pageToken); // Continuer tant qu'il y a des pages suivantes
    
    console.log(`Total files fetched from folder ${folderId}: ${allFiles.length}`);
    return allFiles;
  } catch (error) {
    console.error('Erreur lors de la récupération des fichiers:', error);
    throw error;
  }
}

/**
 * Récupère un fichier spécifique depuis Google Drive
 */
export async function getFile(accessToken: string, fileId: string) {
  const drive = getGoogleDriveClient(accessToken);
  
  try {
    const response = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, webContentLink, webViewLink',
    });
    
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération du fichier:', error);
    throw error;
  }
}

/**
 * Télécharge le contenu d'un fichier depuis Google Drive
 */
export async function downloadFile(accessToken: string, fileId: string) {
  const drive = getGoogleDriveClient(accessToken);
  
  try {
    const response = await drive.files.get({
      fileId,
      alt: 'media',
    }, {
      responseType: 'arraybuffer',
    });
    
    return response.data;
  } catch (error) {
    console.error('Erreur lors du téléchargement du fichier:', error);
    throw error;
  }
} 