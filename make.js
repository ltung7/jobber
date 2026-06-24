import fs from 'fs';
import path from 'path';
import inspect from './sc/inspect.js';

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1)

const type = process.argv[2];
const name = process.argv[3];
const objName = capitalize(name);

const makeFolders = async (currentPath, nodes) => {
    if (nodes.length === 0) return true;
    const node = nodes.splice(0, 1);
    const folderPath = currentPath + '/' + node;
    const exists = fs.existsSync(folderPath);
    if (!exists) await fs.promises.mkdir(folderPath);
    return await makeFolders(folderPath, nodes);
}

const DEFAULT_LANG_FILE_CONTENT = 'export default {\n\n};'

const makeLanguageGroups = async () => {
    const langFolder = path.join('src', 'i18n');
    const files = await fs.promises.readdir(langFolder);
    const filename = name + '.ts';
    for (const file of files) {
        if (file.length > 2) continue;
        await fs.promises.writeFile(path.join(langFolder, file, filename), DEFAULT_LANG_FILE_CONTENT);
        
        const indexFilePath = path.join(langFolder, file, 'index.ts');
        let indexFileContent = await fs.promises.readFile(indexFilePath, 'utf-8');
        if (indexFileContent.indexOf(name) !== -1) continue;

        const importIndex = indexFileContent.indexOf("\n\n/**");
        indexFileContent = [ indexFileContent.slice(0, importIndex), `\nimport ${name} from './${name}'\n`, indexFileContent.slice(importIndex + 1) ].join('');
        
        const keyIndex = indexFileContent.indexOf(',\n\thi');
        indexFileContent = [ indexFileContent.slice(0, keyIndex), `,\n\t${name},`, indexFileContent.slice(keyIndex + 1) ].join('');

        await fs.promises.writeFile(indexFilePath, indexFileContent);
    }
}

const makeSchema = async () => { 
    await make(CONFIG.schemaconfig);
    const indexFile = path.join('src', CONFIG.schemaconfig.path + '/index.ts');

    const files = await fs.promises.readdir(path.join('src', CONFIG.schemaconfig.path));
    const exportIndex = {};
    let contents = 'export interface BQSchemaField {\r\n    name: string,\r\n    type: string,\r\n    mode: string,\r\n    description: string\r\n}\r\n\r\n' + 
        'export interface BQSchema {\r\n    fields: Array<BQSchemaField>,\r\n    index?: Array<string>,\r\n    editable?: string\r\n}\r\n\r\n';
    for (const file of files) {
        const group = file.split('.')[0].split('_');
        const prefix = group.shift();
        const suffix = group.join('_');
        if (group.length < 1 || prefix === 'template') continue;
        const name = `${prefix}_${suffix}`;
        contents += `import ${name} from './${file.replace('.ts', '')}'\r\n`;
        if (!exportIndex[prefix]) exportIndex[prefix] = [];
        exportIndex[prefix].push(name);
    }

    contents += '\r\nexport default {\r\n';
    for (const [ groupName, groupItems ] of Object.entries(exportIndex)) {
        contents += `\t${groupName}: {\r\n`;
        for (const item of groupItems) {
            contents += `\t\t${item},\r\n`;
        }
        contents += '\t},\r\n';
    }
    contents += '} as Record<string, Record<string, BQSchema>>';
    
    await fs.promises.writeFile(indexFile, contents);
}

const makeAdapter = async () => {
    const templatePath = ROUTE_TEMPLATE_FOLDER + '/template.adapter.ts';
    let content = await fs.promises.readFile(templatePath, 'utf-8');
    const adapterPath = `src/lib/server/adapters/${name}/${name}.class.ts`
    await fs.promises.writeFile(adapterPath, content.replaceAll('__objName__', objName));
}

const makeNotification = async () => {
    const created = await make(CONFIG.notificationTemplate);
    if (!created) return;
    const notificationName = objName + 'Notification';
    const indexRoute = path.join('src', 'lib/server/services/createNotification.service.ts');
    let content = await fs.promises.readFile(indexRoute, 'utf-8');
    const importIndex = content.indexOf('import { createUserNotifications }');
    content = insertString(content, importIndex, `import ${notificationName} from "$lib/mails/${notificationName}.svelte"\r\n`);
    const renderersIndex = content.indexOf('NOTIFICATION_RENDERERS');
    const renderersEndIndex = content.indexOf('}', renderersIndex);
    content = insertString(content, renderersEndIndex, `    ${name.toLowerCase()}: ${notificationName},\r\n`)
    content += `\r\n\r\nexport const create${notificationName} = async (data, flags = []) => {\r\n    const subject = "${objName}"\r\n    return createUserNotifications(SUPER_ADMIN, subject, '${name.toLowerCase()}', data, flags);\r\n}`
    await fs.promises.writeFile(indexRoute, content);
}

