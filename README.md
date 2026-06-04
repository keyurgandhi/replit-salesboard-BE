
# Node Backend Template v2

## ✅ Local Setup

```bash
npm install
npm run dev
```

Create `.env` file:

```
PORT=3000
DB_CONNECTION_STRING=your-db
```

---

## ✅ Endpoints

Health:
http://localhost:3000/api/health

Swagger:
http://localhost:3000/api/docs

Users API:
http://localhost:3000/api/users

---

## ✅ DO NOT MODIFY
- server.js routing structure
- swagger config

## ✅ SAFE TO MODIFY
- routes
- business logic

---

## ✅ DB Changes

Update DB logic in:
```
src/db/db.js
```

---

## ✅ Notes

- All APIs must be under `/api`
- Swagger is aligned with `/api/docs`
- Follow existing structure for consistency
