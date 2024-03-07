import { type BunPlugin } from "bun";
import { jsx2ttl, type JSX2TTLOptions } from "../parse";

/**
 * Bun.sh is a plugin for Bun.build that converts JSX/TSX to TTL.
 */
export function jsx2ttlPlugin(options: JSX2TTLOptions): BunPlugin {
  return {
    name: "JSX to TTL Plugin",
    setup(build) {
      build.onLoad({ filter: /\.(jsx|tsx)$/ }, async (args) => {
        const file = Bun.file(args.path);
        try {
          const newCode = await jsx2ttl(await file.text(), options);
            return {
            contents: newCode,
            loader: args.loader,
          };
        } catch (e) { 
          console.error(`Error processing file at:\n\t"${args.path}"\n\t${e}`);
          throw e;
        }        
      });
    },
  };
}
