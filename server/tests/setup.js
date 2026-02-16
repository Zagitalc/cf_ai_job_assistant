const { MongoMemoryServer } = require("mongodb-memory-server");
const { mongoose, connectToDatabase } = require("../db");

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
    await connectToDatabase(mongoServer.getUri());
});

afterEach(async () => {
    if (shouldSkipDbSetup()) {
        return;
    }

    const { collections } = mongoose.connection;

    for (const collectionName of Object.keys(collections)) {
        await collections[collectionName].deleteMany({});
    }
});

afterAll(async () => {
    if (shouldSkipDbSetup()) {
        return;
    }

    await mongoose.connection.close();

    if (mongoServer) {
        await mongoServer.stop();
    }
});
