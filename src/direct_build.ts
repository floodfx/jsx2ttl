import { booleanLiteral, stringLiteral, type Expression, type JSXAttribute, type SpreadElement } from "@babel/types";
import { Jsx2TtlError, jsx2ttlPlugin, type JSXElementParentMetadata } from ".";

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

// add attributeTransforms
function transformAttribute(attribute: JSXAttribute): JSXAttribute {
  const name = attribute.name.name;  
  if(name === "className") {
    console.log("className", attribute);
    return {
      ...attribute,
      name: {
        ...attribute.name,
        name: "class"
      }
    } as JSXAttribute
  } else if(name === "style") {
    console.log("style", attribute);
    // if value is an object convert to css style string
    // transforming camelCase to kebab-case
    switch(attribute.value?.type) {
      case "JSXExpressionContainer":
        const expression = attribute.value.expression;
        if(expression.type === "ObjectExpression") {
          
          // transform key/value pairs to css style string
          const properties = expression.properties.map((prop) => {
            if(prop.type !== "ObjectProperty") {
              throw new Jsx2TtlError("style object must have key value pairs", prop);
            }
            console.log("key", prop.key, "value", prop.value)
            let key = "";
            let value;
            switch(prop.key.type) {
              case "Identifier":
                key = prop.key.name;
                break;
              case "StringLiteral":
                key = prop.key.value;
                break;
              default:
                throw new Jsx2TtlError("style object keys must be string or identifier", prop.key);
            }
            switch(prop.value.type) {
              case "StringLiteral":
              case "NumericLiteral":
              case "BooleanLiteral":              
                value = prop.value.value;
              break;
              case "TemplateLiteral":
                value = prop.value.quasis[0].value.raw;
                break;
              case "Identifier":
                value = prop.value.name;
                break;
              default:
                throw new Jsx2TtlError("unsupported style value type", prop.value);
            }
            return `${key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}: ${value};`
          });
          return {
            ...attribute,
            value: stringLiteral(properties.join(" "))
          }
        }
        break;
      default:
        return attribute;
    }
  }
  
  return attribute;
}

const attrTransformBuild = await Bun.build({
  entrypoints: [
    "src/jsx/transform_attributes.tsx",
  ],
  outdir: "out/transform_attr",
  plugins: [jsx2ttlPlugin({ importName: "Template", importPath: "../ttl", transformAttribute})],
});

console.log(attrTransformBuild);
