# Naimat Ullah Khan — Portfolio

Static portfolio site with a three.js background, GSAP animations and Lenis smooth scrolling.
No build step and no runtime dependencies on external CDNs.

## Preview locally
Double-click `index.html` — everything, including the 3D background, works from disk.
Or serve it: `python3 -m http.server 8000` and open http://localhost:8000

## Edit content
* Projects, industries, skills — `js/data.js`
* Headline, sections, contact links — `index.html`
* 3D scene look — `js/scene.js`

## Security
See [SECURITY.md](SECURITY.md).

three.js is shipped as classic scripts built from the verified npm sources: `python3 tools/build-three-classic.py`.
