const fs = require('fs');
let JCON = require('../JCON.js');

const numRuns = 100000;

console.log('5 trials of ' + numRuns + '...');

let avgs = [];
for (let i = 0; i < 5; i++) {
	avgs.push(main());
}
avgs.sort();
console.log('BEST OF 5: ' + avgs[0]);


function main() {
	let str = fs.readFileSync('example.jcon', 'utf8');

	let start = new Date ();
	for (let i = 0; i < numRuns; i++) {
		JCON.parse(str);
	}
	let end = new Date ();

	let total = end - start;
	let avg = total / numRuns;

	console.log(numRuns + ' runs.  Average: [' + avg + '] ms');

	return avg;
}
