import sql, * as SqlBricks from 'sql-bricks';
import { logger } from "$lib/utils/logger";
import { TruncateQuery, UpdateOrInsertQuery } from "./customQueries";
import { DeleteQuery, InsertQuery, InsertSerialQuery, SelectQuery, UpdateQuery, bigquery, VERBOSE_QUERIES } from "./query";

export const APP_DATASET = 'app';
export const LOG_DATASET = 'log';

export const removeNulls = (obj: Record<string, any>) => Object.entries(obj).reduce((a,[ k,v ]) => (v == null ? a : (a[k]=v, a)), {} as Record<string,any>);

export const getItem = (tableName: string) => async <T = any> (dataset: string, query: SqlBricks.WhereExpression, fields: string[] | null = null, orderBy: string | null = null): Promise<T | null> => {
  if (VERBOSE_QUERIES) logger.verboseFunction('getItem', { tableName, dataset, query, fields });
  const selectQuery = new SelectQuery(dataset, tableName);
  Object.assign(selectQuery, { query, fields, orderBy });
  return selectQuery.first({ verbose: VERBOSE_QUERIES });
}

export const getLatest = (tableName: string, orderColumn: string = 'timestamp') => async <T = any> (dataset: string, query: SqlBricks.WhereExpression|null = null, fields: Record<string,any> | null = null): Promise<T | null> => {
    const selectQuery = new SelectQuery(dataset, tableName);
    Object.assign(selectQuery, { query, fields, orderBy: `-${orderColumn}` });
    return selectQuery.first({ verbose: VERBOSE_QUERIES });
}

export const getItemById = (tableName: string, indexField: string) => async <T = any> (dataset: string, id: string | number, fields: string[] | null = null): Promise<T | null> => {
    const query: SqlBricks.WhereExpression = {};
    query[indexField] = id.toString();
    return getItem(tableName)(dataset, query, fields);
}

export const getItems = (tableName: string) => async <T = any> (dataset: string, query: SqlBricks.WhereExpression|null = null, fields: string[] | null = null, orderBy: string | null = null, offset: number | string | null = null, limit: number | null = null, asArray: boolean = false): Promise<[T]> => {
    if (VERBOSE_QUERIES) logger.verboseFunction('getItems', { tableName, dataset, query, fields, orderBy, offset, limit })
    const selectQuery = new SelectQuery(dataset, tableName);
    Object.assign(selectQuery, { query, fields, orderBy, offset, limit })
    return selectQuery.exec({ verbose: VERBOSE_QUERIES, asArray });
}

export const getDistinctItems = (tableName: string) => async <T = any> (dataset: string, field: string, query: SqlBricks.WhereExpression|null = null, asArray = false): Promise<[T]> => {
    if (VERBOSE_QUERIES) logger.verboseFunction('getDistinctItems', { tableName, dataset, field, asArray })
    const selectQuery = new SelectQuery(dataset, tableName);
    Object.assign(selectQuery, { query })
    return selectQuery.distinctValues(field).exec({ verbose: VERBOSE_QUERIES, asArray });
}

export const getGroupedItems = (tableName: string) => async <T = any> (dataset: string, query: SqlBricks.WhereExpression|null = null, groupBy: string | null = null, fields: string[] | null = null, orderBy = null, offset = null, limit = null): Promise<[T]> => {
    const selectQuery = new SelectQuery(dataset, tableName);
    Object.assign(selectQuery, { query, fields, groupBy, orderBy, offset, limit })
    return selectQuery.exec({ verbose: VERBOSE_QUERIES });
}

export const aggregateItems = (tableName: string) => async <T = any> (dataset: string, query: SqlBricks.WhereExpression|null = null, fields: string[], groupBy: string | null = null, aggregator = 'SUM'): Promise<[T]> => {
    const selectQuery = new SelectQuery(dataset, tableName);
    Object.assign(selectQuery, { query, fields, groupBy })
    return selectQuery.aggregate(fields, aggregator).exec({ verbose: VERBOSE_QUERIES });
}

export const aggregateRaw = (tableName: string) => async <T = any> (dataset: string, query: SqlBricks.WhereExpression|null = null, fields: string[], groupBy: string | null = null, aggregator = 'SUM'): Promise<[T]> => {
    const selectQuery = new SelectQuery(dataset, tableName);
    Object.assign(selectQuery, { query, fields, groupBy })
    if (groupBy) selectQuery.order(groupBy);
    return selectQuery.aggregateRaw(fields, aggregator).exec({ verbose: VERBOSE_QUERIES });
}

