/**
 * Google Drive Photo Storage Integration
 * 
 * - Target Root Folder: https://drive.google.com/drive/u/3/folders/1oAOGOMlP7REIMCp8PvnkTCZYMOapJLwt
 * - Folder ID: 1oAOGOMlP7REIMCp8PvnkTCZYMOapJLwt
 * - Automatically creates trip subfolders (e.g. "Chuyến đi Đà Lạt (10/2026)")
 * - Uploads high-definition original photos directly to Google Drive
 * - Obtains direct web view and thumbnail links for instant rendering in the app
 * - Bypasses all Firestore quota and document size restrictions
 */

const TARGET_ROOT_FOLDER_ID = '1oAOGOMlP7REIMCp8PvnkTCZYMOapJLwt';
const DRIVE_ACCESS_TOKEN_KEY = 'google_drive_access_token';
const DRIVE_TOKEN_EXPIRES_KEY = 'google_drive_token_expires_at';

// In-memory token cache
let inMemoryAccessToken: string | null = null;

export function getStoredDriveToken(): string | null {
  if (inMemoryAccessToken) return inMemoryAccessToken;
  try {
    const token = localStorage.getItem(DRIVE_ACCESS_TOKEN_KEY);
    const expiresAt = localStorage.getItem(DRIVE_TOKEN_EXPIRES_KEY);
    if (token && expiresAt && Number(expiresAt) > Date.now()) {
      inMemoryAccessToken = token;
      return token;
    }
  } catch (e) {
    console.warn('Error reading drive token:', e);
  }
  return null;
}

export function saveStoredDriveToken(token: string, expiresInSeconds: number = 3500): void {
  inMemoryAccessToken = token;
  try {
    localStorage.setItem(DRIVE_ACCESS_TOKEN_KEY, token);
    localStorage.setItem(DRIVE_TOKEN_EXPIRES_KEY, String(Date.now() + expiresInSeconds * 1000));
  } catch (e) {
    console.warn('Error saving drive token:', e);
  }
}

export function clearStoredDriveToken(): void {
  inMemoryAccessToken = null;
  try {
    localStorage.removeItem(DRIVE_ACCESS_TOKEN_KEY);
    localStorage.removeItem(DRIVE_TOKEN_EXPIRES_KEY);
  } catch (e) {
    console.warn('Error clearing drive token:', e);
  }
}

/**
 * Request OAuth Access Token for Google Drive using Google Identity Services (GIS)
 */
export async function requestGoogleDriveToken(oAuthClientId: string, userHint?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check if google accounts token client is available
    if (typeof window === 'undefined' || !(window as any).google?.accounts?.oauth2) {
      // If GIS library is not yet loaded, wait briefly or load dynamically
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initGISAndRequest(oAuthClientId, userHint, resolve, reject);
      };
      script.onerror = () => reject(new Error('Không thể tải thư viện Google Identity Services.'));
      document.head.appendChild(script);
    } else {
      initGISAndRequest(oAuthClientId, userHint, resolve, reject);
    }
  });
}

function initGISAndRequest(
  clientId: string,
  hint: string | undefined,
  resolve: (token: string) => void,
  reject: (err: Error) => void
) {
  try {
    const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.file',
      hint: hint || '',
      callback: (resp: any) => {
        if (resp.error) {
          console.error('Google OAuth token error:', resp);
          reject(new Error(resp.error_description || resp.error || 'Cấp quyền Google Drive thất bại.'));
          return;
        }
        if (resp.access_token) {
          saveStoredDriveToken(resp.access_token, resp.expires_in || 3500);
          resolve(resp.access_token);
        } else {
          reject(new Error('Không nhận được mã xác thực từ Google.'));
        }
      },
      error_callback: (err: any) => {
        reject(new Error(err?.message || 'Lỗi khi mở cửa sổ Google OAuth.'));
      }
    });

    tokenClient.requestAccessToken({ prompt: '' });
  } catch (err: any) {
    reject(new Error(err?.message || 'Khởi tạo Google OAuth thất bại.'));
  }
}

/**
 * Convert Base64 Data URL to Blob
 */
export function base64ToBlob(base64DataUrl: string): { blob: Blob; mimeType: string } {
  const parts = base64DataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const byteCharacters = atob(parts[1] || parts[0]);
  const byteArrays: Uint8Array[] = [];

  const sliceSize = 1024;
  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  const blob = new Blob(byteArrays as any, { type: mimeType });
  return { blob, mimeType };
}

