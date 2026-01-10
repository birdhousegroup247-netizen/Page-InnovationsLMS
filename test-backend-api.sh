#!/bin/bash

# TekyPro Backend API Test Suite
# Tests all critical API endpoints

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0
TOTAL=0

# API Base URL
API_URL="http://localhost:5000"

# Test credentials
ADMIN_EMAIL="admin@tekypro.com"
ADMIN_PASSWORD="password123"
INSTRUCTOR_EMAIL="kayleigh85@yahoo.com"
INSTRUCTOR_PASSWORD="password123"
STUDENT_EMAIL="dayne.kris33@hotmail.com"
STUDENT_PASSWORD="password123"

# Tokens (will be set after login)
ADMIN_TOKEN=""
INSTRUCTOR_TOKEN=""
STUDENT_TOKEN=""

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        TekyPro LMS - Backend API Test Suite              ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo ""

# Helper function to run a test
run_test() {
    local test_name=$1
    local command=$2
    local expected_code=${3:-200}

    TOTAL=$((TOTAL + 1))
    echo -n "Testing: $test_name ... "

    # Run the command and capture response code
    response=$(eval "$command" 2>&1)
    code=$?

    # Check if curl command succeeded
    if [ $code -eq 0 ]; then
        # Extract HTTP status code from response
        http_code=$(echo "$response" | grep -oP 'HTTP_CODE:\K[0-9]+' | tail -1)

        if [ "$http_code" = "$expected_code" ]; then
            echo -e "${GREEN}✓ PASSED${NC}"
            PASSED=$((PASSED + 1))
            return 0
        else
            echo -e "${RED}✗ FAILED${NC} (Expected: $expected_code, Got: $http_code)"
            FAILED=$((FAILED + 1))
            return 1
        fi
    else
        echo -e "${RED}✗ FAILED${NC} (Connection error)"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Helper function to extract token from login response
extract_token() {
    local response=$1
    # Tokens are in cookies, so we'll use cookie-based auth
    echo "cookie-auth"
}

echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}1. HEALTH & CONNECTIVITY TESTS${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"

# Test 1: Health check
run_test "Health Check Endpoint" \
    "curl -s -w '\nHTTP_CODE:%{http_code}' -X GET '$API_URL/health' -o /dev/null"

# Test 2: API root
run_test "API Root Endpoint" \
    "curl -s -w '\nHTTP_CODE:%{http_code}' -X GET '$API_URL/api' -o /dev/null"

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}2. AUTHENTICATION TESTS${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"

# Test 3: Admin Login
echo -n "Testing: Admin Login ... "
admin_response=$(curl -s -c /tmp/admin_cookies.txt -w '\nHTTP_CODE:%{http_code}' \
    -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

admin_code=$(echo "$admin_response" | grep -oP 'HTTP_CODE:\K[0-9]+' | tail -1)
if [ "$admin_code" = "200" ]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC} (Code: $admin_code)"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

# Test 4: Instructor Login
echo -n "Testing: Instructor Login ... "
instructor_response=$(curl -s -c /tmp/instructor_cookies.txt -w '\nHTTP_CODE:%{http_code}' \
    -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$INSTRUCTOR_EMAIL\",\"password\":\"$INSTRUCTOR_PASSWORD\"}")

instructor_code=$(echo "$instructor_response" | grep -oP 'HTTP_CODE:\K[0-9]+' | tail -1)
if [ "$instructor_code" = "200" ]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC} (Code: $instructor_code)"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

# Test 5: Student Login
echo -n "Testing: Student Login ... "
student_response=$(curl -s -c /tmp/student_cookies.txt -w '\nHTTP_CODE:%{http_code}' \
    -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$STUDENT_EMAIL\",\"password\":\"$STUDENT_PASSWORD\"}")

student_code=$(echo "$student_response" | grep -oP 'HTTP_CODE:\K[0-9]+' | tail -1)
if [ "$student_code" = "200" ]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC} (Code: $student_code)"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

