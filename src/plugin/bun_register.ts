import { plugin } from "bun";
import { jsx2ttlPlugin, type JSX2TTLOptions } from "..";

// could read from bunfig.toml or other config file
const options: JSX2TTLOptions = {
  importName: "Template",
  importPath: "../ttl",  
}

// load the plugin via bunfig.toml preload
plugin(jsx2ttlPlugin(options));
