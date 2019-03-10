import * as fs from 'fs-extra';
import { ObjectID } from 'mongodb';
import { logGreen } from './logger';
import * as _ from 'lodash';

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
 * DEPRECATED Function, not used
 * @param resource The resource to clone
 */
function recursiveReplacer(resource: any): any {
    if (resource === null) return resource;

    if (Array.isArray(resource)) {
        resource.forEach((element, index, theArray) => {
            theArray[index] = recursiveReplacer(element);
        });
     } else if (resource instanceof ObjectID || resource.toString() && resource.toString().match(/^[a-f\d]{24}$/i)) {
        resource = { "$oid": resource.toString() };
    } else if (typeof resource === 'object') {
        Object.keys(resource).forEach((key) => {
            if (key === "_id" || (typeof resource[key] === 'object' && resource[key] instanceof ObjectID)) {
                resource[key] = { "$oid": resource[key].toString() };
            } else if (!Array.isArray(resource[key]) && resource[key] && resource[key].toString() && resource[key].toString().match(/^[a-f\d]{24}$/i)) {
                resource[key] = { "$oid": resource[key].toString() };
            } else if (typeof resource[key] === 'object') {
                resource[key] = recursiveReplacer(resource[key]);
            }
        });
    }
    return resource;
}

/**
 * Converts ObjectIDs in a JSON file to correct format for import
 * @param resource Resource object to check
 */
export function replaceObjectIDs(resource: any): any {
    /*let clonedResource = _.cloneDeepWith(resource, (value,) => {
        if (value instanceof ObjectID) return { "$oid": value.toString() };
        else return undefined;
    });*/
    let clonedResource = recursiveReplacer(_.cloneDeep(resource));
    return clonedResource;
}