#!/bin/bash

# Fix orphaned </Link> tags in instructor pages
files=(
  "frontend/src/pages/instructor/EnrollmentManagement.jsx"
  "frontend/src/pages/instructor/StudentProgress.jsx"
  "frontend/src/pages/instructor/TestAnalytics.jsx"
  "frontend/src/pages/instructor/MyQuestions.jsx"
  "frontend/src/pages/instructor/ManageLessons.jsx"
)

for file in "${files[@]}"; do
  echo "Fixing $file..."
  # Replace orphaned </Link> with proper Link tag
  sed -i '/^            <\/Link>$/d' "$file"
  # Find line with <Container> and add Link before it
  sed -i '/^          <Container>$/i\            <Link\n              to="/instructor/dashboard"\n              className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors"\n            >\n              <ArrowLeft className="w-4 h-4" />\n              Back to Dashboard\n            </Link>\n' "$file"
done

echo "Done!"
