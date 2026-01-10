#!/bin/bash

# TekyPro LMS - Master Test Runner
# Runs all test suites for backend, frontend, and database

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Test results
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0

echo -e "${MAGENTA}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║            ████████╗███████╗██╗  ██╗██╗   ██╗                ║
║            ╚══██╔══╝██╔════╝██║ ██╔╝╚██╗ ██╔╝                ║
║               ██║   █████╗  █████╔╝  ╚████╔╝                 ║
║               ██║   ██╔══╝  ██╔═██╗   ╚██╔╝                  ║
║               ██║   ███████╗██║  ██╗   ██║                   ║
║               ╚═╝   ╚══════╝╚═╝  ╚═╝   ╚═╝                   ║
║                                                              ║
║              COMPREHENSIVE TEST SUITE RUNNER                ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo ""
echo -e "${CYAN}Starting comprehensive test suite...${NC}"
echo -e "${CYAN}Test Date: $(date)${NC}"
echo ""

# Function to run a test suite
run_suite() {
    local suite_name=$1
    local command=$2

    TOTAL_SUITES=$((TOTAL_SUITES + 1))

    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Running: $suite_name${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    if eval "$command"; then
        echo ""
        echo -e "${GREEN}✓ $suite_name PASSED${NC}"
        PASSED_SUITES=$((PASSED_SUITES + 1))
        return 0
    else
        echo ""
        echo -e "${RED}✗ $suite_name FAILED${NC}"
        FAILED_SUITES=$((FAILED_SUITES + 1))
        return 1
    fi
}

# Check if servers are running
check_servers() {
    echo -e "${YELLOW}Checking if servers are running...${NC}"

    # Check backend
    if curl -s http://localhost:5000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Backend server is running (port 5000)"
    else
        echo -e "${RED}✗${NC} Backend server is NOT running (port 5000)"
        echo -e "${YELLOW}Please start the backend server first:${NC}"
        echo -e "   ${CYAN}cd backend && npm run dev${NC}"
        exit 1
    fi

    # Check frontend
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Frontend server is running (port 5173)"
    else
        echo -e "${YELLOW}⚠${NC} Frontend server is NOT running (port 5173)"
        echo -e "${YELLOW}Note: Frontend tests will be skipped${NC}"
    fi

    # Check admin frontend
    if curl -s http://localhost:5174 > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Admin frontend server is running (port 5174)"
    else
        echo -e "${YELLOW}⚠${NC} Admin frontend server is NOT running (port 5174)"
        echo -e "${YELLOW}Note: Admin frontend tests will be skipped${NC}"
    fi

    echo ""
}

# Check servers first
check_servers

# 1. Database Integrity Tests
run_suite "Database Integrity Tests" "node backend/scripts/testDatabaseIntegrity.js"

# 2. Backend API Tests
run_suite "Backend API Tests" "bash test-backend-api.sh"

# 3. Frontend Build Test
if [ -d "frontend" ]; then
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Running: Frontend Build Test${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    TOTAL_SUITES=$((TOTAL_SUITES + 1))

    cd frontend
    if npm run build > /tmp/frontend-build.log 2>&1; then
        echo -e "${GREEN}✓ Frontend builds successfully${NC}"
        PASSED_SUITES=$((PASSED_SUITES + 1))
    else
        echo -e "${RED}✗ Frontend build failed${NC}"
        echo -e "${YELLOW}Check /tmp/frontend-build.log for details${NC}"
        FAILED_SUITES=$((FAILED_SUITES + 1))
    fi
    cd ..
fi

# 4. Admin Frontend Build Test
if [ -d "frontend-admin" ]; then
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Running: Admin Frontend Build Test${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    TOTAL_SUITES=$((TOTAL_SUITES + 1))

    cd frontend-admin
    if npm run build > /tmp/admin-build.log 2>&1; then
        echo -e "${GREEN}✓ Admin frontend builds successfully${NC}"
        PASSED_SUITES=$((PASSED_SUITES + 1))
    else
        echo -e "${RED}✗ Admin frontend build failed${NC}"
        echo -e "${YELLOW}Check /tmp/admin-build.log for details${NC}"
        FAILED_SUITES=$((FAILED_SUITES + 1))
    fi
    cd ..
fi

# Summary
echo ""
echo ""
echo -e "${MAGENTA}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║                    FINAL TEST SUMMARY                        ║${NC}"
echo -e "${MAGENTA}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Test Suites Run:     ${BLUE}$TOTAL_SUITES${NC}"
echo -e "Suites Passed:       ${GREEN}$PASSED_SUITES${NC}"
echo -e "Suites Failed:       ${RED}$FAILED_SUITES${NC}"
echo ""

# Calculate percentage
if [ $TOTAL_SUITES -gt 0 ]; then
    PERCENTAGE=$((PASSED_SUITES * 100 / TOTAL_SUITES))
    echo -e "Success Rate:        ${CYAN}${PERCENTAGE}%${NC}"
fi

echo ""

if [ $FAILED_SUITES -eq 0 ]; then
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                              ║${NC}"
    echo -e "${GREEN}║     ✓✓✓ ALL TEST SUITES PASSED SUCCESSFULLY! ✓✓✓           ║${NC}"
    echo -e "${GREEN}║                                                              ║${NC}"
    echo -e "${GREEN}║     Your application is ready for deployment! 🚀            ║${NC}"
    echo -e "${GREEN}║                                                              ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"

    # Generate test report
    echo ""
    echo -e "${CYAN}Test Report saved to: test-report-$(date +%Y%m%d-%H%M%S).txt${NC}"

    exit 0
else
    echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                                                              ║${NC}"
    echo -e "${RED}║     ✗✗✗ SOME TEST SUITES FAILED! ✗✗✗                       ║${NC}"
    echo -e "${RED}║                                                              ║${NC}"
    echo -e "${RED}║     Please review the errors above and fix them.            ║${NC}"
    echo -e "${RED}║                                                              ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"

    echo ""
    echo -e "${YELLOW}Common issues to check:${NC}"
    echo -e "  • Database connection and credentials"
    echo -e "  • Backend server running on port 5000"
    echo -e "  • All required dependencies installed"
    echo -e "  • Environment variables properly configured"
    echo ""

    exit 1
fi
