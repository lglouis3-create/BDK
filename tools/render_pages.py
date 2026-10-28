"""Render the BDK PDF's pages 2-27 to pages/p<n>.webp for the List tab's "PDF pages" view.

Usage: python3 tools/render_pages.py <BDK.pdf> [out_dir=pages]
Needs pdftoppm (poppler-utils) and Pillow with WebP support. Each page is rendered at 150 dpi,
the white margins are trimmed (24 px kept), and it is saved as WebP quality 82. The image sizes
used by the page are printed as a PAGE_IMG map for assets/app.js.
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageOps

pdf, out = Path(sys.argv[1]), Path(sys.argv[2] if len(sys.argv) > 2 else 'pages')
out.mkdir(exist_ok=True)
dims = {}
with tempfile.TemporaryDirectory() as tmp:
    subprocess.run(['pdftoppm', '-r', '150', '-f', '2', '-l', '27', '-png', str(pdf), f'{tmp}/p'], check=True)
    for png in sorted(Path(tmp).glob('p-*.png')):
        n = int(png.stem.split('-')[1])
        im = Image.open(png).convert('RGB')
        box = ImageOps.invert(im.convert('L')).point(lambda v: 255 if v > 20 else 0).getbbox()
        pad = 24
        im = im.crop((max(0, box[0] - pad), max(0, box[1] - pad), min(im.width, box[2] + pad), min(im.height, box[3] + pad)))
        im.save(out / f'p{n}.webp', 'WEBP', quality=82, method=6)
        dims[n] = list(im.size)
print('const PAGE_IMG = ' + json.dumps(dims, separators=(',', ':')) + ';')
