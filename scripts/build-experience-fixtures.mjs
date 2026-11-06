// Bundle real React components with explicit synthetic I/O boundaries.
// No application environment file or service credentials are loaded.
import fs from "node:fs/promises";
import path from "node:path";
import esbuild from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
const root = process.cwd(),
  dir = path.join(root, "docs/experience-implementation/browser"),
  out = path.join(dir, "build");
await fs.mkdir(out, { recursive: true });
const names = new Set();
const mocked =
  /^(?:@\/lib\/(?:hooks\/|actions\/|supabase\/client)|next\/navigation|next-themes)/;
async function walk(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory() && !["__tests__"].includes(entry.name))
      await walk(file);
    else if (/\.tsx?$/.test(file)) {
      const source = await fs.readFile(file, "utf8");
      for (const match of source.matchAll(
        /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/gs,
      )) {
        if (mocked.test(match[2]))
          for (const part of match[1].split(",")) {
            const name = part
              .trim()
              .replace(/^type\s+/, "")
              .split(/\s+as\s+/)[0]
              .trim();
            if (/^[a-zA-Z_$][\w$]*$/.test(name)) names.add(name);
          }
      }
    }
  }
}
await walk(path.join(root, "app"));
await walk(path.join(root, "components"));
await walk(path.join(root, "lib/services"));
await fs.writeFile(
  path.join(out, "mocks.jsx"),
  `import {mock} from '../runtime';\n${[...names].map((name) => `export const ${name}=(...args)=>mock('${name}',args);`).join("\n")}\n`,
);
const plugin = {
  name: "synthetic-boundaries",
  setup(build) {
    build.onResolve({ filter: /.*/ }, async (args) => {
      if (mocked.test(args.path)) return { path: path.join(out, "mocks.jsx") };
      if (args.path === "next/image")
        return { path: path.join(dir, "image.jsx") };
      if (args.path === "next/link")
        return { path: path.join(dir, "link.jsx") };
      // Use the real filter/uploader components without Next's dynamic loader.
      if (args.path === "@/components/dynamic/wardrobe-search-filters-dynamic")
        return { path: path.join(out, "filters.jsx") };
      if (args.path === "@/components/dynamic/image-upload-dynamic")
        return { path: path.join(out, "upload.jsx") };
      if (args.path.startsWith("@/"))
        for (const suffix of ["", ".tsx", ".ts", "/index.ts", "/index.tsx"]) {
          const file = path.join(root, args.path.slice(2)) + suffix;
          try {
            if ((await fs.stat(file)).isFile()) return { path: file };
          } catch {}
        }
    });
  },
};
await fs.writeFile(
  path.join(out, "filters.jsx"),
  "export {WardrobeSearchFilters as WardrobeSearchFiltersWithErrorBoundary} from '@/components/wardrobe-search-filters';",
);
await fs.writeFile(
  path.join(out, "upload.jsx"),
  "export {ImageUpload as ImageUploadWithErrorBoundary} from '@/components/image-upload';",
);
await esbuild.build({
  entryPoints: [path.join(dir, "entry.jsx")],
  bundle: true,
  format: "esm",
  outfile: path.join(out, "review.js"),
  jsx: "automatic",
  plugins: [plugin],
  define: { "process.env.NODE_ENV": '"development"', "process.env": "{}" },
  logLevel: "warning",
});
const css = await postcss([tailwind()]).process(
  await fs.readFile("app/globals.css", "utf8"),
  { from: path.join(root, "app/globals.css") },
);
await fs.writeFile(path.join(out, "review.css"), css.css);
await fs.copyFile(
  "public/clothing-image-options.json",
  path.join(out, "clothing-image-options.json"),
);
console.log(
  "Real-component fixture build ready. All backend and paid AI I/O is synthetic.",
);
