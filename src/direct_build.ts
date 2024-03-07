import { booleanLiteral, type Expression, type SpreadElement } from "@babel/types";
import { jsx2ttlPlugin, type JSXElementParentMetadata } from ".";

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

// run with callWithAdditionalArgs
function callWithAdditionalArgsFn(parentData: JSXElementParentMetadata): (SpreadElement | Expression)[]{
  console.log("parentData", parentData);
  switch(parentData.type) {
    case "class":
      if(parentData.interfaces.includes("Component")) {
        return [booleanLiteral(true)];
      }
      return [];
    case "function":
      return [booleanLiteral(true)];
    default:
      return [];
  }
}
const addMoreTemplateArgs = await Bun.build({
  entrypoints: [
    "src/jsx/component_class.tsx",
  ],
  outdir: "out/add_more",
  plugins: [jsx2ttlPlugin({ importName: "Template", importPath: "../ttl", callWithAdditionalArgsFn})],
});

console.log(addMoreTemplateArgs);

