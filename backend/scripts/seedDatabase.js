const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Import models with correct names
const {
    User,
    Category,
    Course,
    CourseModule,
    ModuleContent,
    Enrollment,
    ContentProgress,
    QuestionBank,
    Certificate,
    InstructorApplication
} = require('../models');

// Get sequelize instance
const sequelize = User.sequelize;

// Configuration
const RESET_DB = process.argv.includes('--reset');

// Realistic course data
const COURSE_DATA = {
    'Programming': [
        { title: 'JavaScript Fundamentals', price: 0, difficulty: 'beginner', description: 'Master the basics of JavaScript programming from variables to functions.' },
        { title: 'Advanced TypeScript Patterns', price: 49.99, difficulty: 'advanced', description: 'Deep dive into TypeScript design patterns and best practices for enterprise applications.' },
        { title: 'Python for Data Science', price: 99.99, difficulty: 'intermediate', description: 'Learn Python programming with a focus on data analysis and visualization.' },
        { title: 'Java Spring Boot Masterclass', price: 79.99, difficulty: 'intermediate', description: 'Build production-ready REST APIs with Spring Boot and best practices.' }
    ],
    'Databases': [
        { title: 'MySQL Database Administration', price: 89.99, difficulty: 'intermediate', description: 'Complete guide to MySQL database administration, optimization, and troubleshooting.' },
        { title: 'PostgreSQL for Developers', price: 69.99, difficulty: 'intermediate', description: 'Master PostgreSQL for application development with advanced queries and performance tuning.' },
        { title: 'MongoDB Essentials', price: 49.99, difficulty: 'beginner', description: 'Introduction to NoSQL databases with MongoDB, from basics to real-world applications.' },
        { title: 'Database Design Best Practices', price: 0, difficulty: 'beginner', description: 'Learn to design efficient, normalized databases for modern applications.' }
    ],
    'Web Development': [
        { title: 'React.js Complete Guide', price: 79.99, difficulty: 'intermediate', description: 'Build modern web applications with React, hooks, and state management.' },
        { title: 'Vue.js 3 From Scratch', price: 59.99, difficulty: 'beginner', description: 'Start building interactive web applications with Vue.js 3 and the Composition API.' },
        { title: 'Full Stack Web Development', price: 129.99, difficulty: 'advanced', description: 'Comprehensive course covering frontend, backend, databases, and deployment.' },
        { title: 'HTML & CSS Fundamentals', price: 0, difficulty: 'beginner', description: 'Master the building blocks of web development with HTML5 and CSS3.' }
    ],
    'Cloud Computing': [
        { title: 'AWS Solutions Architect', price: 149.99, difficulty: 'advanced', description: 'Prepare for AWS certification while learning cloud architecture best practices.' },
        { title: 'Docker and Kubernetes Essentials', price: 89.99, difficulty: 'intermediate', description: 'Containerize applications and orchestrate with Kubernetes in production.' },
        { title: 'Azure Cloud Fundamentals', price: 79.99, difficulty: 'beginner', description: 'Introduction to Microsoft Azure cloud services and deployment strategies.' }
    ],
    'Data Science': [
        { title: 'Machine Learning with Python', price: 119.99, difficulty: 'advanced', description: 'Build and deploy machine learning models using Python and scikit-learn.' },
        { title: 'Data Analysis with Pandas', price: 69.99, difficulty: 'intermediate', description: 'Master data manipulation and analysis using the Pandas library.' },
        { title: 'SQL for Data Analytics', price: 49.99, difficulty: 'beginner', description: 'Learn SQL queries for extracting insights from databases.' }
    ]
};

class DatabaseSeeder {
    constructor() {
        this.users = { admins: [], instructors: [], students: [] };
        this.categories = {};
        this.courses = [];
        this.modules = [];
        this.contents = [];
    }

    async run() {
        try {
            console.log('🌱 Starting database seeder...\n');

            if (RESET_DB) {
                await this.clearDatabase();
            }

            await this.createUsers();
            await this.createCategories();
            await this.createCourses();
            await this.createCourseContent();
            await this.createEnrollments();

            console.log('\n✅ Database seeding completed successfully!');
            console.log('\n📊 Summary:');
            console.log(`   Users: ${this.users.admins.length + this.users.instructors.length + this.users.students.length}`);
            console.log(`   - Admins: ${this.users.admins.length}`);
            console.log(`   - Instructors: ${this.users.instructors.length}`);
            console.log(`   - Students: ${this.users.students.length}`);
            console.log(`   Categories: ${Object.keys(this.categories).length}`);
            console.log(`   Courses: ${this.courses.length}`);
            console.log(`   Modules: ${this.modules.length}`);
            console.log(`   Lessons: ${this.contents.length}`);

            process.exit(0);
        } catch (error) {
            console.error('❌ Seeding failed:', error);
            process.exit(1);
        }
    }

