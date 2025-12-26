#!/bin/bash

# Quick Smoke Test for Question Bank Routes
# Tests that all routes return 200 OK and pages load

echo "🧪 Question Bank Routes - Smoke Test"
echo "======================================"
echo ""

BASE_URL="http://localhost:5174"
ADMIN_PANEL_ROUTES=(
  "/questions"
  "/tests"
  "/test-builder"
)

echo "Testing routes on $BASE_URL..."
echo ""

FAILED=0
PASSED=0

for route in "${ADMIN_PANEL_ROUTES[@]}"; do
  URL="$BASE_URL$route"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL")

  if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ $route - HTTP $HTTP_CODE"
    ((PASSED++))
  else
    echo "❌ $route - HTTP $HTTP_CODE (Expected 200)"
    ((FAILED++))
  fi
done

echo ""
echo "======================================"
echo "Results: $PASSED passed, $FAILED failed"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "✅ All routes accessible!"
  exit 0
else
  echo "❌ Some routes failed. Check if frontend is running."
  exit 1
fi
