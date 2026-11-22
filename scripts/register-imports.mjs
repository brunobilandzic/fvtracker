import { existsSync, readFileSync, statSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { transformSync } from "esbuild";

const root = fileURLToPath(new URL("../", import.meta.url));

registerHooks({
  resolve(specifier, context, next) {
    if (/^next\/(?:server|headers|navigation)$/.test(specifier)) {
      return next(specifier + ".js", context);
    }
    if (context.conditions.includes("require") || context.parentURL?.includes("/node_modules/")) return next(specifier, context);
    if (!specifier.startsWith("@/") &&
        !(specifier.startsWith(".") && context.parentURL?.startsWith("file:"))) {
      return next(specifier, context);
    }

    const path = specifier.startsWith("@/")
      ? resolve(root, specifier.slice(2))
      : resolve(dirname(fileURLToPath(context.parentURL)), specifier);
    const file = [path, path + ".js", resolve(path, "index.js")]
      .find(candidate => existsSync(candidate) && statSync(candidate).isFile());
    return next(file ? pathToFileURL(file).href : specifier, context);
  },
  load(url, context, next) {
    if (!url.startsWith("file:") || url.includes("/node_modules/") || !url.endsWith(".js")) {
      return next(url, context);
    }
    const file = fileURLToPath(url);
    const source = transformSync(readFileSync(file, "utf8"), {
      loader: "jsx",
      jsx: "automatic",
      sourcefile: file,
    }).code;
    return { format: "module", source, shortCircuit: true };
  },
});

