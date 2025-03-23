/**
 * Middleware to handle requests for video files
 * It will detect if the request is for a video, and if so,
 * handle it appropriately with proper content headers for streaming
 */
import fs from 'fs';
import path from 'path';
import { isVideoFile, getMimeType } from '../utils/mediaUtils.js';

export const handleVideoRequests = (req, res, next) => {
  // Add more detailed logging
  console.log(`Video middleware processing: ${req.path}, query:`, req.query);
  
  // Only process requests for files from the uploads directory
  if (!req.path.startsWith('/uploads/')) {
    return next();
  }
  
  // Get the real file path
  const filePath = path.join(process.cwd(), req.path.replace(/^\//, ''));
  console.log(`Looking for file at absolute path: ${filePath}`);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return res.status(404).send('File not found');
  }
  
  // Check if it's a video file
  const isVideo = isVideoFile(filePath);
  console.log(`Is video file? ${isVideo ? 'YES' : 'NO'}`);
  
  // If it's a direct video file request
  if (isVideo) {
    const mime = getMimeType(filePath);
    console.log(`Serving video with mime type: ${mime}`);
    
    // Check if thumbnail is requested
    if (req.query.thumbnail === 'true') {
      console.log(`Thumbnail requested for video: ${req.path}`);
      handleThumbnailRequest(filePath, res, next);
      return;
    }
    
    // Video streaming
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    if (range) {
      // Handle range requests for video streaming
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, {start, end});
      
      console.log(`Streaming video range: ${start}-${end}/${fileSize}`);
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': mime
      });
      
      file.pipe(res);
    } else {
      // Full video response
      console.log(`Streaming entire video: ${fileSize} bytes`);
      
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': mime
      });
      
      fs.createReadStream(filePath).pipe(res);
    }
    return;
  }
  
  // For non-video files, let Express handle it
  console.log('Not a video file, passing to next middleware');
  next();
};

// Helper function to handle thumbnail requests
function handleThumbnailRequest(videoPath, res, next) {
  const { generateVideoThumbnail } = require('../utils/mediaUtils.js');
  
  // Generate or get thumbnail path
  const thumbnailPath = generateVideoThumbnail(videoPath);
  console.log(`Generated thumbnail path: ${thumbnailPath || 'FAILED'}`);
  
  if (thumbnailPath) {
    // Serve the thumbnail
    const fullThumbnailPath = path.join(process.cwd(), thumbnailPath.replace(/^\//, ''));
    console.log(`Serving thumbnail from: ${fullThumbnailPath}`);
    
    if (fs.existsSync(fullThumbnailPath)) {
      return res.sendFile(fullThumbnailPath);
    } else {
      console.log(`Thumbnail file doesn't exist: ${fullThumbnailPath}`);
    }
  }
  
  // If we get here, either thumbnail generation failed or the file doesn't exist
  // First try SVG thumbnail, then PNG as fallback
  const defaultSvgThumbnail = path.join(process.cwd(), 'public', 'video-thumbnail.svg');
  console.log(`Trying default SVG thumbnail: ${defaultSvgThumbnail}`);
  
  if (fs.existsSync(defaultSvgThumbnail)) {
    console.log('Serving default SVG thumbnail');
    return res.sendFile(defaultSvgThumbnail);
  }
  
  // Try PNG fallback
  const defaultPngThumbnail = path.join(process.cwd(), 'public', 'video-thumbnail.png');
  console.log(`Trying default PNG thumbnail: ${defaultPngThumbnail}`);
  
  if (fs.existsSync(defaultPngThumbnail)) {
    console.log('Serving default PNG thumbnail');
    return res.sendFile(defaultPngThumbnail);
  }
  
  console.log('No default thumbnails found, sending 404');
  res.status(404).send('Thumbnail not available');
} 