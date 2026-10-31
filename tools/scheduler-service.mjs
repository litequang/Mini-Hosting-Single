import {assertStandalone} from '../panel/src/config.mjs';
import {startScheduler} from '../panel/src/scheduler.mjs';
assertStandalone();const stop=startScheduler();process.on('SIGTERM',()=>{stop();process.exit(0);});process.on('SIGINT',()=>{stop();process.exit(0);});
