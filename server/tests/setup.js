const { MongoMemoryServer } = require("mongodb-memory-server");
const { mongoose, connectToDatabase } = require("../db");

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create({
        instance: {
            ip: "127.0.0.1"
        }
    });
    await connectToDatabase(mongoServer.getUri());
});

afterEach(async () => {
    const { collections } = mongoose.connection;

    for (const collectionName of Object.keys(collections)) {
        await collections[collectionName].deleteMany({});
    }
});

afterAll(async () => {
    await mongoose.connection.close();

    if (mongoServer) {
        await mongoServer.stop();
    }
});
