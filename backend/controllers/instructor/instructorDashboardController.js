const { Course, Enrollment, User, AssignedTest, QuestionBank, LiveSession, Assignment, AssignmentSubmission, sequelize } = require('../../models');
const ApiResponse = require('../../utils/response');
const { Op } = require('sequelize');

/**
 * Instructor Dashboard Controller
 * Provides comprehensive dashboard data for instructors
 */
class InstructorDashboardController {
  /**
   * Get instructor dashboard overview
   * GET /api/instructor/dashboard
   */
  static async getDashboard(req, res, next) {
    try {
      const instructorId = req.user.id;

      // Run all queries in parallel for performance
      const [
        teachingSummary,
        recentEnrollments,
        pendingQuestions,
        coursePerformance,
        testSubmissionsPending,
        recentActivity
      ] = await Promise.all([
        InstructorDashboardController.getTeachingSummary(instructorId),
        InstructorDashboardController.getRecentEnrollments(instructorId),
        InstructorDashboardController.getPendingQuestions(instructorId),
        InstructorDashboardController.getCoursePerformance(instructorId),
        InstructorDashboardController.getTestSubmissionsPending(instructorId),
        InstructorDashboardController.getRecentActivity(instructorId)
      ]);

      return ApiResponse.success(res, {
        teaching_summary: teachingSummary,
        recent_enrollments: recentEnrollments,
        pending_questions: pendingQuestions,
        course_performance: coursePerformance,
        test_submissions_pending: testSubmissionsPending,
        recent_activity: recentActivity
      }, 'Instructor dashboard data retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get teaching summary statistics
   * @private
   */
  static async getTeachingSummary(instructorId) {
    // Get all courses by instructor
    const courses = await Course.findAll({
      where: { instructor_id: instructorId },
      attributes: ['id', 'status']
    });

    const totalCourses = courses.length;
    const publishedCourses = courses.filter(c => c.status === 'published').length;
    const draftCourses = courses.filter(c => c.status === 'draft').length;

    // Get enrollment counts
    const courseIds = courses.map(c => c.id);

    const enrollments = await Enrollment.findAll({
      where: {
        course_id: { [Op.in]: courseIds }
      },
      attributes: [
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('student_id'))), 'total_students'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_enrollments']
      ],
      raw: true
    });

    // Get enrollments this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyEnrollments = await Enrollment.count({
      where: {
        course_id: { [Op.in]: courseIds },
        enrollment_date: { [Op.gte]: startOfMonth }
      }
    });

