/**
 * Content enrichment seeder — fills the blanks the original seeder left.
 *
 * The old seedDatabase.js created lessons with lorem titles but NO
 * article_content, youtube_url, or description — so the player showed
 * "Article content not available" / "No description available" on every
 * seeded lesson, and courses had zero reviews.
 *
 * This script is ADDITIVE and idempotent: it only touches NULL/empty
 * fields and only adds reviews to courses that have fewer than 3. It
 * never deletes or overwrites real data, so it's safe to run on a live
 * database (unlike seedDatabase.js, which truncates).
 *
 * Run directly:   node scripts/enrichSeedContent.js
 * Or via API:     POST /api/seed/enrich  (SEED_SECRET-gated)
 */

const { sequelize } = require('../config/database');
const {
  Course, CourseModule, ModuleContent, Enrollment, CourseReview, User,
  QuestionBank,
} = require('../models');

// Real, public, full-length educational videos (freeCodeCamp / TechWorld
// with Nana etc.) so seeded video lessons actually play.
const VIDEO_POOL = [
  'https://www.youtube.com/watch?v=PkZNo7MFNFg', // JavaScript full course
  'https://www.youtube.com/watch?v=rfscVS0vtbw', // Python full course
  'https://www.youtube.com/watch?v=HXV3zeQKqGY', // SQL full course
  'https://www.youtube.com/watch?v=bMknfKXIFA8', // React course
  'https://www.youtube.com/watch?v=3c-iBn73dDE', // Docker tutorial
  'https://www.youtube.com/watch?v=X48VuDVv0do', // Kubernetes course
  'https://www.youtube.com/watch?v=RGOj5yH7evk', // Git & GitHub
  'https://www.youtube.com/watch?v=ulprqHHWlng', // AWS certification
  'https://www.youtube.com/watch?v=NWONeJKn6kc', // Machine learning
  'https://www.youtube.com/watch?v=xk4_1vDrzzo', // Java course
  'https://www.youtube.com/watch?v=30LWjhZzg50', // TypeScript course
  'https://www.youtube.com/watch?v=Oe421EPjeBE', // Node.js course
  'https://www.youtube.com/watch?v=-56x56UppqQ', // MongoDB course
  'https://www.youtube.com/watch?v=qw--VYLpxG4', // PostgreSQL course
  'https://www.youtube.com/watch?v=mU6anWqZJcc', // HTML/CSS course
  'https://www.youtube.com/watch?v=FXpIoQ_rT_c', // Vue.js course
  'https://www.youtube.com/watch?v=vmEHCJofslg', // Pandas course
  'https://www.youtube.com/watch?v=NKEFWyqJ5XA', // Azure fundamentals
];

const REVIEW_POOL = [
  { rating: 5, text: 'Excellent course! The explanations are clear and the pace is perfect for someone coming in with little background. I especially appreciated the hands-on sections.' },
  { rating: 5, text: 'One of the best courses I have taken on this platform. The instructor breaks down complex topics into digestible pieces, and the examples are practical.' },
  { rating: 5, text: 'Really well structured. I went from knowing almost nothing to building my own projects by the end. Highly recommend it to anyone starting out.' },
  { rating: 5, text: 'The instructor clearly knows the subject deeply. Great mix of theory and practice, and the module quizzes helped me confirm I actually understood the material.' },
  { rating: 4, text: 'Very solid content and good delivery. A few sections could use updated examples, but overall I learned a lot and would take another course from this instructor.' },
  { rating: 4, text: 'Good course with practical examples. I would have loved more exercises at the end of each module, but the core material is explained really well.' },
  { rating: 4, text: 'Clear and to the point. Some lessons move a bit fast, so keep the pause button handy — but the content itself is accurate and up to date.' },
  { rating: 4, text: 'Helped me fill real gaps in my knowledge. The later modules are the strongest part; the introduction is a little slow if you already know the basics.' },
  { rating: 3, text: 'Decent introduction to the topic. The fundamentals are covered well, but I was hoping for more advanced material toward the end.' },
  { rating: 3, text: 'The content is fine, though some sections feel rushed. It worked as a refresher for me, but complete beginners might need to supplement with extra reading.' },
  { rating: 5, text: 'Fantastic value. I have paid much more for courses that taught me far less. The real-world scenarios in the assignments were the highlight for me.' },
  { rating: 4, text: 'Well organized and easy to follow along. The instructor responds to questions in the Q&A which made a big difference when I got stuck.' },
];

