grep -rE "^import.*from.*['\"]" easy-locs-ea1eb0ed/src | sed -E "s/.*from.*['\"](.*)['\"]/\1/" | sort -u > all_imported_paths.txt

while read file; do
    # Remove prefix
    rel_path="${file#easy-locs-ea1eb0ed/src/}"
    # Remove extension
    path_no_ext="${rel_path%.*}"
    # Convert to alias format
    alias_path="@/${path_no_ext}"
    
    # Check if this alias_path or rel_path is in all_imported_paths.txt
    # We also need to handle relative imports like "./MyComponent" or "../../MyComponent"
    # This is trickier... let's check for the base name if it's unique
    base_name=$(basename "$file" | cut -d. -f1)
    
    if ! grep -q -F "$alias_path" all_imported_paths.txt; then
        # Check if it's imported as a base name in some file (not the file itself)
        # This is very slow for each file...
        echo "$file"
    fi
done < all_target_files.txt
