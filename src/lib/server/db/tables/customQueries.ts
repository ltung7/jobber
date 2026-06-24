import { LOGGER_COLORS, logger } from "$lib/utils/logger";
import { DatabaseQuery, location, bigquery, projectId,  PLACEHOLDER, objectifyValues, DeleteQuery, InsertQuery } from "./query";
import sql from 'sql-bricks';

export const getTableName = (dataset: string, table: string) => [ projectId, dataset, table ].join('.');

export const runCustomQuery = async (queryString: string, queryParameters: Record<string,any> | null = null, verbose = false) => {
    const query = new CustomQuery();
    return query.run(queryString.toString(), queryParameters, verbose);
}

export class CustomQuery extends DatabaseQuery {
    queryString = '';
    constructor(database: string = '', table: string = '') {
        super(database, table);
    }

    setQuery (queryString: string) {
        this.queryString = queryString;
        return this;
    }

    buildQuery() {
        return { location, query: this.queryString, params: null }
    }

    async run(query: string | any, params: Record<string,any> | null = null, verbose = false) {
        let options: Record<string,any>;
        if (typeof query === 'string') {
            options = { query: query.toString(), location }
            if (params) options.params = params;
            if (verbose) logger.inspect(options);
        } else {
            const queryParams = query.toParams({ placeholder: PLACEHOLDER + '%d' })
            options = {
                query: queryParams.text,
                params: objectifyValues(queryParams.values),
                location
            };
        }
        try {
            const [ job ] = await bigquery.createQueryJob(options);
            const [ rows ] = await job.getQueryResults();
            return rows;
        } catch (err: unknown) {
            logger.inspect({ query: options.query, params: options.params ? Object.values(options.params).slice(0, 50) : null })
            logger.dberror(err);
        }
    }
}

export class TruncateQuery extends CustomQuery {
    buildQuery() {
        return { location, query: 'TRUNCATE TABLE '+ this.tablename(), params: null }
    }
}

export class CreateIndexQuery extends CustomQuery {
    fields(fields: string[]) {
        if (!Array.isArray(fields)) fields = [ fields ];
        const name = 'si_' + fields.join('_');
        // CREATE SEARCH INDEX my_index ON dataset.simple_table(a, c);
        return this.setQuery(`CREATE SEARCH INDEX ${name} ON ${this.tablename()} (${fields.join(', ')})`)
    }
}

class IndexedBufferQuery extends CustomQuery {
    buffer: ExplicitAnyToExtend[];
    indexField: string;
    constructor(dataset: string, table: string, indexField: string) {
        super(dataset, table);
        this.buffer = [];
        this.indexField = indexField;
    }

    index(field: string) {
        this.indexField = field;
        return this;
    }

    push(index: string, values: ExplicitAnyToExtend) {
        this.buffer.push([ index.toString(), values ]);
        return this;
    }

    set(buffer: ExplicitAnyToExtend[]) {
        if (!Array.isArray(buffer)) {
            throw new Error('Invalid format');
        }
        if (!Array.isArray(buffer[0])) {
            buffer = buffer.map(element => [ element[this.indexField], element ]);
        }
        this.buffer = buffer;
        return this;
    }
}

export class UpdateMultipleQuery extends IndexedBufferQuery {
    shareQuery: ExplicitAnyToExtend;
    shared(query: ExplicitAnyToExtend) {
        this.shareQuery = query;
        return this;
    }

    async exec() {
        if (!this.buffer.length) return;
        const updatable = [], updatableValues = [];
        
        for (const [ index, values ] of this.buffer) {
            const query = this.shareQuery ?? {};
            query[this.indexField] = index;
            const updateQuery = sql.update(this.tablename()).where(query).set(values)
            const updateParams = updateQuery.toParams({ placeholder: '?' });
            updatable.push(updateParams.text);
            updatableValues.push(...updateParams.values);
        }

        const updateQuery = 'BEGIN TRANSACTION; ' + updatable.join('; ') + '; COMMIT TRANSACTION;'
        return this.run(updateQuery, updatableValues);
    }
}

export class UpdateOrInsertQuery extends IndexedBufferQuery {
    checked: { tablename: string, updatable: ExplicitAnyToExtend[], insertable: ExplicitAnyToExtend[], updatableValues: ExplicitAnyToExtend } | false = false;
    set(buffer: ExplicitAnyToExtend[]) {
        super.set(buffer);
        this.checked = false;
        return this;
    }

    async runCheck(options: Record<string,ExplicitAnyToExtend> = {}) {
        const tablename = this.tablename();
        /** SEARCH **/
        const indexes = this.buffer.map(element => element[0]);

        let searchQuery = sql.select().from(tablename).where(sql.in(this.indexField, indexes));
        if (options.fields) searchQuery = searchQuery.select(options.fields);
        const searchResult = await this.run(searchQuery.toString())
        const existing = new Map();
        if (searchResult) {
            for (const row of searchResult) {
                existing.set(row[this.indexField], row);
            }
        }
        
        /** SPLITTING */
        const insertable = [], updatable = [], updatableValues = [], records = [];
        for (const [ index, row ] of this.buffer) {
            const item = existing.get(index)
            if (item) {
                const updateItem: Record<string,ExplicitAnyToExtend> = {};
                let hasUpdate = false;
                for (const [ key, value ] of Object.entries(row)) {
                    if (item[key] != value) {
                        updateItem[key] = value;
                        hasUpdate = true;
                    }
                }

                if (hasUpdate) {
                    const updateQuery = sql.update(tablename).where(this.indexField, index).set(updateItem)
                    const updateParams = updateQuery.toParams({ placeholder: '?' });
                    updatable.push(updateParams.text);
                    updatableValues.push(...updateParams.values);
                    records.push(row);
                }
            } else {
                row[this.indexField] = index;
                insertable.push(row);
                records.push(row);
            }
        }
        this.checked = { tablename, updatable, insertable, updatableValues }
        return records;
    }

    async exec(options: Record<string,ExplicitAnyToExtend> = {}) {
        if (!this.checked) {
            await this.runCheck(options);
        }

        if (!this.checked) throw new Error("Check failed");

        /** UPDATING */
        if (this.checked.updatable.length) {
            const updateQuery = this.checked.updatable.join('; ')
            if (options.verbose) logger.log(updateQuery, LOGGER_COLORS.YELLOW);
            await this.run(updateQuery, this.checked.updatableValues);
        }

        /** INSERTING */
        if (this.checked.insertable.length) {
            const insertQuery = sql.insert(this.checked.tablename).values(this.checked.insertable)
            if (options.verbose) logger.log(insertQuery.toString(), LOGGER_COLORS.YELLOW);
            await this.run(insertQuery.toString());
        }
    }
}

export class ReplaceDataQuery extends IndexedBufferQuery {
    async exec(options = {}) {
        if (!this.buffer.length) return;
        const ids = [], products = [];
        for (const [ id, product ] of this.buffer) {
            ids.push(id);
            products.push(product);
        }
        
        const query = sql.in(this.indexField, ids);
        const deleteQuery = new DeleteQuery(this.dataset, this.table);
        await deleteQuery.where(query).exec(options);
        
        const insertQuery = new InsertQuery(this.dataset, this.table);
        return insertQuery.values(products).exec(options);

    }
}