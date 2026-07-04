# Page Innovations Learning Management System (LMS)

> **⚠️ SECURITY NOTICE:** This repository contains sensitive information. Always keep `.env` files secure and never commit them to version control.

## 🎓 Project Overview

Page Innovations LMS is a comprehensive Learning Management System built for database training excellence, specifically designed for MSSQL Server training with scalability for PostgreSQL, MySQL, and other technologies.

### Key Features

- ✅ Complete authentication system (JWT + Google OAuth)
- ✅ Role-based access control (Student, Instructor, Admin, Super Admin)
- ✅ Course management with video, document, and article support
- ✅ Progress tracking and analytics
- ✅ Question bank with 200+ interview questions
- ✅ Practice tests (student self-generated)
- ✅ Assigned tests (instructor-created exams)
- ✅ Certificate generation and verification
- ✅ Knowledge center with articles
- ✅ Engagement features (bookmarks, Q&A, reviews)

## 🏗️ Architecture

```
Tekypro/
├── backend/                    # Unified Backend API (Port 5000)
│   ├── config/                # Database, passport, swagger configs
│   ├── controllers/           # Route controllers
│   │   ├── admin/            # Admin-specific controllers
│   │   └── ...               # Other controllers
│   ├── middleware/            # Auth, validation, error handling
│   ├── models/                # Sequelize models
│   ├── routes/                # API routes
│   │   └── api/
│   │       ├── admin/        # Admin routes (/api/admin/*)
│   │       └── ...           # Other routes
│   ├── services/              # Business logic (email, certificates, etc.)
│   └── utils/                 # Helper functions
│
├── database/                  # Database schema and seed data
│   ├── schema.sql            # Complete database schema (30 tables)
│   ├── seed.sql              # Sample data
│   └── README.md             # Database documentation
│
└── plan.md                    # Complete project blueprint

```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ LTS
- MySQL 8+
- Redis (optional, for caching)

### 1. Clone & Install

```bash
# Clone the repository
git clone <repository-url>
cd Tekypro

# Install backend dependencies
cd backend
npm install
```

### 2. Database Setup

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE pageinnovation_lms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Import schema and seed data
USE pageinnovation_lms;
SOURCE database/schema.sql;
SOURCE database/seed.sql;

# Verify
SHOW TABLES;
```

### 3. Environment Configuration

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your credentials
```

**⚠️ IMPORTANT:** Generate strong secrets for production:

```bash
# Generate JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate JWT Refresh Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate Session Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Run the Application

```bash
# Start the backend
cd backend
npm run dev
```

**Backend API:** http://localhost:5000
**Admin API:** http://localhost:5000/api/admin/*
**API Documentation:** http://localhost:5000/api-docs

## 📋 Default Users (Development)

| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| admin@pageinnovation.com | Admin@123 | Super Admin | Full system access |
| instructor@pageinnovation.com | Admin@123 | Instructor | Create courses/tests |
| student@pageinnovation.com | Admin@123 | Student | Enroll and learn |

**⚠️ SECURITY:** Change these passwords immediately in production!

## 🔐 Security Checklist

Before deploying to production:

- [ ] Change all default passwords
- [ ] Generate strong JWT secrets (64+ characters)
- [ ] Configure environment variables properly
- [ ] Enable HTTPS/SSL
- [ ] Setup proper CORS origins
- [ ] Configure rate limiting
- [ ] Setup database backups
- [ ] Enable error monitoring (Sentry)
- [ ] Review and update `.gitignore`
- [ ] Never commit `.env` files

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run with coverage
npm run test:coverage
```

**⚠️ NOTE:** Tests are not yet implemented. See [Issue #1] for test setup.

## 📚 API Documentation

Access Swagger documentation at: http://localhost:5000/api-docs

Key endpoints:
- `/api/auth/*` - Authentication (register, login, OAuth)
- `/api/courses/*` - Course management
- `/api/questions/*` - Question bank
- `/api/practice-tests/*` - Practice tests
- `/api/assigned-tests/*` - Instructor tests
- `/api/certificates/*` - Certificates
- `/api/knowledge/*` - Knowledge center
- `/api/admin/*` - Admin dashboard (users, stats, analytics)

## 🔧 Development

### Code Structure

- **Controllers:** Handle HTTP requests/responses
- **Services:** Business logic and external integrations
- **Middleware:** Authentication, validation, error handling
- **Models:** Sequelize ORM models
- **Utils:** Helper functions and utilities

### Adding New Features

1. Create model in `models/`
2. Create controller in `controllers/`
3. Add routes in `routes/api/`
4. Update Swagger documentation
5. Add tests (when setup)

## 📦 Deployment

### Backend (Railway/Render)

```bash
# Build command
npm install

# Start command
npm start
```

### Environment Variables

Set these in your hosting platform:
- `NODE_ENV=production`
- `DATABASE_URL` (or individual DB_* vars)
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- All other vars from `.env.example`

### Database Migration

For production, use a managed MySQL service:
- Railway MySQL
- AWS RDS
- DigitalOcean Managed Database
- PlanetScale

## 🐛 Known Issues

1. **No Tests:** Test suite needs to be implemented.
2. **Missing Frontend:** React frontend not included in this repository.
3. **Third-party Services:** Google OAuth, Cloudinary, and Email services need configuration.

## 📈 Performance

- Redis caching enabled for frequently accessed data
- Database indexes on all foreign keys and search fields
- Response compression enabled
- Rate limiting configured (100 requests per 15 minutes)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Write tests
4. Submit a pull request

## 📄 License

Proprietary - Page Innovations - The Leading Remote DBA Service Provider

## 🆘 Support

For issues or questions:
- Email: support@pageinnovation.com
- Website: https://www.pageinnovation.com

## 🗺️ Roadmap

- [ ] Implement comprehensive test suite
- [ ] Consolidate duplicate backend code
- [ ] Add React frontend
- [ ] Configure third-party services
- [ ] Add real-time notifications (Socket.io)
- [ ] Implement advanced analytics
- [ ] Add multi-language support
- [ ] Mobile app (React Native)

---

**Built with ❤️ by Page Innovations**
