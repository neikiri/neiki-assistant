import os
import re
import shutil
import subprocess
import sys


SRC_DIR = "src"
OUTPUT_DIR = "dist"

CSS_INPUT = os.path.join(SRC_DIR, "styles.css")
JS_INPUT = os.path.join(SRC_DIR, "neiki-assistant.js")
I18N_DIR = os.path.join(SRC_DIR, "i18n")

JS_OUTPUT = os.path.join(OUTPUT_DIR, "neiki-assistant.min.js")
CSS_OUTPUT = os.path.join(OUTPUT_DIR, "neiki-assistant.min.css")
JS_TEMP = os.path.join(OUTPUT_DIR, "neiki-assistant.temp.js")

BANNER = "/* neiki-assistant 1.0.0 | MIT */\n"


def minify_css(css):
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.DOTALL)
    css = re.sub(r"\s+", " ", css)
    css = re.sub(r"\s*([{}:;,>])\s*", r"\1", css)
    css = css.replace(";}", "}")
    return css.strip()


def read(path):
    with open(path, "r", encoding="utf-8") as handle:
        return handle.read()


def write(path, content):
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(content)


def locale_variable(name):
    return re.sub(r"\W", "_", name)


def discover_locale_files():
    return {
        os.path.splitext(filename)[0]: os.path.join(I18N_DIR, filename)
        for filename in sorted(os.listdir(I18N_DIR))
        if filename.endswith(".js")
    }


def extract_locale_constant(name, path):
    content = read(path)
    match = re.search(r"export\s+default\s+(\{[\s\S]*?\});?\s*$", content)
    if not match:
        raise RuntimeError(f"Could not read locale export from {path}")
    return f"const {locale_variable(name)} = {match.group(1)};"


def build_bundle_source(minified_css):
    js = read(JS_INPUT)
    js = re.sub(r"^\s*import\s+.+?;\s*\n", "", js, flags=re.MULTILINE)
    js = re.sub(r"^\s*export\s+default\s+\w+\s*;\s*$", "", js, flags=re.MULTILINE)

    marker = "\n".join([
        "// ====================================",
        "// NEIKI-ASSISTANT / CSS-INJECT",
        "// ====================================",
        "let NEIKI_ASSISTANT_CSS = '';",
        "// ====================================",
        "// END CSS-INJECT",
        "// ====================================",
    ])
    escaped_css = minified_css.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")
    if marker not in js:
        raise RuntimeError("Could not find CSS injection marker in src/neiki-assistant.js")
    js = js.replace(marker, f"let NEIKI_ASSISTANT_CSS = `{escaped_css}`;")

    js = re.sub(
        r"const cssReady = NEIKI_ASSISTANT_CSS[\s\S]*?catch\(\(\) => ''\);",
        "const cssReady = Promise.resolve(NEIKI_ASSISTANT_CSS);",
        js,
        count=1,
    )

    locale_files = discover_locale_files()
    locales = "\n".join(extract_locale_constant(name, path) for name, path in locale_files.items())
    locale_map = ", ".join(f"'{name}': {locale_variable(name)}" for name in locale_files)
    js = re.sub(r"const LOCALES\s*=\s*\{[^}]+\};", f"const LOCALES = {{ {locale_map} }};", js, count=1)
    return f"{BANNER}(function(){{\n'use strict';\n{locales}\n{js}\n}})();\n"


def minify_js(temp_path, output_path):
    npx = r"C:\Program Files\nodejs\npx.cmd" if sys.platform == "win32" else shutil.which("npx")
    if not npx:
        write(output_path, read(temp_path))
        print("npx was not found; wrote an unminified bundle.")
        return

    try:
        subprocess.run(
            [npx, "terser", temp_path, "-o", output_path, "--compress", "--mangle"],
            check=True,
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        write(output_path, read(temp_path))
        print("terser failed; wrote an unminified bundle.")


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("Minifying CSS...")
    minified_css = minify_css(read(CSS_INPUT))
    write(CSS_OUTPUT, minified_css)

    print("Building JavaScript bundle...")
    bundle_source = build_bundle_source(minified_css)
    write(JS_TEMP, bundle_source)

    print("Minifying JavaScript...")
    minify_js(JS_TEMP, JS_OUTPUT)
    os.remove(JS_TEMP)

    output = read(JS_OUTPUT)
    if not output.startswith("/* neiki-assistant"):
        write(JS_OUTPUT, BANNER + output)

    print("\nDONE")
    print(f"CSS: {CSS_OUTPUT}")
    print(f"JS:  {JS_OUTPUT}")


if __name__ == "__main__":
    main()
