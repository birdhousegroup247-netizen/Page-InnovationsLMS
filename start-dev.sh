#!/bin/bash

# TekyPro LMS Development Server Startup Script
# This script starts both the backend API and admin frontend servers

echo "=========================================="
echo "  TekyPro LMS - Development Environment  "
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Check if ports are already in use
if check_port 5000; then
    echo -e "${YELLOW}⚠  Warning: Port 5000 is already in use${NC}"
    echo "   Backend may already be running or another service is using this port"
    read -p "   Do you want to kill the process and restart? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill -9 $(lsof -ti:5000) 2>/dev/null
        echo -e "${GREEN}✓  Killed process on port 5000${NC}"
    else
        echo "   Skipping backend startup"
        SKIP_BACKEND=true
    fi
fi

if check_port 5174 || check_port 5175; then
    echo -e "${YELLOW}⚠  Warning: Port 5174 or 5175 is already in use${NC}"
    echo "   Admin frontend may already be running"
    read -p "   Do you want to kill the process and restart? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill -9 $(lsof -ti:5174) 2>/dev/null
        kill -9 $(lsof -ti:5175) 2>/dev/null
        echo -e "${GREEN}✓  Killed process on ports 5174/5175${NC}"
    else
        echo "   Skipping frontend startup"
        SKIP_FRONTEND=true
    fi
fi

echo ""

# Start Backend
if [ "$SKIP_BACKEND" != true ]; then
    echo -e "${BLUE}Starting Backend API Server...${NC}"
    cd backend
    if [ ! -d "node_modules" ]; then
        echo "Installing backend dependencies..."
        npm install
    fi
    npm run dev > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo -e "${GREEN}✓  Backend started (PID: $BACKEND_PID)${NC}"
    echo "   URL: http://localhost:5000"
    echo "   Logs: logs/backend.log"
    cd ..
fi

# Wait a moment for backend to start
sleep 2

# Start Admin Frontend
if [ "$SKIP_FRONTEND" != true ]; then
    echo ""
    echo -e "${BLUE}Starting Admin Frontend...${NC}"
    cd frontend-admin
    if [ ! -d "node_modules" ]; then
        echo "Installing frontend dependencies..."
        npm install
    fi
    npm run dev > ../logs/frontend-admin.log 2>&1 &
    FRONTEND_PID=$!
    echo -e "${GREEN}✓  Admin Frontend started (PID: $FRONTEND_PID)${NC}"
    echo "   URL: http://localhost:5174 (or 5175 if 5174 is in use)"
    echo "   Logs: logs/frontend-admin.log"
    cd ..
fi

# Create logs directory if it doesn't exist
mkdir -p logs

echo ""
echo "=========================================="
echo -e "${GREEN}✓  Development servers are running!${NC}"
echo "=========================================="
echo ""
echo "Backend API:      http://localhost:5000"
echo "Admin Frontend:   http://localhost:5174"
echo "Health Check:     http://localhost:5000/health"
echo ""
echo "To stop the servers, press Ctrl+C or run:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "Logs are being written to the 'logs' directory"
echo ""

# Wait for user interrupt
trap 'echo ""; echo "Stopping servers..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit' INT TERM

# Keep script running
wait
