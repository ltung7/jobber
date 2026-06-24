// @ts-expect-error no types
import sql from 'mysql-bricks';
import sleep from '$lib/utils/sleep';
import { BigQuery, type Query } from '@google-cloud/bigquery';
import { getTableName } from './customQueries';
import { logger } from '$lib/utils/logger';

export const projectId = 'ecomsupportapp';
export const location = 'europe-central2';
export const bigquery = new BigQuery({ projectId });
export const PLACEHOLDER = '@v';

export let VERBOSE_QUERIES = false;

export interface SqlBuildResult {
    query: string,
    params: Record<string,any> | null,
    location: string
}

export const verboseQueries = (verbose: boolean = true) => {
    VERBOSE_QUERIES = verbose;
}

export const unverboseQueries = () => {
    VERBOSE_QUERIES = false;
}

export const objectifyValues = (list: ExplicitAnyToExtend[]) => {
    const values: Record<string,ExplicitAnyToExtend> = {};
    let counter = 0;
    for (const item of list) {
        values['v' + (++counter)] = item
    }
    return values;
}

export class DatabaseQuery {
    dataset: string;
    table: string;
    query: ExplicitAnyToExtend;
    constructor(dataset: string, table: string) {
        this.dataset = dataset;
        this.table = table;
    }

    source(dataset: string) {
        this.dataset = dataset;
        return this;
    }

    from(table: string) {
        this.table = table;
        return this;
    }

    where (query: ExplicitAnyToExtend) {
        this.query = query;
        return this;
    }

    buildQuery(_options: Record<string,any> = {}): SqlBuildResult | false {
        throw Error('ABSTRACT. Do not call this directly.')
    }

    dump() {
        const options = this.buildQuery() as Record<string,any>;
        if (options.params) options.params = JSON.stringify(options.params)
        logger.inspect(options);
        return this;
    }

    tablename() {
        return [ projectId, this.dataset, this.table ].join('.');
    }

    async exec(config: Record<string,any> = {}) {
        const options = this.buildQuery(config);
        if (!options) return;
        
        if (config.verbose || VERBOSE_QUERIES) logger.inspect(options);

        try {
            const [ job ] = await bigquery.createQueryJob(options as Query);
            const [ rows ] = await job.getQueryResults();
            if (config.format) return config.format(rows)
            return rows;
        } catch (err: unknown) {
            logger.inspect({ query: options.query, params: options.params ? Object.values(options.params).slice(0, 50) : null })
            logger.dberror(err);
        }
    }
}

interface JoinTableObject {
    fromTableField: string,
    tableName: string,
    joinTableField: string,
}

type AggregateMapFunction = (aggregatorUppercase: string, aggregator: string) => (field: string) => string;

export class SelectQuery extends DatabaseQuery {
    fields: string[] = [];
    limit: number = 0;
    offset: number = 0;
    groupBy: string = "";
    orderBy: string = "";
    distinct: string = "";
    joinTable: JoinTableObject | null = null;
    joinTables: JoinTableObject[] | null = null;

    select (fields: string[]) {
        this.fields = fields;
        return this;
    }

    distinctValues (distinct: string) {
        this.distinct = distinct;
        return this;
    }

    order(field: string, desc = false) {
        this.orderBy = field;
        if (desc) this.orderBy += ' DESC';
        return this;
    }

    page(page = 0, limit = 100) {
        this.offset = limit * page;
        this.limit = limit;
        return this;
    }

    limitRecords(limit = 100) {
        this.limit = limit;
        return this;
    }

    group(groupBy: string) {
        this.groupBy = groupBy;
        return this;
    }

    join(tableName: string, fromTableField: string = 'product_id', joinTableField: string = 'product_id') {
        this.joinTable = {
            tableName, fromTableField, joinTableField
        }
        return this;
    }

    joinMultiple(array: JoinTableObject[]) {
        this.joinTables = array;
        return this;
    }

    aggregateFunction = (fields: string[], aggregator: string, map: AggregateMapFunction) => {
        aggregator = aggregator.toLowerCase();
        const aggregatorUppercase = aggregator.toUpperCase();
        if (!Array.isArray(fields)) fields = [ fields ];
        this.fields = fields.map(item => map(aggregatorUppercase, aggregator)(item));
        if (this.groupBy) this.fields.push(this.groupBy);
        return this;
    }

    aggregate(fields: string[], aggregator = 'sum') {
        const map = (aggregatorUppercase: string, aggregator: string) => (field: string): string => `${aggregatorUppercase}(\`${field}\`) as \`${field}_${aggregator}\``;
        return this.aggregateFunction(fields, aggregator, map)
    }

    aggregateRaw(fields: string[], aggregator = 'sum') {
        const map = (aggregatorUppercase: string) => (field: string) => `${aggregatorUppercase}(\`${field}\`) as \`${field}\``;
        return this.aggregateFunction(fields, aggregator, map)
    }

    aggregateMapped(fields: string[], aggregator = 'sum') {
        const map = (aggregatorUppercase: string) => (field: string): string => 
            Array.isArray(field) ?
                `${aggregatorUppercase}(\`${field[0]}\`) as \`${field[1]}\`` :
                `${aggregatorUppercase}(\`${field}\`) as \`${field}\``;
        return this.aggregateFunction(fields, aggregator, map)
    }

