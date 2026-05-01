import { MongoClient, Db, MongoClientOptions } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined");
}

const uri = process.env.MONGODB_URI;

const options: MongoClientOptions = {
  maxPoolSize: 10,                 // Critical for serverless — cap concurrent connections
  minPoolSize: 0,
  connectTimeoutMS: 10000,         // Fail fast: 10s to establish connection
  socketTimeoutMS: 45000,          // 45s socket timeout
  serverSelectionTimeoutMS: 10000, // 10s to find/select a MongoDB server
  retryWrites: true,
  retryReads: true,
};

// ─── Global connection cache ─────────────────────────────────────────────────
// Caching in global scope is required for BOTH dev and production serverless.
// Without this, each Vercel function invocation creates a new MongoClient,
// quickly exhausting Atlas free-tier's 500-connection limit → 500 errors.
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClientPromise(): Promise<MongoClient> {
  return new MongoClient(uri, options).connect();
}

if (!global._mongoClientPromise) {
  global._mongoClientPromise = createClientPromise();
}

let clientPromise: Promise<MongoClient> = global._mongoClientPromise;

export async function getDb(): Promise<Db> {
  try {
    const client = await clientPromise;
    const db = client.db("ricky-flow");
    // Ensure unique email index — idempotent, silent fail
    db.collection("users").createIndex({ email: 1 }, { unique: true }).catch(() => {});
    return db;
  } catch (err) {
    // If connection failed, reset cache so next request gets a fresh attempt
    global._mongoClientPromise = createClientPromise();
    clientPromise = global._mongoClientPromise;
    throw err;
  }
}

export default clientPromise;
