import { jsx2ttlPlugin } from ".";

console.log("starting...")

const out = await Bun.build({
  entrypoints: [
    "src/jsx/simple_class.tsx", 
    "src/jsx/simple_static.tsx",
    "src/jsx/nested_props.tsx", 
    "src/jsx/inherits_class.tsx", 
    "src/jsx/nested_classes",
    "src/jsx/implements_class.tsx",
  ],
  outdir: "out/template",
  plugins: [jsx2ttlPlugin({ importName: "Template", importPath: "../ttl"})],
});

console.log(out);

const otherTTLOut = await Bun.build({
  entrypoints: [
    "src/jsx/simple_class.tsx",
  ],
  outdir: "out/myttl",
  plugins: [jsx2ttlPlugin({ importName: "myttl", importPath: "../ttl/myttl", callWithoutNew: true, isDefaultImport: true})],
});

console.log(otherTTLOut);

