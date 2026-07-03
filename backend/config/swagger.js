/**
 * Swagger API Documentation Configuration
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Page Innovation LMS API',
      version: '1.0.0',
      description: 'Complete API documentation for Page Innovation Learning Management System',
      contact: {
        name: 'Page Innovation Support',
        url: 'https://www.pageinnovation.com',
        email: 'support@pageinnovation.com',
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
      {
        url: 'https://api.pageinnovation.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            full_name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            role: { type: 'string', enum: ['student', 'instructor', 'admin', 'super_admin'], example: 'student' },
            is_active: { type: 'boolean', example: true },
            profile_picture: { type: 'string', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Course: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            title: { type: 'string', example: 'MySQL Database Administration' },
            slug: { type: 'string', example: 'mysql-database-administration' },
            description: { type: 'string' },
            thumbnail: { type: 'string', nullable: true },
            category_id: { type: 'integer', example: 1 },
            instructor_id: { type: 'integer', example: 1 },
            duration_hours: { type: 'integer', example: 20 },
            difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
            status: { type: 'string', enum: ['draft', 'published', 'archived'] },
            average_rating: { type: 'number', format: 'float', example: 4.5 },
            total_reviews: { type: 'integer', example: 150 },
            enrollment_count: { type: 'integer', example: 500 },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Review: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            course_id: { type: 'integer', example: 1 },
            student_id: { type: 'integer', example: 1 },
            rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
            review_text: { type: 'string', nullable: true },
            is_approved: { type: 'boolean', example: true },
            helpful_count: { type: 'integer', example: 10 },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            user_id: { type: 'integer', example: 1 },
            type: { type: 'string', example: 'course_enrollment' },
            title: { type: 'string', example: 'Course Enrolled' },
            message: { type: 'string' },
            link: { type: 'string', nullable: true },
            is_read: { type: 'boolean', example: false },
            priority: { type: 'string', enum: ['low', 'normal', 'high'] },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error message' },
            error: { type: 'string', example: 'Detailed error description' },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation successful' },
            data: { type: 'object' },
          },
        },
        PaginationResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            pagination: {
              type: 'object',
              properties: {
                currentPage: { type: 'integer', example: 1 },
                totalPages: { type: 'integer', example: 10 },
                totalItems: { type: 'integer', example: 100 },
                itemsPerPage: { type: 'integer', example: 10 },
              },
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication token is missing or invalid',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        ForbiddenError: {
          description: 'User does not have permission to perform this action',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        NotFoundError: {
          description: 'The requested resource was not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        ValidationError: {
          description: 'Invalid input data',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Authentication', description: 'User authentication and authorization' },
      { name: 'Courses', description: 'Course management' },
      { name: 'Enrollments', description: 'Course enrollments' },
      { name: 'Reviews', description: 'Course reviews and ratings' },
      { name: 'Bookmarks', description: 'Lesson and article bookmarks' },
      { name: 'Questions', description: 'Lesson Q&A system' },
      { name: 'Announcements', description: 'Course announcements' },
      { name: 'Notifications', description: 'User notifications' },
      { name: 'Profile', description: 'User profile management' },
      { name: 'Certificates', description: 'Course certificates' },
      { name: 'Knowledge', description: 'Knowledge center articles' },
      { name: 'Exams', description: 'Practice and assigned tests' },
      { name: 'Upload', description: 'File uploads' },
      { name: 'Activity', description: 'Activity logs' },
    ],
  },
  apis: ['./routes/api/*.js', './controllers/**/*.js'], // Path to API docs
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
