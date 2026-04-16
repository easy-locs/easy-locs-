#!/bin/bash
find easy-locs-ea1eb0ed/src -type f \( -name "*.ts" -o -name "*.tsx" \) | while read file; do
  grep -oP "from ['\"](@/[^'\"]+)['\"]" "$file" | sed -E "s/from ['\"](@\/[^'\"]+)['\"]/\1/" | while read import_path; do
    echo "$file $import_path"
  done
done
