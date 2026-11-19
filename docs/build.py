import pathlib
d=pathlib.Path(__file__).parent
page=(d/"src/page.html").read_text()
page=page.replace("/*MOTION_CSS*/",(d/"src/motion.css").read_text()).replace("/*MOTION_JS*/",(d/"src/motion.js").read_text())
# artifact version: the publisher wraps it in a document skeleton
(d/"artifact.html").write_text(page)
# standalone version for GitHub Pages
head,rest=page.split("</style>\n\n<header",1)
(d/"index.html").write_text('<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'+head+'</style>\n</head>\n<body style="margin:0">\n<header'+rest+'\n</body>\n</html>\n')
print("built")
