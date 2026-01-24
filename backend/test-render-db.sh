#!/bin/bash

# 🔗 Quick Render Database Connection Helper
# This script helps you test credentials against Render's PostgreSQL database

echo "🔗 Render Database Connection Helper"
echo "===================================="
echo ""

# Check if .env.render exists
if [ ! -f ".env.render" ]; then
    echo "⚠️  .env.render not found!"
    echo ""
    echo "Please create .env.render with your Render PostgreSQL credentials:"
    echo ""
    echo "DB_HOST=<your-host>.oregon-postgres.render.com"
    echo "DB_PORT=5432"
    echo "DB_NAME=<your-database-name>"
    echo "DB_USER=<your-database-user>"
    echo "DB_PASSWORD=<your-database-password>"
    echo "DB_DIALECT=postgres"
    echo ""
    echo "📖 See CONNECT_TO_RENDER_DB.md for detailed instructions"
    exit 1
fi

# Backup current .env if it exists
if [ -f ".env" ]; then
    echo "📦 Backing up current .env to .env.local..."
    cp .env .env.local
fi

# Use Render database
echo "🔄 Switching to Render database..."
cp .env.render .env

# Run the test
echo "🧪 Testing login credentials..."
echo ""
node test-login.js

# Store the exit code
TEST_EXIT_CODE=$?

# Restore original .env
if [ -f ".env.local" ]; then
    echo ""
    echo "🔄 Restoring local database connection..."
    mv .env.local .env
fi

echo ""
echo "✅ Done! Your local .env has been restored."

exit $TEST_EXIT_CODE
