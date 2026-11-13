/**
 * loadData - read one bundled JSON file from simulations/shared/data/.
 *
 * In the browser it is a plain fetch next to this module, so it works from any
 * course host and never leaves the bundle (no network beyond the course's own
 * files). Under the headless tools the module URL is a file: URL, where fetch
 * is not available, so it reads the file instead. One fetch per file per page:
 * every mount of a scene shares the same parsed object, so treat it as frozen.
 */
const cache = new Map();

export function loadData(name) {
  if (!cache.has(name)) {
    const url = new URL(`./data/${name}.json`, import.meta.url);
    cache.set(name, url.protocol === 'file:'
      ? import('node:fs/promises').then((fs) => fs.readFile(url, 'utf8')).then((t) => JSON.parse(t))
      : fetch(url).then((r) => { if (!r.ok) throw new Error(`loadData ${name}: ${r.status}`); return r.json(); }));
  }
  return cache.get(name);
}
