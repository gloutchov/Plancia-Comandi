/**
 * Trusted, static worker program, bundled inside main.js so it also runs from ASAR.
 * No user data is interpolated into this source. Regex sources arrive as messages,
 * are only passed to RegExp, and are never evaluated as JavaScript code.
 */
export const CUSTOM_PATTERN_WORKER_SOURCE = String.raw`
'use strict';
const { parentPort, workerData } = require('node:worker_threads');
const keys = ['idle', 'busy', 'attention'];
let revision = -1;
let compiled;
let invalid = false;
parentPort.on('message', (job) => {
  if (!job || !Number.isSafeInteger(job.id) || !Number.isSafeInteger(job.revision) ||
      !keys.every((key) => Array.isArray(job.patterns?.[key]) &&
        job.patterns[key].length <= 40 && job.patterns[key].every((source) =>
          typeof source === 'string' && source.length > 0 && source.length < 300) &&
        typeof job.text?.[key] === 'string' && job.text[key].length <= workerData.maxInputChars)) {
    parentPort.postMessage({ type: 'failed' });
    return;
  }
  if (revision !== job.revision) {
    invalid = false;
    compiled = Object.fromEntries(keys.map((key) => [key, job.patterns[key].flatMap((source) => {
      try { return [new RegExp(source, 'i')]; }
      catch { invalid = true; return []; }
    })]));
    revision = job.revision;
  }
  const matches = Object.fromEntries(keys.map((key) => [key,
    job.text[key].trim().length > 0 && compiled[key].some((pattern) => pattern.test(job.text[key]))]));
  parentPort.postMessage({ type: 'result', id: job.id, revision, matches, invalid });
});
parentPort.postMessage({ type: 'ready' });
`