# Test 6: Invalid Login
run_test "Invalid Login (Should Fail)" \
    "curl -s -w '\nHTTP_CODE:%{http_code}' -X POST '$API_URL/api/auth/login' \
    -H 'Content-Type: application/json' \
    -d '{\"email\":\"invalid@test.com\",\"password\":\"wrongpass\"}' -o /dev/null" \
    401

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}3. STUDENT ENDPOINTS${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"

# Test 7: Get Student Profile Stats
run_test "Student Profile Stats" \
    "curl -s -b /tmp/student_cookies.txt -w '\nHTTP_CODE:%{http_code}' \
    -X GET '$API_URL/api/profile/stats' -o /dev/null"

# Test 8: Get Student Courses
run_test "Student Enrolled Courses" \
    "curl -s -b /tmp/student_cookies.txt -w '\nHTTP_CODE:%{http_code}' \
    -X GET '$API_URL/api/enrollments/my-courses' -o /dev/null"

# Test 9: Get All Courses (Public)
run_test "Public Courses List" \
    "curl -s -w '\nHTTP_CODE:%{http_code}' \
    -X GET '$API_URL/api/courses' -o /dev/null"

# Test 10: Get Categories
run_test "Categories List" \
    "curl -s -w '\nHTTP_CODE:%{http_code}' \
    -X GET '$API_URL/api/courses/categories' -o /dev/null"

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}4. INSTRUCTOR ENDPOINTS${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"

# Test 11: Instructor Dashboard
run_test "Instructor Dashboard" \
    "curl -s -b /tmp/instructor_cookies.txt -w '\nHTTP_CODE:%{http_code}' \
    -X GET '$API_URL/api/instructor/dashboard' -o /dev/null"

# Test 12: Instructor Stats
run_test "Instructor Stats" \
    "curl -s -b /tmp/instructor_cookies.txt -w '\nHTTP_CODE:%{http_code}' \
    -X GET '$API_URL/api/instructor/stats' -o /dev/null"

# Test 13: Instructor Courses
run_test "Instructor Courses" \
    "curl -s -b /tmp/instructor_cookies.txt -w '\nHTTP_CODE:%{http_code}' \
    -X GET '$API_URL/api/courses/my/teaching' -o /dev/null"

# Test 14: Instructor Students
run_test "Instructor Students" \
    "curl -s -b /tmp/instructor_cookies.txt -w '\nHTTP_CODE:%{http_code}' \
    -X GET '$API_URL/api/courses/my/students' -o /dev/null"

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}5. ADMIN ENDPOINTS${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"

# Test 15: Admin Users List
run_test "Admin Users List" \
    "curl -s -b /tmp/admin_cookies.txt -w '\nHTTP_CODE:%{http_code}' \
    -X GET '$API_URL/api/admin/users' -o /dev/null"

# Test 16: Admin Courses List
run_test "Admin Courses List" \
    "curl -s -b /tmp/admin_cookies.txt -w '\nHTTP_CODE:%{http_code}' \
    -X GET '$API_URL/api/admin/courses' -o /dev/null"

# Test 17: Admin Instructor Applications
run_test "Admin Instructor Applications" \
    "curl -s -b /tmp/admin_cookies.txt -w '\nHTTP_CODE:%{http_code}' \
    -X GET '$API_URL/api/admin/instructor-applications' -o /dev/null"

# Test 18: Admin Categories
run_test "Admin Categories Management" \
    "curl -s -b /tmp/admin_cookies.txt -w '\nHTTP_CODE:%{http_code}' \
    -X GET '$API_URL/api/admin/categories' -o /dev/null"

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}6. AUTHORIZATION TESTS${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"

# Test 19: Student cannot access admin endpoints
run_test "Student Access Denied to Admin" \
    "curl -s -b /tmp/student_cookies.txt -w '\nHTTP_CODE:%{http_code}' \
    -X GET '$API_URL/api/admin/users' -o /dev/null" \
    403

# Test 20: Student cannot access instructor dashboard
run_test "Student Access Denied to Instructor Dashboard" \
    "curl -s -b /tmp/student_cookies.txt -w '\nHTTP_CODE:%{http_code}' \
    -X GET '$API_URL/api/instructor/dashboard' -o /dev/null" \
    403

# Test 21: Unauthenticated access denied
run_test "Unauthenticated Access Denied" \
    "curl -s -w '\nHTTP_CODE:%{http_code}' \
    -X GET '$API_URL/api/profile' -o /dev/null" \
    401

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}7. DATA INTEGRITY TESTS${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"

# Test 22: Verify response contains expected data structure
echo -n "Testing: Student Stats Data Structure ... "
stats_response=$(curl -s -b /tmp/student_cookies.txt -X GET "$API_URL/api/profile/stats")
if echo "$stats_response" | grep -q "total_enrollments" && \
   echo "$stats_response" | grep -q "completed_courses" && \
   echo "$stats_response" | grep -q "total_certificates"; then
    echo -e "${GREEN}✓ PASSED${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC} (Missing expected fields)"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

# Test 23: Verify instructor dashboard has required fields
echo -n "Testing: Instructor Dashboard Data Structure ... "
dashboard_response=$(curl -s -b /tmp/instructor_cookies.txt -X GET "$API_URL/api/instructor/dashboard")
if echo "$dashboard_response" | grep -q "teaching_summary" && \
   echo "$dashboard_response" | grep -q "recent_enrollments" && \
   echo "$dashboard_response" | grep -q "course_performance"; then
    echo -e "${GREEN}✓ PASSED${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC} (Missing expected fields)"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

# Cleanup
rm -f /tmp/admin_cookies.txt /tmp/instructor_cookies.txt /tmp/student_cookies.txt

# Summary
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}TEST SUMMARY${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "Total Tests:  ${BLUE}$TOTAL${NC}"
echo -e "Passed:       ${GREEN}$PASSED${NC}"
echo -e "Failed:       ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   ALL TESTS PASSED! ✓ Backend API is working perfectly   ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║   SOME TESTS FAILED! ✗ Please check the errors above     ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
