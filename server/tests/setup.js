const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

let mongoServer;

const shouldSkipDbSetup = () => process.env.SKIP_DB_SETUP === "1";

beforeAll(async () => {
    if (shouldSkipDbSetup()) {
        return;
    }

    mongoServer = await MongoMemoryServer.create({
        instance: {
            ip: "127.0.0.1"
        }
    });
    await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
    if (shouldSkipDbSetup()) {
        return;
    }

    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

afterAll(async () => {
    if (shouldSkipDbSetup()) {
        return;
    }

    await mongoose.disconnect();

    if (mongoServer) {
        await mongoServer.stop();
    }
});
