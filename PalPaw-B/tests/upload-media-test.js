/**
 * This is a simple test script to test the /upload/media endpoint.
 * Run it with Node.js: node upload-media-test.js
 */

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_URL = 'http://localhost:5001/api/upload/media';
const TOKEN = ''; // Add your auth token here
const TEST_FILE_PATH = path.join(__dirname, 'test-image.jpg'); // Change to your test file path
const CHAT_ID = ''; // Add a valid chat ID here

async function uploadMediaFile() {
  try {
    // Check if test file exists
    if (!fs.existsSync(TEST_FILE_PATH)) {
      console.error(`Test file not found: ${TEST_FILE_PATH}`);
      return;
    }

    // Create form data
    const formData = new FormData();
    formData.append('media', fs.createReadStream(TEST_FILE_PATH));
    formData.append('chatId', CHAT_ID);

    // Upload the file
    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });

    // Parse and log the response
    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('✅ File upload successful!');
      console.log('File URL:', result.path);
    } else {
      console.error('❌ File upload failed!');
    }
  } catch (error) {
    console.error('Error uploading file:', error);
  }
}

// Run the test
uploadMediaFile(); 