    async clearDatabase() {
        console.log('🗑️  Clearing existing data...');

        // Disable foreign key checks
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

        // Truncate tables in correct order
        const tables = [
            'AssignedTestAnswers', 'AssignedTestAttempts', 'TestAssignments', 'AssignedTestQuestions', 'AssignedTests',
            'PracticeTestAnswers', 'PracticeTestQuestions', 'PracticeTestAttempts',
            'QuestionReplies', 'LessonQuestions', 'ArticleBookmarks', 'LessonBookmarks',
            'CourseAnnouncements', 'CourseReviews', 'Certificates', 'ContentProgress',
            'Enrollments', 'ModuleContents', 'CourseModules', 'QuestionBank',
            'KnowledgeArticles', 'Courses', 'Categories', 'InstructorApplications',
            'PasswordResets', 'Notifications', 'ActivityLogs', 'Users'
        ];

        for (const table of tables) {
            try {
                await sequelize.query(`TRUNCATE TABLE ${table}`);
                console.log(`   ✓ Cleared ${table}`);
            } catch (error) {
                console.log(`   ⚠ Could not clear ${table}`);
            }
        }

        // Re-enable foreign key checks
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('');
    }

    async createUsers() {
        console.log('👥 Creating users...');

        const hashedPassword = await bcrypt.hash('password123', 10);

        // Create Super Admin
        const superAdmin = await User.create({
            full_name: 'System Administrator',
            email: 'admin@pageinnovation.com',
            password_hash: hashedPassword,
            role: 'super_admin',
            is_active: true,
            email_verified: true
        });
        this.users.admins.push(superAdmin);
        console.log('   ✓ Created super admin');

        // Create Admins
        for (let i = 0; i < 2; i++) {
            const admin = await User.create({
                full_name: faker.person.fullName(),
                email: faker.internet.email({ provider: 'pageinnovation.com' }).toLowerCase(),
                password_hash: hashedPassword,
                role: 'admin',
                is_active: true,
                email_verified: true
            });
            this.users.admins.push(admin);
        }
        console.log(`   ✓ Created ${this.users.admins.length} admins`);

        // Create Instructors with realistic profiles
        const instructorProfiles = [
            { bio: 'Senior Software Engineer with 10+ years of experience in full-stack development.', expertise: 'Programming', exp: 10 },
            { bio: 'Database architect specializing in MySQL and PostgreSQL optimization.', expertise: 'Databases', exp: 8 },
            { bio: 'Full-stack developer passionate about React and modern web technologies.', expertise: 'Web Development', exp: 7 },
            { bio: 'AWS Solutions Architect helping teams build scalable cloud infrastructure.', expertise: 'Cloud Computing', exp: 12 },
            { bio: 'Data scientist with expertise in machine learning and Python.', expertise: 'Data Science', exp: 6 },
            { bio: 'Former Google engineer teaching software development best practices.', expertise: 'Programming', exp: 15 },
            { bio: 'DevOps specialist focused on Docker, Kubernetes, and CI/CD.', expertise: 'Cloud Computing', exp: 9 },
            { bio: 'Frontend developer with a passion for creating beautiful user experiences.', expertise: 'Web Development', exp: 5 },
            { bio: 'Backend engineer specializing in API design and microservices.', expertise: 'Programming', exp: 11 },
            { bio: 'Data engineer helping students master SQL and data analytics.', expertise: 'Data Science', exp: 7 }
        ];

        for (let i = 0; i < 10; i++) {
            const profile = instructorProfiles[i];
            const instructor = await User.create({
                full_name: faker.person.fullName(),
                email: faker.internet.email().toLowerCase(),
                password_hash: hashedPassword,
                role: 'instructor',
                is_active: true,
                email_verified: true,
                bio: profile.bio
            });
            this.users.instructors.push(instructor);

            // Create instructor application
            await InstructorApplication.create({
                user_id: instructor.id,
                status: 'approved',
                qualifications: `Master's degree in Computer Science with ${profile.exp} years of industry experience`,
                teaching_experience: `${profile.exp} years of professional experience and 3+ years teaching online courses`,
                subject_expertise: profile.expertise,
                approved_at: faker.date.past(),
                reviewed_by: superAdmin.id
            });
        }
        console.log(`   ✓ Created ${this.users.instructors.length} instructors`);

        // Create Students
        for (let i = 0; i < 50; i++) {
            const student = await User.create({
                full_name: faker.person.fullName(),
                email: faker.internet.email().toLowerCase(),
                password_hash: hashedPassword,
                role: 'student',
                is_active: true,
                email_verified: faker.datatype.boolean(0.9),
                bio: faker.datatype.boolean(0.3) ? faker.lorem.sentence() : null
            });
            this.users.students.push(student);
        }
        console.log(`   ✓ Created ${this.users.students.length} students\n`);
    }

