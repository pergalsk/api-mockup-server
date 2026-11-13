# Proxy example

ES modules (`import`) with proxy target. Requests which are not mocked go to the proxy target.

- proxy targets list - on start choose target in CLI (pick `JSONPlaceholder - https://jsonplaceholder.typicode.com`)
- mocked routes - `GET /users/1`, `POST /posts` (200) and `PUT /posts/:id` (500) return local data
- proxy route interceptors - `/posts/:id` and `/todos/:id` come from proxy target and are modified by `callback`

Needs internet (uses public API https://jsonplaceholder.typicode.com).

Note: second target `http://localhost:3000` is only there to show the targets list. If you choose it without a local backend on that port, proxied requests fail.

## Run

```
npm install
npm start
```

## Try

- GET http://localhost:9933/users/1 - mocked user
- GET http://localhost:9933/users/2 - proxied (real data)
- GET http://localhost:9933/posts/1 - proxied and intercepted (title uppercase, `intercepted: true`)
- GET http://localhost:9933/todos/1 - proxied and intercepted (added `status: open/done`)
- POST http://localhost:9933/posts - mocked, status 200, request body with `id: 101`
- PUT http://localhost:9933/posts/1 - mocked, status 500 with error message

`-i` shows response status and headers before the body. `X-Api-Mockup-Server` header tells if the response is `mocked...` or from `proxy`.

```
curl -i http://localhost:9933/users/1
curl -i http://localhost:9933/users/2
curl -i http://localhost:9933/posts/1
curl -i http://localhost:9933/todos/1
curl -i -X POST -H "Content-Type: application/json" -d '{"title":"Hello","userId":1}' http://localhost:9933/posts
curl -i -X PUT http://localhost:9933/posts/1
```