const ROUTE_TEMPLATE_FOLDER = 'src/lib/templates';
const CONFIG = {
    db: {
        route: false,
        path: 'lib/server/db/tables',
        files: {
            'template.db.ts': [ 'name', 'objName' ]
        }
    },
    fdb: {
        route: false,
        path: 'lib/server/db/firebase',
        files: {
            'template.fdb.ts': [ 'name', 'objName' ]
        }
    },
    schemaconfig: {
        route: false,
        path: 'lib/server/db/schemas',
        files: {
            'template.schema.ts': [ 'name', 'extra' ]
        }
    },
    service: {
        route: false,
        path: 'lib/server/services',
        files: {
            'template.service.ts': [ 'name' ]
        }
    },
    task: {
        route: false,
        path: 'lib/server/tasks',
        files: {
            'template.task.ts': [ 'name', 'objName' ]
        },
        indexName: 'taskIndex.service.ts',
        index: [
            { before: '\n/**', txt: "import __name__ from './__name__.task';\r\n" },
            { before: '\n};', txt: ",\r\n    __name__" }
        ]
    },
    generator: {
        route: false,
        path: 'lib/server/services/generators',
        files: {
            'template.generator.ts': [ 'name', 'objName' ]
        },
        index: [
            { before: '\r\nexport default', txt: "import __name__ from './__name__.generator'\r\n" },
            { before: '\r\n}', txt: ",\r\n    __name__" }
        ]
    },
    connector: {
        route: false,
        path: 'lib/server/connectors',
        files: {
            'template.connector.ts': [ 'name', 'objName' ]
        },
        index: [
            { before: '\r\nexport default', txt: "import __name__ from './__name__.connector'\r\n" },
            { before: '\r\n}', txt: ",\r\n    __name__" }
        ]
    },
    oauth: {
        route: false,
        path: 'lib/server/connectors',
        files: {
            'template2.connector.ts': [ 'name', 'objName' ]
        },
        index: [
            { before: '\r\nexport default', txt: "import __name__ from './__name__.connector'\r\n" },
            { before: '\r\n}', txt: ",\r\n    __name__" },
            { after: 'export const oauth2Connectors = {', txt: "\r\n    __name__," }
        ]
    },
    mail: {
        route: false,
        path: 'lib/mails',
        files: {
            'TemplateMail.svelte': [ 'name' ]
        }
    },
    test: {
        route: false,
        path: 'tests',
        files: {
            'template.test.ts': [ 'name', 'objName' ]
        }
    },
    notificationTemplate: {
        route: false,
        path: 'lib/mails',
        files: {
            'TemplateNotification.svelte': [ 'name' ]
        }
    },
    phconv: {
        route: false,
        path: 'lib/server/services/phenomena/feeds',
        files: {
            'template.converter.ts': [ 'name' ],
            'template.errors.tson': []
        },
        index: [
            { before: '\r\nexport default', txt: "import __name__ from './__name__.converter'\r\n" },
            { before: '\r\n}', txt: ",\r\n    __name__" }
        ]
    },
    logs: {
        route: true,
        path: 'routes/(protected)/(admin)/admin/logs/',
        files: [ {
            template: 'template.logs.svelte',
            target: '+page.svelte',
            replace: [
                'rootName'
            ]
        }, {
            template: 'template.logs.ts',
            target: '+page.server.ts',
            replace: [
                'rootName'
            ]
        } ]
    },
    page: {
        route: true,
        path: 'routes/',
        files: [ {
            template: 'template.page.svelte',
            target: '+page.svelte',
            replace: [
                'rootName'
            ]
        } ]
    },
    instr: {
        route: true,
        path: 'routes/(common)/instructions',
        files: [ {
            template: 'template.instruction.svelte',
            target: '+page.svelte',
            replace: [
                'rootName',
                'tagName'
            ]
        } ]
    },
    api: {
        route: true,
        path: 'routes/(api)/api',
        files: [ {
            template: 'template.server.ts',
            target: '+server.ts',
            replace: [
                'root',
                'rootName'
            ]
        } ]
    },
    superform: {
        route: true,
        path: 'routes/(admin)/',
        files: [
            { 
                template: 'superform.new.template.ts',
                target: 'new/+page.server.ts',
                replace: [ 'root', 'rootName' ]
            },
            {
                template: 'superform.id.template.ts',
                target: '[id]/+page.server.ts',
                replace: [ 'root', 'rootName' ]
            },
            {
                template: 'superform.template.svelte',
                target: 'new/+page.svelte',
                replace: [ 'name' ]
            },
            {
                template: 'superform.template.svelte',
                target: '[id]/+page.svelte',
                replace: [ 'name' ]
            },
            {
                template: 'superform.schema.template.ts',
                target: '__root__.schema.ts',
            }
        ]

    },
    lang: makeLanguageGroups,
    schema: makeSchema,
    adapter: makeAdapter,
    notification: makeNotification
}