export const aggregateMapped = (tableName: string) => async <T = any> (dataset: string, query: SqlBricks.WhereExpression|null = null, fields: string[], groupBy: string | null = null, aggregator = 'SUM'): Promise<[T]> => {
    const selectQuery = new SelectQuery(dataset, tableName);
    Object.assign(selectQuery, { query, fields, groupBy })
    if (groupBy) selectQuery.order(groupBy);
    return selectQuery.aggregateMapped(fields, aggregator).exec({ verbose: VERBOSE_QUERIES });
}

export const countItems = (tableName: string) => async (dataset: string, query: SqlBricks.WhereExpression|null = null, field = '1'): Promise<number> => {
    const fields = `COUNT(${field}) as \`cnt\``;
    const selectQuery = new SelectQuery(dataset, tableName);
    Object.assign(selectQuery, { query, fields });
    return selectQuery.exec({ verbose: VERBOSE_QUERIES }).then(result => result[0].cnt);
}

export const getItemsIn = (tableName: string, indexField: string) => async <T = any> (dataset: string, values: string[], fields: string[] | null = null, column = indexField): Promise<[T]> => {
    const query = sql.in(column, values);
    return getItems(tableName)(dataset, query, fields)
}

export const getItemsBetween = (tableName: string) => async <T = any> (dataset: string, from: string | number, to: string | number, fields: string[] | null = null, column: string = 'timestamp', order: boolean | string = true, asArray: boolean = false): Promise<[T]> => {
    let orderBy = column;
    if (order === true) orderBy += ' DESC';
    else if (order && order.length) orderBy = order;
    const query = sql.between(column, from, to);
    return getItems(tableName)(dataset, query, fields, orderBy, null, null, asArray)
}

export const getItemsByIdDate = (tableName: string, indexField: string) => async <T = ExplicitAnyToExtend>(dataset: string, id: number | string, from: number | string, to: number | string, fields: string[] | null = null): Promise<[T]> => {
    const idQuery: SqlBricks.WhereExpression = {}
    idQuery[indexField] = id;
    const dateQuery = between('date', from, to);
    const query = [ idQuery, dateQuery ];
    const fn = getItems(tableName);
    return fn(dataset, query, fields);
}

export const updateItemsIn = (tableName: string, indexField: string) => async (dataset: string, indexes: ExplicitAnyToExtend[], newValues: Record<string,any>, query: SqlBricks.WhereExpression|null = null, indexColumn: string = indexField) => {
    if (!query) query = sql.in(indexColumn, indexes);
    else query = sql.and(query, sql.in(indexColumn, indexes));
    return updateItem(tableName)(dataset, query, newValues);
}

export const updateItem = (tableName: string) => async (dataset: string, query: SqlBricks.WhereExpression, newValues: Record<string,any>) => {
    const udapteQuery = new UpdateQuery(dataset, tableName);
    Object.assign(udapteQuery, { query, newValues })
    try {
        const result = await udapteQuery.exec({ verbose: VERBOSE_QUERIES });
        return result;
    } catch (err: unknown) {
        if (err instanceof Error) {
            if (err.message.indexOf('concurrent') > 0) {
                setTimeout(async () => {
                    try {
                        const result = await udapteQuery.exec({ verbose: VERBOSE_QUERIES });
                        return result;
                    } catch (err: unknown) {
                        logger.error(err);
                        return false;
                    }
                }, Math.random() * 5000 + 1000);
            }
        }

        throw err;
    }
}

export const updateItemById = (tableName: string, indexField: string) => async (dataset: string, id: number | string, newValues: Record<string,ExplicitAnyToExtend>) => {
    const query: Record<string,any> = {};
    query[indexField] = id;
    return updateItem(tableName)(dataset, query, newValues);
}

export const insertItems = <T = ExplicitAnyToExtend>(tableName: string, json: boolean = false, maxRecords: number | null = null) => async (dataset: string, insertable: T | T[]) => {
    const insertQuery = new InsertQuery(dataset, tableName);
    if (!Array.isArray(insertable)) insertable = [ insertable ];
    if (!insertable.length) throw new Error('No data to insert');
    if (!maxRecords) return insertQuery.values(insertable).exec({ json, verbose: VERBOSE_QUERIES });
    let maxLoops = 100;

    do {
        const subList = insertable.splice(0, maxRecords);
        await insertQuery.values(subList).exec({ json, verbose: VERBOSE_QUERIES });
        if (--maxLoops <= 0) {
            logger.error('Max number of insertion loops reached for table ' + tableName);
            break;
        }
    } while(insertable.length > 0)
}

