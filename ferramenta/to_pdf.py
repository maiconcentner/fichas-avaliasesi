import asyncio, sys, os
from playwright.async_api import async_playwright
async def _go(html_path, pdf_path):
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page()
        await pg.goto('file://' + os.path.abspath(html_path))
        await pg.evaluate('document.fonts.ready')
        await pg.pdf(path=pdf_path, width='1122.56px', height='793.28px', print_background=True, prefer_css_page_size=True)
        await b.close()
def html_to_pdf(html_path, pdf_path): asyncio.run(_go(html_path, pdf_path))
async def _go2(h, p, w, hh):
    async with async_playwright() as pw:
        b = await pw.chromium.launch(); pg = await b.new_page()
        await pg.goto('file://' + os.path.abspath(h)); await pg.evaluate('document.fonts.ready')
        await pg.pdf(path=p, width=f'{w}px', height=f'{hh}px', print_background=True, prefer_css_page_size=True)
        await b.close()
def html_to_pdf_size(h, p, w, hh): asyncio.run(_go2(h, p, w, hh))
if __name__ == '__main__': html_to_pdf(sys.argv[1], sys.argv[2])
