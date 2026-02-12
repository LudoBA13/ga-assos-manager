const gas = require('gas-local');
const path = require('path');
const fs = require('fs');
const vm = require('vm');

/**
 * Local Test Runner
 * Manually creates a GAS-like global context.
 */

const mocks = {
	Logger: {
		log: function (msg)
		{ console.log('  [GAS Logger]', msg); }
	},
	console: console,
	// Add other GAS services here if needed
};

// Create a sandbox with mocks
const sandbox = vm.createContext(mocks);

// Identify all .gs files
const folderPath = path.resolve(__dirname);
const gsFiles = fs.readdirSync(folderPath)
	.filter(file => file.endsWith('.gs'))
	.sort(); // Consistent load order

console.log('--- Loading GAS Files ---');
gsFiles.forEach(file => {
	const code = fs.readFileSync(path.join(folderPath, file), 'utf8');
	try {
		vm.runInContext(code, sandbox, { filename: file });
	} catch (e)
	{
		console.error(`Error loading ${file}:`, e);
	}
});

console.log('--- Starting Local GAS Tests ---');
try {
	// Execute the test runner from the sandbox
	const results = sandbox.runPlanningEncoderTests();
	
	if (results && results.failed > 0)
	{
		process.exit(1);
	}
} catch (err)
{
	console.error('Fatal error during test execution:');
	console.error(err);
	process.exit(1);
}
