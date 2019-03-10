import * as fs from 'fs-extra';
import { ObjectID } from 'mongodb';

/**
 * Creates a folder if it doesn't exist yet
 * @param path Path of the folder to create
 */
export async function createFolderIfNotExist(path: string): Promise<void> {
    let fullPath = __dirname + "/../" + path;
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath);
    }
}

/**
 * Converts ObjectIDs in a JSON file to correct format for import
 * @param resource Resource object to check
 */
export function replaceObjectIDs(resource: any): any {
    if (typeof resource === 'object') {
            Object.keys(resource).forEach((key) => {
                if (typeof resource[key] === 'object' && resource[key] instanceof ObjectID) resource[key] = { "$oid": resource[key].toString() };
                else if (Array.isArray(resource[key])) {
                    resource[key].forEach((element) => {
                        element = replaceObjectIDs(resource[key]);
                    });
                } else if (typeof resource[key] === 'object') resource[key] = replaceObjectIDs(resource[key]);
            });
    }
    return resource;
}