import * as fs from 'fs-extra';
import { createFolderIfNotExist, replaceObjectIDs, checkFlowDependencies } from './helper/utils';
import { IProject } from './helper/interfaces';
import { logGreen, logRed } from './helper/logger';
import MongoConnection from './helper/MongoConnection';

/**
 * Creates folder structure for this project export and stores project JSON
 * @param project The selected project
 */
async function storeProject(project: IProject): Promise<void> {
    // create basic folder structure if it doesn't exist
    createFolderIfNotExist(`/data`);
    createFolderIfNotExist(`/data/organisations/`);
    createFolderIfNotExist(`/data/organisations/${process.env.SOURCE_ORG_ID}`);
    createFolderIfNotExist(`/data/organisations/${process.env.SOURCE_ORG_ID}/projects`);

    // delete project folder if it exists and recreate
    if (fs.existsSync(`${__dirname}/data/organisations/${process.env.SOURCE_ORG_ID}/projects/${project._id}`)) fs.removeSync(`${__dirname}/data/organisations/${process.env.SOURCE_ORG_ID}/projects/${project._id}`);
    createFolderIfNotExist(`/data/organisations/${process.env.SOURCE_ORG_ID}/projects/${project._id}`);

    // save project JSON
    project.organisation = process.env.TARGET_ORG_ID;
    fs.writeFileSync(`${__dirname}/data/organisations/${process.env.SOURCE_ORG_ID}/projects/${project._id}/${project._id}.json`, JSON.stringify(replaceObjectIDs(project)));
    logGreen("Stored project JSON...");
}



/**
 * Stores resources into folder
 * @param type Type of resource (e.g. flows)
 * @param resources Array of resources
 * @param project Project these resources belong to
 */
async function storeResources(type: string, resources: Array<any>, project: IProject): Promise<void> {
    createFolderIfNotExist(`/data/organisations/${process.env.SOURCE_ORG_ID}/projects/${project._id}/${type}`);
    resources.forEach((resource) => {
        if (type === "flows") {
            // resolve dependencies in map
            checkFlowDependencies(resource);

            // set trained to false to force retraining
            if (resource && resource.newIntents && resource.newIntents.trained) resource.newIntents.trained = false;
            if (resource && resource.newIntents && resource.newIntents.modelId) resource.newIntents.modelId = null;
        }
        fs.writeFileSync(`${__dirname}/data/organisations/${process.env.SOURCE_ORG_ID}/projects/${project._id}/${type}/${resource._id}.json`, JSON.stringify(replaceObjectIDs(resource)));
    });
}

/**
 * Retrieves the resources for a project
 * @param resources Object with resource arrays
 * @param selectedProject The selected project
 */
async function retrieveResources(resources: any, selectedProject: IProject): Promise<any> {
    logGreen(`Storing project resources ...`);

    // go through list of all resources
    for (let resourceType of Object.keys(resources)) {
        if (resources[resourceType].length > 0) {
            logGreen(`Retrieving ${resources[resourceType].length} ${resourceType.substr(0, resourceType.length - 1)}(s) ...`);

            // connect to the correct source db
            let resourceDBName = "service-" + resourceType;
            if (resourceType === "databaseconnections") resourceDBName = "service-database-connections";
            if (resourceType === "nlpconnectors") resourceDBName = "service-nlp-connectors";
            const resourceDB = MongoConnection.getConnection().db(resourceDBName);

            // go through all resources in resource type
            for (let resource of resources[resourceType]) {
                // retrieve resource from sourcedatabase
                const query = (resourceType === "flows") ? { parentId: resource } : { _id: resource };
                let retrievedResource = await resourceDB.collection(resourceType).find(query).toArray();

                // if resources found, execute store functions
                if (retrievedResource.length > 0) {
                    await storeResources(resourceType, retrievedResource, selectedProject);
                    logGreen(`Stored ${resourceType.substr(0, resourceType.length - 1)} with id ${resource} ...`);
                } else logGreen(`No ${resourceType} found. Continuing...`);
            }
        }
    }
}

/**
 * Main export function for the selected project
 * @param projectID The ID of the selected project
 */
export async function exportProject(projectID: string, allProjects: Array<any>): Promise<void> {
    const selectedProject: IProject = allProjects.find((element) => element._id.toString() === projectID);
    if (selectedProject) {
        // store project datastructure and metadata
        await storeProject(selectedProject);
        const resources = {
            flows: [],
            lexicons: [],
            playbooks: [],
            endpoints: [],
            forms: [],
            nlpconnectors: [],
            databaseconnections: [],
            secrets: [],
            settings: []
        };
        // store IDs of resources in resources arrays
        selectedProject.resources.forEach((resource) => {
            switch (resource.type) {
                case "flow":
                    resources.flows.push(resource.parentId);
                    break;
                default:
                    resources[`${resource.type}s`].push(resource._id);
            }
        });
        // add settings as a resource
        resources.settings.push(selectedProject.settingsId);

        await retrieveResources(resources, selectedProject);
    }
}