/**
 * Find or create a subfolder for a specific trip inside the Root Google Drive Folder
 */
export async function getOrCreateTripFolder(
  accessToken: string,
  tripName: string,
  tripId: string
): Promise<string> {
  const folderName = `${tripName || 'Chuyến đi'}`.trim();
  const parentFolderId = TARGET_ROOT_FOLDER_ID;

  // 1. Search for existing folder with same name inside TARGET_ROOT_FOLDER_ID
  const query = `'${parentFolderId}' in parents and name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;

  try {
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    } else if (searchRes.status === 401) {
      clearStoredDriveToken();
      throw new Error('UNAUTHORIZED_TOKEN');
    }
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED_TOKEN') throw err;
    console.warn('Search trip folder warning, will attempt create:', err);
  }

  // 2. Create the folder if not found
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
      description: `Thư mục ảnh cho chuyến đi ${tripName} (ID: ${tripId})`
    })
  });

  if (!createRes.ok) {
    if (createRes.status === 401) {
      clearStoredDriveToken();
      throw new Error('UNAUTHORIZED_TOKEN');
    }
    const errText = await createRes.text();
    console.error('Error creating trip folder on Google Drive:', errText);
    // If creation inside parent fails (e.g. restricted root permissions), fallback to creating in user drive root
    const fallbackCreate = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `OurTravelPlanner - ${folderName}`,
        mimeType: 'application/vnd.google-apps.folder'
      })
    });
    if (fallbackCreate.ok) {
      const fallbackData = await fallbackCreate.json();
      return fallbackData.id;
    }
    throw new Error('Không thể tạo thư mục chuyến đi trên Google Drive.');
  }

  const newFolder = await createRes.json();
  return newFolder.id;
}

export interface DriveUploadedPhoto {
  fileId: string;
  name: string;
  webContentLink?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  directImageUrl: string;
}

/**
 * Upload an image Blob / Base64 directly into the trip's Google Drive folder
 */
export async function uploadPhotoToDrive(
  accessToken: string,
  folderId: string,
  base64OrBlob: string | Blob,
  fileName: string
): Promise<DriveUploadedPhoto> {
  let blob: Blob;
  let mimeType: string = 'image/jpeg';

  if (typeof base64OrBlob === 'string') {
    const converted = base64ToBlob(base64OrBlob);
    blob = converted.blob;
    mimeType = converted.mimeType;
  } else {
    blob = base64OrBlob;
    mimeType = blob.type || 'image/jpeg';
  }

  const metadata = {
    name: fileName || `photo_${Date.now()}.jpg`,
    parents: [folderId],
    mimeType
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webContentLink,webViewLink,thumbnailLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: form
    }
  );

  if (!uploadRes.ok) {
    if (uploadRes.status === 401) {
      clearStoredDriveToken();
      throw new Error('UNAUTHORIZED_TOKEN');
    }
    const errText = await uploadRes.text();
    console.error('Google Drive photo upload failed:', errText);
    throw new Error('Không thể tải ảnh lên Google Drive.');
  }

  const fileData = await uploadRes.json();
  const fileId = fileData.id;

  // Make the uploaded photo link accessible for reading within the app
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });
  } catch (permErr) {
    console.warn('Set photo anyone-reader permission warning (benign):', permErr);
  }

  // Fast direct CDN-friendly Google Drive image rendering URL
  const directImageUrl = `https://lh3.googleusercontent.com/d/${fileId}=w1920`;

  return {
    fileId,
    name: fileData.name || fileName,
    webContentLink: fileData.webContentLink,
    webViewLink: fileData.webViewLink,
    thumbnailLink: fileData.thumbnailLink,
    directImageUrl
  };
}

/**
 * Upload multiple photos in parallel to Google Drive
 */
export async function uploadMultiplePhotosToDrive(
  accessToken: string,
  folderId: string,
  photos: { base64: string; name?: string }[],
  onProgress?: (completed: number, total: number) => void
): Promise<string[]> {
  const total = photos.length;
  let completed = 0;

  const uploadPromises = photos.map(async (p, idx) => {
    const fileName = p.name || `photo_${Date.now()}_${idx + 1}.jpg`;
    const res = await uploadPhotoToDrive(accessToken, folderId, p.base64, fileName);
    completed++;
    if (onProgress) onProgress(completed, total);
    return res.directImageUrl;
  });

  return Promise.all(uploadPromises);
}
