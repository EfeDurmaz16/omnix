function formatModelId(modelId) {
  if (!modelId) return 'Unknown Model';
  
  const id = modelId.toLowerCase();
  
  // Claude models - handle timestamp versions
  if (id.includes('claude-4-opus')) return 'Claude 4 Opus';
  if (id.includes('claude-4-sonnet') || id.includes('claude-sonnet-4')) return 'Claude 4 Sonnet';
  if (id.includes('claude-3.5-sonnet') || id.includes('claude-3-5-sonnet')) return 'Claude 3.5 Sonnet';
  if (id.includes('claude-3.5-haiku') || id.includes('claude-3-5-haiku')) return 'Claude 3.5 Haiku';
  if (id.includes('claude-3-opus')) return 'Claude 3 Opus';
  if (id.includes('claude-3-sonnet')) return 'Claude 3 Sonnet';
  if (id.includes('claude-3-haiku')) return 'Claude 3 Haiku';
  
  // OpenAI models - handle various formats
  if (id.includes('gpt-4o-mini')) return 'GPT-4o Mini';
  if (id.includes('gpt-4o')) return 'GPT-4o';
  if (id.includes('gpt-4-turbo')) return 'GPT-4 Turbo';
  if (id.includes('gpt-4')) return 'GPT-4';
  
  // Gemini models - handle version suffixes
  if (id.includes('gemini-2.0-flash') || id.includes('gemini-2-0-flash')) return 'Gemini 2.0 Flash';
  if (id.includes('gemini-1.5-flash') || id.includes('gemini-1-5-flash')) return 'Gemini 1.5 Flash';
  if (id.includes('gemini-pro')) return 'Gemini Pro';
  if (id.includes('gemini-flash')) return 'Gemini Flash';
  
  // Generic cleanup for unknown models
  let name = modelId
    // Remove provider prefixes
    .replace(/^(openai|anthropic|google|meta|mistral|xai|alibaba|deepseek|stability|midjourney|elevenlabs|wavespeed)[-_\/]?/i, '')
    // Remove timestamp suffixes (like -20241022)
    .replace(/-\d{8}$/, '')
    // Remove version suffixes (like -001, -002)
    .replace(/-\d{3}$/, '')
    // Replace dashes and underscores with spaces
    .replace(/[-_]/g, ' ')
    // Capitalize each word
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim();
  
  return name || modelId;
}

console.log('Testing formatModelId:');
console.log('claude-3-5-sonnet-20241022 ->', formatModelId('claude-3-5-sonnet-20241022'));
console.log('gpt-4o-mini-2024-07-18 ->', formatModelId('gpt-4o-mini-2024-07-18'));
console.log('gemini-2-0-flash-001 ->', formatModelId('gemini-2-0-flash-001'));