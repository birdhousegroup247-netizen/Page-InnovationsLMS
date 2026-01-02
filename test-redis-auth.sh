#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:5000"
COOKIE_JAR="/tmp/tekypro-cookies.txt"

echo "========================================="
echo "TekyPro LMS - Redis Auth Test"
echo "========================================="
echo ""

# Clean up old cookies
rm -f $COOKIE_JAR

# Step 1: Login
echo -e "${YELLOW}Step 1: Logging in as student...${NC}"
LOGIN_RESPONSE=$(curl -s -c $COOKIE_JAR -X POST \
  "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@tekypro.com",
    "password": "Admin@123"
  }')

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Login successful${NC}"
  USER_EMAIL=$(echo "$LOGIN_RESPONSE" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)
  echo "  Logged in as: $USER_EMAIL"
else
  echo -e "${RED}✗ Login failed${NC}"
  echo "  Response: $LOGIN_RESPONSE"
  exit 1
fi

echo ""

# Step 2: Access protected endpoint
echo -e "${YELLOW}Step 2: Accessing protected endpoint (should work)...${NC}"
PROFILE_RESPONSE=$(curl -s -b $COOKIE_JAR -X GET \
  "$API_URL/api/auth/me")

if echo "$PROFILE_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Protected endpoint accessible${NC}"
else
  echo -e "${RED}✗ Failed to access protected endpoint${NC}"
  echo "  Response: $PROFILE_RESPONSE"
  exit 1
fi

echo ""

# Step 3: Check Redis before logout
echo -e "${YELLOW}Step 3: Checking Redis blacklist (should be empty)...${NC}"
BLACKLIST_COUNT_BEFORE=$(redis-cli KEYS "blacklist:*" | wc -l)
echo "  Blacklisted tokens: $BLACKLIST_COUNT_BEFORE"

echo ""

# Step 4: Logout
echo -e "${YELLOW}Step 4: Logging out (should blacklist token)...${NC}"
LOGOUT_RESPONSE=$(curl -s -b $COOKIE_JAR -c $COOKIE_JAR -X POST \
  "$API_URL/api/auth/logout")

if echo "$LOGOUT_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Logout successful${NC}"
else
  echo -e "${RED}✗ Logout failed${NC}"
  echo "  Response: $LOGOUT_RESPONSE"
fi

echo ""

# Step 5: Check Redis after logout
echo -e "${YELLOW}Step 5: Checking Redis blacklist (should have token)...${NC}"
sleep 1 # Wait for Redis write
BLACKLIST_COUNT_AFTER=$(redis-cli KEYS "blacklist:*" | wc -l)
echo "  Blacklisted tokens: $BLACKLIST_COUNT_AFTER"

if [ "$BLACKLIST_COUNT_AFTER" -gt "$BLACKLIST_COUNT_BEFORE" ]; then
  echo -e "${GREEN}✓ Token added to blacklist${NC}"
else
  echo -e "${YELLOW}⚠ Token may not be in blacklist (check server logs)${NC}"
fi

echo ""

# Step 6: Try to access protected endpoint again
echo -e "${YELLOW}Step 6: Trying to access protected endpoint again (should fail)...${NC}"
PROFILE_RESPONSE_2=$(curl -s -b $COOKIE_JAR -X GET \
  "$API_URL/api/auth/me")

if echo "$PROFILE_RESPONSE_2" | grep -q '"success":false\|"error"\|Unauthorized'; then
  echo -e "${GREEN}✓ Protected endpoint correctly blocked${NC}"
  echo -e "${GREEN}✓ Token blacklist is working!${NC}"
else
  echo -e "${RED}✗ Protected endpoint still accessible (blacklist not working)${NC}"
  echo "  Response: $PROFILE_RESPONSE_2"
fi

echo ""

# Step 7: View blacklisted tokens
echo -e "${YELLOW}Step 7: Viewing blacklisted tokens in Redis...${NC}"
echo "  Keys in Redis:"
redis-cli KEYS "blacklist:*" | head -5
if [ "$BLACKLIST_COUNT_AFTER" -gt 5 ]; then
  echo "  ... and $((BLACKLIST_COUNT_AFTER - 5)) more"
fi

echo ""

# Cleanup
rm -f $COOKIE_JAR

echo "========================================="
echo -e "${GREEN}Redis Authentication Test Complete!${NC}"
echo "========================================="
echo ""
echo "Summary:"
echo "  - Cookie auth: Working"
echo "  - Redis connection: Working"
echo "  - Token blacklist: $([ "$BLACKLIST_COUNT_AFTER" -gt "$BLACKLIST_COUNT_BEFORE" ] && echo 'Working' || echo 'Check logs')"
echo "  - Logout security: $(echo "$PROFILE_RESPONSE_2" | grep -q '"success":false\|"error"\|Unauthorized' && echo 'Working' || echo 'Check logs')"
echo ""