    buildQuery(config: Record<string,any> = {}) {
        let queryBuilder = sql.select().from(this.tablename());
        if (this.fields) queryBuilder = queryBuilder.select(this.fields);
        if (this.query) {
            if (Array.isArray(this.query)) {
                for (const queryPart of this.query) {
                    queryBuilder = queryBuilder.where(queryPart); 
                }
            } else queryBuilder = queryBuilder.where(this.query);
        }
        if (this.limit) queryBuilder = queryBuilder.limit(this.limit);
        if (this.offset) queryBuilder = queryBuilder.offset(this.offset);
        if (this.groupBy) queryBuilder = queryBuilder.groupBy(this.groupBy);
        if (this.orderBy) queryBuilder = queryBuilder.orderBy(this.orderBy);
        if (this.distinct) queryBuilder = queryBuilder.distinct(this.distinct);
        else if (!this.fields) queryBuilder = queryBuilder.select('*');
        if (this.joinTable) {
            const joinTableName = getTableName(this.dataset, this.joinTable.tableName);
            const onQuery: Record<string,string> = {};
            onQuery[`\`${this.table}\`.${this.joinTable.fromTableField}`] = `\`${this.joinTable.tableName}\`.${this.joinTable.joinTableField}`;
            queryBuilder = queryBuilder.join(joinTableName, onQuery)
        }
        if (this.joinTables) {
            for (const joinTable of this.joinTables) {
                const joinTableName = getTableName(this.dataset, joinTable.tableName);
                const onQuery: Record<string,string> = {};
                onQuery[`\`${this.table}\`.${joinTable.fromTableField}`] = `\`${joinTable.tableName}\`.${joinTable.joinTableField}`;
                queryBuilder = queryBuilder.join(joinTableName, onQuery)
            }
        }
        queryBuilder = queryBuilder.toParams({ placeholder: PLACEHOLDER + '%d' });
        const options = {
            query: queryBuilder.text,
            params: objectifyValues(queryBuilder.values),
            location
        };

        if (!config) config = {};
        if (config.asArray) {
            const columnName  = this.table + '_array';
            options.query = `SELECT ARRAY (${options.query}) as \`${columnName}\``;
            if (config.format) {
                logger.error('config.format' + config.format)
                //@ts-expect-error TODO: unknown 
                config.format = (result: ExplicitAnyToExtend) => options.format(result[0][columnName]);
            } else {
                config.format = (result: ExplicitAnyToExtend) => result[0][columnName];
            }
        }
        return options;
    }

    async first(config = {}) {
        this.limit = 1;
        return this.exec(config).then(response => response[0]);
    }
}

export class UpdateQuery extends DatabaseQuery {
    newValues: Record<string,any> = {};
    values (newValues: Record<string,any>) {
        this.newValues = newValues;
        return this;
    }

    buildQuery() {
        const queryBuilder = sql.update(this.tablename(), this.newValues).where(this.query).toParams({ placeholder: PLACEHOLDER + '%d' });
        const options = {
            query: queryBuilder.text,
            params: objectifyValues(queryBuilder.values),
            location
        };
        return options;
    }
}

export class DeleteQuery extends DatabaseQuery {
    buildQuery() {
        if (!this.query) throw new Error('Deleting withour WHERE clause is forbidden');
        const queryBuilder = sql.delete(this.tablename()).where(this.query).toParams({ placeholder: PLACEHOLDER + '%d' });
        const options = {
            query: queryBuilder.text,
            params: objectifyValues(queryBuilder.values),
            location
        };
        return options;
    }
}

export class InsertQuery extends DatabaseQuery {
    json: boolean = false;
    insertable: ExplicitAnyToExtend[] = [];

    asJson(json = true) {
        this.json = json;
    }

    values(insertable: ExplicitAnyToExtend[]) {
        this.insertable = insertable;
        return this;
    }

    push(record: ExplicitAnyToExtend) {
        if (!this.insertable) this.insertable = [ record ];
        else if (Array.isArray(this.insertable)) this.insertable.push(record);
        else this.insertable = [ this.insertable, record ];
        return this.insertable.length;
    }

    buildQuery(config: Record<string,ExplicitAnyToExtend> = {}) {
        if (!this.insertable || this.insertable.length === 0) return false;
        const queryBuilder = sql.insert(this.tablename()).values(this.insertable).toParams({ placeholder: PLACEHOLDER + '%d' });
        const options = {
            query: queryBuilder.text,
            params: objectifyValues(queryBuilder.values),
            location
        };

        if ((this.json || config.json) && options.params) {
            for (const [ index, value ] of Object.entries(options.params)) {
                if (typeof value === 'object') options.query = options.query.replace('@' + index, 'JSON \'' + JSON.stringify(value) + '\'');
            }
        }

        this.insertable = [];
        return options;
    }
} 

export class InsertSerialQuery extends InsertQuery {
    maxSize: number;
    aoa: boolean;
    constructor(dataset: string, table: string, maxSize: number = 1000, isArrayOfArrays: boolean = false, json: boolean = false) {
       super(dataset, table);
       this.maxSize = maxSize;
       this.insertable = [];
       this.aoa = isArrayOfArrays;
       this.json = json;
    }

    arrayOfArrays (isArrayOfArrays = true) {
        this.aoa = isArrayOfArrays
    }

    size(maxSize: number) { 
        this.maxSize = maxSize
    }

    async processRecord (record: ExplicitAnyToExtend) {
        const size = this.push(record);
        if (size >= this.maxSize) {
            if (this.aoa) this.insertable = Array.prototype.concat.apply([], this.insertable);
            const results = await this.exec();
            this.insertable = [];
            return results;
        }
    }

    async processRemainder() {
        if (this.aoa) this.insertable = Array.prototype.concat.apply([], this.insertable);
        const results = await this.exec();
        this.insertable = [];
        return results;
    }

    async processBatch (batch: ExplicitAnyToExtend[], options: Record<string,any> = {}) {
        do {
            this.insertable = batch.splice(0, this.maxSize);
            if (this.aoa) this.insertable = Array.prototype.concat.apply([], this.insertable);
            await this.exec(options);
            this.insertable = [];
            if (batch.length) await sleep(500);
        } while(batch.length)

    }
}