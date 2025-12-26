/**
 * Activity Logger Middleware
 * Automatically logs activities for audit trail
 */

const ActivityController = require('../controllers/activity/activityController');

/**
 * Middleware to log activity after successful request
 * Usage: router.post('/courses', authenticate, logActivity('course_create', 'course'), createCourse);
 */
const logActivity = (action, entity_type = null) => {
  return async (req, res, next) => {
    // Store original send function
    const originalSend = res.send;

    // Override send to capture response
    res.send = function (data) {
      // Only log on successful responses (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          // Parse response to get entity_id if available
          let entity_id = null;
          let metadata = {};

          // Try to extract entity ID from request params or body
          if (req.params.id) {
            entity_id = req.params.id;
          } else if (req.params.courseId) {
            entity_id = req.params.courseId;
          } else if (req.params.userId) {
            entity_id = req.params.userId;
          }

          // Try to parse response data
          try {
            const responseData = JSON.parse(data);
            if (responseData.data) {
              // Extract ID from response
              if (responseData.data.course?.id) {
                entity_id = responseData.data.course.id;
                metadata.course_title = responseData.data.course.title;
              } else if (responseData.data.user?.id) {
                entity_id = responseData.data.user.id;
                metadata.user_name = responseData.data.user.full_name;
              } else if (responseData.data.id) {
                entity_id = responseData.data.id;
              }
            }
          } catch (e) {
            // Response not JSON, that's okay
          }

          // Log activity asynchronously (don't wait)
          ActivityController.logFromRequest(
            req,
            action,
            entity_type,
            entity_id,
            metadata
          ).catch(err => {
            console.error('Error logging activity:', err.message);
          });
        } catch (error) {
          console.error('Activity logging error:', error.message);
        }
      }

      // Call original send
      originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Helper to manually log activity from anywhere in code
 */
const logManualActivity = async (user_id, action, entity_type = null, entity_id = null, metadata = null, ip_address = null) => {
  try {
    return await ActivityController.logActivity({
      user_id,
      action,
      entity_type,
      entity_id,
      metadata,
      ip_address,
    });
  } catch (error) {
    console.error('Manual activity logging error:', error.message);
  }
};

module.exports = {
  logActivity,
  logManualActivity,
};
