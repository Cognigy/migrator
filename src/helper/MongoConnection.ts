import { MongoClient, Db } from 'mongodb';
import { logGreen, logRed } from './logger';

class MongoConnection {
    private mongoConnection: MongoClient = null;

    async connectToMongo(): Promise<Boolean> {
        // Connection URL
        const url = `mongodb://${process.env.SOURCE_DB_USERNAME}:${encodeURIComponent(process.env.SOURCE_DB_PASSWORD)}@${process.env.SOURCE_DB_HOST}:${process.env.SOURCE_DB_PORT}`;

        this.mongoConnection = await MongoClient.connect(url, { useNewUrlParser: true });

        return true;
    }

    public getConnection(): MongoClient {
        return this.mongoConnection;
    }
}

export default new MongoConnection();

