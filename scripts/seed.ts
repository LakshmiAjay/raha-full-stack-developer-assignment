import { MongoClient, ObjectId } from "mongodb";
import { hash } from "bcryptjs";
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017",
    databaseName = process.env.MONGODB_DB || "raha_fielddesk";
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(databaseName);
  await Promise.all([
    db.collection("users").deleteMany({}),
    db.collection("leads").deleteMany({}),
    db.collection("days").deleteMany({}),
    db.collection("approvals").deleteMany({}),
    db.collection("workPolicies").deleteMany({}),
  ]);
  const branchId = new ObjectId(),
    passwordHash = await hash("Raha@123", 12),
    headId = new ObjectId(),
    associateIds = [new ObjectId(), new ObjectId(), new ObjectId()];
  await db.collection("users").insertMany([
    {
      _id: headId,
      name: "Meera Iyer",
      email: "meera@raha.in",
      passwordHash,
      role: "head",
      branchId,
    },
    {
      _id: associateIds[0],
      name: "Arjun Rao",
      email: "arjun@raha.in",
      passwordHash,
      role: "associate",
      branchId,
      managerId: headId,
    },
    {
      _id: associateIds[1],
      name: "Nisha Kapoor",
      email: "nisha@raha.in",
      passwordHash,
      role: "associate",
      branchId,
      managerId: headId,
    },
    {
      _id: associateIds[2],
      name: "Vikram Reddy",
      email: "vikram@raha.in",
      passwordHash,
      role: "associate",
      branchId,
      managerId: headId,
    },
  ]);
  const leads = [
    {
      _id: new ObjectId(),
      name: "Lotus Diagnostics",
      contact: "Dr Ananya \u00b7 98480 11220",
      location: { latitude: 17.4429, longitude: 78.3772 },
      branchId,
    },
    {
      _id: new ObjectId(),
      name: "Savera Pharmacy",
      contact: "Karthik \u00b7 98480 22331",
      location: { latitude: 17.4375, longitude: 78.4483 },
      branchId,
    },
    {
      _id: new ObjectId(),
      name: "Madhapur Medicals",
      contact: "Sandeep \u00b7 98480 33442",
      location: { latitude: 17.4486, longitude: 78.3908 },
      branchId,
    },
    {
      _id: new ObjectId(),
      name: "Olive Health Centre",
      contact: "Rina \u00b7 98480 44553",
      location: { latitude: 17.4256, longitude: 78.4104 },
      branchId,
    },
    {
      _id: new ObjectId(),
      name: "Jubilee Care",
      contact: "Dr Farah \u00b7 98480 55664",
      location: { latitude: 17.4318, longitude: 78.4073 },
      branchId,
    },
  ];
  await db.collection("leads").insertMany(leads);
  await db.collection("workPolicies").insertOne({
    managerId: headId,
    branchId,
    timezone: "Asia/Kolkata",
    startTime: "09:00",
    endTime: "18:00",
    saturdayHoliday: false,
    sundayHoliday: false,
    holidays: [],
    updatedAt: new Date(),
  });
  const now = new Date(),
    historic = [];
  for (let u = 0; u < associateIds.length; u++)
    for (let d = 1; d <= 5; d++) {
      const date = new Date(now);
      date.setDate(now.getDate() - (d + u));
      date.setHours(9, 15, 0, 0);
      const localDate = date.toISOString().slice(0, 10),
        a = leads[(d + u) % leads.length],
        b = leads[(d + u + 1) % leads.length],
        p = (lat: number, lon: number, h: number) => ({
          latitude: lat,
          longitude: lon,
          accuracy: 10 + d,
          capturedAt: new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            h,
            15,
          ),
        });
      historic.push({
        userId: associateIds[u],
        branchId,
        localDate,
        sessionNumber: 1,
        timezone: "Asia/Kolkata",
        status: "completed",
        startedAt: p(17.4504, 78.3808, 9).capturedAt,
        startLocation: p(17.4504, 78.3808, 9),
        routeSamples: [
          p(17.4504, 78.3808, 9),
          p(a.location.latitude, a.location.longitude, 11),
          p(b.location.latitude, b.location.longitude, 15),
          p(17.4504, 78.3808, 18),
        ],
        activities: [
          {
            _id: new ObjectId(),
            leadId: a._id,
            leadName: a.name,
            notes: "Discussed renewal and next month\u2019s requirement.",
            leadLocation: { ...a.location },
            leadLocationDistanceMeters: 0,
            location: p(a.location.latitude, a.location.longitude, 11),
            createdAt: p(a.location.latitude, a.location.longitude, 11)
              .capturedAt,
          },
          {
            _id: new ObjectId(),
            leadId: b._id,
            leadName: b.name,
            notes: "Shared product update; follow-up requested on Friday.",
            leadLocation: { ...b.location },
            leadLocationDistanceMeters: 0,
            location: p(b.location.latitude, b.location.longitude, 15),
            createdAt: p(b.location.latitude, b.location.longitude, 15)
              .capturedAt,
          },
        ],
        endedAt: p(17.4504, 78.3808, 18).capturedAt,
        endLocation: p(17.4504, 78.3808, 18),
        totalDistanceKm: Math.round((18 + d * 1.7 + u) * 10) / 10,
        distanceSource: "Seeded road estimate",
      });
    }
  await db.collection("days").insertMany(historic);
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db
      .collection("days")
      .createIndex(
        { userId: 1, status: 1 },
        { unique: true, partialFilterExpression: { status: "active" } },
      ),
    db.collection("days").createIndex({ branchId: 1, localDate: 1 }),
    db.collection("leads").createIndex({ branchId: 1, name: 1 }),
    db
      .collection("approvals")
      .createIndex({ managerId: 1, status: 1, createdAt: -1 }),
    db
      .collection("approvals")
      .createIndex({ userId: 1, requestedDate: 1, type: 1, status: 1 }),
    db
      .collection("workPolicies")
      .createIndex({ managerId: 1, branchId: 1 }, { unique: true }),
  ]);
  console.log("Seeded Raha Fielddesk");
  console.log("Head: meera@raha.in / Raha@123");
  console.log("Associate: arjun@raha.in / Raha@123");
  await client.close();
}

main();
