# Basic example

ES modules (`import`) with routes defined inline in `server.js`.

## Run

```
npm install
npm start
```

## Try

- GET http://localhost:9933/api/books/all - books list
- GET http://localhost:9933/api/books/7 - book detail (any id)
- POST http://localhost:9933/api/authors - status 400 with error message

```
curl http://localhost:9933/api/books/all
curl http://localhost:9933/api/books/7
curl -X POST http://localhost:9933/api/authors
```
