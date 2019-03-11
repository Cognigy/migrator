import * as fs from 'fs-extra';
import { createFolderIfNotExist, replaceObjectIDs, checkFlowDependencies } from './helper/utils';
import { logGreen, logRed } from './helper/logger';
import { connectToMongo } from './helper/MongoConnection';
import * as inquirer from 'inquirer';
import { MongoClient, ObjectID } from 'mongodb';
import { IProject } from './helper/interfaces';

// global Mongo connection
let mongoClient: MongoClient = null;

// global variable to store projects
let allProjects = [];

/**
 * Prints the welcome message
 */
function showWelcomeMessage(): void {
    logGreen("**************************************************************");
    logGreen("*               COGNIGY.AI MIGRATION TOOL v3.3               *");
    logGreen("*          currently this tool only supports exports         *");
    logGreen("**************************************************************");
    logGreen("");
}

/**
 * Connects to the source database
 */
async function connectToDB(): Promise<void> {
    logGreen(`Attempting to connect to MongoDB at ${process.env.SOURCE_DB_HOST}:${process.env.SOURCE_DB_PORT}`);

    try {
        mongoClient = await connectToMongo();
        logGreen("Connected to MongoDB");
        return Promise.resolve();
    } catch (err) {
        return Promise.reject(err);
    }
}

/**
 * Retrieve all projects for the given Source Org
 */
async function getProjects(): Promise<any> {
    try {
        const projectsDB = mongoClient.db("projects");
        return projectsDB.collection("projects")
            .find({ organisation: new ObjectID(process.env.SOURCE_ORG) })
            .toArray();
    } catch (err) {
        return Promise.reject(err);
    }
}

/**
 * Display the list of projects and allow selection
 * @param projects Array of projects
 */
async function selectProject(projects: any[]): Promise<any> {
    allProjects = projects;
    logGreen(`We have retrieved ${projects.length} projects for the source organisation:`);
    try {
        const projectChoices = [];
        projects.forEach((project) => { projectChoices.push({ name: `${project._id.toString()} - (${project.name})`, value: project._id.toString() }); } );
        return inquirer
            .prompt([
                {
                    type: 'checkbox',
                    message: 'Select Projects to export',
                    name: 'project',
                    choices: projectChoices,
                    validate: (answer) => {
                        if (answer.length < 1) {
                            return 'You must choose at least one project.';
                        }
                        return true;
                    }
                }
            ])
            .then((answers) => answers.project );
    } catch (err) {
        return Promise.reject(err);
    }
}

/**
 * Creates folder structure for this project export and stores project JSON
 * @param project The selected project
 */
async function storeProject(project: IProject): Promise<void> {
    createFolderIfNotExist(`/data`);
    createFolderIfNotExist(`/data/organisations/`);
    createFolderIfNotExist(`/data/organisations/${process.env.SOURCE_ORG}`);
    createFolderIfNotExist(`/data/organisations/${process.env.SOURCE_ORG}/projects`);
    if (fs.existsSync(`${__dirname}/data/organisations/${process.env.SOURCE_ORG}/projects/${project._id}`)) fs.removeSync(`${__dirname}/data/organisations/${process.env.SOURCE_ORG}/projects/${project._id}`);
    createFolderIfNotExist(`/data/organisations/${process.env.SOURCE_ORG}/projects/${project._id}`);
    fs.writeFileSync(`${__dirname}/data/organisations/${process.env.SOURCE_ORG}/projects/${project._id}/${project._id}.json`, JSON.stringify(replaceObjectIDs(project)));
    logGreen("Stored project JSON...");
}



/**
 * Stores resources into folder
 * @param type Type of resource (e.g. flows)
 * @param resources Array of resources
 * @param project Project these resources belong to
 */
async function storeResources(type: string, resources: Array<any>, project: IProject): Promise<void> {
    createFolderIfNotExist(`/data/organisations/${process.env.SOURCE_ORG}/projects/${project._id}/${type}`);
    resources.forEach((resource) => {
        if (type === "flows") {
            // resolve dependencies in map
            checkFlowDependencies(resource);

            // set trained to false to force retraining
            if (resource && resource.newIntents && resource.newIntents.trained) resource.newIntents.trained = false;
            if (resource && resource.newIntents && resource.newIntents.modelId) resource.newIntents.modelId = null;
        }
        fs.writeFileSync(`${__dirname}/data/organisations/${process.env.SOURCE_ORG}/projects/${project._id}/${type}/${resource._id}.json`, JSON.stringify(replaceObjectIDs(resource)));
    });
}

/**
 * Retrieves the resources for a project
 * @param resources Object with resource arrays
 * @param selectedProject The selected project
 */
async function retrieveResources(resources: any, selectedProject: IProject): Promise<any> {
    logGreen(`Storing project resources ...`);
    for (let resourceType of Object.keys(resources)) {
        if (resources[resourceType].length > 0) {
            logGreen(`Retrieving ${resources[resourceType].length} ${resourceType.substr(0, resourceType.length - 1)}(s) ...`);
            let resourceDBName = resourceType;
            if (resourceType === "databaseconnections") resourceDBName = "database-connections";
            if (resourceType === "nlpconnectors") resourceDBName = "nlp-connectors";
            const resourceDB = mongoClient.db(resourceDBName);
            for (let resource of resources[resourceType]) {
                const query = (resourceType === "flows") ? { parentId: resource } : { _id: resource };
                let retrievedResource = await resourceDB.collection(resourceType).find(query).toArray();
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
async function exportProject(projectID: string): Promise<void> {
    const selectedProject: IProject = allProjects.find((element) => element._id.toString() === projectID);
    if (selectedProject) {
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

        selectedProject.resources.forEach((resource) => {
            switch (resource.type) {
                case "flow":
                    resources.flows.push(resource.parentId);
                    break;
                default:
                    resources[`${resource.type}s`].push(resource._id);
            }
        });

        resources.settings.push(selectedProject.settingsId);

        await retrieveResources(resources, selectedProject);
    }
}

/**
 * Wrapper function to get started
 */
async function start(): Promise<void> {
    try {
        // send welcome message
        showWelcomeMessage();

        // connect to the source mongodb
        await connectToDB();

        // get all projects for the given organisation
        const projects = await getProjects();

        // select a project
        const selectedProjects = await selectProject(projects);

        for (let selectedProject of selectedProjects) {
            logGreen("\n################################################################\nStarting export of project " + selectedProject);
            // start the export of the project
            await exportProject(selectedProject);
            logGreen("\nFinished export of project " + selectedProject + "\n################################################################\n");
        }

        // log success message
        logGreen("\nDONE - your export has been saved to disc.");
        process.exit(0);
    } catch (err) {
        logRed(err);
    }

}

start();