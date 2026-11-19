import pathlib, base64
d=pathlib.Path(__file__).parent
page=(d/"src/page.html").read_text()
page=page.replace("/*MOTION_CSS*/",(d/"src/motion.css").read_text()).replace("/*MOTION_JS*/",(d/"src/motion.js").read_text())
photo=next((p for p in [d/"assets/photo.jpg",d/"assets/photo.jpeg",d/"assets/photo.png",d/"assets/photo.webp"] if p.exists()),None)
alt='alt="Portrait d\'Amar Idinarene"'
def slot(src): return f'<div class="frame"><img src="{src}" {alt} width="600" height="750"></div>' if src else '<div class="frame"><span class="mono" aria-hidden="true">AI</span></div>'
mime={"jpg":"jpeg","jpeg":"jpeg","png":"png","webp":"webp"}
art_src = f"data:image/{mime[photo.suffix[1:]]};base64,"+base64.b64encode(photo.read_bytes()).decode() if photo else None
web_src = f"assets/{photo.name}" if photo else None
# artifact version: the publisher wraps it in a document skeleton; images must be inline
(d/"artifact.html").write_text(page.replace("<!--PHOTO-->",slot(art_src)))
# standalone version for GitHub Pages
web=page.replace("<!--PHOTO-->",slot(web_src))
head,rest=web.split("</style>\n\n<header",1)
(d/"index.html").write_text('<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'+head+'</style>\n</head>\n<body style="margin:0">\n<header'+rest+'\n</body>\n</html>\n')
print("built, photo:", photo)
