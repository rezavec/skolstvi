/**
 * `process` v prohlížeči neexistuje — tahle deklarace je tu jen proto, aby
 * TypeScript rozuměl `process.env.WEB_URL`, který při buildu nahrazuje
 * esbuild konkrétní hodnotou (viz build.mjs, `define`).
 */
declare const process: { env: { WEB_URL: string } };
