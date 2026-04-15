# Take a list of candidates and check for name imports or relative imports
while read file; do
    base_no_ext=$(basename "$file" | cut -d. -f1)
    # Exclude index files for now as they are tricky
    if [[ "$base_no_ext" == "index" ]]; then
        continue
    fi
    
    # Fast check: grep for the base name in all files in src
    # This might have false positives but we're looking for orphans (not imported)
    # If no file in src (excluding itself) contains "base_no_ext", it's likely orphan
    if ! grep -r "$base_no_ext" easy-locs-ea1eb0ed/src --exclude="$file" --exclude="*.test.*" | grep -q "$base_no_ext"; then
        echo "$file"
    fi
done < all_target_files.txt
