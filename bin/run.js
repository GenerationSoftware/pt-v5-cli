#!/usr/bin/env node

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// eslint-disable-next-line unicorn/prefer-top-level-await
(async () => {
  const oclif = await import("@oclif/core");
  await oclif.execute({ development: false, dir: __dirname });
})();

// #!/usr/bin/env node

// const oclif = require('@oclif/core')

// oclif.run().then(require('@oclif/core/flush')).catch(require('@oclif/core/handle'))
