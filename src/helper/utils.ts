import * as fs from 'fs-extra';

export async function createFolderIfNotExist(path: string): Promise<void> {
    let fullPath = __dirname + "/../" + path;
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath);
    }
}