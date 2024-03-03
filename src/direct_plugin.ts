// jsx2ttlPlugin is loaded via bunfig.toml so this should work
// without having a jsx runtime in the project
import foo from "./jsx/simple_static";
console.log(foo().toString()); 