export const replaceItems = (tableName: string, indexField: string) => async (dataset: string, values: Record<string,any> | Record<string,any>[], indexedFields: string[] | null = null) => {
    const valuesArray: Record<string,any>[] = Array.isArray(values) ? values : [ values ];
    if (indexedFields === null) indexedFields = [ indexField ];
    if (typeof indexedFields === 'string') indexedFields = [ indexedFields ];
    if (Array.isArray(indexedFields)) {
        const conditions = [];
        for (const value of valuesArray) {
            const condition: SqlBricks.WhereExpression = {};
            for (const field of indexedFields) {
                condition[field] = value[field]
            }
            conditions.push(condition);
        }
        const query = conditions.length === 1 ? conditions[0] : sql.or(conditions)
        await deleteData(tableName, dataset, query);
    } else {
        await deleteData(tableName, dataset, indexedFields);
    }

    return insertItems(tableName)(dataset, valuesArray);
}

export const updateOrInsertItems = (tableName: string, indexField: string) => async (dataset: string, data: Record<string,any>[], json = false) => {
    if (Array.isArray(data) && data.length === 0) throw new Error('No data to be updated');
    const query = new UpdateOrInsertQuery(dataset, tableName, indexField);
    return query.set(data).exec({ json, verbose: VERBOSE_QUERIES });
}

export const checkUdateOrInsertItems = (tableName: string, indexField: string) => async (dataset: string, data: Record<string,any>[], json = false) => {
    const query = new UpdateOrInsertQuery(dataset, tableName, indexField);
    const checkResult = await query.set(data).runCheck({ json });
    setTimeout(() => query.exec({ json, verbose: VERBOSE_QUERIES }), 200);
    return checkResult;
}

export const truncateTable = async (tableName: string, dataset: string) => {
    const query = new TruncateQuery(dataset, tableName);
    return query.exec({ verbose: VERBOSE_QUERIES });
}

export const deleteData = async (tableName: string, dataset: string, query: SqlBricks.WhereExpression) => {
    const deleteQuery = new DeleteQuery(dataset, tableName);
    return deleteQuery.where(query).exec({ verbose: VERBOSE_QUERIES });
}

export const insertSerialQuery = (tableName: string) => (dataset: string, maxSize = 1000, isArrayOfArrays = false, json = false) => {
    return new InsertSerialQuery(dataset, tableName, maxSize, isArrayOfArrays, json);
}

export const searchItems = (tableName: string) => async <T = any> (dataset: string, text: string, columns: string[], fields: string[] | null = null): Promise<[T]> => {
    const queries = [];
    for (const column of columns) {
        queries.push(sql.like(column, `%${text}%`));
    }
    const query = sql.or(queries)
    return getItems(tableName)(dataset, query, fields);
}

export const between = sql.between;

export const tableExists = async (dataset: string, tableName: string, log: boolean = true) => {
    try {
        await bigquery.dataset(dataset).table(tableName).get();
        return true;
    } catch (err: unknown) {
        if (log) logger.error(err);
        return false;
    }
}

export const getAppItems = (tableName: string) => async (query: SqlBricks.WhereExpression|null = null, fields: string[] | null = null, orderBy = null, offset = null, limit = null) => {
    const selectQuery = new SelectQuery(APP_DATASET, tableName);
    Object.assign(selectQuery, { query, fields, orderBy, offset, limit })
    return selectQuery.exec({ verbose: VERBOSE_QUERIES });
}

export const insertAppItems = (tableName: string) => async (items: ExplicitAnyToExtend[]) => insertItems(tableName)(APP_DATASET, items);
export const getAppItemById = async (tableName: string, indexField: string, id: number | string, fields: string[] | null = null) => getItemById(tableName, indexField)(APP_DATASET, id, fields);
export const updateAppItemById = async (tableName: string, indexField: string, id: number | string, newValues: Record<string,any>) => updateItemById(tableName, indexField)(APP_DATASET, id, newValues);

export const getDatasetTables = async (dataset: string) => bigquery.dataset(dataset).getTables().then(response => response[0].map(table => table.id)); 

export const deduplicateItems = async (tableName: string, indexField: string, dataset: string, orderBy: string = 'timestamp') => {
    const items = await getItems(tableName)(dataset, null, null, orderBy);
    const mapped = items.reduce((map: Map<string, any>, item: ExplicitAnyToExtend) => {
        const id: string = item[indexField];
        if (!map.get(id)) map.set(id, item)
        return map;
    }, new Map() as Map<string, any>);
    if (mapped.size < items.length) {
        await deleteData(tableName, dataset, { 1: 1 });
        return insertItems(tableName)(dataset, [ ...mapped.values() ]);
    }
    return {
        original: items.length,
        deduplicated: mapped.size
    }
}