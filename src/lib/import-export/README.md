# Chat Import/Export System

A comprehensive chat import/export system for the Aspendos AI platform that supports multiple AI platform formats and export types with advanced security validation.

## Features

### 🔄 Import Support
- **ChatGPT**: Import from OpenAI conversation exports (conversations.json)
- **Claude**: Import from Anthropic conversation exports
- **Google Gemini/Bard**: Import from Google AI conversation exports
- **Microsoft Copilot**: Import from Microsoft chat exports
- **Aspendos**: Native format support

### 📤 Export Formats
- **JSON**: Structured data format (recommended for re-importing)
- **Markdown**: Human-readable format with formatting
- **CSV**: Spreadsheet format for data analysis
- **HTML**: Web format with rich styling
- **Plain Text**: Universal compatibility
- **PDF**: Document format (exported as HTML)

### 🔒 Security Features
- File validation and sanitization
- Content security scanning
- Privacy data filtering
- Malicious pattern detection
- Risk assessment scoring

### ⚡ Advanced Capabilities
- Batch import/export operations
- Format conversion between platforms
- Date range filtering
- Conversation-specific exports
- Metadata preservation
- Progress tracking

## Quick Start

### Basic Export

```typescript
import { ImportExportButton } from '@/lib/import-export';

// Add to your component
<ImportExportButton userId={userId} />
```

### Programmatic Export

```typescript
import { ImportExportService } from '@/lib/import-export';

const result = await ImportExportService.exportConversations(userId, {
  format: 'json',
  includeMetadata: true,
  includeSystemMessages: false,
  dateRange: {
    start: '2024-01-01',
    end: '2024-12-31'
  }
});
```

### Programmatic Import

```typescript
import { ImportExportService } from '@/lib/import-export';

const result = await ImportExportService.importConversations(
  userId,
  fileContent,
  {
    platform: 'chatgpt',
    mergeStrategy: 'merge',
    validateContent: true,
    preserveIds: false
  }
);
```

## API Endpoints

### Export Conversations
```
GET /api/conversations/export
```

Query Parameters:
- `format`: Export format (json, markdown, csv, html, txt, pdf)
- `includeMetadata`: Include conversation metadata (default: true)
- `includeSystemMessages`: Include system messages (default: false)
- `startDate`: Filter start date (ISO string)
- `endDate`: Filter end date (ISO string)
- `conversationIds`: Comma-separated conversation IDs
- `limit`: Maximum conversations to export
- `offset`: Pagination offset

### Import Conversations
```
POST /api/conversations/import
```

Form Data:
- `file`: The conversation file to import
- `options`: JSON string with import options
- `privacySettings`: JSON string with privacy settings

### Batch Operations
```
POST /api/conversations/batch
```

Supports multiple import/export operations in a single request.

### Format Conversion
```
POST /api/conversations/convert
```

Convert between different platform formats without saving to database.

## File Format Examples

### ChatGPT Export Format
```json
{
  "conversations": [
    {
      "title": "My Conversation",
      "create_time": 1703980800,
      "update_time": 1703984400,
      "mapping": {
        "msg_id": {
          "message": {
            "content": {
              "content_type": "text",
              "parts": ["Hello, world!"]
            },
            "author": {
              "role": "user"
            }
          }
        }
      }
    }
  ]
}
```

### Claude Export Format
```json
{
  "conversations": [
    {
      "uuid": "conv_123",
      "name": "My Conversation",
      "created_at": "2024-01-01T00:00:00Z",
      "chat_messages": [
        {
          "uuid": "msg_123",
          "text": "Hello, world!",
          "sender": "human",
          "created_at": "2024-01-01T00:00:00Z"
        }
      ]
    }
  ]
}
```

### Aspendos Native Format
```json
{
  "version": "1.0",
  "source": "aspendos",
  "exportDate": "2024-01-01T00:00:00Z",
  "conversations": [
    {
      "id": "conv_123",
      "title": "My Conversation",
      "model": "gpt-4o",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z",
      "messages": [
        {
          "id": "msg_123",
          "role": "user",
          "content": "Hello, world!",
          "timestamp": "2024-01-01T00:00:00Z",
          "model": "gpt-4o"
        }
      ],
      "metadata": {
        "platform": "aspendos",
        "tokenCount": 10,
        "cost": 0.001
      }
    }
  ]
}
```

## Security Considerations

