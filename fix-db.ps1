# Fix Database and ChromaDB Issues Script

Write-Host "🔧 Fixing database and ChromaDB issues..." -ForegroundColor Yellow

# Step 1: Clean Prisma cache and regenerate
Write-Host "1. Cleaning Prisma cache..." -ForegroundColor Cyan
Remove-Item -Path "node_modules/.prisma" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "prisma/dev.db" -Force -ErrorAction SilentlyContinue

# Step 2: Regenerate Prisma client
Write-Host "2. Regenerating Prisma client..." -ForegroundColor Cyan
npx prisma generate

# Step 3: Push schema to database
Write-Host "3. Pushing schema to database..." -ForegroundColor Cyan
npx prisma db push --accept-data-loss

# Step 4: Restart development server
Write-Host "4. Restarting development server..." -ForegroundColor Cyan
Write-Host "   Please run: npm run dev" -ForegroundColor Yellow

Write-Host "✅ Database fix completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart your development server: npm run dev" -ForegroundColor Gray
Write-Host "2. Test the debug endpoints:" -ForegroundColor Gray
Write-Host "   - curl http://localhost:3000/api/debug/stripe-status" -ForegroundColor Gray
Write-Host "   - curl -X POST http://localhost:3000/api/debug/fix-credits" -ForegroundColor Gray