import * as fs from 'fs-extra';
import { createFolderIfNotExist, replaceObjectIDs } from './helper/utils';
import { IExportOptions } from './helper/interfaces';
import { logGreen, logRed } from './helper/logger';
import MongoConnection from './helper/MongoConnection';

/**
 * Stores docuemnts into folder
 * @param documents Array of documents
 */
async function storeDocuments(documentsArray: Array<any>, options: IExportOptions): Promise<void> {
    createFolderIfNotExist(`/data/organisations/${process.env.SOURCE_ORG_ID}/${options.type}`);
    documentsArray.forEach((document) => {
        document.organisation = process.env.TARGET_ORG_ID;
        fs.writeFileSync(`${__dirname}/data/organisations/${process.env.SOURCE_ORG_ID}/${options.type}/${document._id}.json`, JSON.stringify(replaceObjectIDs(document)));
    });
}

/**
 * Retrieves the documents for the selected source
 */
async function retrieveDocuments(options: IExportOptions): Promise<Array<any>> {
    logGreen(`Loading documents ...`);

    const analyticsDB = MongoConnection.getConnection().db(options.db);
    return await analyticsDB.collection(options.collection).find({ organisation: process.env.SOURCE_ORG_ID }).toArray();
}

/**
 * Main export function for the selected source
 */
export async function exportDocuments(options: IExportOptions): Promise<Number> {
    const analyticsdata = await retrieveDocuments(options);
    await storeDocuments(analyticsdata, options);
    return Promise.resolve(analyticsdata.length);
}