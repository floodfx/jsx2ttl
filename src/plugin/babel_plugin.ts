import { parse } from "@babel/parser";
import { type JSX2TTLOptions, jsx2ttl } from "../parse";

/**
 * Babel plugin export for jsx2ttl.
 * Allows using jsx2ttl as a standard Babel plugin in Vite, Webpack, Rollup, Babel CLI, etc.
 */
export function babelPluginJsx2Ttl(api: any, options: any) {
  return {
    name: "babel-plugin-jsx2ttl",
    visitor: {
      Program: {
        enter(path: any, state: any) {
          if (state.opts.__jsx2ttlDone) return;
          state.opts.__jsx2ttlDone = true;
          const code = state.file.code;
          if (!code) return;
          try {
            const transformed = jsx2ttl(code, options);
            const ast = parse(transformed, {
              sourceType: "module",
              plugins: ["typescript", "jsx"]
            });
            path.node.body = ast.program.body;
          } catch (e) {
            // handle error
          }
        }
      }
    }
  };
}

export default babelPluginJsx2Ttl;
