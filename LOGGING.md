# Logging System Documentation

## Overview

The application now uses a centralized logging system that replaces verbose console.log statements with structured, level-based logging.

## Configuration

### Environment Variables

Add these to your `.env.local` file:

```bash
# Set log level (ERROR, WARN, INFO, DEBUG, TRACE)
LOG_LEVEL=INFO

# Filter by components (comma-separated, empty = all)
LOG_COMPONENTS=memory,stream
```

### Log Levels

- **ERROR** (0): Only critical errors
- **WARN** (1): Warnings and errors
- **INFO** (2): General information, warnings, and errors
- **DEBUG** (3): Detailed debugging information
- **TRACE** (4): Very detailed tracing (most verbose)

### Components

- `memory`: Memory retrieval, caching, and storage
- `stream`: Request streaming and chunk processing
- `context`: Context management and creation
- `embedding`: Embedding generation and processing
- `cache`: Cache operations (Redis, L1 cache)

## Usage Examples

### Basic Usage

```typescript
import { logger } from '@/lib/utils/logger';

// Simple logging
logger.info('Operation completed');
logger.error('Something went wrong', undefined, error);

// With context
logger.debug('Processing request', {
  component: 'stream',
  userId: 'user123',
  chatId: 'chat456'
});
```

### Specialized Methods

```typescript
// Component-specific logging
logger.memory('Retrieved 5 memories', { count: 5 });
logger.stream('Chunk processed', { size: 150 });
logger.context('Context created', { contextId: 'ctx_123' });

// Performance logging
logger.performance('Memory retrieval', 250); // Warns if > 1000ms
```

### Development vs Production

**Development** (default: DEBUG level):
```bash
LOG_LEVEL=DEBUG
LOG_COMPONENTS=memory,stream
```

**Production** (default: INFO level):
```bash
LOG_LEVEL=WARN
LOG_COMPONENTS=
```

**Debugging Specific Issues**:
```bash
LOG_LEVEL=TRACE
LOG_COMPONENTS=memory
```

## Benefits

1. **Reduced Noise**: No more thousands of debug lines
2. **Structured Data**: Consistent logging format
3. **Filtering**: Focus on specific components or operations
4. **Performance**: Conditional logging based on levels
5. **Production Ready**: Appropriate logging for different environments

## Migration

The old console.log statements have been replaced with:
- `console.log` → `logger.info` or `logger.debug`
- `console.warn` → `logger.warn`
- `console.error` → `logger.error`

All logging now includes component context and structured data for better debugging.