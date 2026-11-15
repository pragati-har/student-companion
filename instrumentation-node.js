import dns from 'node:dns';
import { threadId } from 'node:worker_threads';

export function registerNodeInstrumentation() {
  if (process.platform === 'win32' && process.env.NODE_ENV !== 'production') {
    dns.setServers(['8.8.8.8']);
    console.log('[dns instrumentation]', process.pid, threadId, dns.getServers());
  }
}
