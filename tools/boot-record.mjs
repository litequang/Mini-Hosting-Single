import os from 'node:os';
import path from 'node:path';
import {DATA,atomicJson,assertStandalone} from '../panel/src/config.mjs';
assertStandalone();atomicJson(path.join(DATA,'boot-last.json'),{project:'MHS',invokedAt:new Date().toISOString(),uptimeSeconds:os.uptime(),physicalRebootVerified:false});
