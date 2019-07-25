export interface IProjectResource {
    _id: string;
    parentId?: string;
    name: string;
    type: string;
    properties: Array<any>;
    createdAt: Number;
    lastChanged: Number;
    createdBy: string;
    lastChangedBy: string;
}

export interface IProject {
    _id: string;

    /* the mongo object id of the organisation this project belongs to */
	organisation: string | number;

	/* the color of this project - contains a css-palette color */
	color: string;

	/* the project wide settings for this project */
	settingsId: string;

	/* the meta data of all referenced resources within this project */
	resources: IProjectResource[];
}