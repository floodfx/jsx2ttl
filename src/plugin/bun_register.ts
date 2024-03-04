import { plugin } from "bun";
import { jsx2ttlPlugin } from "..";

// load the plugin via bunfig.toml preload
plugin(jsx2ttlPlugin({ templateImportPath: "../ttl" }));
