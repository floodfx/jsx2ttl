import { expect, test } from "bun:test";
import { transformSync } from "@babel/core";
import { babelPluginJsx2Ttl } from "../plugin/babel_plugin";

test("babelPluginJsx2Ttl transforms JSX in standard Babel pipeline (taggedTemplate mode)", () => {
  const code = `
    export function Header(props: { title: string }) {
      return <header className="hero"><h1>{props.title}</h1></header>;
    }
  `;

  const result = transformSync(code, {
    filename: "Header.tsx",
    presets: ["@babel/preset-typescript"],
    plugins: [
      [
        babelPluginJsx2Ttl,
        {
          importPath: "jsx2ttl/ttl",
          importName: "html",
          mode: "taggedTemplate"
        }
      ]
    ]
  });

  expect(result?.code).toContain('import { html } from "jsx2ttl/ttl";');
  expect(result?.code).toContain('html`<header className="hero">${html`<h1>${props.title}</h1>`}</header>`');
});

test("babelPluginJsx2Ttl transforms JSX in constructor mode", () => {
  const code = `
    export function Button(props: { label: string }) {
      return <button type="button">{props.label}</button>;
    }
  `;

  const result = transformSync(code, {
    filename: "Button.tsx",
    presets: ["@babel/preset-typescript"],
    plugins: [
      [
        babelPluginJsx2Ttl,
        {
          importPath: "jsx2ttl/ttl",
          importName: "Template",
          mode: "constructor"
        }
      ]
    ]
  });

  expect(result?.code).toContain('import { Template } from "jsx2ttl/ttl";');
  expect(result?.code).toContain('new Template(["<button type=\\"button\\">", "</button>"], [props.label])');
});
