# jsx2ttl

**Warning: Very experimental / proof of concept**

Uses Babel to parse JSX into an AST, then converts the AST into a tagged template literal-based `Template` object.

I have a LiveView-based project that requires the use of a tagged template literal-based Template object.  For "technical reasons" specific to the LiveView protocol, traditional JSX components (and JSX runtimes) are not compatible.  This project is an attempt to create a JSX-to-TTL transpiler that can be used to convert JSX into a TTL-based Template object that is compatible with LiveView-based projects.

That said, you could theoretically use this project to convert JSX into a TTL-based `Template` object for use in any project that requires a TTL-based functions.

This is a [Bun](https://bun.sh) project but the code that does the heavy lifting is not bun-specific and could be used in any project that requires a JSX-to-TTL transpiler. See `src/index.ts` for the main logic.

## NPM Package
This project is published as an npm package: [jsx2ttl](https://www.npmjs.com/package/jsx2ttl)
```bash
bun add jsx2ttl
```
or your favorite package manager:
```bash
npm install jsx2ttl
```

## Example Conversions

### Pretty simple, JSX with no props:
Input JSX:
```tsx
// source: https://react.dev/learn/your-first-component
export default function Profile() {
  return (
    <img
      src="https://i.imgur.com/MK3eW3Am.jpg"
      alt="Katherine Johnson"
    />
  )
}
```
Output TTL-based Template:
```typescript
import { Template } from "../ttl";

export default function Profile() {
  return new Template(["<img src=\"https://i.imgur.com/MK3eW3Am.jpg\" alt=\"Katherine Johnson\">"], []);
}
```

### More complex, JSX with props and children:
Input JSX:
```tsx
function Foo1(props: {msg: number}) {
  return <div>hi {props.msg}</div>;
}

function App(props: {name: string}) {
  return <h1 className="foo">Hello {props.name}. <Foo1 msg={1+3} /></h1>;
}

export default App;
```

Output TTL-based Template:
```typescript
import { Template } from "../ttl";
function Foo1(props: {
  msg: number;
}) {
  return new Template(["<div>hi ", "</div>"], [props.msg]);
}
function App(props: {
  name: string;
}) {
  return new Template(["<h1 className=\"foo\">Hello ", ". ", "</h1>"], [props.name, Foo1({
    msg: 1 + 3
  })]);
}
export default App;
```

## Next Steps
- [ ] Test / add support for more JSX features
- [ ] Handle `style` and `className` props properly when converting to TTL
- [ ] Add support for `Fragment` and `<>` syntax
- [ ] Support other TTL-based functions or objects (not just `new Template`)
- [x] ~~Publish as a standalone package on npm~~


## Install Dependencies
```bash
bun install
```

## Running
There isn't much to "run" at the moment but you can see run the `go` script which preloads the `jsx2ttlPlugin` into the bun runtime which parses the TSX file before it is imported and converts it into a TTL-based Template object.
```bash
bun go
```

## Testing
Additionally you can run the tests which also use the `jsx2ttlPlugin` to parse the TSX file before it is imported and converts it into a TTL-based Template object.  These tests are currently pretty simple and use snapshots to compare the output of the transpiled TTL-based Template object.

```bash
bun test
```


## License
MIT

## Author
[Donnie Flood](https://github.com/floodfx)
