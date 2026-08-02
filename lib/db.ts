import { Db, MongoClient } from "mongodb";
import { Resolver } from "node:dns/promises";

const globalForMongo = global as typeof globalThis & {
  mongoPromise?: Promise<MongoClient>;
};

const dnsServers = process.env.MONGODB_DNS_SERVERS
  ?.split(",")
  .map((server) => server.trim())
  .filter(Boolean);

async function resolveMongoUri(uri: string) {
  if (!dnsServers?.length || !uri.startsWith("mongodb+srv://")) return uri;

  const scheme = "mongodb+srv://",
    credentialsEnd = uri.lastIndexOf("@"),
    pathStart = uri.indexOf("/", credentialsEnd + 1);
  if (credentialsEnd < scheme.length)
    throw new Error("MONGODB_URI must include encoded Atlas credentials");

  const hostEnd = pathStart === -1 ? uri.length : pathStart,
    srvHost = uri.slice(credentialsEnd + 1, hostEnd),
    suffix = pathStart === -1 ? "/" : uri.slice(pathStart),
    queryStart = suffix.indexOf("?"),
    databasePath = queryStart === -1 ? suffix : suffix.slice(0, queryStart),
    parameters = new URLSearchParams(
      queryStart === -1 ? "" : suffix.slice(queryStart + 1),
    ),
    resolver = new Resolver();
  resolver.setServers(dnsServers);

  const [records, txtRecords] = await Promise.all([
    resolver.resolveSrv(`_mongodb._tcp.${srvHost}`),
    resolver.resolveTxt(srvHost).catch(() => [] as string[][]),
  ]);
  for (const txtRecord of txtRecords) {
    const txtParameters = new URLSearchParams(txtRecord.join(""));
    for (const [key, value] of txtParameters)
      if (!parameters.has(key)) parameters.set(key, value);
  }
  parameters.set("tls", "true");

  const credentials = uri.slice(scheme.length, credentialsEnd + 1),
    hosts = records.map(({ name, port }) => `${name}:${port}`).join(",");
  return `mongodb://${credentials}${hosts}${databasePath}?${parameters}`;
}

export async function db(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured");
  const clientPromise =
    globalForMongo.mongoPromise ??
    resolveMongoUri(uri).then((resolvedUri) =>
      new MongoClient(resolvedUri).connect(),
    );
  globalForMongo.mongoPromise = clientPromise;
  try {
    return (await clientPromise).db(
      process.env.MONGODB_DB || "raha_fielddesk",
    );
  } catch (error) {
    if (globalForMongo.mongoPromise === clientPromise)
      delete globalForMongo.mongoPromise;
    throw error;
  }
}
