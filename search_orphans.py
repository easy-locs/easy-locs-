import os
import subprocess

with open('all_target_files.txt', 'r') as f:
    files = [line.strip() for line in f]

orphans = []
for file in files:
    # Get the base name without extension
    # e.g. easy-locs-ea1eb0ed/src/components/actions/UniversalActionButtons.tsx
    # -> UniversalActionButtons
    rel_path = file.replace('easy-locs-ea1eb0ed/src/', '')
    base_name = os.path.basename(file).split('.')[0]
    
    # Check for direct import of the file name
    # We search for the base_name in all files in src
    # This might have false positives if names are common (e.g. "Button")
    # Better: Search for the relative path if it's imported via @/
    # @/components/actions/UniversalActionButtons
    path_no_ext = rel_path.rsplit('.', 1)[0]
    
    # Search for occurrences of path_no_ext in src
    # We use grep to find if ANY file imports this path
    # We exclude the file itself from the search
    cmd = ["grep", "-r", path_no_ext, "easy-locs-ea1eb0ed/src"]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        # Filter out matches from the file itself
        matches = [m for m in result.stdout.split('\n') if m and not m.startswith(file)]
        if not matches:
            # Also check for index.ts/tsx exports
            # If it's an index file, we need to check if the directory is imported
            if base_name == "index":
                dir_path = os.path.dirname(path_no_ext)
                cmd_dir = ["grep", "-r", dir_path, "easy-locs-ea1eb0ed/src"]
                result_dir = subprocess.run(cmd_dir, capture_output=True, text=True)
                matches_dir = [m for m in result_dir.stdout.split('\n') if m and not m.startswith(file) and not m.startswith(os.path.dirname(file))]
                if not matches_dir:
                    orphans.append(file)
            else:
                orphans.append(file)
    except Exception as e:
        pass

for orphan in orphans:
    print(orphan)
