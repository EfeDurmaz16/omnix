export function setupEnvironment() {
  // Set up environment variables for Google Cloud
  if (!process.env.GOOGLE_CLOUD_PROJECT) {
    process.env.GOOGLE_CLOUD_PROJECT = 'omni-463513';
  }
  
  if (!process.env.GCS_BUCKET_NAME) {
    process.env.GCS_BUCKET_NAME = 'omnix-video-storage';
  }
  
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = './omni-463513-88580bf51818.json';
  }
  
  console.log('🔧 Environment variables set:', {
    GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
    GCS_BUCKET_NAME: process.env.GCS_BUCKET_NAME,
    GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  });
} 