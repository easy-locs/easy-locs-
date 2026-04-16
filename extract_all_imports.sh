#!/bin/bash
find easy-locs-ea1eb0ed/src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) | while read file; do
  # Match @/ imports
  grep -oE "from ['\"](@/[^'\"]+)['\"]" "$file" | sed -E "s/from ['\"](@\/[^'\"]+)['\"]/\1/" | while read import_path; do
    echo "$file $import_path"
  done
  # Match relative imports
  grep -oE "from ['\"](\.[^'\"]+)['\"]" "$file" | sed -E "s/from ['\"](\.[^'\"]+)['\"]/\1/" | while read import_path; do
    echo "$file $import_path"
  done
done
