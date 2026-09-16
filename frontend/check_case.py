import os
import re
import glob

def check_imports():
    root_dir = "src"
    ts_files = glob.glob(f"{root_dir}/**/*.{'{ts,tsx}'}", recursive=True)
    # glob doesn't support {} in python 3 by default if we don't use glob2 or pathlib
    
    import pathlib
    ts_files = list(pathlib.Path(root_dir).rglob("*.ts")) + list(pathlib.Path(root_dir).rglob("*.tsx"))
    
    import_pattern = re.compile(r'import\s+.*?\s+from\s+[\'"]([^\'"]+)[\'"]')
    dynamic_import_pattern = re.compile(r'import\([\'"]([^\'"]+)[\'"]\)')
    
    errors = 0
    for file_path in ts_files:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        imports = import_pattern.findall(content) + dynamic_import_pattern.findall(content)
        
        for imp in imports:
            if imp.startswith('.') or imp.startswith('@/'):
                # Resolve the path
                if imp.startswith('@/'):
                    imp_path = imp.replace('@/', 'src/')
                else:
                    imp_path = os.path.normpath(os.path.join(os.path.dirname(file_path), imp))
                
                # Check if it exists exactly
                # We need to find the file with exact case
                # Let's check common extensions
                found = False
                for ext in ['', '.ts', '.tsx', '.js', '.jsx', '.css', '.png', '/index.ts', '/index.tsx']:
                    target = imp_path + ext
                    # Check if file exists (case-insensitive on mac)
                    if os.path.exists(target):
                        # Now check if case matches exactly
                        real_path = os.path.realpath(target)
                        # os.path.realpath on Mac sometimes returns the case that was used to access it, not the actual file system case.
                        # The safest way is to list the directory and check if the basename is in the list exactly.
                        dir_name = os.path.dirname(target)
                        base_name = os.path.basename(target)
                        if os.path.exists(dir_name):
                            actual_files = os.listdir(dir_name)
                            if base_name in actual_files:
                                found = True
                                break
                            elif base_name.lower() in [f.lower() for f in actual_files]:
                                actual_case = [f for f in actual_files if f.lower() == base_name.lower()][0]
                                print(f"Case mismatch in {file_path}: imported '{imp}' but file is '{actual_case}'")
                                errors += 1
                                found = True
                                break
                
    if errors == 0:
        print("No case mismatches found!")
        
check_imports()
