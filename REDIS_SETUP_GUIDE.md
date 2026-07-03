# Redis Setup Guide for Page Innovation LMS

## Why Redis is Required

Redis is now **REQUIRED** for the new cookie-based authentication system because:
- **Token Blacklist**: Stores revoked tokens when users log out
- **Session Management**: Prevents use of stolen tokens
- **Security**: Critical for production deployment

---

## Installation Instructions

### Ubuntu/Debian

```bash
# Update package list
sudo apt-get update

# Install Redis
sudo apt-get install -y redis-server

# Start Redis service
sudo systemctl start redis

# Enable Redis to start on boot
sudo systemctl enable redis

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

### macOS (Homebrew)

```bash
# Install Redis
brew install redis

# Start Redis service
brew services start redis

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

### Docker (Alternative)

```bash
# Run Redis in Docker
docker run -d --name pageinnovation-redis -p 6379:6379 redis:7-alpine

# Verify
docker exec pageinnovation-redis redis-cli ping
# Should return: PONG
```

---

## Configuration

### 1. Update Backend `.env`

```bash
cd backend

# If .env doesn't exist, create it from example
cp .env.example .env

# Edit .env file (use nano, vim, or your editor)
nano .env
```

### 2. Set Redis Configuration

```env
# Redis Cache Configuration
# IMPORTANT: Redis is now REQUIRED for token blacklist functionality
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

**Important Notes:**
- Set `REDIS_ENABLED=true` (required!)
- Leave `REDIS_PASSWORD` empty if not using authentication (default)
- Keep `REDIS_HOST=localhost` for local development
- Use `REDIS_DB=0` (default database)

---

## Verification Steps

### Step 1: Check Redis is Running

```bash
# Test connection
redis-cli ping
# Expected: PONG

# Check Redis info
redis-cli info server
# Should show Redis version and uptime
```

### Step 2: Test with Backend

```bash
# Start backend
cd backend
npm run dev

# Look for this log message:
# ✓ Redis connected successfully
# ✓ Redis is ready
```

### Step 3: Run Automated Test Script

```bash
cd /home/anointed/Desktop/Tekypro

# Make script executable (if not already)
chmod +x test-cookie-auth.sh

# Run test
./test-cookie-auth.sh
```

**Expected Output:**
```
==========================================
Page Innovation LMS - Cookie Auth Test Script
==========================================

Step 1: Testing Login (Should set httpOnly cookies)
---------------------------------------------------
✓ Login successful

Step 2: Checking Cookies File
---------------------------------------------------
✓ Cookies file created

Cookies stored:
localhost	FALSE	/	FALSE	0	accessToken	eyJhbG...
localhost	FALSE	/	FALSE	0	refreshToken	eyJhbG...
localhost	FALSE	/	FALSE	0	csrf-token	abc123...

Step 3: Testing Protected Route (with cookies)
---------------------------------------------------
✓ Protected route accessible with cookies

Step 4: Testing Logout (Should blacklist tokens)
---------------------------------------------------
✓ Logout successful

Step 5: Checking Redis Blacklist
---------------------------------------------------
✓ Tokens added to blacklist
Blacklisted tokens: 2

Step 6: Verify Logged Out
---------------------------------------------------
✓ Protected route correctly blocked after logout

==========================================
All tests passed! ✓
==========================================
```

---

## Manual Testing (Browser)

### Test 1: Login

1. **Start both servers:**
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend Admin
cd frontend-admin
npm run dev

# Terminal 3: Frontend Student
cd frontend
npm run dev
```

2. **Login:**
   - Navigate to `http://localhost:5174/login` (Admin)
   - Or `http://localhost:5173/login` (Student)
   - Enter credentials: `admin@pageinnovation.com` / `Admin@123`

3. **Verify Cookies:**
   - Open DevTools → Application → Cookies
   - Check cookies for `http://localhost:5000`
   - Should see:
     - `accessToken` (HttpOnly: ✓)
     - `refreshToken` (HttpOnly: ✓)
     - `csrf-token` (HttpOnly: ✗)

### Test 2: Logout & Blacklist

1. **Before Logout - Check Redis:**
```bash
redis-cli
> KEYS blacklist:*
# Should be empty: (empty list)
> exit
```

2. **Logout from UI**

3. **After Logout - Verify Blacklist:**
```bash
redis-cli
> KEYS blacklist:*
# Should show 2 keys:
# 1) "blacklist:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
# 2) "blacklist:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

> TTL blacklist:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# Should return seconds until expiration (e.g., 86340 for ~24h)
```

---

## Troubleshooting

### Issue: "Redis connection failed"

**Check 1: Is Redis running?**
```bash
sudo systemctl status redis
# Or for macOS:
brew services list | grep redis
```

