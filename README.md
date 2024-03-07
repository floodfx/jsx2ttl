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

## Configuration
Configuring the plugin is done by passing in settings when adding the plugin to the bun runtime.  For instance you can use `bunfig.toml` to preload the plugin with settings:

bunfig.toml:
```toml
preload = ["./src/plugin/register_jsx2ttl.ts"]

[test]
preload = ["./src/plugin/register_jsx2ttl.ts"]
```

Then in `./src/plugin/register_jsx2ttl.ts`:
```typescript
import { plugin } from "bun";
import { jsx2ttlPlugin, type JSX2TTLOptions } from "..";

// could read from bunfig.toml or other config file
const options: JSX2TTLOptions = {
  importName: "myttl",  
  importPath: "../ttl", // or "myttl" if a package
  // other options...
}

// load the plugin via bunfig.toml preload
plugin(jsx2ttlPlugin(options));
```



## Next Steps
- [ ] Fix the `jsx2ttl/dist` import from other projects
- [ ] Test / add support for more JSX features
- [x] ~~Handle `style` and `className` props properly when converting to TTL~~
- [ ] Add support for `Fragment` and `<>` syntax
- [x] ~~Support other TTL-based functions or objects (not just `new Template`)~~
- [x] ~~Publish as a standalone package on npm~~


## Install Dependencies
```bash
bun install
```

## Running
There are a couple of scripts you can run to see the project in action.
 * `bun plugin` - Preloads the `jsx2ttlPlugin` into the bun runtime, which parses the TSX file before it is imported and converts it into a TTL-based Template object.
 * `bun direct` - Outputs the transpiled TTL-based code into `/out` directory for inspection.
 * `bun test` - Runs `src/tests/plugin_test.ts` which builds and snapshots the transpiled TTL-based code. These


## License
MIT

## Author
[Donnie Flood](https://github.com/floodfx)
