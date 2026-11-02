import {assertStandalone} from '../panel/src/config.mjs';
import {startScheduler} from '../panel/src/scheduler.mjs';
import {rotateServiceLogs} from '../panel/src/service-logs.mjs';
rotateServiceLogs();const logTimer=setInterval(()=>{try{rotateServiceLogs();}catch{console.error('MHS_LOG_ROTATION_FAILED');}},60000);logTimer.unref();
assertStandalone();const stop=startScheduler();process.on('SIGTERM',()=>{stop();process.exit(0);});process.on('SIGINT',()=>{stop();process.exit(0);});
