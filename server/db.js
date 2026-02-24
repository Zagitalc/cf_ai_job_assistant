const mongoose = require("mongoose");

const DEFAULT_MONGODB_URI =
    process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/onclickcv";

let listenersRegistered = false;

function registerConnectionListeners() {
    if (listenersRegistered) {
        return;
    }

    mongoose.connection.on("connected", () => {
        console.log("MongoDB connected");
    });

    mongoose.connection.on("error", (err) => {
        console.error("MongoDB connection error:", err);
    });

    listenersRegistered = true;
}

async function connectDB(uri = DEFAULT_MONGODB_URI) {
    registerConnectionListeners();

    if (mongoose.connection.readyState !== 0) {
        return mongoose.connection;
    }

    await mongoose.connect(uri);
    return mongoose.connection;
}

if (process.env.NODE_ENV !== "test") {
    connectDB();
}

module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.mongoose = mongoose;
