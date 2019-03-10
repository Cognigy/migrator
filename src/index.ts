
import * as fs from 'fs-extra';
import { logGreen, logRed } from './helper/logger';
import { connectToMongo } from './helper/MongoConnection';
import * as inquirer from 'inquirer';
import { MongoClient, ObjectID } from 'mongodb';
import { IProject } from './helper/interfaces';

let mongoClient: MongoClient = null;
let allProjects = [];

function startMessage(): void {
    logGreen("**************************************************************");
    logGreen("*               COGNIGY.AI MIGRATION TOOL v3.3               *");
    logGreen("*          currently this tool only supports exports         *");
    logGreen("**************************************************************");
    logGreen("");
}

async function dbConnection(): Promise<void> {
    logGreen(`Attempting to connect to MongoDB at ${process.env.SOURCE_DB_HOST}:${process.env.SOURCE_DB_PORT}`);

    try {
        mongoClient = await connectToMongo();
        logGreen("Connected to MongoDB");
        return Promise.resolve();
    } catch (err) {
        return Promise.reject(err);
    }
}

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

async function selectProject(projects: any[]): Promise<any> {
    allProjects = projects;
    logGreen(`We have retrieved ${projects.length} projects for the source organisation:`);
    try {
        const projectChoices = [];
        projects.forEach((project) => { projectChoices.push({ name: `${project._id.toString()} - (${project.name})`, value: project._id.toString() }); } );
        return inquirer
            .prompt([
                {
                    type: 'list',
                    message: 'Select Project to export',
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

async function createFolderIfNotExist(path: string): Promise<void> {
    let fullPath = __dirname + "/" + path;
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath);
    }
}

async function storeProject(project: IProject): Promise<void> {
    createFolderIfNotExist(`/data`);
    createFolderIfNotExist(`/data/${process.env.SOURCE_ORG}`);
    if (fs.existsSync(`${__dirname}/data//${process.env.SOURCE_ORG}/${project._id}`)) fs.removeSync(`${__dirname}/data//${process.env.SOURCE_ORG}/${project._id}`);
    createFolderIfNotExist(`/data/${process.env.SOURCE_ORG}/${project._id}`);
    fs.writeFileSync(`${__dirname}/data/${process.env.SOURCE_ORG}/${project._id}/${project._id}.json`, JSON.stringify(project));
    logGreen("Stored project JSON...");
}

async function storeResources(type: string, resources: Array<any>, project: IProject): Promise<void> {
    createFolderIfNotExist(`/data/${process.env.SOURCE_ORG}/${project._id}/${type}`);
    resources.forEach((resource) => {
        fs.writeFileSync(`${__dirname}/data/${process.env.SOURCE_ORG}/${project._id}/${type}/${resource._id}.json`, JSON.stringify(resource));
    });
}

async function retrieveResources(resources: any, selectedProject: IProject): Promise<any> {
    logGreen(`Storing project resources ...`);
    for (let resourceType of Object.keys(resources)) {
        if (resources[resourceType].length > 0) {
            let resourceDBName = resourceType;
            if (resourceType === "databaseconnections") resourceDBName = "database-connections";
            if (resourceType === "nlpconnectors") resourceDBName = "nlp-connectors";
            const resourceDB = mongoClient.db(resourceDBName);
            for (let resource of resources[resourceType]) {
                if (resourceType === "flows") {
                    let retrievedFlows = await resourceDB.collection(resourceType).find({ parentId: resource }).toArray();
                    await storeResources("flows", retrievedFlows, selectedProject);
                    logGreen(`Stored flows with parentId ${resource} ...`);
                } else {
                    let retrievedResource = await resourceDB.collection(resourceType).find({ _id: resource }).toArray();
                    await storeResources(resourceType, retrievedResource, selectedProject);
                    logGreen(`Stored ${resourceType} with id ${resource} ...`);
                }
            }
        }
    }
}

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

async function start(): Promise<void> {
    try {
        startMessage();
        await dbConnection();
        const projects = await getProjects();
        const selectedProject = await selectProject(projects);
        await exportProject(selectedProject);
        logGreen("");
        logGreen("DONE - your export has been saved to disc.");
    } catch (err) {
        logRed(err);
    }

}

start();