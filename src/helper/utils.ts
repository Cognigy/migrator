import * as fs from 'fs-extra';
import { ObjectID } from 'mongodb';
import { logRed } from './logger';
import * as _ from 'lodash';
import * as dependencyReplacements from '../dependencyReplacements.json';


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
 * Recursively traverses a resource and replaces Object IDs with the correct notation to re-import into MongoDB ($oid)
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
            } else if (!Array.isArray(resource[key]) && resource[key] && !resource["exampleSentences"] && resource[key].toString() && resource[key].toString().match(/^[a-f\d]{24}$/i)) {
                resource[key] = { "$oid": resource[key].toString() };
            } else if (typeof resource[key] === 'object') {
                if (key === "lexica") {
                    resource[key]._id = { "$oid": resource[key]._id.toString() };
                } else {
                    resource[key] = recursiveReplacer(resource[key]);
                }
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
    let clonedResource = recursiveReplacer(_.cloneDeep(resource));
    return clonedResource;
}

/**
 * Checks for dependencies such as Cognigy Lexicons and Cognigy Flows
 * These dependencies must be mapped in dependencyReplacements.json, otherwise an error is thrown
 * @param resource Flow to check
 */
export function checkFlowDependencies(resource: any): any {
    // Check if there are Cognigy lexica and if yes, check if they are in the dependency map
    if (resource && resource.lexica && resource.lexica.cognigy && Array.isArray(resource.lexica.cognigy) && resource.lexica.cognigy.length > 0) {
        // there are attached Cognigy Lexica
        resource.lexica.cognigy.forEach((value, index, sourceArray) => {
            if (dependencyReplacements[value]) sourceArray[index] = dependencyReplacements[value];
            else {
                logRed(`Missing dependency mapping in dependencyReplacements.json: COGNIGGY LEXICON ${value}\nPlease add this resource to the file.\nAborting...`);
                process.exit(0);
            }
        });
    }

    // Check if there are Cognigy attached Flows and if yes, check if they are in the dependency map
    if (resource && resource.attachedFlows && resource.attachedFlows.cognigy && Array.isArray(resource.attachedFlows.cognigy) && resource.attachedFlows.cognigy.length > 0) {
        // there are attached Cognigy Flows
        resource.attachedFlows.cognigy.forEach((value, index, sourceArray) => {
            if (dependencyReplacements[value]) sourceArray[index] = dependencyReplacements[value];
            else {
                logRed(`Missing dependency mapping in dependencyReplacements.json: ATTACHED COGNIGY FLOW ${value}\nPlease add this resource to the file.\nAborting...`);
                process.exit(0);
            }
        });
    }
}