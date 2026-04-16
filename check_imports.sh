#!/bin/bash
BASE_DIR="easy-locs-ea1eb0ed/src"
while read -r line; do
  # Remove leading @/
  rel_path=${line#@/}
  
  found=0
  # Check for direct file match (.ts, .tsx, .js, .jsx, .png, .jpg)
  for ext in "" ".ts" ".tsx" ".js" ".jsx" ".png" ".jpg"; do
    if [ -f "$BASE_DIR/$rel_path$ext" ]; then
      found=1
      break
    fi
  done
  
  # Check for index files if it's a directory
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
done < all_at_imports.txt
