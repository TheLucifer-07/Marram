import sys
from PIL import Image
# usage: sheet.py out.png width_per_cell cols file1 file2 ...
out, w, cols, files = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4:]
ims = []
for f in files:
    im = Image.open(f).convert('RGB'); r = w / im.width; ims.append(im.resize((w, max(1, int(im.height * r)))))
rows = [ims[i:i+cols] for i in range(0, len(ims), cols)]
H = sum(max(i.height for i in r) + 8 for r in rows); W = cols * (w + 8)
sheet = Image.new('RGB', (W, H), (120, 120, 120)); y = 0
for r in rows:
    for c, im in enumerate(r): sheet.paste(im, (c * (w + 8), y))
    y += max(i.height for i in r) + 8
sheet.save(out)
print(out, sheet.size)
