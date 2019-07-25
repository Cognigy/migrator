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
    createFolderIfNotExist(`/data`);
    createFolderIfNotExist(`/data/organisations/`);
    createFolderIfNotExist(`/data/organisations/${process.env.SOURCE_ORG_ID}`);
    createFolderIfNotExist(`/data/organisations/${process.env.SOURCE_ORG_ID}/${options.type}`);
    documentsArray.forEach((document) => {
        if (options.replaceObjectIDs) {
            document.organisation = process.env.TARGET_ORG_ID;
            fs.writeFileSync(`${__dirname}/data/organisations/${process.env.SOURCE_ORG_ID}/${options.type}/${document._id}.json`, JSON.stringify(replaceObjectIDs(document)));
        } else {
            document.organisation = {
                "$oid": process.env.TARGET_ORG_ID
            };
            fs.writeFileSync(`${__dirname}/data/organisations/${process.env.SOURCE_ORG_ID}/${options.type}/${document._id}.json`, JSON.stringify(document));
        }
    });
}

/**
 * Retrieves the documents for the selected source
 */
async function retrieveDocuments(options: IExportOptions): Promise<Array<any>> {
    const analyticsDB = MongoConnection.getConnection().db(options.db);
    return await analyticsDB.collection(options.collection).find({ organisation: process.env.SOURCE_ORG_ID }).toArray();
}

/**
 * Main export function for the selected source
 */
export async function exportDocuments(options: IExportOptions): Promise<Number> {
    logGreen(`Loading ${options.type} documents from MongoDB ...`);
    const documentdata = await retrieveDocuments(options);
    logGreen(`Retrieved ${documentdata.length} documents.`);
    logGreen(`Storing documents ...`);
    await storeDocuments(documentdata, options);
    logGreen(`Stored documents to ./build/data/...`);
    return Promise.resolve(documentdata.length);
}