/**
 * Social Sharing Service
 * Generates social sharing links and metadata
 */

class SocialSharingService {
  /**
   * Generate sharing links for a course
   */
  static generateCourseShareLinks(course, baseUrl = 'https://www.pageinnovation.com') {
    const courseUrl = `${baseUrl}/courses/${course.slug || course.id}`;
    const title = encodeURIComponent(course.title);
    const description = encodeURIComponent(course.description?.substring(0, 200) || '');

    return {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(courseUrl)}`,
      twitter: `https://twitter.com/intent/tweet?text=${title}&url=${encodeURIComponent(courseUrl)}&via=Page Innovation`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(courseUrl)}`,
      whatsapp: `https://wa.me/?text=${title}%20${encodeURIComponent(courseUrl)}`,
      email: `mailto:?subject=${title}&body=Check%20out%20this%20course:%20${encodeURIComponent(courseUrl)}`,
      copyLink: courseUrl,
    };
  }

  /**
   * Generate sharing links for a certificate
   */
  static generateCertificateShareLinks(certificate, student, course, baseUrl = 'https://www.pageinnovation.com') {
    const certificateUrl = `${baseUrl}/certificates/verify/${certificate.certificate_unique_id}`;
    const title = encodeURIComponent(`I completed ${course.title} on Page Innovation!`);
    const message = encodeURIComponent(
      `I'm proud to share that I've completed ${course.title} on Page Innovation LMS. Check out my certificate!`
    );

    return {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(certificateUrl)}`,
      twitter: `https://twitter.com/intent/tweet?text=${message}&url=${encodeURIComponent(certificateUrl)}&hashtags=Learning,Certificate,Page Innovation`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(certificateUrl)}`,
      whatsapp: `https://wa.me/?text=${message}%20${encodeURIComponent(certificateUrl)}`,
      email: `mailto:?subject=${title}&body=${message}%20${encodeURIComponent(certificateUrl)}`,
      copyLink: certificateUrl,
    };
  }

  /**
   * Generate LinkedIn certification share (special format for adding to profile)
   */
  static generateLinkedInCertificationShare(certificate, student, course, baseUrl = 'https://www.pageinnovation.com') {
    const params = new URLSearchParams({
      name: course.title,
      organizationId: '0', // Page Innovation organization ID (you'll need to register)
      issueYear: new Date(certificate.issued_at).getFullYear().toString(),
      issueMonth: (new Date(certificate.issued_at).getMonth() + 1).toString(),
      certUrl: `${baseUrl}/certificates/verify/${certificate.certificate_unique_id}`,
      certId: certificate.certificate_unique_id,
    });

    return `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&${params.toString()}`;
  }

  /**
   * Generate Open Graph metadata for course
   */
  static generateCourseOGMetadata(course, baseUrl = 'https://www.pageinnovation.com') {
    return {
      'og:title': course.title,
      'og:description': course.description?.substring(0, 200) || '',
      'og:image': course.thumbnail || `${baseUrl}/default-course-image.jpg`,
      'og:url': `${baseUrl}/courses/${course.slug || course.id}`,
      'og:type': 'website',
      'og:site_name': 'Page Innovation LMS',
      'twitter:card': 'summary_large_image',
      'twitter:title': course.title,
      'twitter:description': course.description?.substring(0, 200) || '',
      'twitter:image': course.thumbnail || `${baseUrl}/default-course-image.jpg`,
    };
  }

  /**
   * Generate Open Graph metadata for certificate
   */
  static generateCertificateOGMetadata(certificate, student, course, baseUrl = 'https://www.pageinnovation.com') {
    return {
      'og:title': `${student.full_name} - ${course.title} Certificate`,
      'og:description': `${student.full_name} has successfully completed ${course.title} on Page Innovation LMS`,
      'og:image': `${baseUrl}/certificates/${certificate.certificate_unique_id}/image`,
      'og:url': `${baseUrl}/certificates/verify/${certificate.certificate_unique_id}`,
      'og:type': 'profile',
      'og:site_name': 'Page Innovation LMS',
      'twitter:card': 'summary_large_image',
      'twitter:title': `Certificate: ${course.title}`,
      'twitter:description': `${student.full_name} completed this course on Page Innovation`,
    };
  }

  /**
   * Generate share text templates
   */
  static generateShareText(type, data) {
    const templates = {
      course_completed: `I just completed "${data.courseTitle}" on @Page Innovation! 🎉 Check it out: ${data.url}`,
      course_enrolled: `Just enrolled in "${data.courseTitle}" on @Page Innovation! Excited to learn! 📚 ${data.url}`,
      certificate_earned: `Proud to share that I've earned my certificate for "${data.courseTitle}" from @Page Innovation! 🏆 ${data.url}`,
      achievement: `New achievement unlocked on @Page Innovation! ${data.achievementName} 🎯 ${data.url}`,
    };

    return templates[type] || '';
  }
}

module.exports = SocialSharingService;
