
async function doit() {
	const duckdb = require('duckdb');
	const db = new duckdb.Database(':memory:');

	const items = [
		`select * from read_csv_auto('/Users/rjf/Downloads/share/1454304501596272_找不到店铺名__1659895479(@即时聊天对话记录_20220808020215_169481.csv)_utf8.csv', DELIM=',', QUOTE='"', ESCAPE='"', HEADER=1, SAMPLE_SIZE=1024)`,
		`select '1;2' as a union all select 2;
		select 3;
		`,
		"select 2"
	]

	const queryQueue = items
		.flatMap(s => s.split(/;\n/))
		.filter(s => !s.match(/^[\s\n]*$/g))
		.map((sql, index) => {
			return new Promise((resolve, reject) => {
				db.all(sql, function(err, res) {
					if (err) {
						reject(`sql: ${sql}, ${err}`)
					} else {
						resolve(res)
					}
				});
			});
		});
	const queryResult = (await Promise.all(queryQueue)).reduce((collection, result) => {
		collection.push(result);
		return collection;
	}, []);
	console.log(queryResult)
}
doit()

