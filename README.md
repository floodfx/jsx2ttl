# jsx2ttl

*Very experimental / proof of concept*

Uses Babel to parse JSX into an AST, then converts the AST into a tagged template literal-based Template object.

I have a LiveView-based project that requires the use of a tagged template literal-based Template object.  For "technical reasons" specific to the LiveView protocol, traditional JSX components (and JSX runtimes) are not compatible.  This project is an attempt to create a JSX-to-TTL transpiler that can be used to convert JSX into a TTL-based Template object that is compatible with LiveView-based projects.

That said, you could theoretically use this project to convert JSX into a TTL-based Template object for use in any project that requires a TTL-based Template object.

This is a [Bun](https://bun.sh) project but the code that does the heavy lifting is not bun-specific and could be used in any project that requires a JSX-to-TTL transpiler. See `src/index.ts` for the main logic.

## Installation
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

