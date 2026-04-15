# Extract all imports from the codebase
# Handle both @/ and relative imports
grep -rE "^import.*from.*['\"]" easy-locs-ea1eb0ed/src | sed -E "s/.*from.*['\"](.*)['\"]/\1/" | sort -u > all_imported_raw.txt

# Extract ALL paths that are imported
# E.g. @/components/Button
# E.g. ./MyComponent
# E.g. ../../lib/utils
# E.g. lucide-react (ignore)

# Get all target files in src
# E.g. easy-locs-ea1eb0ed/src/components/Button.tsx
# Convert to:
# 1. @/components/Button
# 2. components/Button
# 3. /Button.tsx (for base name check)

# Create a list of all possible ways to refer to each file
# and see if ANY of them are present in all_imported_raw.txt

while read file; do
    rel_path="${file#easy-locs-ea1eb0ed/src/}"
    path_no_ext="${rel_path%.*}"
    base_name=$(basename "$file")
    base_no_ext="${base_name%.*}"
    
    # Check if @/path/to/file is in all_imported_raw.txt
    if grep -q "@/${path_no_ext}$" all_imported_raw.txt; then
        continue
    fi
    
    # Check if rel_path is in all_imported_raw.txt
    if grep -q "${path_no_ext}$" all_imported_raw.txt; then
        continue
    fi
    
    # If it's an index.ts file, check if the directory is imported
    if [[ "$base_no_ext" == "index" ]]; then
        dir_path="${path_no_ext%/index}"
        if grep -q "@/${dir_path}$" all_imported_raw.txt; then
            continue
        fi
        if grep -q "${dir_path}$" all_imported_raw.txt; then
            continue
        fi
    fi
    
    # Check if it's imported as a base name
    # We do a grep across the whole src directory to find occurrences of the file name
    # but excluding the file itself and comments.
    # This is slightly slow but more accurate.
    if ! grep -r "$base_no_ext" easy-locs-ea1eb0ed/src --exclude="$file" | grep -vE "import|from" | grep -q "$base_no_ext"; then
         # This grep is to find if it's imported by NAME or just mentioned.
         # Actually let's just grep for the import statement.
         if ! grep -r "import.*$base_no_ext" easy-locs-ea1eb0ed/src --exclude="$file" | grep -q "import"; then
             echo "$file"
         fi
    fi
done < all_target_files.txt