    async createCategories() {
        console.log('📁 Creating categories...');

        const mainCategories = Object.keys(COURSE_DATA);

        for (const catName of mainCategories) {
            const category = await Category.create({
                name: catName,
                description: `Courses related to ${catName.toLowerCase()}`,
                is_active: true,
                display_order: mainCategories.indexOf(catName)
            });
            this.categories[catName] = category;
            console.log(`   ✓ Created category: ${catName}`);
        }
        console.log('');
    }

    async createCourses() {
        console.log('🎓 Creating courses...');

        for (const [categoryName, courses] of Object.entries(COURSE_DATA)) {
            const category = this.categories[categoryName];

            for (const courseData of courses) {
                const instructor = faker.helpers.arrayElement(this.users.instructors);

                const course = await Course.create({
                    title: courseData.title,
                    description: courseData.description,
                    instructor_id: instructor.id,
                    category_id: category.id,
                    difficulty: courseData.difficulty,
                    price: courseData.price,
                    status: 'published',
                    duration: faker.number.int({ min: 5, max: 40 }) + ' hours',
                    requirements: faker.lorem.sentence(),
                    learning_outcomes: faker.lorem.sentences(3),
                    thumbnail_url: `https://placehold.co/800x450/0e2b5c/ffffff?text=${encodeURIComponent(courseData.title)}`,
                    created_at: faker.date.past({ years: 1 }),
                    published_at: faker.date.past({ years: 1 })
                });

                this.courses.push(course);
            }
        }
        console.log(`   ✓ Created ${this.courses.length} courses\n`);
    }

    async createCourseContent() {
        console.log('📚 Creating course content...');

        for (const course of this.courses) {
            const moduleCount = faker.number.int({ min: 3, max: 5 });

            for (let i = 0; i < moduleCount; i++) {
                const module = await CourseModule.create({
                    course_id: course.id,
                    title: `Module ${i + 1}: ${faker.lorem.words(3)}`,
                    description: faker.lorem.sentence(),
                    order_index: i,
                    is_published: true
                });
                this.modules.push(module);

                // Create lessons for this module
                const lessonCount = faker.number.int({ min: 5, max: 10 });
                for (let j = 0; j < lessonCount; j++) {
                    const content = await ModuleContent.create({
                        module_id: module.id,
                        title: `Lesson ${j + 1}: ${faker.lorem.words(4)}`,
                        content_type: faker.helpers.arrayElement(['video', 'article']),
                        content_data: JSON.stringify({
                            duration: faker.number.int({ min: 5, max: 30 }),
                            description: faker.lorem.paragraph()
                        }),
                        order_index: j,
                        duration_minutes: faker.number.int({ min: 5, max: 30 }),
                        is_free: j === 0
                    });
                    this.contents.push(content);
                }
            }
        }
        console.log(`   ✓ Created ${this.modules.length} modules`);
        console.log(`   ✓ Created ${this.contents.length} lessons\n`);
    }

    async createEnrollments() {
        console.log('📝 Creating enrollments...');

        let enrollmentCount = 0;

        for (const student of this.users.students) {
            const coursesToEnroll = faker.helpers.arrayElements(
                this.courses,
                faker.number.int({ min: 1, max: 5 })
            );

            for (const course of coursesToEnroll) {
                const enrollment_date = faker.date.past({ years: 0.5 });
                const progress = faker.number.int({ min: 0, max: 100 });

                await Enrollment.create({
                    student_id: student.id,
                    course_id: course.id,
                    enrollment_date,
                    progress_percentage: progress,
                    completed_at: progress === 100 ? faker.date.between({ from: enrollment_date, to: new Date() }) : null
                });

                enrollmentCount++;

                // Create certificate if completed
                if (progress === 100) {
                    await Certificate.create({
                        certificate_id: `CERT-${Date.now()}-${faker.string.alphanumeric(8).toUpperCase()}`,
                        student_id: student.id,
                        course_id: course.id,
                        student_name: student.full_name,
                        course_title: course.title,
                        issue_date: faker.date.recent(),
                        certificate_url: `https://pageinnovation.com/certificates/${faker.string.alphanumeric(16)}`
                    });
                }
            }
        }
        console.log(`   ✓ Created ${enrollmentCount} enrollments\n`);
    }
}

// Run the seeder
const seeder = new DatabaseSeeder();
seeder.run();
