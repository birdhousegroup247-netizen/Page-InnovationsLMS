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

async function auditDatabase() {
  try {
    console.log('\n====================================');
    console.log('DATABASE AUDIT - TABLE COUNTS');
    console.log('====================================\n');

    const counts = await Promise.all([
      User.count(),
      Category.count(),
      Course.count(),
      CourseModule.count(),
      ModuleContent.count(),
      Enrollment.count(),
      Certificate.count(),
      InstructorApplication.count(),
      QuestionBank.count(),
      CourseReview.count(),
      Notification.count(),
      ActivityLog.count()
    ]);

    const tables = [
      { name: 'Users', count: counts[0] },
      { name: 'Categories', count: counts[1] },
      { name: 'Courses', count: counts[2] },
      { name: 'Course Modules', count: counts[3] },
      { name: 'Module Contents (Lessons)', count: counts[4] },
      { name: 'Enrollments', count: counts[5] },
      { name: 'Certificates', count: counts[6] },
      { name: 'Instructor Applications', count: counts[7] },
      { name: 'Question Bank', count: counts[8] },
      { name: 'Course Reviews', count: counts[9] },
      { name: 'Notifications', count: counts[10] },
      { name: 'Activity Logs', count: counts[11] }
    ];

    tables.forEach(table => {
      console.log(`${table.name.padEnd(30)} : ${table.count}`);
    });

    console.log('\n====================================');
    console.log('USER BREAKDOWN');
    console.log('====================================\n');

    const userRoles = await User.findAll({
      attributes: [
        'role',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['role']
    });

    userRoles.forEach(role => {
      console.log(`${role.role.padEnd(30)} : ${role.get('count')}`);
    });

    console.log('\n====================================');
    console.log('COURSE STATUS BREAKDOWN');
    console.log('====================================\n');

    const courseStatus = await Course.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    courseStatus.forEach(status => {
      console.log(`${status.status.padEnd(30)} : ${status.get('count')}`);
    });

    console.log('\n====================================');
    console.log('ENROLLMENT STATISTICS');
    console.log('====================================\n');

    const enrollmentStats = await Enrollment.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('student_id'))), 'unique_students'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_enrollments'],
        [sequelize.fn('AVG', sequelize.col('progress_percentage')), 'avg_progress'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN completed_at IS NOT NULL THEN 1 END')), 'completed_enrollments']
      ],
      raw: true
    });

    console.log(`Unique Students Enrolled      : ${enrollmentStats[0].unique_students}`);
    console.log(`Total Enrollments             : ${enrollmentStats[0].total_enrollments}`);
    console.log(`Average Progress              : ${parseFloat(enrollmentStats[0].avg_progress).toFixed(2)}%`);
    console.log(`Completed Enrollments         : ${enrollmentStats[0].completed_enrollments}`);

    console.log('\n====================================');
    console.log('SAMPLE DATA VERIFICATION');
    console.log('====================================\n');

    // Check a sample enrollment with all relationships
    const sampleEnrollment = await Enrollment.findOne({
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'full_name', 'email']
        },
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'title'],
          include: [
            {
              model: User,
              as: 'instructor',
              attributes: ['id', 'full_name']
            }
          ]
        }
      ]
    });

    if (sampleEnrollment) {
      console.log('Sample Enrollment:');
      console.log(`  Student: ${sampleEnrollment.student?.full_name} (${sampleEnrollment.student?.email})`);
      console.log(`  Course: ${sampleEnrollment.course?.title}`);
      console.log(`  Instructor: ${sampleEnrollment.course?.instructor?.full_name}`);
      console.log(`  Enrolled: ${sampleEnrollment.enrollment_date}`);
      console.log(`  Progress: ${sampleEnrollment.progress_percentage}%`);
      console.log(`  Completed: ${sampleEnrollment.completed_at || 'Not completed'}`);
    }

    console.log('\n====================================');
    console.log('AUDIT COMPLETE');
    console.log('====================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Audit failed:', error);
    process.exit(1);
  }
}

auditDatabase();
