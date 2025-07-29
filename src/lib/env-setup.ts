export function setupEnvironment() {
  // Set up environment variables for Google Cloud
  if (!process.env.GOOGLE_CLOUD_PROJECT) {
    process.env.GOOGLE_CLOUD_PROJECT = 'omni-463513';
  }
  
  if (!process.env.GCS_BUCKET_NAME) {
    process.env.GCS_BUCKET_NAME = 'omnix-video-storage';
  }
  
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Check for Render secret file first, then fallback to local
    const renderSecretPath = '/etc/secrets/omni-463513-88580bf51818.json';
    const localPath = './omni-463513-88580bf51818.json';
    
    // Use require to check file existence synchronously
    const fs = require('fs');
    if (fs.existsSync(renderSecretPath)) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = renderSecretPath;
    } else {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = localPath;
    }
  }
  
  console.log('🔧 Environment variables set:', {
    GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
    GCS_BUCKET_NAME: process.env.GCS_BUCKET_NAME,
    GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  });
} 