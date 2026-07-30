import { expect, test } from "bun:test";
import { jsx2ttl } from "../parse";

test("corner case - member expression components (<UI.Modal.Header />)", () => {
  const jsx = `
export function Page() {
  return <UI.Modal.Header title="Welcome" />;
}
  `;

  const output = jsx2ttl(jsx, {
    importPath: "ttl",
    importName: "Template"
  });

  expect(output).toContain('UI.Modal.Header({\n    title: "Welcome"\n  })');
});

test("corner case - JSX element as attribute value (<Tooltip content={<Help />} />)", () => {
  const jsx = `
function Help() {
  return <span>Need help?</span>;
}

export function Button() {
  return <Tooltip content={<Help />}>Hover me</Tooltip>;
}
  `;

  const output = jsx2ttl(jsx, {
    importPath: "ttl",
    importName: "Template"
  });

  expect(output).toContain('content: Help({})');
  expect(output).toContain('Tooltip({\n    content: Help({}),\n    children: "Hover me"\n  })');
});

test("corner case - static string with backticks, ${}, and special characters in taggedTemplate mode", () => {
  const jsx = `
export function Special() {
  return <div data-expr="price is \${10} & \`free\`">Special text</div>;
}
  `;

  const output = jsx2ttl(jsx, {
    importPath: "ttl",
    importName: "html",
    mode: "taggedTemplate"
  });

  expect(output).toContain('html`<div data-expr="price is \\${10} & \\`free\\`">Special text</div>`');
});

test("corner case - multiple spread attributes interspersed with regular attributes", () => {
  const jsx = `
export function Card(props1, props2) {
  return <div id="card-1" {...props1} className="active" {...props2} data-role="main">Card Content</div>;
}
  `;

  const output = jsx2ttl(jsx, {
    importPath: "ttl",
    importName: "Template"
  });

  expect(output).toContain('new Template(["<div id=\\"card-1\\" ", " className=\\"active\\" ", " data-role=\\"main\\">Card Content</div>"], [props1, props2])');
});

test("corner case - arrow function concise body without explicit return", () => {
  const jsx = `
export const Item = ({ text }) => <li>{text}</li>;
  `;

  const output = jsx2ttl(jsx, {
    importPath: "ttl",
    importName: "Template"
  });

  expect(output).toContain('=> new Template(["<li>", "</li>"], [text])');
});

test("corner case - class property initializer arrow function", () => {
  const jsx = `
export class Header {
  renderTitle = () => <h1>My Title</h1>;
}
  `;

  const output = jsx2ttl(jsx, {
    importPath: "ttl",
    importName: "Template"
  });

  expect(output).toContain('renderTitle = () => new Template(["<h1>My Title</h1>"], []);');
});

test("corner case - map callback rendering list of elements", () => {
  const jsx = `
export function List({ items }) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
  `;

  const output = jsx2ttl(jsx, {
    importPath: "ttl",
    importName: "Template"
  });

  expect(output).toContain('items.map((item, index) => new Template(["<li key=\\"", "\\">", "</li>"], [index, item]))');
});

test("corner case - ternary conditional and logical AND rendering", () => {
  const jsx = `
export function Dashboard({ isLoaded, showNotice }) {
  return (
    <div>
      {isLoaded ? <Content /> : <Spinner />}
      {showNotice && <Notice />}
    </div>
  );
}
  `;

  const output = jsx2ttl(jsx, {
    importPath: "ttl",
    importName: "Template"
  });

  expect(output).toContain('isLoaded ? Content({}) : Spinner({})');
  expect(output).toContain('showNotice && Notice({})');
});

test("corner case - deeply nested JSX fragments (<><><div /></></>)", () => {
  const jsx = `
export function NestedFragments() {
  return (
    <>
      <>
        <div>Deep Fragment</div>
      </>
    </>
  );
}
  `;

  const output = jsx2ttl(jsx, {
    importPath: "ttl",
    importName: "Template"
  });

  expect(output).toContain('new Template(["<div>Deep Fragment</div>"], [])');
});
