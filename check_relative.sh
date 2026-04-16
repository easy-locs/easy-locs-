#!/bin/bash
find easy-locs-ea1eb0ed/src -type f \( -name "*.ts" -o -name "*.tsx" \) | while read file; do
  dir=$(dirname "$file")
  grep -oE "from ['\"](\.[^'\"]+)['\"]" "$file" | sed -E "s/from ['\"](\.[^'\"]+)['\"]/\1/" | while read import_path; do
    target="$dir/$import_path"
    found=0
    for ext in "" ".ts" ".tsx" ".js" ".jsx" ".png" ".jpg" ".jpeg" ".svg"; do
      if [ -f "$target$ext" ]; then
        found=1
        break
      fi
    done
    if [ $found -eq 0 ]; then
      if [ -d "$target" ]; then
        for ext in "/index.ts" "/index.tsx" "/index.js" "/index.jsx"; do
          if [ -f "$target$ext" ]; then
            found=1
            break
          fi
        done
      fi
    fi
    if [ $found -eq 0 ]; then
      echo "Broken Relative: $file -> $import_path"
    fi
  done
done
