/**
 * Token Estimation Utilities
 * Estimate token usage for cost optimization
 */

export interface TokenEstimate {
  input: number;
  output: number;
  total: number;
}

export interface TaskTokenEstimates {
  [taskType: string]: {
    baseInputTokens: number;
    baseOutputTokens: number;
    tokensPerCharacter: number;
  };
}

// Task-based token estimation patterns
const TASK_ESTIMATES: TaskTokenEstimates = {
  'chat': {
    baseInputTokens: 50,
    baseOutputTokens: 200,
    tokensPerCharacter: 0.25
  },
  'code': {
    baseInputTokens: 100,
    baseOutputTokens: 400,
    tokensPerCharacter: 0.3
  },
  'analysis': {
    baseInputTokens: 200,
    baseOutputTokens: 600,
    tokensPerCharacter: 0.28
  },
  'creative': {
    baseInputTokens: 80,
    baseOutputTokens: 800,
    tokensPerCharacter: 0.22
  },
  'translation': {
    baseInputTokens: 100,
    baseOutputTokens: 150,
    tokensPerCharacter: 0.26
  },
  'summarization': {
    baseInputTokens: 500,
    baseOutputTokens: 100,
    tokensPerCharacter: 0.25
  },
  'question-answering': {
    baseInputTokens: 150,
    baseOutputTokens: 250,
    tokensPerCharacter: 0.27
  }
};

/**
 * Estimate tokens for a given text input
 */
export function estimateInputTokens(text: string): number {
  // Rough estimation: ~4 characters per token for English text
  const charactersPerToken = 4;
  const baseTokens = Math.ceil(text.length / charactersPerToken);
  
  // Add some overhead for system prompts and formatting
  const overhead = Math.min(50, baseTokens * 0.1);
  
  return Math.ceil(baseTokens + overhead);
}

/**
 * Estimate tokens based on task type and content
 */
export function estimateTokens(task: string, taskType?: string): TokenEstimate {
  // Determine task type from content if not provided
  const detectedTaskType = taskType || detectTaskType(task);
  const estimates = TASK_ESTIMATES[detectedTaskType] || TASK_ESTIMATES['chat'];
  
  // Calculate input tokens
  const contentTokens = Math.ceil(task.length * estimates.tokensPerCharacter);
  const inputTokens = estimates.baseInputTokens + contentTokens;
  
  // Estimate output tokens based on task complexity
  const complexityFactor = calculateComplexityFactor(task);
  const outputTokens = Math.ceil(estimates.baseOutputTokens * complexityFactor);
  
  return {
    input: inputTokens,
    output: outputTokens,
    total: inputTokens + outputTokens
  };
}

/**
 * Detect task type from content analysis
 */
function detectTaskType(task: string): string {
  const taskLower = task.toLowerCase();
  
  // Code-related keywords
  if (taskLower.includes('code') || taskLower.includes('function') || 
      taskLower.includes('debug') || taskLower.includes('program')) {
    return 'code';
  }
  
  // Analysis keywords
  if (taskLower.includes('analyze') || taskLower.includes('review') || 
      taskLower.includes('examine') || taskLower.includes('evaluate')) {
    return 'analysis';
  }
  
  // Creative keywords
  if (taskLower.includes('write') || taskLower.includes('create') || 
      taskLower.includes('story') || taskLower.includes('poem')) {
    return 'creative';
  }
  
  // Translation keywords
  if (taskLower.includes('translate') || taskLower.includes('translation')) {
    return 'translation';
  }
  
  // Summarization keywords
  if (taskLower.includes('summarize') || taskLower.includes('summary') || 
      taskLower.includes('brief')) {
    return 'summarization';
  }
  
  // Question answering keywords
  if (taskLower.includes('?') || taskLower.includes('what') || 
      taskLower.includes('how') || taskLower.includes('why')) {
    return 'question-answering';
  }
  
  // Default to chat
  return 'chat';
}

/**
 * Calculate complexity factor based on task characteristics
 */
function calculateComplexityFactor(task: string): number {
  let factor = 1.0;
  
  // Length factor
  if (task.length > 500) factor += 0.3;
  if (task.length > 1000) factor += 0.2;
  
  // Complexity indicators
  const complexityKeywords = [
    'detailed', 'comprehensive', 'thorough', 'complex', 'advanced',
    'in-depth', 'elaborate', 'extensive', 'complete', 'full'
  ];
  
  const taskLower = task.toLowerCase();
  const complexityMatches = complexityKeywords.filter(keyword => 
    taskLower.includes(keyword)
  ).length;
  
  factor += complexityMatches * 0.15;
  
  // Multiple questions or tasks
  const questionMarks = (task.match(/\?/g) || []).length;
  if (questionMarks > 1) factor += questionMarks * 0.1;
  
  // Technical terms (likely to need more detailed responses)
  const technicalKeywords = [
    'algorithm', 'implementation', 'architecture', 'system', 'database',
    'api', 'framework', 'optimization', 'performance', 'security'
  ];
  
  const technicalMatches = technicalKeywords.filter(keyword => 
    taskLower.includes(keyword)
  ).length;
  
  factor += technicalMatches * 0.1;
  
  // Cap the factor to prevent extreme estimates
  return Math.min(factor, 3.0);
}

/**
 * Estimate tokens for batch processing
 */
export function estimateBatchTokens(tasks: string[], taskType?: string): TokenEstimate {
  const estimates = tasks.map(task => estimateTokens(task, taskType));
  
  return {
    input: estimates.reduce((sum, est) => sum + est.input, 0),
    output: estimates.reduce((sum, est) => sum + est.output, 0),
    total: estimates.reduce((sum, est) => sum + est.total, 0)
  };
}

/**
 * Convert tokens to approximate cost
 */
export function tokensToAPICost(
  inputTokens: number, 
  outputTokens: number,
  inputCostPer1k: number,
  outputCostPer1k: number
): number {
  const inputCost = (inputTokens / 1000) * inputCostPer1k;
  const outputCost = (outputTokens / 1000) * outputCostPer1k;
  return inputCost + outputCost;
}

/**
 * Get estimated cost range for a task across different models
 */
export function getTaskCostRange(task: string, taskType?: string): {
  low: number;
  high: number;
  estimate: TokenEstimate;
} {
  const estimate = estimateTokens(task, taskType);
  
  // Based on current model pricing ranges
  const lowCostModel = { input: 0.0005, output: 0.0015 }; // GPT-3.5 turbo
  const highCostModel = { input: 0.03, output: 0.06 }; // GPT-4
  
  return {
    low: tokensToAPICost(estimate.input, estimate.output, lowCostModel.input, lowCostModel.output),
    high: tokensToAPICost(estimate.input, estimate.output, highCostModel.input, highCostModel.output),
    estimate
  };
}