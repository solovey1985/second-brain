# Building REST API Backend with Firebase

## Overview

Firebase does not provide a traditional REST API backend out of the box, but it allows you to create one using **Firebase Cloud Functions** (serverless functions) together with **Firestore** or **Realtime Database**. These functions can expose RESTful endpoints that your Angular app can consume.

---

## 🔹 Core Components

1. **Firebase Authentication** → to identify users.
2. **Firestore Database** → to store users, actions, balances.
3. **Firebase Cloud Functions** → to implement REST endpoints.
4. **Firebase Hosting** → optional, to serve Angular frontend.

---

## 🔹 Steps to Build REST API Backend

### 1. Initialize Firebase project

```bash
firebase login
firebase init functions firestore hosting
```

* Choose TypeScript for functions.
* Enable ESLint if needed.

### 2. Install dependencies

```bash
cd functions
npm install express cors firebase-admin firebase-functions
```

* **express** → for building REST API.
* **cors** → allow Angular frontend requests.

### 3. Setup Express App in Functions

`functions/src/index.ts`

```ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as express from "express";
import * as cors from "cors";

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));

// Example: get balance
app.get("/balance/:userId", async (req, res) => {
  const { userId } = req.params;
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) return res.status(404).send("User not found");
  res.json(userDoc.data());
});

// Example: add action
app.post("/actions/add", async (req, res) => {
  const { userId, actionTypeId, amount } = req.body;
  const actionTypeDoc = await db.collection("actionTypes").doc(actionTypeId).get();
  if (!actionTypeDoc.exists) return res.status(404).send("ActionType not found");

  const actionType = actionTypeDoc.data()!;
  const credits = amount * actionType.creditValue;

  // Create userAction log
  const userAction = {
    userId,
    actionTypeId,
    amount,
    calculatedCredits: credits,
    date: new Date().toISOString(),
  };
  await db.collection("userActions").add(userAction);

  // Update balance transaction
  const userRef = db.collection("users").doc(userId);
  await db.runTransaction(async (t) => {
    const userDoc = await t.get(userRef);
    if (!userDoc.exists) throw "User not found";

    const balance = userDoc.data() || { balanceKP: 0, balanceKZ: 0 };
    if (actionType.type === "KP") {
      balance.balanceKP += credits;
    } else {
      balance.balanceKZ += credits;
    }

    t.update(userRef, balance);
  });

  res.json({ success: true, credits });
});

// Export API
exports.api = functions.https.onRequest(app);
```

### 4. Deploy REST API

```bash
firebase deploy --only functions
```

Firebase will give you a URL like:

```
https://us-central1-YOUR_PROJECT.cloudfunctions.net/api
```

Endpoints:

* `GET /balance/:userId`
* `POST /actions/add`

### 5. Secure the API

* Use **Firebase Auth** ID tokens.
* Middleware to verify token before executing endpoints.

Example middleware:

```ts
import { Request, Response, NextFunction } from "express";

async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send("Unauthorized");
  }
  const token = authHeader.split(" ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    (req as any).user = decodedToken;
    next();
  } catch (err) {
    return res.status(401).send("Invalid token");
  }
}

app.use(authenticate);
```

---

## 🔹 Angular Integration

* Use Angular **HttpClient** to call the REST API.
* Attach **Firebase Auth ID token** in request headers.

Example:

```ts
const token = await this.afAuth.currentUser?.getIdToken();
this.http.post(`${apiUrl}/actions/add`, body, {
  headers: { Authorization: `Bearer ${token}` }
});
```

---

## 🔹 Benefits of this Setup

* Fully serverless → no need to manage backend servers.
* REST API structure is clear and can evolve.
* Scalable and secure via Firebase Auth.

---

## Next Steps for MVP

* Add `DELETE /actions/:id` endpoint.
* Add `GET /logs/:userId` endpoint.
* Add CRUD for `actionTypes`.
* Extend with goals and penalties in future versions.
