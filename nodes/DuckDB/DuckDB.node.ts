import {
	BINARY_ENCODING,
	IExecuteFunctions
} from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

const duckdb: any = require('duckdb');

export class DuckDB implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'DuckDB',
		name: 'duckDB',
		icon: 'file:duckdb.svg',
		group: ['input'],
		version: 1,
		description: 'DuckDB is an in-process SQL OLAP database management system',
		defaults: {
			name: 'DuckDB',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			// Node properties which the user gets displayed and
			// can change on the node.
			{
				displayName: 'SQL Code',
				name: 'sql',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				required: true,
				default: '',
				placeholder: `select 'hello'`,
				description: 'The SQL code to execute',
				// noDataExpression: true,
			},
		],
	};

	// The function below is responsible for actually doing whatever this node
	// is supposed to do. In this case, we're just appending the `myString` property
	// with whatever the user has entered.
	// You can make async calls and use `await`.
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const db = new duckdb.Database(':memory:');
		let returnItems = [];

		// Iterates over all input items and add the key "myString" with the
		// value the parameter "myString" resolves to.
		// (This could be a different value for each item in case it contains an expression)
		try {
			const queryQueue = items.map((item, index) => {
				return new Promise((resolve, reject) => {
					const sql = this.getNodeParameter('sql', index) as string;
					db.all(sql, function(err: any, res: any) {
						if (err) {
							reject(`sql: ${sql}, ${err}`)
						} else {
							resolve(res)
						}
					});
				});
				// return db.query(rawQuery);
			});

			const queryResult = (await Promise.all(queryQueue) as any[]).reduce((collection, result) => {
				// const [rows, fields] = result;

				// if (Array.isArray(rows)) {
				// 	return collection.concat(rows);
				// }

				// collection.push(rows);

				collection.push(result);

				return collection;
			}, []);

			returnItems = this.helpers.returnJsonArray(queryResult as unknown as IDataObject[]);

			// item = items[itemIndex];

			// const sql = this.getNodeParameter('sql', itemIndex) as string;
			// db.all(sql, function(err: any, res: any) {
			// 	if (err) {
			// 		throw err;
			// 	}
			// 	console.log(res[0].fortytwo)
			// });

			// item.json['myString'] = myString;
		} catch (error) {
			// This node should never fail but we want to showcase how
			// to handle errors.
			if (this.continueOnFail()) {
				returnItems = this.helpers.returnJsonArray({ error: error.message });
			} else {
				await db.close();
				throw new NodeOperationError(this.getNode(), error);
			}
		}

		return this.prepareOutputData(returnItems);
	}
}
