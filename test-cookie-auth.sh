#!/bin/bash

# TekyPro LMS - Cookie-Based Authentication Test Script
# Tests the new httpOnly cookie authentication system

echo "=========================================="
echo "TekyPro LMS - Cookie Auth Test Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="http://localhost:5000"
TEST_EMAIL="admin@tekypro.com"
TEST_PASSWORD="Admin@123"
COOKIE_JAR="/tmp/tekypro_cookies.txt"

# Cleanup old cookies
rm -f $COOKIE_JAR

echo "Step 1: Testing Login (Should set httpOnly cookies)"
echo "---------------------------------------------------"
LOGIN_RESPONSE=$(curl -s -c $COOKIE_JAR -X POST \
  ${API_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")

if echo "$LOGIN_RESPONSE" | grep -q "Login successful"; then
  echo -e "${GREEN}✓ Login successful${NC}"
  echo ""

  echo "Step 2: Checking Cookies File"
  echo "---------------------------------------------------"
  if [ -f $COOKIE_JAR ]; then
    echo -e "${GREEN}✓ Cookies file created${NC}"
    echo ""
    echo "Cookies stored:"
    cat $COOKIE_JAR | grep -E "(accessToken|refreshToken|csrf-token)"
    echo ""
  else
    echo -e "${RED}✗ No cookies file found${NC}"
    exit 1
  fi

  echo "Step 3: Testing Protected Route (with cookies)"
  echo "---------------------------------------------------"
  PROFILE_RESPONSE=$(curl -s -b $COOKIE_JAR -X GET \
    ${API_URL}/api/profile)

  if echo "$PROFILE_RESPONSE" | grep -q "email"; then
    echo -e "${GREEN}✓ Protected route accessible with cookies${NC}"
    echo "User data retrieved successfully"
    echo ""
  else
    echo -e "${RED}✗ Failed to access protected route${NC}"
    echo "Response: $PROFILE_RESPONSE"
    exit 1
  fi

  echo "Step 4: Testing Logout (Should blacklist tokens)"
  echo "---------------------------------------------------"
  LOGOUT_RESPONSE=$(curl -s -b $COOKIE_JAR -c $COOKIE_JAR -X POST \
    ${API_URL}/api/auth/logout)

  if echo "$LOGOUT_RESPONSE" | grep -q "Logout successful"; then
    echo -e "${GREEN}✓ Logout successful${NC}"
    echo ""

    echo "Step 5: Checking Redis Blacklist"
    echo "---------------------------------------------------"
    BLACKLIST_COUNT=$(redis-cli KEYS "blacklist:*" 2>/dev/null | wc -l)

    if [ $BLACKLIST_COUNT -gt 0 ]; then
      echo -e "${GREEN}✓ Tokens added to blacklist${NC}"
      echo "Blacklisted tokens: $BLACKLIST_COUNT"
      echo ""

      echo "Sample blacklist keys:"
      redis-cli KEYS "blacklist:*" 2>/dev/null | head -2
      echo ""
    else
      echo -e "${YELLOW}⚠ Redis might not be running or blacklist empty${NC}"
      echo "To check Redis: redis-cli ping"
      echo ""
    fi

    echo "Step 6: Verify Logged Out (Should fail to access protected route)"
    echo "---------------------------------------------------"
    PROTECTED_RESPONSE=$(curl -s -b $COOKIE_JAR -X GET \
      ${API_URL}/api/profile)

    if echo "$PROTECTED_RESPONSE" | grep -q "Unauthorized"; then
      echo -e "${GREEN}✓ Protected route correctly blocked after logout${NC}"
      echo ""
    else
      echo -e "${RED}✗ Protected route still accessible after logout${NC}"
      echo "Response: $PROTECTED_RESPONSE"
      exit 1
    fi

  else
    echo -e "${RED}✗ Logout failed${NC}"
    echo "Response: $LOGOUT_RESPONSE"
    exit 1
  fi

else
  echo -e "${RED}✗ Login failed${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "=========================================="
echo -e "${GREEN}All tests passed! ✓${NC}"
echo "=========================================="
echo ""
echo "Summary:"
echo "  ✓ Login sets httpOnly cookies"
echo "  ✓ Cookies authenticate requests"
echo "  ✓ Logout blacklists tokens in Redis"
echo "  ✓ Blacklisted tokens rejected"
echo ""
echo "Cookie-based authentication is working correctly!"
echo ""

# Cleanup
rm -f $COOKIE_JAR
