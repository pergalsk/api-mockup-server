# Basic example

ES modules (`import`) with routes defined inline in `server.js`.

## Run

```
npm install
npm start
```

## Try

- GET http://localhost:9933/api/books/all - list of 6 books
- GET http://localhost:9933/api/books/7 - book detail with author, tags and rating (any id)
- POST http://localhost:9933/api/authors - status 400 with validation error

`-i` shows response status and headers (e.g. `X-Api-Mockup-Server: mocked`) before the body.

```
curl -i http://localhost:9933/api/books/all
curl -i http://localhost:9933/api/books/7
curl -i -X POST http://localhost:9933/api/authors
```
