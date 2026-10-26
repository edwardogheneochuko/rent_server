# RentRight Naija — Server (API)

Node.js + Express 5 + MongoDB (Mongoose) REST API.

## Setup

```bash
cd server
npm install
cp .env.example .env       # Windows CMD: copy .env.example .env
```

Edit `.env`:

- `MONGO_URI`: a local MongoDB (`mongodb://127.0.0.1:27017/rentright`) or a free MongoDB Atlas cluster string.
- `JWT_SECRET`: a long random string. Generate one with
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

```bash
npm run seed           # ⚠️ wipes the database, then loads Lagos + Abuja sample data
npm run dev            # start with auto-restart on http://localhost:5000
npm run create-admin   # create/update the admin account from ADMIN_* values in .env
```

### Seed data

`npm run seed` creates 50 properties and about 65 listings across Yaba, Lekki Phase 1, Ikeja,
Surulere, Gwarinpa and Wuse 2. It also creates about 54 reviews (most approved, some pending)
and 8 scam reports. All phone numbers (0800…), emails (@rentright.test) and account numbers
(900000…) are fictional. The data is the same on every run.

| Role     | Email                             | Password                     |
| -------- | --------------------------------- | ---------------------------- |
| admin    | `ADMIN_EMAIL` from .env           | `ADMIN_PASSWORD` from .env   |
| tenant   | chiamaka@rentright.test           | Password123                  |
| agent    | segun.agent@rentright.test        | Password123                  |
| landlord | olumide.landlord@rentright.test   | Password123                  |

More accounts are listed in `seed/data.js`.

## Folder structure

| Folder         | What lives there                                                     |
| -------------- | -------------------------------------------------------------------- |
| `config/`      | Environment settings (`index.js`) and the MongoDB connection (`db.js`) |
| `models/`      | Mongoose schemas: User, Agent, Landlord, Property, Listing, Review, ScamReport |
| `controllers/` | Request handlers: the logic behind each route                        |
| `routes/`      | URL → controller mapping, plus input validation rules                |
| `middleware/`  | auth (`protect`), roles (`authorize`), validation, rate limits, errors |
| `utils/`       | Helpers: phone normalisation, naira formatting, JWT cookies, ApiError |
| `seed/`        | Scripts that put data in the database                                |
| `postman/`     | Postman collection for testing                                       |

## Response format

Success:

```json
{ "success": true, "data": { ... } }
```

Error (always this shape):

```json
{
  "success": false,
  "error": {
    "message": "Some fields are invalid",
    "statusCode": 422,
    "details": [{ "field": "email", "message": "Enter a valid email address" }]
  }
}
```

## Auth endpoints (Phase 1)

| Method | URL                  | Auth   | Body                                        |
| ------ | -------------------- | ------ | ------------------------------------------- |
| GET    | `/api/health`        | none   | n/a                                         |
| POST   | `/api/auth/register` | none   | `name, email, password, role?, phone?`      |
| POST   | `/api/auth/login`    | none   | `email, password`                           |
| POST   | `/api/auth/logout`   | none   | n/a                                         |
| GET    | `/api/auth/me`       | signed in | n/a                                      |

- `role` can be `tenant` (default), `landlord` or `agent`. Admins can't sign up through the API.
- Signing up as a landlord or agent also creates their public Landlord/Agent profile.
- The login token is set in an httpOnly cookie named `rr_token`. For Postman or mobile
  clients you can also send `Authorization: Bearer <token>`.

## Testing with curl

These use Git Bash or Mac/Linux syntax. `-c`/`-b` save and send the login cookie.

```bash
# 1. Health check -> 200
curl http://localhost:5000/api/health

# 2. Register a tenant -> 201 (phone is stored as 2348031234567)
curl -c cookies.txt -H "Content-Type: application/json" \
  -X POST http://localhost:5000/api/auth/register \
  -d '{"name":"Ada Obi","email":"ada@example.com","password":"Password123","phone":"+234 803 123 4567"}'

# 3. Who am I? (uses saved cookie) -> 200
curl -b cookies.txt http://localhost:5000/api/auth/me

# 4. Same email again -> 409
curl -H "Content-Type: application/json" -X POST http://localhost:5000/api/auth/register \
  -d '{"name":"Ada Obi","email":"ada@example.com","password":"Password123"}'

# 5. Invalid fields -> 422 with a details list
curl -H "Content-Type: application/json" -X POST http://localhost:5000/api/auth/register \
  -d '{"name":"A","email":"bad","password":"short","role":"admin","phone":"12345"}'

# 6. Register an agent -> 201, response includes an Agent "profile"
curl -H "Content-Type: application/json" -X POST http://localhost:5000/api/auth/register \
  -d '{"name":"Tunde Bakare","email":"tunde@example.com","password":"Password123","role":"agent","phone":"08051112222"}'

# 7. Wrong password -> 401
curl -H "Content-Type: application/json" -X POST http://localhost:5000/api/auth/login \
  -d '{"email":"ada@example.com","password":"WrongPass1"}'

# 8. Login -> 200
curl -c cookies.txt -H "Content-Type: application/json" -X POST http://localhost:5000/api/auth/login \
  -d '{"email":"ada@example.com","password":"Password123"}'

# 9. Logout, then /me -> 401
curl -b cookies.txt -c cookies.txt -X POST http://localhost:5000/api/auth/logout
curl -b cookies.txt http://localhost:5000/api/auth/me
```

**Windows PowerShell:** `curl` there is a different program. Use `curl.exe` and put the JSON in
a file, e.g. `curl.exe -c cookies.txt -H "Content-Type: application/json" -X POST http://localhost:5000/api/auth/register --data "@register.json"`, or use Postman.

