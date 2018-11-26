const fs = require('fs');
let JCON = require('../JCON.js');

main();

function ok(pass, message) {
	let status = pass ? '[ OK ]' : '[FAIL]';
	console.log(status + ' ' + message);
}

function fails(message, str) {

	try {
		JCON.parse(str);
	}	
	catch (e) {
		ok(true, message);
		return;
	}

	ok(false, message);
}

// really basic tests
function main() {

	let str = fs.readFileSync('example.jcon', 'utf8');

	let data = JCON.parse(str);
	let json = JSON.stringify(data);

	// note: backslashed need to be escaped
	let correctJson = '{"string":"hello","boolean":true,"float":1234.56,"int":789,"ipv6:123:abc":":other:address","/path/to/file":"/another/path","regex":"/\\\\n+\\\\s*$/","ⓤnicode":"ⒶⒷⒸ ⒹⒺ","nestedMap":{"a1":"bbbb","b2":"this is a sentence","list":["inner","values"]},"list":[123.45,true,"I am a string"],"rows":[{"name":"Alice","job":"Developer"},{"name":"Bob","job":"Cat"}],"mlString":"hello\nworld\n\n  indent 2\n    indent 4\n\nbaseline","lastKey":"bye"}';
	correctJson = correctJson.replace(/\n/g, '\\n');

	console.log(''); // newlines

	ok(correctJson === json, 'Kitchen sink test');
	ok(data.string === 'hello', 'string value');
	ok(data.boolean === true, 'boolean value');
	ok(data.float === 1234.56, 'float value');
	ok(data.int === 789, 'int value');

	ok(data.mlString.indexOf('\nbaseline') > 0, 'indent baseline');
	ok(data.mlString.indexOf('\n  indent 2') > 0, 'indented 2');
	ok(data.mlString.indexOf('\n    indent 4') > 0, 'indented 4');

	ok(data['/path/to/file'] == '/another/path', 'slashes in key & value');
	ok(data['ipv6:123:abc'] == ':other:address', 'colons in key & value');
	ok(data.regex === '/\\n+\\s*$/', 'regex with backslashes');

	ok(data.nestedMap.list[0] == 'inner', 'nested value 1');
	ok(data.rows[1].job == 'Cat', 'nested value 2');

	data = JCON.parse(str);
	ok(data.list[1] === true, '2nd call with same object');

	fails('extra space before colon', `
		{
			key : value
		}
	`);

	fails('missing space after colon', `
		{
			key:value
		}
	`);

	fails('one-line map', `
		{
			key: { inline map }
		}
	`);

	fails('unclosed map', `
		{
			key: { 
		}
	`);

	fails('unclosed list', `
		{
			key: []
		}
	`);

	fails('unclosed string', `
		{
			key: \`
		}
	`);

	// TODO: test windows newlines

	console.log('\n--- DONE ---\n');
}



