import { google } from "googleapis";

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
 * Liste tous les fichiers dans un dossier Google Drive
 */
export async function listFiles(accessToken: string, folderId: string) {
  const drive = getGoogleDriveClient(accessToken);
  
  try {
    // Récupère tous les fichiers du dossier (images, PDFs, etc.)
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, webContentLink)',
      orderBy: 'name',
    });
    
    return response.data.files || [];
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