import { expect, test } from "bun:test";
import { jsx2ttl } from "../parse";

test("jsx2ttl - mode: taggedTemplate generates actual tagged template literals", () => {
  const jsx = `
export function Welcome(props) {
  return <div className="card">Hello {props.name}!</div>;
}
  `;

  const output = jsx2ttl(jsx, {
    importPath: "ttl",
    importName: "html",
    mode: "taggedTemplate"
  });

  expect(output).toContain('import { html } from "ttl";');
  expect(output).toContain('html`<div className="card">Hello ${props.name}!</div>`');
});

test("jsx2ttl - handles JSX Fragments (<></>)", () => {
  const jsx = `
export function List() {
  return (
    <>
      <span>Item 1</span>
      <span>Item 2</span>
    </>
  );
}
  `;

  const output = jsx2ttl(jsx, {
    importPath: "../ttl",
    importName: "Template"
  });

  expect(output).toContain('new Template(["<span>Item 1</span>"], [])');
  expect(output).toContain('new Template(["<span>Item 2</span>"], [])');
});

test("jsx2ttl - passes children as props to component calls", () => {
  const jsx = `
function Card(props) {
  return <div className="card">{props.children}</div>;
}

export function App() {
  return <Card><h1>Title</h1></Card>;
}
  `;

  const output = jsx2ttl(jsx, {
    importPath: "../ttl",
    importName: "Template"
  });

  expect(output).toContain('Card({\n    children: new Template(["<h1>Title</h1>"], [])\n  })');
});

test("jsx2ttl - handles JSXSpreadAttribute without throwing statics/dynamics error", () => {
  const jsx = `
export function Button(props) {
  return <button {...props} className="btn">Click me</button>;
}
  `;

  const output = jsx2ttl(jsx, {
    importPath: "../ttl",
    importName: "Template"
  });

  expect(output).toContain('props');
  expect(output).toContain('className=\\"btn\\">Click me</button>');
});

test("jsx2ttl - handles boolean shorthand attributes", () => {
  const jsx = `
export function Checkbox() {
  return <input type="checkbox" disabled checked={true} />;
}
  `;

  const output = jsx2ttl(jsx, {
    importPath: "../ttl",
    importName: "Template"
  });

  expect(output).toContain('disabled');
  expect(output).toContain('checked=\\"');
});

test("jsx2ttl - mode: function generates call without new", () => {
  const jsx = `
export function App() {
  return <div>Hello world</div>;
}
  `;

  const output = jsx2ttl(jsx, {
    importPath: "../ttl",
    importName: "html",
    mode: "function"
  });

  expect(output).toContain('html(["<div>Hello world</div>"], [])');
});
