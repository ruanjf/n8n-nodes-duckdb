import {
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
					rows: 10,
				},
				required: true,
				default: '',
				placeholder: `select 'hello'`,
				description: 'The SQL code to execute',
				// noDataExpression: true,
			},
			{
				displayName: 'Result Index',
				name: 'index',
				type: 'number',
				required: false,
				default: 0,
				placeholder: `1`,
				description: 'Which index as output. start from 1',
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
			const queryQueue = items.flatMap((item, index) => {
				const sql = this.getNodeParameter('sql', index) as string;
				return sql.split(/;\n+/)
					.filter(s => !s.match(/^[\s\n]*$/g))
					.map(s => {
						return new Promise((resolve, reject) => {
							db.all(s, function(err: any, res: any) {
								if (err) {
									reject(`sql: ${s}, ${err}`)
								} else {
									resolve({ sql: s, result: res })
								}
							});
						});
					})
			});

			let queryResult = await Promise.all(queryQueue) as any[];
			const index = this.getNodeParameter('index', 0) as number;
			if (index > 0 && queryResult.length > 0) {
				queryResult = index <= queryQueue.length ? queryResult[index-1].result : null
			}
			returnItems = this.helpers.returnJsonArray(queryResult as unknown as IDataObject[]);

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
