#!/bin/bash

# TekyPro LMS - Production Build Test Script
# This script tests production builds locally before deploying to Render.com

set -e  # Exit on any error

echo "╔════════════════════════════════════════════════════════════╗"
echo "║      TekyPro LMS - Production Build Test                 ║"
echo "╔════════════════════════════════════════════════════════════╗"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

# Test 1: Check if Node.js is installed
echo "1. Checking prerequisites..."
if command -v node &> /dev/null; then
  NODE_VERSION=$(node --version)
  print_status "Node.js installed: $NODE_VERSION"
else
  print_error "Node.js is not installed!"
  exit 1
fi

if command -v npm &> /dev/null; then
  NPM_VERSION=$(npm --version)
  print_status "npm installed: $NPM_VERSION"
else
  print_error "npm is not installed!"
  exit 1
fi

echo ""

# Test 2: Build Student Frontend
echo "2. Building Student/Instructor Frontend..."
cd frontend

if [ ! -d "node_modules" ]; then
  print_warning "Installing dependencies first..."
  npm install
fi

print_status "Running build command: npm run build"
npm run build

if [ -d "dist" ]; then
  DIST_SIZE=$(du -sh dist | cut -f1)
  print_status "Build successful! Output size: $DIST_SIZE"
  print_status "Build location: frontend/dist"
else
  print_error "Build failed - dist folder not created!"
  exit 1
fi

cd ..
echo ""

# Test 3: Build Admin Frontend
echo "3. Building Admin Frontend..."
cd frontend-admin

if [ ! -d "node_modules" ]; then
  print_warning "Installing dependencies first..."
  npm install
fi

print_status "Running build command: npm run build"
npm run build

if [ -d "dist" ]; then
  DIST_SIZE=$(du -sh dist | cut -f1)
  print_status "Build successful! Output size: $DIST_SIZE"
  print_status "Build location: frontend-admin/dist"
else
  print_error "Build failed - dist folder not created!"
  exit 1
fi

cd ..
echo ""

# Test 4: Check Backend dependencies
echo "4. Checking Backend setup..."
cd backend

if [ ! -f ".env" ]; then
  print_warning ".env file not found in backend directory"
  print_warning "Make sure to create one before deploying to Render.com"
else
  print_status ".env file exists"
fi

if [ ! -d "node_modules" ]; then
  print_warning "Installing backend dependencies..."
  npm install
fi

print_status "Backend dependencies installed"

cd ..
echo ""

# Test 5: Check for required files
echo "5. Checking deployment files..."

if [ -f "render.yaml" ]; then
  print_status "render.yaml found"
else
  print_warning "render.yaml not found - required for Render.com deployment"
fi

if [ -f ".env.production.example" ]; then
  print_status ".env.production.example found"
else
  print_warning ".env.production.example not found"
fi

if [ -f "RENDER_DEPLOYMENT_GUIDE.md" ]; then
  print_status "RENDER_DEPLOYMENT_GUIDE.md found"
else
  print_warning "RENDER_DEPLOYMENT_GUIDE.md not found"
fi

echo ""

# Summary
echo "════════════════════════════════════════════════════════════"
echo "BUILD TEST SUMMARY"
echo "════════════════════════════════════════════════════════════"
print_status "Student Frontend: Built successfully"
print_status "Admin Frontend: Built successfully"
print_status "Backend: Dependencies installed"
echo ""
echo "Your application is ready for deployment to Render.com!"
echo ""
echo "Next steps:"
echo "  1. Push your code to GitHub"
echo "  2. Follow the guide in RENDER_DEPLOYMENT_GUIDE.md"
echo "  3. Deploy to Render.com"
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    ✓ ALL TESTS PASSED                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
