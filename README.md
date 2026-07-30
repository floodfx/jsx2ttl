# jsx2ttl

A fast, flexible JSX/TSX-to-Tagged Template Literal transpiler for JavaScript & TypeScript.

`jsx2ttl` parses `.jsx` and `.tsx` files into an AST using Babel, then automatically converts JSX elements into Tagged Template Literals (e.g. `` html`<div class="${cls}">...</div>` ``), function calls (e.g. `html(statics, dynamics)`), or `Template` class instances (`new Template(statics, dynamics)`).

Works natively in **Node.js**, **Bun**, and **Deno**, and integrates seamlessly into **Babel**, **Vite**, **Webpack**, and **Rollup** build pipelines.

---

## Key Concept: Bring Your Own TTL Function

`jsx2ttl` is a **pure compiler plugin**. It transforms JSX syntax into Tagged Template Literals, but does not dictate how template strings are evaluated. 

As a developer, you configure `jsx2ttl` with:
- `importPath`: The module path or package name containing your TTL function/class.
- `importName`: The name of the exported function or class.
- `mode`: The transformation style (`'taggedTemplate'`, `'constructor'`, or `'function'`).

---

## Defining Your TTL Function

Here are examples of TTL functions and classes you can define in your own codebase:

### Example 1: Simple HTML String Tag (`html\`...\``)

For `mode: 'taggedTemplate'`:

```typescript
// src/ttl.ts
export function html(statics: TemplateStringsArray, ...dynamics: unknown[]): string {
  return statics.reduce((result, staticPart, index) => {
    const dynamicVal = dynamics[index - 1];
    const strVal = dynamicVal === null || dynamicVal === undefined ? "" : String(dynamicVal);
    return result + strVal + staticPart;
  });
}
```

**Configuration**:
```typescript
{
  importPath: "./ttl",
  importName: "html",
  mode: "taggedTemplate"
}
```

**Transpiled Output**:
```tsx
// Input JSX:  <div className="card">Hello {props.name}!</div>
// Output:     html`<div className="card">Hello ${props.name}!</div>`
```

---

### Example 2: Structured Template Object (`new Template(...)`)

For `mode: 'constructor'` *(default)*:

```typescript
// src/ttl.ts
export class Template {
  constructor(
    public readonly statics: readonly string[],
    public readonly dynamics: readonly unknown[]
  ) {}

  render(): string {
    return this.statics.reduce((res, s, i) => res + String(this.dynamics[i - 1] ?? "") + s);
  }
}
```

**Configuration**:
```typescript
{
  importPath: "./ttl",
  importName: "Template",
  mode: "constructor"
}
```

**Transpiled Output**:
```tsx
// Input JSX:  <div className="card">Hello {props.name}!</div>
// Output:     new Template(["<div className=\"card\">Hello ", "!</div>"], [props.name])
```

---

### Example 3: Integrating Popular Ecosystem Libraries (`lit-html`, `htm`)

You can map JSX directly into third-party template libraries:

```typescript
// For lit-html
{
  importPath: "lit-html",
  importName: "html",
  mode: "taggedTemplate"
}
```

---

## Installation

```bash
# npm
npm install jsx2ttl

# bun
bun add jsx2ttl

# pnpm / yarn
pnpm add jsx2ttl
```

In **Deno**:
```typescript
import { jsx2ttl, babelPluginJsx2Ttl } from "npm:jsx2ttl";
```

---

## Output Modes

`jsx2ttl` supports three output modes:

1. **`mode: 'taggedTemplate'`**: Generates standard Tagged Template Literals: `` html`<div class="${cls}">...</div>` ``.
2. **`mode: 'constructor'`** *(default)*: Generates `new Template(statics, dynamics)` instances.
3. **`mode: 'function'`**: Generates function invocations: `html(statics, dynamics)`.

---

## Build Pipeline Integrations

### 1. Direct Compiler API

```typescript
import { jsx2ttl } from "jsx2ttl";

const tsxCode = `
export function Profile({ name }: { name: string }) {
  return <div className="profile"><h1>{name}</h1></div>;
}
`;

const result = jsx2ttl(tsxCode, {
  importPath: "./my-ttl",
  importName: "html",
  mode: "taggedTemplate",
});

console.log(result);
```

---

### 2. Standard Babel Plugin (Vite / Webpack / Rollup / Node)

Add `babelPluginJsx2Ttl` to your `babel.config.js`:

```javascript
// babel.config.js
import { babelPluginJsx2Ttl } from "jsx2ttl";

export default {
  plugins: [
    [
      babelPluginJsx2Ttl,
      {
        importPath: "./my-ttl",
        importName: "html",
        mode: "taggedTemplate"
      }
    ]
  ]
};
```

---

### 3. Bun Plugin (`Bun.build` / `bun test`)

Preload via `bunfig.toml`:

```toml
# bunfig.toml
preload = ["./src/plugin/bun_register.ts"]

[test]
preload = ["./src/plugin/bun_register.ts"]
```

Or use in `Bun.build`:

```typescript
import { jsx2ttlPlugin } from "jsx2ttl";

await Bun.build({
  entrypoints: ["src/app.tsx"],
  outdir: "dist",
  plugins: [
    jsx2ttlPlugin({
      importPath: "./my-ttl",
      importName: "html",
      mode: "taggedTemplate"
    })
  ],
});
```

---

## Supported JSX Features

- [x] **Full `.jsx` & `.tsx` Parsing**: Full TypeScript interface, generic, and type annotation support.
- [x] **JSX Fragments (`<></>` & `<React.Fragment>`)**: Converted cleanly without unnecessary container tags.
- [x] **Component `children` Props (`<Foo>bar</Foo>`)**: Nested children are passed automatically as `props.children`.
- [x] **Member Expression Tags (`<UI.Modal.Header />`)**: Formatted as valid JS member expression calls (`UI.Modal.Header(props)`).
- [x] **Spread Attributes (`<div {...props} />`)**: Properly balances static and dynamic string arrays.
- [x] **Boolean Shorthand Attributes (`<input disabled />`)**: Preserves shorthand boolean attributes in generated template strings.
- [x] **Custom Attribute Transformers**: Use `transformAttribute` to convert `className` to `class` or transform inline `style` objects.

---

## Development & Testing

```bash
# Run full test suite (29 unit tests)
bun test

# Run direct build demo
bun run direct

# Build production bundle & TypeScript types
bun run build
```

---

## License

[MIT](LICENSE) © [Donnie Flood](https://github.com/floodfx)
