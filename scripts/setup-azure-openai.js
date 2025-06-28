#!/usr/bin/env node

/**
 * Azure OpenAI Setup Script for OmniX
 * 
 * This script helps you configure Azure OpenAI environment variables
 * and validates your setup.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('🚀 Azure OpenAI Setup for OmniX\n');
  
  console.log('This script will help you configure Azure OpenAI integration.');
  console.log('Make sure you have completed the Azure setup first (see AZURE_OPENAI_SETUP.md)\n');
  
  // Collect information
  const apiKey = await question('Enter your Azure OpenAI API Key: ');
  const endpoint = await question('Enter your Azure OpenAI Endpoint (e.g., https://omnix-openai-sweden.openai.azure.com/): ');
  const region = await question('Enter your Azure OpenAI Region (e.g., sweden-central): ');
  
  console.log('\nOptional: Model deployment names (press Enter for defaults)');
  const gpt4oDeployment = await question('GPT-4o deployment name [gpt-4o-deployment]: ') || 'gpt-4o-deployment';
  const gpt4oMiniDeployment = await question('GPT-4o Mini deployment name [gpt-4o-mini-deployment]: ') || 'gpt-4o-mini-deployment';
  const gpt35Deployment = await question('GPT-3.5 Turbo deployment name [gpt-35-turbo-deployment]: ') || 'gpt-35-turbo-deployment';
  
  // Validate inputs
  if (!apiKey || !endpoint || !region) {
    console.error('❌ Error: API Key, Endpoint, and Region are required!');
    process.exit(1);
  }
  
  if (!endpoint.includes('openai.azure.com')) {
    console.error('❌ Error: Endpoint should be an Azure OpenAI endpoint (contains "openai.azure.com")');
    process.exit(1);
  }
  
  // Prepare environment variables
  const envVars = `
# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=${apiKey}
AZURE_OPENAI_ENDPOINT=${endpoint}
AZURE_OPENAI_API_VERSION=2024-02-01
AZURE_OPENAI_REGION=${region}

# Model Deployments
AZURE_OPENAI_GPT4O_DEPLOYMENT=${gpt4oDeployment}
AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT=${gpt4oMiniDeployment}
AZURE_OPENAI_GPT35_DEPLOYMENT=${gpt35Deployment}
`;

  // Check if .env.local exists
  const envPath = path.join(process.cwd(), '.env.local');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    
    // Check if Azure OpenAI config already exists
    if (envContent.includes('AZURE_OPENAI_API_KEY')) {
      const overwrite = await question('\n⚠️  Azure OpenAI configuration already exists. Overwrite? (y/N): ');
      if (overwrite.toLowerCase() !== 'y') {
        console.log('Setup cancelled.');
        rl.close();
        return;
      }
      
      // Remove existing Azure OpenAI config
      envContent = envContent.replace(/# Azure OpenAI Configuration[\s\S]*?(?=\n#|\n[A-Z]|$)/g, '');
    }
  }
  
  // Add new configuration
  const updatedEnvContent = envContent + envVars;
  
  try {
    fs.writeFileSync(envPath, updatedEnvContent);
    console.log('\n✅ Environment variables saved to .env.local');
    
    console.log('\n📋 Configuration Summary:');
    console.log(`   Endpoint: ${endpoint}`);
    console.log(`   Region: ${region}`);
    console.log(`   GPT-4o Deployment: ${gpt4oDeployment}`);
    console.log(`   GPT-4o Mini Deployment: ${gpt4oMiniDeployment}`);
    console.log(`   GPT-3.5 Deployment: ${gpt35Deployment}`);
    
    console.log('\n🔄 Next Steps:');
    console.log('1. Restart your development server: npm run dev');
    console.log('2. Go to /dashboard');
    console.log('3. Look for Azure OpenAI models in the model picker');
    console.log('4. Test with a message to verify connection');
    
    console.log('\n💡 Models will appear as:');
    console.log('   - GPT-4o (Azure)');
    console.log('   - GPT-4o Mini (Azure)');
    console.log('   - GPT-3.5 Turbo (Azure)');
    
  } catch (error) {
    console.error('❌ Error saving configuration:', error.message);
    process.exit(1);
  }
  
  rl.close();
}

main().catch(console.error); 