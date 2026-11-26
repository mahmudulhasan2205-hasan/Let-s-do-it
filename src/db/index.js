import mongoose from "mongoose";
import { DB_Name } from "../constants.js";

let connectionPromise;

const connectDB = async () => {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (!connectionPromise) {
        connectionPromise = mongoose
            .connect(process.env.MONGODB_URL, { dbName: DB_Name })
            .then((connection) => {
                console.log(`MongoDB connected: ${connection.connection.host}`);
                return connection;
            })
            .catch((error) => {
                connectionPromise = undefined;
                console.error("MongoDB connection error:", error);
                throw error;
            });
    }

    return connectionPromise;
};

export default connectDB;