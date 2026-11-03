# Extended example

ES modules (`import`) with:

- routes in separate file (`routes.js`)
- response data in JSON files (`db/`)
- data file per HTTP status (`BOOK_DETAIL.400.json`)
- `callback` - modify response data
- `callback` with URL params, query params and request body
- different methods: GET, POST (200), PUT (400), DELETE
- route `prefix` - overrides global prefix
- `delay` - random response delay (500 - 1500 ms)
- hot reload - edit `routes.js` or `db/` files, server restarts automatically

## Run

```
npm install
npm start
```

## Try

- GET http://localhost:9933/api/v1/books/all - 12 books from `db/BOOKS_ALL.json` with `_t` timestamp (callback)
- GET http://localhost:9933/api/v1/books/search?genre=Romance - books filtered by query param (callback with `query`)
- GET http://localhost:9933/api/v2/books/7 - book detail from `db/BOOK_DETAIL.json` with `id: 7` from URL (callback)
- POST http://localhost:9933/api/v1/books - status 200, created book: request body + `db/BOOK_CREATE.json` (callback with `body`)
- PUT http://localhost:9933/api/v1/books/10 - status 400 with validation errors from `db/BOOK_DETAIL.400.json`
- DELETE http://localhost:9933/api/v1/books/10 - status 200, `{ deleted: true, id: 10 }`

```
curl http://localhost:9933/api/v1/books/all
curl "http://localhost:9933/api/v1/books/search?genre=Romance"
curl http://localhost:9933/api/v2/books/7
curl -X POST -H "Content-Type: application/json" -d '{"title":"Ivanhoe","authorId":8}' http://localhost:9933/api/v1/books
curl -X PUT http://localhost:9933/api/v1/books/10
curl -X DELETE http://localhost:9933/api/v1/books/10
```

## Hot reload

1. Set `active: true` for the `/authors` route in `routes.js` and save.
2. GET http://localhost:9933/api/v1/authors - now returns authors list from `db/AUTHORS_ALL.json` (no restart needed).

Data: books link to authors by `authorId`, authors list their `bookIds`.
