import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Configure ffmpeg path - use the path from environment variables
// or fallback to the provided path if env variable is not set
const FFMPEG_PATH = process.env.FFMPEG_PATH || 'X:\\CSProjects\\fullstack\\ffmpeg\\ffmpeg-master-latest-win64-gpl-shared\\bin\\ffmpeg.exe';

console.log('FFmpeg path configured as:', FFMPEG_PATH);

/**
 * Generates a thumbnail from a video file using ffmpeg
 * @param {string} videoPath - Path to the video file
 * @param {string} outputPath - Path where the thumbnail should be saved
 * @param {number} timeInSeconds - Time in seconds from which to capture the thumbnail (default: 0)
 * @param {string} size - Size of the thumbnail (default: '320x240')
 * @returns {Promise<string>} - Path to the generated thumbnail
 */
const generateVideoThumbnail = (videoPath, outputPath, timeInSeconds = 0, size = '320x240') => {
  return new Promise((resolve, reject) => {
    // Make sure the output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Format time as HH:MM:SS
    const formattedTime = new Date(timeInSeconds * 1000).toISOString().substr(11, 8);
    
    console.log(`Attempting to generate thumbnail using ffmpeg at ${FFMPEG_PATH}`);
    console.log(`Video path: ${videoPath}`);
    console.log(`Output path: ${outputPath}`);
    
    // Check if ffmpeg executable exists
    if (!fs.existsSync(FFMPEG_PATH)) {
      console.error(`FFmpeg executable not found at: ${FFMPEG_PATH}`);
      return reject(new Error(`FFmpeg executable not found at: ${FFMPEG_PATH}`));
    }
    
    // Spawn ffmpeg process with shell option for Windows paths with spaces
    const ffmpeg = spawn(FFMPEG_PATH, [
      '-i', videoPath,
      '-ss', formattedTime,
      '-vframes', '1',
      '-vf', `scale=${size}`,
      '-f', 'image2',
      '-y', // Overwrite output file if it exists
      outputPath
    ], { shell: process.platform === 'win32' });

    // Handle process events
    ffmpeg.on('error', (err) => {
      console.error(`Failed to start ffmpeg: ${err.message}`);
      reject(new Error(`Failed to start ffmpeg: ${err.message}`));
    });

    ffmpeg.stderr.on('data', (data) => {
      // ffmpeg logs to stderr by default, even for non-error output
      console.log(`ffmpeg: ${data.toString()}`);
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log(`Successfully generated thumbnail at ${outputPath}`);
        resolve(outputPath);
      } else {
        console.error(`ffmpeg process exited with code ${code}`);
        reject(new Error(`ffmpeg process exited with code ${code}`));
      }
    });
  });
};

export { generateVideoThumbnail };
