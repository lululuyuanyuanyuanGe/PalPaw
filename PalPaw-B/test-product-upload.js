import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configs
const API_URL = 'http://localhost:5001';
const SAMPLE_IMAGE_PATH = path.join(__dirname, 'test-image.jpg');
const SAMPLE_VIDEO_PATH = path.join(__dirname, 'test-video.mp4');

// Create test files if they don't exist
async function createTestFiles() {
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(__dirname, 'uploads', 'posts');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Create a test image if it doesn't exist
  if (!fs.existsSync(SAMPLE_IMAGE_PATH)) {
    console.log('Creating test image file...');
    // Create a simple 1x1 pixel JPEG
    const imageBuffer = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 
      0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xC2, 0x00, 0x0B, 0x08, 0x00, 0x01, 0x00, 
      0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x10, 0x01, 0x00, 
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
      0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x01, 0x3F, 
      0x10
    ]);
    fs.writeFileSync(SAMPLE_IMAGE_PATH, imageBuffer);
    console.log('Created test image at:', SAMPLE_IMAGE_PATH);
  }

  // Create a test video if it doesn't exist
  if (!fs.existsSync(SAMPLE_VIDEO_PATH)) {
    console.log('Creating test video file...');
    // Create a minimal MP4 file
    const videoBuffer = Buffer.from([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6D, 0x70, 0x34, 0x32, 
      0x00, 0x00, 0x00, 0x00, 0x6D, 0x70, 0x34, 0x32, 0x69, 0x73, 0x6F, 0x6D, 
      0x00, 0x00, 0x00, 0x08, 0x6D, 0x6F, 0x6F, 0x76
    ]);
    fs.writeFileSync(SAMPLE_VIDEO_PATH, videoBuffer);
    console.log('Created test video at:', SAMPLE_VIDEO_PATH);
  }
}

// Test product upload with multiple media files
async function testProductUpload() {
  try {
    // Make sure test files exist
    await createTestFiles();

    // Create a new FormData instance
    const form = new FormData();
    
    // Add product details
    form.append('name', 'Test Product');
    form.append('description', 'This is a test product with multiple media files');
    form.append('price', '19.99');
    form.append('category', 'Pet Toys');
    form.append('condition', 'Like New');
    form.append('quantity', '1');
    
    // Add test image
    const imageStream = fs.createReadStream(SAMPLE_IMAGE_PATH);
    form.append('media', imageStream, { filename: 'test-image.jpg' });
    
    // Add test video if it exists
    if (fs.existsSync(SAMPLE_VIDEO_PATH)) {
      const videoStream = fs.createReadStream(SAMPLE_VIDEO_PATH);
      form.append('media', videoStream, { filename: 'test-video.mp4' });
    }
    
    console.log('Making API request to upload product...');
    console.log('URL:', `${API_URL}/api/pg/products/upload`);
    console.log('Form data boundary:', form.getBoundary());
    
    // Get a test auth token
    // In a real app, you would authenticate first
    const testToken = process.env.TEST_AUTH_TOKEN || 'YOUR_TEST_TOKEN';
    
    // Make the API request
    const response = await fetch(`${API_URL}/api/pg/products/upload`, {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${testToken}`
      }
    });
    
    console.log('\nResponse status:', response.status);
    console.log('Response headers:', response.headers.raw());
    
    // Try to parse the response as JSON
    let data;
    try {
      data = await response.json();
      console.log('\nResponse data:', JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('Error parsing response as JSON:', e);
      const text = await response.text();
      console.log('Response text:', text);
    }
    
    if (response.ok) {
      console.log('\n✅ Product upload successful!');
    } else {
      console.error('\n❌ Product upload failed!');
    }
  } catch (error) {
    console.error('Error in test:', error);
  }
}

// Run the test
console.log('Starting product upload test...');
testProductUpload(); 