/**
 * Get MIME type for a file based on extension
 * @param {string} filePath - Path to the file
 * @returns {string} - MIME type
 */
export const getMimeType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  
  const mimeTypes = {
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.webm': 'video/webm',
    '.mkv': 'video/x-matroska',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}; 