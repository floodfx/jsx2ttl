import { expect, test } from "bun:test";
import { jsx2ttlPlugin } from "../plugin/jsx2ttl_plugin";

test("jsx2ttlPlugin works seamlessly with Bun.build", async () => {
  const result = await Bun.build({
    entrypoints: ["src/jsx/simple_static.tsx"],
    outdir: "out/test_bun_build",
    plugins: [
      jsx2ttlPlugin({
        importName: "Template",
        importPath: "../ttl",
        mode: "constructor"
      })
    ]
  });

  expect(result.success).toBe(true);
  expect(result.outputs.length).toBeGreaterThan(0);

  const outputFile = Bun.file("out/test_bun_build/simple_static.js");
  const outputText = await outputFile.text();

  expect(outputText).toContain("Template");
  expect(outputText).toContain("/assets/profile.jpg");
});