## Phase 2 endpoints

All list endpoints accept `page` and `limit` (max 50) and return `data.items` + `data.pagination`.

| Method | URL | Who | Notes |
| ------ | --- | --- | ----- |
| GET | `/api/listings` | anyone | `area` (prefix match), `state` (`Lagos`, `FCT`/`Abuja`), `type`, `minRent`, `maxRent`, `status` (`available` default, `taken`, `all`), `sort` (`newest`, `cheapest`, `priciest`, by total move-in cost) |
| GET | `/api/listings/mine` | signed in | Your listings, any status |
| GET | `/api/listings/:id` | anyone | Includes `costBreakdown` in naira |
| POST | `/api/listings` | landlord, agent, admin | `propertyId` **or** `property {address, area, state, type, lga?, amenities?, coordinates?: {lat, lng}}`, plus `rent`, `agentFee`, `legalFee`, `caution`, `serviceCharge`. Optionally `agentId`/`agent {name, phone}` and `landlordId`/`landlord {name, phone}` |
| PATCH | `/api/listings/:id` | owner, admin | Any fee, `status`, `agentId`, `property {...}` |
| DELETE | `/api/listings/:id` | owner, admin | Keeps the property and its reviews |
| GET | `/api/reviews?targetType=&targetId=` | anyone | Approved only, plus `summary` (average per rating, caution refunds) |
| GET | `/api/reviews/mine` | signed in | All your reviews, any status |
| POST | `/api/reviews` | signed in | `targetType`, `targetId`, `ratings {overall, light?, water?, security?, flooding?, landlordBehaviour?}`, `cautionRefunded?`, `text` |
| POST | `/api/reviews/:id/reply` | reviewed agent/landlord | `text`. Approved reviews only |
| GET | `/api/scams/check?query=` | anyone | Phone (any format), 10-digit account number or name. Confirmed reports only |
| POST | `/api/scams` | signed in | `phone?`, `name?`, `accountNumber?`, `bankName?`, `description`, `evidence? [https urls]` |
| GET | `/api/insights/rent?state=&area=&months=` | anyone | Average, min and max rent per type (last 24 months by default) |
| GET | `/api/insights/areas?state=` | anyone | Areas per state, for dropdowns |
| GET | `/api/agents/:id`, `/api/landlords/:id` | anyone | Profile + listings/properties |
| GET | `/api/admin/pending?type=reviews\|scams` | admin | Moderation queue, oldest first |
| PATCH | `/api/admin/reviews/:id` | admin | `{ "status": "approved" \| "rejected" \| "pending" }`, recalculates ratings |
| PATCH | `/api/admin/scams/:id` | admin | `{ "status": "confirmed" \| "rejected" \| "pending" }` |
| PATCH | `/api/admin/agents/:id`, `/api/admin/landlords/:id` | admin | `{ "verified": true }` |

### Phase 2 curl tests

Run `npm run seed` first.

```bash
B=http://localhost:5000/api
J="Content-Type: application/json"

# Browse
curl "$B/listings?area=lekki&type=2-bedroom&sort=cheapest"
curl "$B/listings?state=abuja&maxRent=2000000&page=1&limit=5"
curl "$B/insights/rent?state=Lagos"
curl "$B/insights/areas"

# Scam check: these three all find the same confirmed report
curl "$B/scams/check?query=08000000901"
curl "$B/scams/check?query=%2B2348000000901"
curl "$B/scams/check?query=mama%20tobi"

# Sign in as each role (each keeps its own cookie file)
curl -c agent.txt  -H "$J" -X POST $B/auth/login -d '{"email":"segun.agent@rentright.test","password":"Password123"}'
curl -c tenant.txt -H "$J" -X POST $B/auth/login -d '{"email":"chiamaka@rentright.test","password":"Password123"}'
curl -c admin.txt  -H "$J" -X POST $B/auth/login -d '{"email":"admin@rentright.ng","password":"ChangeMe123"}'

# Agent creates a listing: total move-in cost = ₦1,950,000
curl -b agent.txt -H "$J" -X POST $B/listings -d '{
  "property": {"address":"14 Akoka Road","area":"Yaba","state":"Lagos","type":"mini-flat"},
  "landlord": {"name":"Mr Adewale","phone":"08000000999"},
  "rent":1500000,"agentFee":150000,"legalFee":150000,"caution":100000,"serviceCharge":50000}'

# Tenant can't create listings -> 403
curl -b tenant.txt -H "$J" -X POST $B/listings -d '{}'

# Tenant reports a scam (pending until an admin confirms it)
curl -b tenant.txt -H "$J" -X POST $B/scams -d '{"name":"Fake Caretaker","phone":"08000000777","description":"Collected rent for a flat he does not manage."}'

# Admin moderation queue
curl -b admin.txt "$B/admin/pending"
# Then approve one: curl -b admin.txt -H "$J" -X PATCH $B/admin/reviews/<id> -d '{"status":"approved"}'
```

## Testing with Postman

1. Import both files in `postman/`.
2. For Phase 2, run `npm run seed` first.
3. Run each collection (Collection → Run). Every request has automatic pass/fail tests.
4. If your port isn't 5000, change the `baseUrl` collection variable. If your admin
   login differs from the .env.example defaults, change `adminEmail`/`adminPassword`.

**Rate limits:** the whole API allows 300 requests per 15 minutes per IP. Register and login
allow 10 *failed* attempts per 15 minutes. If you get a 429 while testing, restart the server
to reset the limits.
