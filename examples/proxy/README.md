# Proxy example

ES modules (`import`) with proxy target. Requests which are not mocked go to the proxy target.

- proxy targets list - on start choose target in CLI (pick `https://jsonplaceholder.typicode.com`)
- mocked route - `/users/1` returns local data
- proxy route interceptor - `/posts/:id` comes from proxy target and is modified by `callback`

Needs internet (uses public API https://jsonplaceholder.typicode.com).

## Run

```
npm install
npm start
```

## Try

- GET http://localhost:9933/users/1 - mocked user
- GET http://localhost:9933/users/2 - proxied (real data)
- GET http://localhost:9933/posts/1 - proxied and intercepted (title uppercase, `intercepted: true`)

```
curl http://localhost:9933/users/1
curl http://localhost:9933/users/2
curl http://localhost:9933/posts/1
```
