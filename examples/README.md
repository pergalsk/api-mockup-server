# Examples

Small standalone projects to try API Mockup Server quickly.

| Example                  | Shows                                                                     |
| ------------------------ | ------------------------------------------------------------------------- |
| [basic](./basic)         | ESM, inline routes (README quick start)                                   |
| [extended](./extended)   | ESM, routes file, db files, status files, callback, applyIf, delay, hot reload |
| [proxy](./proxy)         | ESM, proxy targets list, mocked routes + proxy route interceptor          |
| [cjs](./cjs)             | CommonJS, the basic example with `require()`                              |

Run one example at a time (all use port 9933):

```
cd examples/<name>
npm install
npm start
```

Each example uses the local package (`"api-mockup-server": "file:../.."`).