### Validation Pipeline
1. **File Validation**: Size, type, and name checks
2. **JSON Structure**: Schema validation
3. **Content Security**: Malicious pattern detection
4. **Data Sanitization**: Remove or anonymize sensitive content
5. **Risk Assessment**: Scoring based on security indicators

### Privacy Options
- **Anonymize User Data**: Replace names and personal references
- **Exclude Sensitive Content**: Filter out emails, phone numbers, etc.
- **Content Filtering**: Remove potentially harmful patterns
- **Metadata Filtering**: Control what metadata is preserved

### Risk Factors
- File size and format
- Suspicious patterns in content
- Unusual metadata fields
- Encoded content detection
- Sensitive keyword presence

## Configuration

### Import Options
```typescript
interface ImportOptions {
  platform: SupportedPlatform;
  mergeStrategy: 'replace' | 'merge' | 'skip_existing';
  preserveIds: boolean;
  validateContent: boolean;
  includeMetadata: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}
```

### Export Options
```typescript
interface ExportOptions {
  format: ExportFormat;
  includeMetadata: boolean;
  includeSystemMessages: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  conversationIds?: string[];
  compression?: 'none' | 'zip' | 'gzip';
  pagination?: {
    limit: number;
    offset: number;
  };
}
```

### Privacy Settings
```typescript
interface PrivacySettings {
  includePersonalInfo: boolean;
  anonymizeUserData: boolean;
  excludeSensitiveContent: boolean;
  retentionPeriod?: number;
  encryptExport: boolean;
  requirePasswordForDownload: boolean;
}
```

## Error Handling

The system provides comprehensive error handling with detailed error codes:

- `UNAUTHORIZED`: Authentication required
- `NO_FILE`: No file provided for import
- `INVALID_FILE`: File validation failed
- `HIGH_RISK_FILE`: Security assessment failed
- `INVALID_JSON`: File does not contain valid JSON
- `INVALID_STRUCTURE`: Data structure validation failed
- `PARSE_FAILED`: Unable to parse conversations
- `VALIDATION_FAILED`: Content validation failed
- `NO_CONVERSATIONS`: No conversations found
- `EXPORT_FAILED`: Export operation failed
- `IMPORT_FAILED`: Import operation failed

## Performance Considerations

### Optimization Features
- Streaming support for large files
- Pagination for large datasets
- Progress tracking for long operations
- Caching for repeated operations
- Batch processing for multiple operations

### Limits
- Maximum file size: 50MB
- Maximum conversations per import: 10,000
- Maximum messages per conversation: 1,000
- Maximum message length: 50,000 characters
- Batch operation limit: 10 operations

## Integration Examples

### Add to Chat Interface

```typescript
import { ImportExportButton } from '@/lib/import-export';

function ChatInterface() {
  return (
    <div>
      {/* Your chat interface */}
      <ImportExportButton 
        userId={userId}
        variant="outline"
        size="sm"
      />
    </div>
  );
}
```

### Custom Export Function

```typescript
import { ImportExportService } from '@/lib/import-export';

async function exportMyChats() {
  try {
    const result = await fetch('/api/conversations/export?format=markdown&includeMetadata=true');
    const blob = await result.blob();
    
    // Trigger download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-chats.md';
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Export failed:', error);
  }
}
```

### Custom Import Handler

```typescript
import { ImportExportService } from '@/lib/import-export';

async function handleFileImport(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('options', JSON.stringify({
    platform: 'chatgpt',
    mergeStrategy: 'merge',
    validateContent: true
  }));

  try {
    const response = await fetch('/api/conversations/import', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    if (result.success) {
      console.log('Import successful:', result.result);
    } else {
      console.error('Import failed:', result.error);
    }
  } catch (error) {
    console.error('Import request failed:', error);
  }
}
```

## Testing

The system includes comprehensive validation and testing utilities:

```typescript
import { ImportExportUtils, ImportValidator } from '@/lib/import-export';

// Generate sample data for testing
const sampleConversation = ImportExportUtils.generateSampleConversation();

// Validate file before processing
const validation = ImportExportService.validateImportFile(file, content);
if (!validation.isValid) {
  console.error('Validation failed:', validation.errors);
}
```

## Future Enhancements

- Real-time progress tracking
- Resume interrupted operations
- Scheduled exports
- Cloud storage integration
- Advanced encryption options
- Custom format plugins
- Webhook notifications
- Audit logging