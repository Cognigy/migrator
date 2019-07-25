
import { logGreen, logRed } from './helper/logger';
import MongoConnection from './helper/MongoConnection';
import * as inquirer from 'inquirer';
import { ObjectID } from 'mongodb';
import * as projects from './project';
import { IExportOptions } from './helper/interfaces';
import { exportDocuments } from './documents';

// global variable to store projects
let allProjects = [];

/**
 * Prints the welcome message
 */
function showWelcomeMessage(): void {
    logGreen("**************************************************************");
    logGreen("*               COGNIGY.AI MIGRATION TOOL v3.4               *");
    logGreen("*          currently this tool only supports exports         *");
    logGreen("**************************************************************");
    logGreen(`*         Exporting for Org ${process.env.SOURCE_ORG}         *`);
    logGreen("**************************************************************");
    logGreen("");
}

/**
 * Asks the user what they want to do
 */
async function showTaskSelection(): Promise<any> {
    return inquirer
        .prompt([
            {
                type: 'list',
                name: 'theme',
                message: 'What do you want to export?',
                choices: [
                    'Projects',
                    'Analytics',
                    'Conversations',
                    'Profiles'
                ]
            }
        ])
        .then(answers => {
            return answers.theme;
        });
}

/**
 * Connects to the source database
 */
async function connectToDB(): Promise<any> {
    logGreen(`Attempting to connect to MongoDB at ${process.env.SOURCE_DB_HOST}:${process.env.SOURCE_DB_PORT}`);

    try {
        await MongoConnection.connectToMongo();
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
        const mongoClient = MongoConnection.getConnection();
        const projectsDB = mongoClient.db("projects");
        return projectsDB.collection("projects")
            .find({ organisation: new ObjectID(process.env.SOURCE_ORG_ID) })
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
 * Wrapper function to get started
 */
async function start(): Promise<void> {
    try {
        // send welcome message
        await showWelcomeMessage();

        // connect to the source mongodb
        const mongoClient = await connectToDB();

        // select what to export
        const task = await showTaskSelection();

        switch (task) {
            case "Projects":
                // get all projects for the given organisation
                const projects = await getProjects();

                // select a project
                const selectedProjects = await selectProject(projects);

                for (let selectedProject of selectedProjects) {
                    logGreen("\n################################################################\nStarting export of project " + selectedProject);
                    // start the export of the project
                    await projects.exportProject(selectedProject, allProjects);
                    logGreen("\nFinished export of project " + selectedProject + "\n################################################################\n");
                }

                // log success message
                logGreen("\nDONE - your project export has been saved to disc.");
                break;

            case "Conversations":
                break;

            case "Analytics":
                    const exportOptions: IExportOptions = {
                        type: 'analytics',
                        db: 'service-analytics-collector',
                        collection: 'analytics'
                    };

                    logGreen("\n################################################################\n");
                    logGreen("Starting export of " + task);
                    const docCount = await exportDocuments(exportOptions);
                    logGreen(`\nFinished export of ${docCount} ${task} Records\n`);
                    logGreen("################################################################\n");
                break;

            case "Profiles":
                break;

            default:
                logGreen(`\nStarting task ${task}.`);
        }

        process.exit(0);
    } catch (err) {
        logRed(err);
    }

}

start();
