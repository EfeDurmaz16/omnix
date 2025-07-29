#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create Google Cloud credentials file from environment variables
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  const credentialsPath = path.join(__dirname, '..', 'omni-463513-88580bf51818.json');
  fs.writeFileSync(credentialsPath, process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  console.log('✅ Created Google Cloud credentials file');
} else {
  console.log('⚠️  GOOGLE_APPLICATION_CREDENTIALS_JSON not found - credentials file not created');
}