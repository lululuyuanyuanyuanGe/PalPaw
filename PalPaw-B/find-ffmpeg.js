/**
 * This script attempts to locate the ffmpeg executable on the system
 * and prints its path for use in environment variables
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

// Possible locations to check for ffmpeg on Windows
const possibleWindowsPaths = [
  'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
  'C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe',
  'C:\\ffmpeg\\bin\\ffmpeg.exe',
  process.env.ProgramFiles + '\\ffmpeg\\bin\\ffmpeg.exe',
  process.env['ProgramFiles(x86)'] + '\\ffmpeg\\bin\\ffmpeg.exe'
];

// Function to check if a file exists
const fileExists = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      return true;
    }
  } catch (err) {
    console.error(`Error checking if file exists: ${err.message}`);
  }
  return false;
};

// Check common installation paths first
console.log('Checking common installation paths for ffmpeg...');
for (const potentialPath of possibleWindowsPaths) {
  if (fileExists(potentialPath)) {
    console.log(`✅ Found ffmpeg at: ${potentialPath}`);
    console.log(`\nAdd this to your .env file or environment variables:`);
    console.log(`FFMPEG_PATH="${potentialPath}"`);
    process.exit(0);
  }
}

// If not found in common paths, try to locate using 'where' command on Windows
console.log('Checking system PATH for ffmpeg...');
exec('where ffmpeg', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ Could not find ffmpeg in system PATH');
    console.log('\nPlease ensure ffmpeg is installed and available in your PATH, or:');
    console.log('1. Install ffmpeg from https://ffmpeg.org/download.html');
    console.log('2. Add the path to ffmpeg.exe in your .env file:');
    console.log('   FFMPEG_PATH="C:\\path\\to\\ffmpeg.exe"');
    process.exit(1);
  }
  
  const ffmpegPath = stdout.trim().split('\n')[0];
  if (ffmpegPath) {
    console.log(`✅ Found ffmpeg at: ${ffmpegPath}`);
    console.log(`\nAdd this to your .env file or environment variables:`);
    console.log(`FFMPEG_PATH="${ffmpegPath}"`);
    process.exit(0);
  }
}); 