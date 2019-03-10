import { MongoClient, Db } from 'mongodb';
import { logGreen, logRed } from './logger';

export async function connectToMongo(): Promise<MongoClient> {
    // Connection URL
    const url = `mongodb://${process.env.SOURCE_DB_USERNAME}:${process.env.SOURCE_DB_PASSWORD}@${process.env.SOURCE_DB_HOST}:${process.env.SOURCE_DB_PORT}`;

    return MongoClient.connect(url, { useNewUrlParser: true });
}