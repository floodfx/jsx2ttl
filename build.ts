const buildOutput = await Bun.build({
  entrypoints: ["src/index.ts"],
  outdir: "dist",
  sourcemap: "external",
  external: ["bun"],
});

console.log(buildOutput);

export { };

