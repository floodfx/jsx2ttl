import { expect, test } from "bun:test";
import { jsx2ttl } from "../parse";

test("processes real .tsx file content directly", async () => {
  const fileContent = await Bun.file("src/jsx/simple_static.tsx").text();
  const output = jsx2ttl(fileContent, {
    importPath: "../ttl",
    importName: "Template"
  });

  expect(output).toContain('new Template(["<img src=\\"/assets/profile.jpg\\" alt=\\"Katherine Johnson\\" />"], [])');
});

test("processes real .jsx file with typescript annotations and fragments", async () => {
  const jsxCode = `
import React from 'react';

interface Props {
  title: string;
  items: string[];
}

export function Component({ title, items }: Props) {
  return (
    <>
      <h2 className="title">{title}</h2>
      <ul>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </>
  );
}
  `;

  const output = jsx2ttl(jsxCode, {
    importPath: "ttl",
    importName: "html",
    mode: "taggedTemplate"
  });

  expect(output).toContain('html`<h2 className="title">${title}</h2>`');
  expect(output).toContain('items.map((item, i) => html`<li key="${i}">${item}</li>`)');
});
