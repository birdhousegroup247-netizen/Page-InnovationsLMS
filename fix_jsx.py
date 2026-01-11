#!/usr/bin/env python3
import re

files_to_fix = [
    ("frontend/src/pages/instructor/MyQuestions.jsx", "/instructor/questions", "Back to Questions"),
    ("frontend/src/pages/instructor/StudentProgress.jsx", "/instructor/students", "Back to Students"),
    ("frontend/src/pages/instructor/TestAnalytics.jsx", "/instructor/dashboard", "Back to Dashboard"),
    ("frontend/src/pages/instructor/ManageLessons.jsx", "/instructor/dashboard", "Back to Dashboard"),
]

for filepath, back_link, back_text in files_to_fix:
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Find the orphaned </Link> pattern and replace with proper Link
        # Pattern: lines with just "            </Link>" after <Container>
        pattern = r'(\s+<Container>)\s+</Link>'
        replacement = f'''\\1
            <Link
              to="{back_link}"
              className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {back_text}
            </Link>'''
        
        content = re.sub(pattern, replacement, content)
        
        with open(filepath, 'w') as f:
            f.write(content)
        
        print(f"✓ Fixed {filepath}")
    except Exception as e:
        print(f"✗ Error fixing {filepath}: {e}")

print("\nDone!")
