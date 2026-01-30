import { SHAREPOINT_CONFIG } from './constants';

let cachedToken = null;
let tokenExpiry = null;

async function getAccessToken() {
  // Return cached token if still valid
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const { tenantId, clientId, clientSecret } = SHAREPOINT_CONFIG;
  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!response.ok) {
    throw new Error(`Token fetch failed: ${response.status}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  // Cache for 50 minutes (tokens last 60)
  tokenExpiry = Date.now() + 50 * 60 * 1000;

  return cachedToken;
}

async function getSiteId(token) {
  const { host, sitePath } = SHAREPOINT_CONFIG;
  const url = `https://graph.microsoft.com/v1.0/sites/${host}:${sitePath}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Site fetch failed: ${response.status}`);
  }

  const data = await response.json();
  return data.id;
}

async function getDriveId(token, siteId) {
  const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Drive fetch failed: ${response.status}`);
  }

  const data = await response.json();
  return data.id;
}

export async function downloadFile(filename) {
  const token = await getAccessToken();
  const siteId = await getSiteId(token);
  const driveId = await getDriveId(token, siteId);

  const filePath = `${SHAREPOINT_CONFIG.folderPath}/${filename}`;
  const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:${filePath}:/content`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`File download failed: ${response.status}`);
  }

  return response.arrayBuffer();
}
