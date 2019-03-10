# Cognigy Environment Migrator
This tool allows for the export of a Cognigy.AI project, including all resources, to disc.

The resulting files can then easily be imported into another environment.

Please note that before importing a project, you need to change the organisation property in the project JSON file to the organisation ID on your new environment.

## How to use the tool
- Clone this repo
- Install dependencies
- Compile with `tsc`
- Create a .env file with your MongoDB admin credentials (see .env-dist for an example)
- Run `npm start`
- If everything goes well, you should see a list of projects
- Select the projects to export
- The tool will now start to export your projects and resources. This can take a while depending on connection speed and project size
- After the tool is done, you will see your export in `./build/data/{projectId}`

