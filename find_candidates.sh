# Read all target files and generate their @/ paths
while read file; do
    rel_path="${file#easy-locs-ea1eb0ed/src/}"
    path_no_ext="${rel_path%.*}"
    echo "@/${path_no_ext}" >> all_possible_at_paths.txt
    # If index, add the directory as well
    if [[ "$(basename "$file")" == "index.ts" || "$(basename "$file")" == "index.tsx" ]]; then
        dir_path="${path_no_ext%/index}"
        echo "@/${dir_path}" >> all_possible_at_paths.txt
    fi
done < all_target_files.txt

# Now find all @/ paths that are NOT in all_imports.txt
# This is much faster with comm or grep -f
grep "^@/" all_imports.txt | sort -u > all_actual_at_imports.txt
sort -u all_possible_at_paths.txt > all_sorted_at_paths.txt

comm -23 all_sorted_at_paths.txt all_actual_at_imports.txt > missing_at_imports.txt
