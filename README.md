# Cognigy Environment Migrator

This tool allows for the export of a Cognigy.AI projects, including all resources, analytics, conversations, profiles and profile schemas to disc.

The resulting files can then easily be imported into another environment.

Please note that before importing a project, you need to change the organisation property in the project JSON file to the organisation ID on your new environment.

## How to use the tool
- Clone this repo
- Install dependencies (`npm install`)
- Compile with `npm run tsc`
- Create a `.env` file with your MongoDB admin credentials (see `.env-dist` for an example)
- Run `npm start`
- If everything goes well, you should see a list of projects for the organisation specified in the `.env` file
- Select the projects to export by pressing space
- The tool will now start to export your projects and their resources. This can take a while depending on connection speed and project size
- After the tool is done, you will see your exports in `./build/data/organisations/{orgId}/projects/{projectId}`

## Dependencies
Some resources, such as Cognigy Lexicons (e.g. citiesEN) or Cognigy Attached Flows (e.g. smalltalkEN) will have other IDs in the target and source environments.

For that reason you need to create a map and store it in dependencyReplacements.json. This map is used to translate the resources from one to the other environment.

## How to import
You can import the JSON files with the tool of your choice, for example [mongoimport](https://docs.mongodb.com/manual/reference/program/mongoimport/) or [Studio 3T](https://studio3t.com).

After you import a Flow, you will need to [re-train its Intents](https://docs.cognigy.com/docs/machine-learning-intents).