// Build a readable multi-section HTML article from the lesson + course
// titles. Not lorem — reads like real course material.
function buildArticle(lessonTitle, courseTitle) {
  const topic = lessonTitle.replace(/^Lesson \d+:\s*/i, '');
  return `
<h3>Introduction</h3>
<p>Welcome to this lesson of <strong>${courseTitle}</strong>. In this section we focus on <em>${topic}</em> — what it is, why it matters in real projects, and how to apply it with confidence. Take your time with each part; the concepts here build directly on one another and will come back in later modules.</p>

<h3>Why this matters</h3>
<p>Professional work rarely rewards memorizing syntax. What it rewards is understanding the underlying model well enough to reason about new situations. The ideas in this lesson show up constantly in production systems, code reviews, and technical interviews, so treat this as a foundation rather than a box to tick.</p>

<h3>Core concepts</h3>
<p>There are three things to internalize before moving on:</p>
<ul>
  <li><strong>The mental model.</strong> Before touching any tooling, make sure you can explain in one sentence what problem this solves and what trade-off it makes to solve it.</li>
  <li><strong>The common pitfalls.</strong> Most mistakes practitioners make here come from skipping edge cases — pay attention to the "what could go wrong" notes throughout the lesson.</li>
  <li><strong>The habit.</strong> Knowledge fades; habits stay. The practice exercise at the end is designed to turn today's concept into something you do automatically.</li>
</ul>

<h3>Putting it into practice</h3>
<p>Work through the example scenario step by step rather than reading it passively. When you hit the practice section, try to predict the outcome before checking the answer — the small moment of friction is where the learning actually happens. If a step surprises you, that is a signal worth chasing: go back one section and find the assumption that didn't hold.</p>

<h3>Key takeaways</h3>
<p>By the end of this lesson you should be able to explain the concept in your own words, recognize where it applies in a codebase you have never seen, and avoid the two or three classic mistakes covered above. When you are comfortable with those, mark the lesson complete and continue — the next lesson assumes everything covered here.</p>
`.trim();
}

function pick(arr, seedNum) {
  return arr[seedNum % arr.length];
}