function insertString(str, index, insert) {
    return str.substring(0, index) + insert + str.substring(index);
}

const tagify = (str) => str.split('/').join('-').toLowerCase()

const make = async (model) => {
    let created = false;
    if (model.route) {
        let pathNodes = name.split('/');
        const folderPath = path.join('src', model.path);
        await makeFolders(folderPath, pathNodes)
        pathNodes = name.split('/');
        const root = pathNodes[0]
        const replacables = { name, objName, root, rootName: capitalize(root), tagName: tagify(name) };

        for (const file of model.files) {
            const sourceFile = path.join(ROUTE_TEMPLATE_FOLDER, file.template);
            let content = await fs.promises.readFile(sourceFile, 'utf-8');
            if (file.replace) {
                for (const replacable of file.replace) {
                    const textFind = `__${replacable}__`;
                    content = content.replaceAll(textFind, replacables[replacable]);
                }
            }
            if (file.target.indexOf('__root__') >= 0) {
                file.target = file.target.replace('__root__', replacables.root);
            }
            const targetPath = path.join('src', model.path, ...pathNodes, file.target);
            const newfolderPosition = file.target.indexOf('/')
            if (newfolderPosition > 0) {
                const targetPathFolder = path.join('src', model.path, ...pathNodes);
                const newFolder = file.target.substring(0, newfolderPosition);
                await makeFolders(targetPathFolder, [ newFolder ])
            }
            try {
                await fs.promises.access(targetPath)
            } catch (err) {
                err;
                created = true;
                await fs.promises.writeFile(targetPath, content);
            }
        }
    } else {
        if (model.files) {
            for (const [ file, replace ] of Object.entries(model.files)) {
                let targetFilename = file.replace('template2', name).replace('template', name).replace('Template', objName);
                const sourceFile = path.join('src', model.path, file);
                const targetFile = path.join('src', model.path, targetFilename);
                
                let content = await fs.promises.readFile(sourceFile, 'utf-8');
                if (replace && replace.length) {
                    const replacables = { name, objName };
                    for (const replacable of replace) {
                        const textFind = `__${replacable}__`;
                        content = content.replaceAll(textFind, replacables[replacable]);
                    }
                }
                
                try {
                    await fs.promises.access(targetFile)
                } catch (err) {
                    err;
                    created = true;
                    await fs.promises.writeFile(targetFile, content);
                }
            }
        }

        if (model.index && created) {
            const indexFile = path.join('src', model.path, model.indexName ?? 'index.ts');
            let content = await fs.promises.readFile(indexFile, 'utf-8');
            for (const insertion of model.index) {
                if (insertion.before) {
                    const index = content.indexOf(insertion.before);
                    if (index > 0) {
                        const insert = insertion.txt.replaceAll('__name__', name);
                        content = insertString(content, index, insert)
                    }
                }
                if (insertion.after) {
                    const index = content.indexOf(insertion.after);
                    if (index > 0) {
                        const insert = insertion.txt.replaceAll('__name__', name);
                        content = insertString(content, index + insertion.after.length, insert)
                    }
                }
            }

            await fs.promises.writeFile(indexFile, content);
        }
    }

    if (created) {
        inspect(`The ${type} of ${objName} as been created`);
        return true
    }
    else {
        inspect(`Failed to create ${type} of ${objName} - file already exists`, '\x1b[35m%s\x1b[0m');
        return false;
    }
}

const model = CONFIG[type];
if (!model) throw new Error('Invalid type')
if (typeof model === 'object') make(model);
else model();