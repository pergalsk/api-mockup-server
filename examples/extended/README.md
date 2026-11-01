# Extended example

ES modules (`import`) with:

- routes in separate file (`routes.cjs`)
- response data in JSON files (`db/`)
- data file per HTTP status (`BOOK_DETAIL.400.json`)
- `callback` - modify response data
- `applyIf` - mock route only if condition is met
- route `prefix` - overrides global prefix
- `delay` - random response delay (500 - 1500 ms)
- hot reload - edit `routes.cjs` or `db/` files, server restarts automatically

Note: routes file is `.cjs` because hot reload of ESM routes file is not supported yet.

## Run

```
npm install
npm start
```

## Try

- GET http://localhost:9933/api/v1/books/all - books list from `db/BOOKS_ALL.json` with `_t` timestamp (callback)
- GET http://localhost:9933/api/v2/books/10 - book detail from `db/BOOK_DETAIL.json` (only id `10`, applyIf)
- PUT http://localhost:9933/api/v1/books/10 - status 400 with `db/BOOK_DETAIL.400.json`

```
curl http://localhost:9933/api/v1/books/all
curl http://localhost:9933/api/v2/books/10
curl -X PUT http://localhost:9933/api/v1/books/10
```

## Hot reload

1. Set `active: true` for the `/authors` route in `routes.cjs` and save.
2. GET http://localhost:9933/api/v1/authors - now returns authors list (no restart needed).
