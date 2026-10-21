// Node 24 synchronous hooks: run TypeScript maintenance scripts without a bundler process.
import { registerHooks } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import ts from "typescript";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
registerHooks({
  resolve(specifier, context, nextResolve) {
    let candidate;
    if (specifier.startsWith("@/"))
      candidate = path.join(root, "src", specifier.slice(2));
    else if (
      specifier.startsWith(".") &&
      context.parentURL?.startsWith("file:")
    )
      candidate = fileURLToPath(new URL(specifier, context.parentURL));
    if (candidate) {
      for (const extension of ["", ".ts", ".tsx", "/index.ts"])
        if (
          existsSync(candidate + extension) &&
          /\.[cm]?[jt]sx?$/.test(candidate + extension)
        )
          return {
            url: pathToFileURL(candidate + extension).href,
            shortCircuit: true,
          };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (
      url.startsWith("file:") &&
      /\.tsx?$/.test(url) &&
      !url.includes("/node_modules/")
    ) {
      const source = ts.transpileModule(
        readFileSync(fileURLToPath(url), "utf8"),
        {
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
            jsx: ts.JsxEmit.ReactJSX,
          },
        },
      ).outputText;
      return { format: "module", source, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
