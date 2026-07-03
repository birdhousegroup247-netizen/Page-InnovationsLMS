# Page Innovation LMS - Authentication API Documentation

## 🔐 Authentication System

Complete authentication system with JWT tokens, password reset, and role-based access control.

---

## 📡 Base URL

```
http://localhost:5000/api/auth
```

---

## 🚀 Endpoints

### 1. Register New User

**POST** `/api/auth/register`

Create a new user account.

#### Request Body

```json
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass@123",
  "role": "student"  // Optional: "student" or "instructor" (default: "student")
}
```

#### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (!@#$%^&*)

#### Response (201 Created)

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": 4,
      "full_name": "John Doe",
      "email": "john@example.com",
      "role": "student",
      "is_active": true,
      "email_verified": false,
      "created_at": "2025-12-12T21:30:20.135Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### cURL Example

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass@123",
    "role": "student"
  }'
```

---

### 2. Login

**POST** `/api/auth/login`

Authenticate user and receive tokens.

#### Request Body

```json
{
  "email": "john@example.com",
  "password": "SecurePass@123"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 4,
      "full_name": "John Doe",
      "email": "john@example.com",
      "role": "student",
      "is_active": true,
      "last_login": "2025-12-12T21:31:02.418Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### cURL Example

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass@123"
  }'
```

---

### 3. Get Current User

**GET** `/api/auth/me`

Get authenticated user's information.

**🔒 Requires Authentication**

#### Headers

```
Authorization: Bearer {accessToken}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "user": {
      "id": 4,
      "full_name": "John Doe",
      "email": "john@example.com",
      "role": "student",
      "profile_picture": null,
      "bio": null,
      "is_active": true,
      "email_verified": false
    }
  }
}
```

#### cURL Example

```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 4. Refresh Token

**POST** `/api/auth/refresh`

Get a new access token using refresh token.

#### Request Body

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 5. Forgot Password

**POST** `/api/auth/forgot-password`

Request a password reset link.

#### Request Body

```json
{
  "email": "john@example.com"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "If the email exists, a password reset link will be sent",
  "data": {
    "resetLink": "http://localhost:3000/reset-password?token=abc123...",
    "token": "abc123...",
    "expires_at": "2025-12-12T22:34:48.955Z"
  }
}
```

**Note:** In production, the token and resetLink won't be returned. It will only be sent via email.

#### cURL Example

```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com"
  }'
```

---

### 6. Reset Password

**POST** `/api/auth/reset-password`

Reset password using the token from email.

#### Request Body

```json
{
  "token": "14b09b674fd934d6f09146d30b4b7e69...",
  "newPassword": "NewSecurePass@123"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Password reset successful",
  "data": null
}
```

#### cURL Example

```bash
curl -X POST http://localhost:5000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_RESET_TOKEN",
    "newPassword": "NewSecurePass@123"
  }'
```

---

### 7. Change Password

**POST** `/api/auth/change-password`

Change password for authenticated user.

**🔒 Requires Authentication**

#### Headers

```
Authorization: Bearer {accessToken}
```

#### Request Body

```json
{
  "currentPassword": "OldPass@123",
  "newPassword": "NewPass@123"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": null
}
```

#### cURL Example

```bash
curl -X POST http://localhost:5000/api/auth/change-password \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "OldPass@123",
    "newPassword": "NewPass@123"
  }'
```

---

### 8. Logout

**POST** `/api/auth/logout`

Logout user (client-side token removal).

**🔒 Requires Authentication**

#### Headers

```
Authorization: Bearer {accessToken}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Logout successful",
  "data": null
}
```

**Note:** Since we use JWT tokens, logout is primarily client-side. The client should remove tokens from storage.

---

## 🛡️ Authentication Middleware

### Usage in Routes

```javascript
const { authenticate, authorize } = require('./middleware/auth/authMiddleware');

// Protect a route (requires any authenticated user)
router.get('/profile', authenticate, getProfile);

// Restrict to specific roles
router.post('/courses', authenticate, authorize('instructor', 'admin'), createCourse);

// Allow both instructor and admin
router.delete('/courses/:id', authenticate, authorize('instructor', 'admin'), deleteCourse);
```

### Available Roles

- `student` - Regular learners
- `instructor` - Course creators
- `admin` - Platform administrators
- `super_admin` - Full system access

---

## 🔑 JWT Tokens

### Access Token
- **Expires:** 24 hours (default)
- **Purpose:** Authenticate API requests
- **Storage:** Client-side (localStorage/sessionStorage)

### Refresh Token
- **Expires:** 7 days (default)
- **Purpose:** Get new access tokens
- **Storage:** Client-side (httpOnly cookie recommended)

### Token Format

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## ❌ Error Responses

### Validation Error (422)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Must be a valid email address"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

### Unauthorized (401)

```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

### Forbidden (403)

```json
{
  "success": false,
  "message": "You do not have permission to access this resource"
}
```

### Not Found (404)

```json
{
  "success": false,
  "message": "User not found"
}
```

### Server Error (500)

```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## 📝 Testing with Postman

### 1. Create Environment

**Variables:**
- `baseUrl`: `http://localhost:5000`
- `accessToken`: (auto-set from login response)
- `refreshToken`: (auto-set from login response)

### 2. Register Test

```
POST {{baseUrl}}/api/auth/register
Body: {raw JSON}
```

### 3. Auto-Set Tokens

In Postman Tests tab for login/register:

```javascript
if (pm.response.code === 200 || pm.response.code === 201) {
    const response = pm.response.json();
    pm.environment.set("accessToken", response.data.accessToken);
    pm.environment.set("refreshToken", response.data.refreshToken);
}
```

### 4. Use Token

In protected routes, add header:
```
Authorization: Bearer {{accessToken}}
```

---

## 🔒 Security Best Practices

✅ **Implemented:**
- Password hashing with bcrypt (10 rounds)
- JWT token expiration
- Role-based access control
- Input validation with Joi
- Security headers (Helmet)
- Rate limiting
- CORS protection

🚀 **Recommended for Production:**
- Email verification
- 2FA (Two-factor authentication)
- Token blacklisting for logout
- Password history (prevent reuse)
- Account lockout after failed attempts
- HTTPS only
- Secure cookies for refresh tokens

---

## 📚 Related Documentation

- [API Overview](./API.md)
- [User Management](./USERS.md)
- [Database Schema](../database/schema.sql)

---

**Page Innovation - The Leading Remote DBA Service Provider**
