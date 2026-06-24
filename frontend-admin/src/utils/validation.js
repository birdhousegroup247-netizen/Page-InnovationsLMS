/**
 * Form Validation Utilities
 */

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid
 */
export const isValidPhone = (phone) => {
  if (!phone) return true; // Phone is optional
  // Support various formats: +1234567890, (123) 456-7890, 123-456-7890, etc.
  const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Validate required field
 * @param {string} value - Value to validate
 * @returns {boolean} - True if not empty
 */
export const isRequired = (value) => {
  return value !== null && value !== undefined && value.toString().trim().length > 0;
};

/**
 * Validate minimum length
 * @param {string} value - Value to validate
 * @param {number} minLength - Minimum length required
 * @returns {boolean} - True if meets minimum
 */
export const minLength = (value, minLength) => {
  if (!value) return false;
  return value.toString().trim().length >= minLength;
};

/**
 * Validate maximum length
 * @param {string} value - Value to validate
 * @param {number} maxLength - Maximum length allowed
 * @returns {boolean} - True if within maximum
 */
export const maxLength = (value, maxLength) => {
  if (!value) return true;
  return value.toString().trim().length <= maxLength;
};

/**
 * Validate user form data
 * @param {object} formData - User form data
 * @param {boolean} isCreate - Whether this is a create operation (requires password)
 * @returns {object} - { isValid: boolean, errors: object }
 */
export const validateUserForm = (formData, isCreate = false) => {
  const errors = {};

  // Full name validation
  if (!isRequired(formData.full_name)) {
    errors.full_name = 'Full name is required';
  } else if (!minLength(formData.full_name, 2)) {
    errors.full_name = 'Full name must be at least 2 characters';
  } else if (!maxLength(formData.full_name, 100)) {
    errors.full_name = 'Full name must not exceed 100 characters';
  }

  // Email validation
  if (!isRequired(formData.email)) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(formData.email)) {
    errors.email = 'Please enter a valid email address';
  }

  // Role validation
  if (!isRequired(formData.role)) {
    errors.role = 'Role is required';
  } else if (!['student', 'instructor', 'admin', 'super_admin'].includes(formData.role)) {
    errors.role = 'Invalid role selected';
  }

  // Status validation (only for edit)
  if (!isCreate) {
    if (!isRequired(formData.status)) {
      errors.status = 'Status is required';
    } else if (!['active', 'inactive'].includes(formData.status)) {
      errors.status = 'Invalid status selected';
    }
  }

  // Password validation (only for create)
  if (isCreate) {
    if (!isRequired(formData.password)) {
      errors.password = 'Password is required';
    } else if (!minLength(formData.password, 8)) {
      errors.password = 'Password must be at least 8 characters';
    }
  }

  // Phone validation (optional)
  if (formData.phone && !isValidPhone(formData.phone)) {
    errors.phone = 'Please enter a valid phone number';
  }

  // Bio validation (optional)
  if (formData.bio && !maxLength(formData.bio, 500)) {
    errors.bio = 'Bio must not exceed 500 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Format validation errors for display
 * @param {object} errors - Validation errors object
 * @returns {string} - Formatted error message
 */
export const formatErrors = (errors) => {
  if (!errors || Object.keys(errors).length === 0) return '';

  const errorMessages = Object.values(errors);
  if (errorMessages.length === 1) return errorMessages[0];

  return errorMessages.join(', ');
};

/**
 * Validate course form data
 * @param {object} formData - Course form data
 * @returns {object} - { isValid: boolean, errors: object }
 */
export const validateCourseForm = (formData) => {
  const errors = {};

  // Title validation
  if (!isRequired(formData.title)) {
    errors.title = 'Course title is required';
  } else if (!minLength(formData.title, 3)) {
    errors.title = 'Title must be at least 3 characters';
  } else if (!maxLength(formData.title, 200)) {
    errors.title = 'Title must not exceed 200 characters';
  }

  // Description validation
  if (!isRequired(formData.description)) {
    errors.description = 'Description is required';
  } else if (!minLength(formData.description, 10)) {
    errors.description = 'Description must be at least 10 characters';
  } else if (!maxLength(formData.description, 2000)) {
    errors.description = 'Description must not exceed 2000 characters';
  }

  // Category validation
  if (!isRequired(formData.category_id)) {
    errors.category_id = 'Category is required';
  }

  // Level validation
  if (!isRequired(formData.level)) {
    errors.level = 'Level is required';
  } else if (!['beginner', 'intermediate', 'advanced'].includes(formData.level)) {
    errors.level = 'Invalid level selected';
  }

  // Price validation (optional but must be valid if provided)
  if (formData.price !== null && formData.price !== undefined && formData.price !== '') {
    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      errors.price = 'Price must be a positive number';
    }
  }

  // Duration validation (optional but must be valid if provided)
  if (formData.duration_hours && formData.duration_hours !== '') {
    const duration = parseInt(formData.duration_hours);
    if (isNaN(duration) || duration < 0) {
      errors.duration_hours = 'Duration must be a positive number';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