    return {
      total_courses: totalCourses,
      published_courses: publishedCourses,
      draft_courses: draftCourses,
      total_students: parseInt(enrollments[0]?.total_students || 0),
      total_enrollments: parseInt(enrollments[0]?.total_enrollments || 0),
      enrollments_this_month: monthlyEnrollments
    };
  }

  /**
   * Get recent enrollments
   * @private
   */
  static async getRecentEnrollments(instructorId, limit = 10) {
    const courses = await Course.findAll({
      where: { instructor_id: instructorId },
      attributes: ['id']
    });

    const courseIds = courses.map(c => c.id);

    if (courseIds.length === 0) {
      return [];
    }

    const enrollments = await Enrollment.findAll({
      where: {
        course_id: { [Op.in]: courseIds }
      },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'full_name', 'email', 'profile_picture']
        },
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'title', 'thumbnail']
        }
      ],
      order: [['enrollment_date', 'DESC']],
      limit: limit
    });

    return enrollments.map(enrollment => ({
      id: enrollment.id,
      student_id: enrollment.student_id,
      student_name: enrollment.student?.full_name,
      student_email: enrollment.student?.email,
      student_avatar: enrollment.student?.profile_picture,
      course_id: enrollment.course_id,
      course_title: enrollment.course?.title,
      course_thumbnail: enrollment.course?.thumbnail,
      enrollment_date: enrollment.enrollment_date,
      progress_percentage: enrollment.progress_percentage || 0
    }));
  }

  /**
   * Get pending questions count
   * @private
   */
  static async getPendingQuestions(instructorId) {
    const count = await QuestionBank.count({
      where: {
        created_by: instructorId,
        is_approved: false  // Fixed: use is_approved instead of status
      }
    });

    return count;
  }

  /**
   * Get course performance metrics
   * @private
   */
  static async getCoursePerformance(instructorId, limit = 5) {
    const courses = await Course.findAll({
      where: {
        instructor_id: instructorId,
        status: 'published'
      },
      include: [
        {
          model: Enrollment,
          as: 'enrollments',
          attributes: ['progress_percentage', 'completed_at']  // Fixed: use completed_at instead of status
        }
      ],
      limit: limit,
      order: [['created_at', 'DESC']]
    });

    return courses.map(course => {
      const enrollments = course.enrollments || [];
      const totalStudents = enrollments.length;
      const completedStudents = enrollments.filter(e => e.completed_at !== null).length;
      const avgProgress = totalStudents > 0
        ? enrollments.reduce((sum, e) => sum + (parseFloat(e.progress_percentage) || 0), 0) / totalStudents
        : 0;
      const completionRate = totalStudents > 0
        ? (completedStudents / totalStudents) * 100
        : 0;

      return {
        course_id: course.id,
        title: course.title,
        thumbnail: course.thumbnail,
        students: totalStudents,
        avg_progress: Math.round(avgProgress * 10) / 10,
        completion_rate: Math.round(completionRate * 10) / 10,
        rating: course.average_rating || 0,
        status: course.status
      };
    });
  }

  /**
   * Get test submissions pending review
   * @private
   */
  static async getTestSubmissionsPending(instructorId) {
    // For now, return 0 as manual grading isn't implemented
    // This will be updated when grading system is added
    return 0;
  }

  /**
   * Get recent activity
   * @private
   */
  static async getRecentActivity(instructorId, limit = 10) {
    const courses = await Course.findAll({
      where: { instructor_id: instructorId },
      attributes: ['id']
    });

    const courseIds = courses.map(c => c.id);

    if (courseIds.length === 0) {
      return [];
    }

    // Get recent enrollments for activity feed
    const enrollments = await Enrollment.findAll({
      where: {
        course_id: { [Op.in]: courseIds }
      },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'full_name', 'profile_picture']
        },
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'title']
        }
      ],
      order: [['enrollment_date', 'DESC']],
      limit: limit
    });

    return enrollments.map(enrollment => ({
      type: 'enrollment',
      message: `${enrollment.student?.full_name} enrolled in ${enrollment.course?.title}`,
      student_name: enrollment.student?.full_name,
      course_title: enrollment.course?.title,
      timestamp: enrollment.enrollment_date,
      avatar: enrollment.student?.profile_picture
    }));
  }

  /**
   * Get instructor statistics
   * GET /api/instructor/stats
   */
  static async getStats(req, res, next) {
    try {
      const instructorId = req.user.id;

      const courses = await Course.findAll({
        where: { instructor_id: instructorId }
      });

      const courseIds = courses.map(c => c.id);

      // Get total enrollments
      const totalEnrollments = await Enrollment.count({
        where: {
          course_id: { [Op.in]: courseIds }
        }
      });

      // Get unique students
      const uniqueStudents = await Enrollment.count({
        where: {
          course_id: { [Op.in]: courseIds }
        },
        distinct: true,
        col: 'student_id'
      });

      // Get completed courses
      const completedEnrollments = await Enrollment.count({
        where: {
          course_id: { [Op.in]: courseIds },
          completed_at: { [Op.ne]: null }
        }
      });

      // Get tests created
      const testsCreated = await AssignedTest.count({
        where: {
          instructor_id: instructorId
        }
      });

      // Get questions contributed
      const questionsContributed = await QuestionBank.count({
        where: {
          created_by: instructorId
        }
      });

      // Get approved questions
      const questionsApproved = await QuestionBank.count({
        where: {
          created_by: instructorId,
          approval_status: 'approved'
        }
      });

      return ApiResponse.success(res, {
        total_courses: courses.length,
        published_courses: courses.filter(c => c.status === 'published').length,
        total_enrollments: totalEnrollments,
        unique_students: uniqueStudents,
        completed_enrollments: completedEnrollments,
        tests_created: testsCreated,
        questions_contributed: questionsContributed,
        questions_approved: questionsApproved
      }, 'Instructor statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/instructor/live-sessions
   *
   * All sessions across every course this instructor teaches.
   * Optional ?status=upcoming|past|all (default upcoming).
   * Returns rows already enriched with course title + thumbnail so
   * the global Live Sessions page doesn't need a second hop per row.
   */
  static async getMyLiveSessions(req, res, next) {
    try {
      const { status = 'upcoming', limit = 100 } = req.query;
      const instructorId = req.user.id;

      const courses = await Course.findAll({
        where: { instructor_id: instructorId },
        attributes: ['id'],
        raw: true,
      });
      const courseIds = courses.map((c) => c.id);
      if (courseIds.length === 0) {
        return ApiResponse.success(res, { sessions: [] });
      }

      const where = { course_id: { [Op.in]: courseIds } };
      const now = new Date();
      // Status is the source of truth for actionability — past clock
      // time is just a HINT (the UI shows an "Overdue" chip). So
      // "upcoming" = anything not ended (covers scheduled-but-late
      // and live). "Past" = anything explicitly ended. Time of day
      // no longer hides a session the instructor can still open.
      if (status === 'upcoming') {
        where.status = { [Op.in]: ['scheduled', 'live'] };
      } else if (status === 'past') {
        where.status = 'ended';
      }

      const sessions = await LiveSession.findAll({
        where,
        include: [
          { model: Course, as: 'course', attributes: ['id', 'title', 'thumbnail'] },
        ],
        order: status === 'past'
          ? [['scheduled_at', 'DESC']]
          : [['scheduled_at', 'ASC']],
        limit: parseInt(limit, 10) || 100,
      });

      return ApiResponse.success(res, { sessions });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/instructor/assignments
   *
   * All assignments across every course this instructor teaches,
   * each row carrying total_submissions + pending_grading counts so
   * the global Assignments page can show a queue at a glance without
   * fanning out further.
   */
  static async getMyAssignments(req, res, next) {
    try {
      const instructorId = req.user.id;

      const courses = await Course.findAll({
        where: { instructor_id: instructorId },
        attributes: ['id', 'title', 'thumbnail'],
        raw: true,
      });
      const courseIds = courses.map((c) => c.id);
      if (courseIds.length === 0) {
        return ApiResponse.success(res, { assignments: [] });
      }
      const courseById = new Map(courses.map((c) => [c.id, c]));

      const assignments = await Assignment.findAll({
        where: { course_id: { [Op.in]: courseIds } },
        order: [['created_at', 'DESC']],
        raw: true,
      });
      if (assignments.length === 0) {
        return ApiResponse.success(res, { assignments: [] });
      }

      const assignmentIds = assignments.map((a) => a.id);
      // Two grouped counts: total submissions per assignment, +
      // pending grading (status !== 'graded') per assignment.
      let totals = [];
      let pending = [];
      try {
        totals = await AssignmentSubmission.findAll({
          where: { assignment_id: { [Op.in]: assignmentIds } },
          attributes: [
            'assignment_id',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          ],
          group: ['assignment_id'],
          raw: true,
        });
        pending = await AssignmentSubmission.findAll({
          where: {
            assignment_id: { [Op.in]: assignmentIds },
            status: { [Op.ne]: 'graded' },
          },
          attributes: [
            'assignment_id',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          ],
          group: ['assignment_id'],
          raw: true,
        });
      } catch (e) {
        // Sub-count failures don't block the assignment list.
      }
      const totalById = new Map(totals.map((r) => [parseInt(r.assignment_id, 10), parseInt(r.count, 10)]));
      const pendingById = new Map(pending.map((r) => [parseInt(r.assignment_id, 10), parseInt(r.count, 10)]));

      const enriched = assignments.map((a) => ({
        ...a,
        course: courseById.get(a.course_id) || null,
        total_submissions: totalById.get(a.id) || 0,
        pending_grading:   pendingById.get(a.id) || 0,
      }));

      return ApiResponse.success(res, { assignments: enriched });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = InstructorDashboardController;
