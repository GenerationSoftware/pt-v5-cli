#!/usr/bin/env node_modules/.bin/ts-node
// eslint-disable-next-line node/shebang, unicorn/prefer-top-level-await

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// const project = path.join(__dirname, "..", "tsconfig.json");

(async () => {
  const oclif = await import("@oclif/core");
  await oclif.execute({ development: true, dir: __dirname });
})();

// #!/usr/bin/env node

// import oclif from "@oclif/core";
// // const oclif = require('@oclif/core')

// import path from "path";
// import { fileURLToPath } from "url";

// import tsNode from "ts-node";

// // const path = require("path");
// // const project = path.join(__dirname, "..", "tsconfig.json");

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// const project = path.join(__dirname, "..", "tsconfig.json");

// // In dev mode -> use ts-node and dev plugins
// process.env.NODE_ENV = "development";

// // require("ts-node").register({ project });
// tsNode.register({ project });

// // In dev mode, always show stack traces
// oclif.settings.debug = true;

// // Start the CLI
// oclif.run().then(oclif.flush).catch(oclif.Errors.handle);
