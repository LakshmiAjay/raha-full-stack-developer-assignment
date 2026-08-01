import { Db, MongoClient } from "mongodb";
const globalForMongo = global as typeof globalThis & {
  mongoPromise?: Promise<MongoClient>;
};
export async function db(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured");
  const clientPromise =
    globalForMongo.mongoPromise ?? new MongoClient(uri).connect();
  if (process.env.NODE_ENV !== "production")
    globalForMongo.mongoPromise = clientPromise;
  return (await clientPromise).db(process.env.MONGODB_DB || "raha_fielddesk");
}
