#!/bin/bash

# ============================================================================
# TekyPro LMS - Database Setup Script
# Description: Automated database creation and seeding
# ============================================================================

echo "=========================================="
echo "TekyPro LMS - Database Setup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database configuration
DB_NAME="tekypro_lms"
DB_CHARSET="utf8mb4"
DB_COLLATE="utf8mb4_unicode_ci"

# Prompt for MySQL credentials
echo -e "${YELLOW}Enter MySQL credentials:${NC}"
read -p "MySQL Host [localhost]: " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "MySQL Port [3306]: " DB_PORT
DB_PORT=${DB_PORT:-3306}

read -p "MySQL Username [root]: " DB_USER
DB_USER=${DB_USER:-root}

read -sp "MySQL Password: " DB_PASS
echo ""
echo ""

# Test MySQL connection
echo -e "${YELLOW}Testing MySQL connection...${NC}"
mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" -e "SELECT 1;" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to connect to MySQL server${NC}"
    echo "Please check your credentials and try again."
    exit 1
fi

echo -e "${GREEN}✓ Connected to MySQL server${NC}"
echo ""

# Ask if user wants to drop existing database
echo -e "${YELLOW}Do you want to drop existing database '$DB_NAME' if it exists?${NC}"
read -p "This will DELETE ALL DATA! (yes/no): " DROP_DB

if [ "$DROP_DB" = "yes" ]; then
    echo -e "${YELLOW}Dropping existing database...${NC}"
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" -e "DROP DATABASE IF EXISTS $DB_NAME;" 2>&1
    echo -e "${GREEN}✓ Database dropped${NC}"
fi

# Create database
echo -e "${YELLOW}Creating database '$DB_NAME'...${NC}"
mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET $DB_CHARSET COLLATE $DB_COLLATE;" 2>&1

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to create database${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Database created${NC}"
echo ""

# Run schema
echo -e "${YELLOW}Running schema.sql...${NC}"
mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" < schema.sql 2>&1

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to run schema${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Schema created successfully${NC}"
echo ""

# Ask if user wants to seed data
echo -e "${YELLOW}Do you want to insert seed data (sample data for testing)?${NC}"
read -p "(yes/no): " SEED_DATA

if [ "$SEED_DATA" = "yes" ]; then
    echo -e "${YELLOW}Running seed.sql...${NC}"
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" < seed.sql 2>&1

    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ Failed to insert seed data${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ Seed data inserted successfully${NC}"
    echo ""
fi

# Get table count
TABLE_COUNT=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$DB_NAME';")

echo ""
echo "=========================================="
echo -e "${GREEN}Database Setup Complete!${NC}"
echo "=========================================="
echo "Database Name: $DB_NAME"
echo "Total Tables: $TABLE_COUNT"
echo ""

if [ "$SEED_DATA" = "yes" ]; then
    echo "Default Users:"
    echo "  • admin@tekypro.com (Super Admin)"
    echo "  • instructor@tekypro.com (Instructor)"
    echo "  • student@tekypro.com (Student)"
    echo "  Password: Admin@123"
    echo ""
    echo -e "${RED}⚠️  IMPORTANT: Change these passwords in production!${NC}"
    echo ""
fi

echo "Connection Details:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""
echo "Next Steps:"
echo "  1. Update your .env file with these credentials"
echo "  2. Start building the backend API"
echo "  3. Test the database connection"
echo ""
echo "=========================================="
