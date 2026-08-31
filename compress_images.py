#!/usr/bin/env python3
import os
import sys
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    print("Installing Pillow...")
    os.system(f"{sys.executable} -m pip install pillow")
    from PIL import Image, ImageOps

def optimize_image(filepath, max_dimension=1600, quality=82):
    path = Path(filepath)
    orig_size = path.stat().st_size
    ext = path.suffix.lower()

    if ext not in ['.jpg', '.jpeg', '.png', '.webp']:
        return

    try:
        with Image.open(path) as img:
            try:
                img = ImageOps.exif_transpose(img)
            except Exception:
                pass

            orig_w, orig_h = img.size
            if orig_w > max_dimension or orig_h > max_dimension:
                img.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)

            if ext in ['.jpg', '.jpeg']:
                if img.mode in ('RGBA', 'P', 'LA'):
                    img = img.convert('RGB')
                img.save(path, 'JPEG', quality=quality, optimize=True, progressive=True)
            elif ext == '.png':
                if 'favicon' in path.name.lower():
                    if img.size[0] > 128 or img.size[1] > 128:
                        img.thumbnail((128, 128), Image.Resampling.LANCZOS)
                    img.save(path, 'PNG', optimize=True)
                else:
                    img.save(path, 'PNG', optimize=True)
            elif ext == '.webp':
                img.save(path, 'WEBP', quality=quality, method=6)

        new_size = path.stat().st_size
        saved = orig_size - new_size
        percent = (saved / orig_size) * 100 if orig_size > 0 else 0
        print(f"[OK] {path.name:<24} {orig_size/1024:>7.1f} KB -> {new_size/1024:>7.1f} KB (-{percent:>4.1f}%)")
    except Exception as e:
        print(f"[ERR] Error processing {path.name}: {e}")

def main():
    root_dir = Path(__file__).resolve().parent
    folders_to_scan = [root_dir / 'img', root_dir / 'images']
    total_before = 0
    total_after = 0

    print("=" * 60)
    print("  DROGLA - Ultra Image Compression & Speed Optimizer")
    print("=" * 60)

    for folder in folders_to_scan:
        if not folder.exists():
            continue
        print(f"\nScanning: {folder.name}/")
        for file in folder.rglob('*'):
            if file.is_file() and file.suffix.lower() in ['.jpg', '.jpeg', '.png', '.webp']:
                before = file.stat().st_size
                total_before += before
                optimize_image(file)
                after = file.stat().st_size
                total_after += after

    saved_total = total_before - total_after
    saved_percent = (saved_total / total_before) * 100 if total_before > 0 else 0

    print("\n" + "=" * 60)
    print(f"Total size before : {total_before / 1024:.1f} KB")
    print(f"Total size after  : {total_after / 1024:.1f} KB")
    print(f"Total bandwidth saved: {saved_total / 1024:.1f} KB ({saved_percent:.1f}% reduction)")
    print("=" * 60)

if __name__ == '__main__':
    main()
