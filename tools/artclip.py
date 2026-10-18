import pymupdf as f, sys, os, json
from PIL import Image, ImageOps
spec=json.load(open(sys.argv[1])); out=sys.argv[2]; os.makedirs(out,exist_ok=True)
def trim(im):
    diff=ImageOps.invert(ImageOps.grayscale(im)).point(lambda v:255 if v>25 else 0)
    bb=diff.getbbox(); return im.crop(bb) if bb else im
for name,(pdf,pidx,xref,mode) in spec.items():
    d=f.open(pdf); pg=d[pidx]
    if mode=='raw':
        pix=f.Pixmap(d,xref)
        if pix.n-pix.alpha>3: pix=f.Pixmap(f.csRGB,pix)
        im=Image.frombytes('L' if pix.n==1 else 'RGB',(pix.width,pix.height),pix.samples)
    else:
        r=pg.get_image_rects(xref)[0] & pg.rect
        for x in pg.get_images(full=True):
            if x[0]!=xref:
                try: pg.delete_image(x[0])
                except Exception as e: pass
        for b in pg.get_text('words'): pg.add_redact_annot(f.Rect(b[:4]))
        pg.apply_redactions(images=f.PDF_REDACT_IMAGE_NONE, graphics=f.PDF_REDACT_LINE_ART_NONE)
        # remove vector drawings too: render only image via clip after removing drawings not possible; accept
        pix=pg.get_pixmap(clip=r,dpi=200)
        im=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
    im=trim(im.convert('RGB')); im.thumbnail((600,900)); im.save(f'{out}/{name}.webp','WEBP',quality=82)
    print(name, im.size)
