require('dotenv').config();
const {
  User,
  Category,
  Course,
  CourseModule,
  ModuleContent,
  Enrollment,
  Certificate,
  InstructorApplication,
  QuestionBank,
  CourseReview,
  Notification,
  ActivityLog,
  sequelize
} = require('../models');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

let passed = 0;
let failed = 0;
let total = 0;

function test(name, condition, errorMsg = '') {
  total++;
  if (condition) {
    console.log(`${colors.green}✓${colors.reset} ${name}`);
    passed++;
    return true;
  } else {
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    if (errorMsg) console.log(`  ${colors.red}Error: ${errorMsg}${colors.reset}`);
    failed++;
    return false;
  }
}

async function testDatabaseIntegrity() {
  console.log(`${colors.blue}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║     Page Innovation LMS - Database Integrity Test Suite          ║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log('');

  try {
    // Test database connection
    console.log(`${colors.yellow}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}1. DATABASE CONNECTION${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════════════${colors.reset}`);

    try {
      await sequelize.authenticate();
      test('Database connection established', true);
    } catch (error) {
      test('Database connection established', false, error.message);
      process.exit(1);
    }

    // Test table existence
    console.log('');
    console.log(`${colors.yellow}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}2. TABLE EXISTENCE${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════════════${colors.reset}`);

    const userCount = await User.count();
    test('Users table exists', userCount >= 0);

    const categoryCount = await Category.count();
    test('Categories table exists', categoryCount >= 0);

    const courseCount = await Course.count();
    test('Courses table exists', courseCount >= 0);

    const moduleCount = await CourseModule.count();
    test('Modules table exists', moduleCount >= 0);

    const contentCount = await ModuleContent.count();
    test('Contents table exists', contentCount >= 0);

    const enrollmentCount = await Enrollment.count();
    test('Enrollments table exists', enrollmentCount >= 0);

    // Test data population
    console.log('');
    console.log(`${colors.yellow}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}3. DATA POPULATION${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════════════${colors.reset}`);

    test('Users table has data', userCount > 0, `Found ${userCount} users`);
    test('Categories table has data', categoryCount > 0, `Found ${categoryCount} categories`);
    test('Courses table has data', courseCount > 0, `Found ${courseCount} courses`);
    test('Modules table has data', moduleCount > 0, `Found ${moduleCount} modules`);
    test('Contents table has data', contentCount > 0, `Found ${contentCount} contents`);

    // Test user roles
    console.log('');
    console.log(`${colors.yellow}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}4. USER ROLES VERIFICATION${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════════════${colors.reset}`);

    const superAdminCount = await User.count({ where: { role: 'super_admin' } });
    test('Super admin exists', superAdminCount >= 1, `Found ${superAdminCount} super admins`);

    const adminCount = await User.count({ where: { role: 'admin' } });
    test('Admins exist', adminCount >= 1, `Found ${adminCount} admins`);

    const instructorCount = await User.count({ where: { role: 'instructor' } });
    test('Instructors exist', instructorCount > 0, `Found ${instructorCount} instructors`);

    const studentCount = await User.count({ where: { role: 'student' } });
    test('Students exist', studentCount > 0, `Found ${studentCount} students`);

    // Test relationships
    console.log('');
    console.log(`${colors.yellow}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}5. RELATIONSHIP INTEGRITY${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════════════${colors.reset}`);

    // Test course has instructor
    const courseWithInstructor = await Course.findOne({
      include: [{ model: User, as: 'instructor' }]
    });
    test('Course-Instructor relationship works',
      courseWithInstructor && courseWithInstructor.instructor !== null,
      'Course has valid instructor');

    // Test course has category
    const courseWithCategory = await Course.findOne({
      include: [{ model: Category, as: 'category' }]
    });
    test('Course-Category relationship works',
      courseWithCategory && courseWithCategory.category !== null,
      'Course has valid category');

    // Test enrollment relationships
    const enrollmentWithRelations = await Enrollment.findOne({
      include: [
        { model: User, as: 'student' },
        { model: Course, as: 'course' }
      ]
    });
    test('Enrollment-Student relationship works',
      enrollmentWithRelations && enrollmentWithRelations.student !== null,
      'Enrollment has valid student');
    test('Enrollment-Course relationship works',
      enrollmentWithRelations && enrollmentWithRelations.course !== null,
      'Enrollment has valid course');

    // Test module-course relationship
    const moduleWithCourse = await CourseModule.findOne({
      include: [{ model: Course, as: 'course' }]
    });
    test('Module-Course relationship works',
      moduleWithCourse && moduleWithCourse.course !== null,
      'Module has valid course');

    // Test content-module relationship
    const contentWithModule = await ModuleContent.findOne({
      include: [{ model: CourseModule, as: 'module' }]
    });
    test('Content-Module relationship works',
      contentWithModule && contentWithModule.module !== null,
      'Content has valid module');

    // Test data consistency
    console.log('');
    console.log(`${colors.yellow}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}6. DATA CONSISTENCY${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════════════${colors.reset}`);

    // Check for courses without modules
    const coursesWithoutModules = await Course.count({
      include: [{
        model: CourseModule,
        as: 'modules',
        required: false
      }],
      having: sequelize.literal('COUNT(`modules`.`id`) = 0'),
      group: ['Course.id']
    });
    test('All courses have modules', coursesWithoutModules === 0,
      coursesWithoutModules > 0 ? `Found ${coursesWithoutModules} courses without modules` : '');

    // Check enrollment progress percentages are valid
    const invalidProgressCount = await Enrollment.count({
      where: {
        progress_percentage: {
          [sequelize.Op.or]: [
            { [sequelize.Op.lt]: 0 },
            { [sequelize.Op.gt]: 100 }
          ]
        }
      }
    });
    test('All enrollment progress values are valid (0-100)',
      invalidProgressCount === 0,
      invalidProgressCount > 0 ? `Found ${invalidProgressCount} invalid progress values` : '');

    // Check for orphaned enrollments (student or course deleted)
    const orphanedEnrollments = await Enrollment.findAll({
      include: [
        { model: User, as: 'student', required: false },
        { model: Course, as: 'course', required: false }
      ]
    });
    const orphanCount = orphanedEnrollments.filter(e => !e.student || !e.course).length;
    test('No orphaned enrollments', orphanCount === 0,
      orphanCount > 0 ? `Found ${orphanCount} orphaned enrollments` : '');

    // Test required fields
    console.log('');
    console.log(`${colors.yellow}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}7. REQUIRED FIELDS VALIDATION${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════════════${colors.reset}`);

    // Check users have required fields
    const usersWithoutEmail = await User.count({
      where: { email: null }
    });
    test('All users have email addresses', usersWithoutEmail === 0);

    const usersWithoutName = await User.count({
      where: { full_name: null }
    });
    test('All users have full names', usersWithoutName === 0);

    // Check courses have required fields
    const coursesWithoutTitle = await Course.count({
      where: { title: null }
    });
    test('All courses have titles', coursesWithoutTitle === 0);

    const coursesWithoutInstructor = await Course.count({
      where: { instructor_id: null }
    });
    test('All courses have instructors', coursesWithoutInstructor === 0);

    // Test enrollment dates
    console.log('');
    console.log(`${colors.yellow}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}8. DATE FIELD VALIDATION${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════════════${colors.reset}`);

    const enrollmentsWithoutDate = await Enrollment.count({
      where: { enrollment_date: null }
    });
    test('All enrollments have enrollment dates', enrollmentsWithoutDate === 0);

    // Check for future enrollment dates (should not exist)
    const futureEnrollments = await Enrollment.count({
      where: {
        enrollment_date: {
          [sequelize.Op.gt]: new Date()
        }
      }
    });
    test('No enrollments with future dates', futureEnrollments === 0,
      futureEnrollments > 0 ? `Found ${futureEnrollments} enrollments with future dates` : '');

    // Summary
    console.log('');
    console.log(`${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}TEST SUMMARY${colors.reset}`);
    console.log(`${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`Total Tests:  ${colors.blue}${total}${colors.reset}`);
    console.log(`Passed:       ${colors.green}${passed}${colors.reset}`);
    console.log(`Failed:       ${colors.red}${failed}${colors.reset}`);
    console.log('');

    if (failed === 0) {
      console.log(`${colors.green}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
      console.log(`${colors.green}║   ALL TESTS PASSED! ✓ Database integrity verified        ║${colors.reset}`);
      console.log(`${colors.green}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
      process.exit(0);
    } else {
      console.log(`${colors.red}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
      console.log(`${colors.red}║   SOME TESTS FAILED! ✗ Please check database integrity   ║${colors.reset}`);
      console.log(`${colors.red}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
      process.exit(1);
    }

  } catch (error) {
    console.error(`${colors.red}Fatal error during testing:${colors.reset}`, error);
    process.exit(1);
  }
}

testDatabaseIntegrity();