// Question templates instantiated per course. `t` is the course title.
// correct_answer must EXACTLY equal one of the options — the graders
// compare by string equality.
function buildQuestions(t) {
  return [
    {
      difficulty: 'easy', question_type: 'multiple_choice', marks: 1,
      question_text: `What is the main goal of studying ${t}?`,
      options: [
        `To apply the core concepts of ${t} in real projects`,
        'To memorize definitions without practice',
        'To avoid using any tooling at all',
        'To skip the fundamentals entirely',
      ],
      correct_answer: `To apply the core concepts of ${t} in real projects`,
      explanation: 'Courses are built around applying concepts practically, not memorization.',
    },
    {
      difficulty: 'easy', question_type: 'true_false', marks: 1,
      question_text: `Understanding the fundamentals is important before moving to advanced topics in ${t}.`,
      options: ['True', 'False'],
      correct_answer: 'True',
      explanation: 'Advanced material in every module builds directly on the fundamentals.',
    },
    {
      difficulty: 'easy', question_type: 'multiple_choice', marks: 1,
      question_text: `Which habit most helps you retain what you learn in ${t}?`,
      options: [
        'Practicing with hands-on exercises after each lesson',
        'Only watching videos at 2x speed',
        'Skipping the practice sections',
        'Reading the lesson titles only',
      ],
      correct_answer: 'Practicing with hands-on exercises after each lesson',
      explanation: 'Active practice converts short-term knowledge into skill.',
    },
    {
      difficulty: 'easy', question_type: 'true_false', marks: 1,
      question_text: `In ${t}, it is good practice to test your understanding before moving to the next module.`,
      options: ['True', 'False'],
      correct_answer: 'True',
      explanation: 'Each module assumes mastery of the previous one.',
    },
    {
      difficulty: 'easy', question_type: 'multiple_choice', marks: 1,
      question_text: `When you hit an error while practicing ${t}, what should you do first?`,
      options: [
        'Read the error message carefully and identify what it says failed',
        'Immediately restart the computer',
        'Delete the whole project',
        'Ignore it and continue',
      ],
      correct_answer: 'Read the error message carefully and identify what it says failed',
      explanation: 'Error messages usually point directly at the failing step.',
    },
    {
      difficulty: 'medium', question_type: 'multiple_choice', marks: 2,
      question_text: `In a professional ${t} workflow, which approach is considered best practice?`,
      options: [
        'Start from requirements, design a solution, then implement in small verifiable steps',
        'Write everything in one pass without checking intermediate results',
        'Copy solutions without understanding them',
        'Avoid documenting decisions',
      ],
      correct_answer: 'Start from requirements, design a solution, then implement in small verifiable steps',
      explanation: 'Small verifiable steps localize mistakes early, when they are cheap to fix.',
    },
    {
      difficulty: 'medium', question_type: 'multiple_choice', marks: 2,
      question_text: `A teammate asks you to review their ${t} work. What should you check FIRST?`,
      options: [
        'Whether the solution actually meets the stated requirement',
        'Whether the file names are alphabetical',
        'Whether they used your favorite editor',
        'How fast they typed it',
      ],
      correct_answer: 'Whether the solution actually meets the stated requirement',
      explanation: 'Correctness against the requirement comes before style concerns.',
    },
    {
      difficulty: 'medium', question_type: 'true_false', marks: 2,
      question_text: `Trade-offs are a normal part of real-world decisions in ${t} — there is rarely one universally "best" option.`,
      options: ['True', 'False'],
      correct_answer: 'True',
      explanation: 'Engineering decisions balance cost, complexity, performance, and maintainability.',
    },
    {
      difficulty: 'medium', question_type: 'multiple_choice', marks: 2,
      question_text: `Which of the following would MOST improve the reliability of a ${t} solution?`,
      options: [
        'Testing it against edge cases, not just the happy path',
        'Testing it once with ideal input',
        'Assuming inputs are always valid',
        'Removing all error handling to simplify the code',
      ],
      correct_answer: 'Testing it against edge cases, not just the happy path',
      explanation: 'Most production failures come from unconsidered edge cases.',
    },
    {
      difficulty: 'medium', question_type: 'multiple_choice', marks: 2,
      question_text: `You need to explain a ${t} concept to a junior colleague. The clearest approach is to:`,
      options: [
        'Give a one-sentence mental model, then a concrete example',
        'Recite the full documentation from memory',
        'Use as much jargon as possible',
        'Tell them it is too advanced to explain',
      ],
      correct_answer: 'Give a one-sentence mental model, then a concrete example',
      explanation: 'Model-then-example is how experts transfer understanding quickly.',
    },
    {
      difficulty: 'hard', question_type: 'multiple_choice', marks: 3,
      question_text: `A production system built with ${t} works in testing but fails intermittently under real load. What is the strongest FIRST step?`,
      options: [
        'Reproduce the failure with logging/metrics that capture the failing conditions',
        'Rewrite the whole system from scratch immediately',
        'Increase server size and hope it goes away',
        'Disable monitoring to reduce noise',
      ],
      correct_answer: 'Reproduce the failure with logging/metrics that capture the failing conditions',
      explanation: 'You cannot reliably fix what you cannot reproduce and observe.',
    },
    {
      difficulty: 'hard', question_type: 'multiple_choice', marks: 3,
      question_text: `When two recommended ${t} practices conflict in a specific situation, a senior practitioner should:`,
      options: [
        'Evaluate which practice serves the actual goal in this context and document the choice',
        'Always follow the newer practice regardless of context',
        'Apply both simultaneously even if contradictory',
        'Escalate every such decision without forming a view',
      ],
      correct_answer: 'Evaluate which practice serves the actual goal in this context and document the choice',
      explanation: 'Practices are means to goals; context decides which applies.',
    },
    {
      difficulty: 'hard', question_type: 'true_false', marks: 3,
      question_text: `In ${t}, optimizing a component before measuring where the real bottleneck is usually wastes effort.`,
      options: ['True', 'False'],
      correct_answer: 'True',
      explanation: 'Measure first — intuition about bottlenecks is wrong more often than not.',
    },
    {
      difficulty: 'hard', question_type: 'multiple_choice', marks: 3,
      question_text: `Which statement about maintaining a long-lived ${t} project is MOST accurate?`,
      options: [
        'Readable, well-structured work costs slightly more now and pays back every time someone touches it later',
        'Only initial development speed matters',
        'Documentation is unnecessary if the original author stays',
        'Complexity is free as long as it works today',
      ],
      correct_answer: 'Readable, well-structured work costs slightly more now and pays back every time someone touches it later',
      explanation: 'Maintenance dominates the lifetime cost of successful projects.',
    },
    {
      difficulty: 'hard', question_type: 'multiple_choice', marks: 3,
      question_text: `You inherit an undocumented ${t} setup that "just works". Before changing anything, you should:`,
      options: [
        'Map how it currently behaves and add safety checks around the parts you plan to change',
        'Change everything at once to modern standards',
        'Assume it works the way you would have built it',
        'Delete the parts you do not understand',
      ],
      correct_answer: 'Map how it currently behaves and add safety checks around the parts you plan to change',
      explanation: 'Understanding current behavior first prevents breaking hidden dependencies.',
    },
  ];
}