**Check 2: Is Redis listening on port 6379?**
```bash
sudo netstat -tlnp | grep 6379
# Or:
sudo lsof -i :6379
```

**Check 3: Test connection directly**
```bash
redis-cli -h localhost -p 6379 ping
```

**Fix:** Restart Redis
```bash
# Ubuntu/Debian
sudo systemctl restart redis

# macOS
brew services restart redis

# Docker
docker restart pageinnovation-redis
```

### Issue: "Connection refused"

**Problem:** Redis is not running

**Fix:**
```bash
# Ubuntu/Debian
sudo systemctl start redis

# macOS
brew services start redis
```

### Issue: "Authentication required"

**Problem:** Redis password is set but not configured in `.env`

**Fix:**
1. Find Redis password in Redis config:
```bash
grep "requirepass" /etc/redis/redis.conf
```

2. Update `.env`:
```env
REDIS_PASSWORD=your_redis_password_here
```

### Issue: Backend starts but Redis warnings

**Warning:** "Redis not available - token blacklist disabled"

**Impact:**
- Logout won't blacklist tokens
- Security vulnerability in production
- Development: System continues to work (fails open)

**Fix:** Enable Redis as shown in configuration section above

---

## Production Considerations

### 1. Enable Redis Password

```bash
# Edit Redis config
sudo nano /etc/redis/redis.conf

# Add or uncomment:
requirepass your_strong_password_here

# Restart Redis
sudo systemctl restart redis
```

Update `.env`:
```env
REDIS_PASSWORD=your_strong_password_here
```

### 2. Enable Redis Persistence

**Option A: RDB (Snapshots)**
```conf
# In /etc/redis/redis.conf
save 900 1      # Save after 900 sec if 1 key changed
save 300 10     # Save after 300 sec if 10 keys changed
save 60 10000   # Save after 60 sec if 10000 keys changed
```

**Option B: AOF (Append-Only File)**
```conf
# In /etc/redis/redis.conf
appendonly yes
appendfsync everysec
```

### 3. Configure Redis Memory Limit

```conf
# In /etc/redis/redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
```

### 4. Monitor Redis

```bash
# Real-time monitoring
redis-cli monitor

# Check memory usage
redis-cli info memory

# Check connected clients
redis-cli info clients

# Check stats
redis-cli info stats
```

---

## Redis Commands Reference

### Useful Commands

```bash
# Connect to Redis
redis-cli

# Inside redis-cli:

# Check connection
PING

# List all keys
KEYS *

# List blacklist keys only
KEYS blacklist:*

# Get key value
GET blacklist:eyJhbGc...

# Check TTL (time to live)
TTL blacklist:eyJhbGc...

# Delete a key
DEL blacklist:eyJhbGc...

# Delete all keys (CAREFUL! Production data loss!)
FLUSHALL

# Get database size
DBSIZE

# Get server info
INFO

# Exit
EXIT
```

---

## Security Best Practices

### Development

- ✅ Redis without password is OK
- ✅ localhost only binding
- ✅ Default port (6379)

### Production

- ✅ **MUST** set strong Redis password
- ✅ **MUST** enable Redis persistence (RDB or AOF)
- ✅ **MUST** configure firewall (only backend can access)
- ✅ Consider Redis TLS encryption
- ✅ Regular backups of Redis data
- ✅ Monitor Redis memory usage
- ✅ Set maxmemory limit
- ✅ Use separate Redis instance per environment

---

## Quick Reference

### Start/Stop Redis

**Ubuntu/Debian:**
```bash
sudo systemctl start redis    # Start
sudo systemctl stop redis     # Stop
sudo systemctl restart redis  # Restart
sudo systemctl status redis   # Status
```

**macOS:**
```bash
brew services start redis     # Start
brew services stop redis      # Stop
brew services restart redis   # Restart
brew services list           # List all services
```

**Docker:**
```bash
docker start pageinnovation-redis   # Start
docker stop pageinnovation-redis    # Stop
docker restart pageinnovation-redis # Restart
docker ps                    # List running containers
```

---

## Next Steps

After Redis is installed and configured:

1. ✅ Update `backend/.env` with `REDIS_ENABLED=true`
2. ✅ Restart backend server
3. ✅ Run `./test-cookie-auth.sh`
4. ✅ Test login/logout in browser
5. ✅ Verify cookies are set correctly
6. ✅ Verify tokens are blacklisted on logout

---

## Support

If you encounter issues:
1. Check Redis is running: `redis-cli ping`
2. Check backend logs for Redis connection messages
3. Review this guide's troubleshooting section
4. Check `SECURITY_UPGRADE_HTTPONLY_COOKIES.md` for more details

**Redis is critical for production security. Do not deploy without it!**
