@echo off
echo 🚀 Setting up MarkItDown integration for OmniX ADK Service

REM Check if we're in the right directory
if not exist "pyproject.toml" (
    echo ❌ Error: pyproject.toml not found. Are you in the adk-service directory?
    exit /b 1
)

REM Install dependencies using Poetry
echo 📦 Installing dependencies with Poetry...
poetry install

REM Verify MarkItDown installation
echo 🔍 Verifying MarkItDown installation...
poetry run python -c "import markitdown; print('✅ MarkItDown successfully installed')"

REM Check if we can import the file processor
echo 🔧 Testing file processor...
poetry run python -c "from file_processor import file_processor; print('✅ FileProcessor ready with', len(file_processor.get_supported_types()), 'supported types')"

REM Show supported file types
echo 📋 Supported file types:
poetry run python -c "from file_processor import file_processor; types = file_processor.get_supported_types(); [print(f'  • {description} ({mime_type})') for mime_type, description in sorted(types.items())]"

echo.
echo ✅ Setup complete! You can now start the service with:
echo    poetry run python main.py
echo.
echo 📍 The service will be available at: http://localhost:8001
echo 🔗 File processing endpoints:
echo    • POST /files/process - Process files with MarkItDown
echo    • GET /files/supported-types - Get supported file types
echo    • POST /files/info - Get file information
echo.
echo 🎯 To test the integration:
echo    curl -X POST http://localhost:8001/files/process -F "file=@your-file.pdf"

pause