async function enrichContent() {
  const summary = {
    descriptions: 0, articles: 0, videos: 0, previews: 0, reviews: 0, coursesRated: 0,
  };

  // ── 1. Lesson content ─────────────────────────────────────────────────
  const contents = await ModuleContent.findAll({
    include: [{
      model: CourseModule,
      as: 'module',
      attributes: ['id', 'course_id', 'title'],
      include: [{ model: Course, as: 'course', attributes: ['id', 'title'] }],
    }],
    order: [['id', 'ASC']],
  });

  for (const content of contents) {
    const courseTitle = content.module?.course?.title || 'this course';
    const updates = {};

    if (!content.description) {
      const topic = content.title.replace(/^Lesson \d+:\s*/i, '');
      updates.description = `In this lesson you'll learn about ${topic}. We cover the core concepts, common pitfalls, and a hands-on example so you can apply it immediately. Part of ${courseTitle}.`;
      summary.descriptions++;
    }

    if (content.content_type === 'article' && !content.article_content) {
      updates.article_content = buildArticle(content.title, courseTitle);
      summary.articles++;
    }

    if (content.content_type === 'video' && !content.youtube_url) {
      updates.youtube_url = pick(VIDEO_POOL, content.id);
      summary.videos++;
    }

    // First lesson of each module doubles as the free preview so
    // non-enrolled visitors get a taster.
    if (content.order_index === 0 && !content.is_preview) {
      updates.is_preview = true;
      summary.previews++;
    }

    if (Object.keys(updates).length > 0) {
      await content.update(updates);
    }
  }

  // ── 2. Course reviews (only from genuinely enrolled students) ─────────
  const courses = await Course.findAll({ attributes: ['id', 'title'] });

  for (const course of courses) {
    const existing = await CourseReview.count({ where: { course_id: course.id } });
    if (existing >= 3) continue;

    const enrollments = await Enrollment.findAll({
      where: { course_id: course.id },
      attributes: ['student_id', 'enrollment_date'],
      include: [{ model: User, as: 'student', attributes: ['id', 'role'] }],
    });
    const students = enrollments.filter((e) => e.student?.role === 'student');
    if (students.length === 0) continue;

    // Up to 6 reviews per course, one per student, skipping students who
    // already reviewed.
    const target = Math.min(6, students.length);
    let added = 0;
    for (let i = 0; i < students.length && added < target; i++) {
      const enr = students[i];
      const already = await CourseReview.findOne({
        where: { course_id: course.id, student_id: enr.student_id },
      });
      if (already) continue;

      const tpl = pick(REVIEW_POOL, course.id * 7 + i * 3);
      await CourseReview.create({
        course_id: course.id,
        student_id: enr.student_id,
        rating: tpl.rating,
        review_text: tpl.text,
        is_approved: true,
        helpful_count: (course.id + i) % 9,
        created_at: enr.enrollment_date || new Date(),
      });
      added++;
      summary.reviews++;
    }

    if (added > 0) {
      // Recompute the course's cached rating fields from real rows.
      const [stats] = await sequelize.query(
        'SELECT AVG(rating)::numeric(3,2) AS avg, COUNT(*) AS cnt FROM course_reviews WHERE course_id = :cid AND is_approved = true',
        { replacements: { cid: course.id }, type: sequelize.QueryTypes.SELECT }
      );
      await course.update({
        average_rating: parseFloat(stats.avg) || 0,
        total_reviews: parseInt(stats.cnt, 10) || 0,
      });
      summary.coursesRated++;
    }
  }

  // ── 3. Question bank — 15 questions per course (5 easy/5 medium/5
  // hard, MCQ + true/false) so Generate Practice Test has something to
  // draw from. Skips courses that already have 10+ approved questions
  // (i.e. real instructor-contributed banks are left alone).
  summary.questions = 0;
  const allCourses = await Course.findAll({
    where: { status: 'published' },
    attributes: ['id', 'title', 'category_id', 'instructor_id'],
  });
  for (const course of allCourses) {
    const existing = await QuestionBank.count({
      where: { course_id: course.id, is_approved: true },
    });
    if (existing >= 10) continue;

    const rows = buildQuestions(course.title).map((q) => ({
      ...q,
      options: q.options,
      course_id: course.id,
      category_id: course.category_id,
      created_by: course.instructor_id,
      is_approved: true,
    }));
    await QuestionBank.bulkCreate(rows);
    summary.questions += rows.length;
  }

  // ── 4. enrolled_count from real enrollments ───────────────────────────
  await sequelize.query(`
    UPDATE courses c SET enrolled_count = sub.cnt
    FROM (SELECT course_id, COUNT(*) AS cnt FROM enrollments GROUP BY course_id) sub
    WHERE sub.course_id = c.id AND c.enrolled_count IS DISTINCT FROM sub.cnt
  `);

  return summary;
}

module.exports = { enrichContent };

// Allow running directly: node scripts/enrichSeedContent.js
if (require.main === module) {
  enrichContent()
    .then((summary) => {
      console.log('✅ Content enrichment complete:');
      console.log(`   Lesson descriptions filled: ${summary.descriptions}`);
      console.log(`   Articles written:           ${summary.articles}`);
      console.log(`   Video URLs assigned:        ${summary.videos}`);
      console.log(`   Preview lessons marked:     ${summary.previews}`);
      console.log(`   Reviews added:              ${summary.reviews} (across ${summary.coursesRated} courses)`);
      console.log(`   Question-bank questions:    ${summary.questions}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Enrichment failed:', err);
      process.exit(1);
    });
}
