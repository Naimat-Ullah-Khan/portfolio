#!/usr/bin/env python3
"""Convert the self-hosted three.js ES modules into classic (non-module) scripts.

Why: browsers block ES-module scripts on file:// pages, so the 3D background would
not load when index.html is opened by double-click. Classic scripts load fine there.

Input  (verified npm sources, three@0.160.0):
  vendor/three/build/three.module.min.js
  vendor/three/examples/jsm/{postprocessing,shaders}/*.js
Output:
  vendor/three/three.classic.min.js   -> defines window.THREE
  vendor/three/three-addons.classic.js -> defines window.THREE_ADDONS

Usage:  python3 tools/build-three-classic.py   (run from the portfolio folder)
"""
import os
import re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
V = os.path.join(ROOT, "vendor", "three")

# ---------------------------------------------------------------- core
src = open(os.path.join(V, "build", "three.module.min.js"), encoding="utf-8").read()
if re.search(r"\bimport\s*[\s{(*'\"]|import\.meta", src):
    raise SystemExit("three.module.min.js contains imports — converter needs updating")
m = re.search(r"export\s*\{([^}]*)\}\s*;?\s*$", src)
if not m:
    raise SystemExit("could not find the final export clause")
pairs = []
for part in m.group(1).split(","):
    part = part.strip()
    if not part:
        continue
    local, _, exported = part.partition(" as ")
    pairs.append((exported.strip() or local.strip(), local.strip()))
body = src[: m.start()]
obj = ",".join(f"{e}:{l}" for e, l in pairs)
core = (
    "/* three.js r160 (MIT) — converted from three.module.min.js to a classic script by tools/build-three-classic.py */\n"
    "(function(){'use strict';\n" + body + f"\nwindow.THREE=Object.freeze({{{obj}}});\n}})();\n"
)
open(os.path.join(V, "three.classic.min.js"), "w", encoding="utf-8").write(core)

# ---------------------------------------------------------------- addons (dependency order)
ORDER = [
    "postprocessing/Pass.js",
    "shaders/CopyShader.js",
    "postprocessing/ShaderPass.js",
    "postprocessing/MaskPass.js",
    "postprocessing/EffectComposer.js",
    "postprocessing/RenderPass.js",
    "shaders/LuminosityHighPassShader.js",
    "postprocessing/UnrealBloomPass.js",
    "shaders/OutputShader.js",
    "postprocessing/OutputPass.js",
]
out = [
    "/* three.js r160 addons (MIT) — converted to a classic script by tools/build-three-classic.py */",
    "(function(){'use strict';",
    "const ADD = {};",
]
for rel in ORDER:
    code = open(os.path.join(V, "examples", "jsm", rel), encoding="utf-8").read()
    # import { A, B } from 'three'  ->  const { A, B } = THREE;
    code = re.sub(r"import\s*\{([^}]*)\}\s*from\s*'three'\s*;", r"const {\1} = window.THREE;", code)
    # import { A } from './X.js'     ->  const { A } = ADD;
    code = re.sub(r"import\s*\{([^}]*)\}\s*from\s*'\.{1,2}/[^']+'\s*;", r"const {\1} = ADD;", code)
    exports = []
    def grab(mm):
        exports.extend(n.strip() for n in mm.group(1).split(",") if n.strip())
        return ""
    code = re.sub(r"export\s*\{([^}]*)\}\s*;?", grab, code)
    if re.search(r"\bimport\b\s*[{*'\"]|\bexport\b", code):
        raise SystemExit(f"unhandled import/export in {rel}")
    out.append(f"// ---- {rel}\n(function(){{\n{code}\nObject.assign(ADD, {{ {', '.join(exports)} }});\n}})();")
out.append("window.THREE_ADDONS = Object.freeze(ADD);\n})();\n")
open(os.path.join(V, "three-addons.classic.js"), "w", encoding="utf-8").write("\n".join(out))
print("built three.classic.min.js (%d exports) and three-addons.classic.js" % len(pairs))
