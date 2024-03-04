import { type BunPlugin } from "bun";
import { jsx2ttl } from "../parse";

interface JSX2TTLPluginOptions {
  /**
   * The import path for the Template class.
   */
  templateImportPath: string;
}

/**
 * Bun.sh is a plugin for Bun.build that converts JSX/TSX to TTL.
 */
export function jsx2ttlPlugin(options: JSX2TTLPluginOptions): BunPlugin {
  return {
    name: "JSX to TTL Plugin",
    setup(build) {
      build.onLoad({ filter: /\.(jsx|tsx)$/ }, async (args) => {
        const file = Bun.file(args.path);
        const newCode = await jsx2ttl(await file.text(), options.templateImportPath);

        return {
          contents: newCode,
          loader: args.loader,
        };
      });
    },
  };
}
