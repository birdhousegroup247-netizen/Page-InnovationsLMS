# TekyPro LMS - Frontend

Modern Dark Mode Learning Management System built with React, Vite, and Tailwind CSS.

## Features

- Modern Dark Mode UI with TekyPro brand colors
- Responsive design for all devices
- Authentication (Login/Register with JWT)
- Protected routes with automatic token refresh
- Beautiful gradient effects and animations
- Component-based architecture
- API integration with backend

## Tech Stack

- **Framework**: React 19
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4 (Dark Mode)
- **Routing**: React Router DOM 7
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Utilities**: clsx, tailwind-merge

## Brand Colors

### Primary Colors
- **Brand Blue**: `#0e2b5c` (Primary)
- **Brand Red**: `#eb1c22` (Accent/CTA)
- **Brand Purple**: `#2e3192` (Secondary)

### Dark Mode Palette
- **Background**: `#0a0e1a` (dark-900)
- **Card**: `#0f1425` (dark-800)
- **Elevated**: `#1a1f35` (dark-700)
- **Hover**: `#242b45` (dark-600)

### Typography
- **Font**: Rubik (Google Fonts)
- **Text Primary**: `#e8eaed`
- **Text Secondary**: `#9ca3af`
- **Text Muted**: `#6b7280`

## Project Structure

```
frontend/
├── src/
│   ├── assets/          # Static assets (images, fonts)
│   ├── components/      # Reusable components
│   │   ├── auth/        # Authentication components
│   │   ├── common/      # Common UI components
│   │   ├── course/      # Course-related components
│   │   ├── dashboard/   # Dashboard components
│   │   └── layout/      # Layout components
│   ├── contexts/        # React contexts (Auth, etc.)
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # API configuration
│   ├── pages/           # Page components
│   ├── utils/           # Utility functions
│   ├── App.jsx          # Main app component with routing
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles with Tailwind
├── public/              # Public static files
├── .env                 # Environment variables
├── tailwind.config.js   # Tailwind configuration
├── vite.config.js       # Vite configuration
└── package.json         # Dependencies
```

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- Backend API running on http://localhost:5000

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set:
   ```
   VITE_API_URL=http://localhost:5000
   VITE_APP_NAME=TekyPro LMS
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

   Frontend will be available at: http://localhost:5173

4. **Build for production**
   ```bash
   npm run build
   ```

5. **Preview production build**
   ```bash
   npm run preview
   ```

## Available Scripts

- `npm run dev` - Start development server (with hot reload)
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## API Integration

The frontend connects to the backend API via Axios. All API endpoints are organized in `/src/lib/api.js`:

- **Authentication**: Login, Register, Logout, Password Reset
- **Courses**: CRUD, Enrollment, Progress
- **Categories**: CRUD
- **Enrollments**: My Courses
- **Progress**: Mark Complete, Get Progress
- **Exams**: Practice Tests, Assigned Tests
- **Notifications**: Get, Mark as Read
- **Bookmarks**: Lessons, Articles

### Authentication Flow

1. User logs in via `/login`
2. JWT tokens stored in localStorage
3. Access token sent with each request
4. Automatic token refresh on 401 errors
5. Redirect to login if refresh fails

## Custom Components

### Buttons
```jsx
<button className="btn-primary">Primary Button</button>
<button className="btn-secondary">Secondary Button</button>
<button className="btn-outline">Outline Button</button>
<button className="btn-ghost">Ghost Button</button>
```

### Cards
```jsx
<div className="card">Basic Card</div>
<div className="card-hover">Hoverable Card</div>
```

### Inputs
```jsx
<input className="input" placeholder="Email" />
<input className="input-error" placeholder="With Error" />
```

### Badges
```jsx
<span className="badge-success">Success</span>
<span className="badge-warning">Warning</span>
<span className="badge-error">Error</span>
<span className="badge-info">Info</span>
```

### Headings
```jsx
<h1 className="heading-1">Heading 1</h1>
<h2 className="heading-2">Heading 2</h2>
<h3 className="heading-3">Heading 3</h3>
```

## Pages

### Current Pages
- **Login** (`/login`) - User authentication
- **Dashboard** (`/dashboard`) - Student dashboard with stats and courses

### Planned Pages
- **Register** (`/register`) - New user registration
- **Forgot Password** (`/forgot-password`) - Password reset
- **Course Catalog** (`/courses`) - Browse all courses
- **Course Detail** (`/courses/:id`) - Course information
- **My Courses** (`/my-courses`) - Enrolled courses
- **Instructor Dashboard** (`/instructor`) - For instructors
- **Admin Dashboard** (`/admin`) - For administrators

## Deployment

### Vercel (Recommended)

1. Install Vercel CLI
   ```bash
   npm install -g vercel
   ```

2. Deploy
   ```bash
   vercel
   ```

3. Set environment variables in Vercel dashboard
   - `VITE_API_URL` = Your production API URL

### Other Platforms

- **Netlify**: Works out of the box, set build command to `npm run build` and publish directory to `dist`
- **GitHub Pages**: Requires additional configuration for SPA routing
- **AWS S3 + CloudFront**: Build and upload `dist` folder

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## Troubleshooting

### Build Errors
- Clear `node_modules` and reinstall: `rm -rf node_modules package-lock.json && npm install`
- Check Node.js version: `node -v` (should be 18+)

### API Connection Issues
- Verify backend is running on the correct port
- Check CORS configuration in backend
- Verify `VITE_API_URL` in `.env`

### Styling Issues
- Clear Tailwind cache: `npx tailwindcss -c tailwind.config.js -o src/output.css --watch`
- Check `tailwind.config.js` content paths

## License

Copyright © 2024 TekyPro. All rights reserved.
