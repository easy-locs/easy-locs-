#!/bin/bash
BASE_DIR="easy-locs-ea1eb0ed/src"
while read -r line; do
  rel_path=${line#@/}
  found=0
  for ext in "" ".ts" ".tsx" ".js" ".jsx" ".png" ".jpg" ".jpeg" ".svg"; do
    if [ -f "$BASE_DIR/$rel_path$ext" ]; then
      found=1
      break
    fi
  done
  if [ $found -eq 0 ]; then
    if [ -d "$BASE_DIR/$rel_path" ]; then
      for ext in "/index.ts" "/index.tsx" "/index.js" "/index.jsx"; do
        if [ -f "$BASE_DIR/$rel_path$ext" ]; then
          found=1
          break
        fi
      done
    fi
  fi
  if [ $found -eq 0 ]; then
    echo "Broken: $line"
  fi
done < all_at_imports_v2.txt
