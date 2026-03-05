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
	Utilities: {
		newBlob: function (data, mimeType)
		{
			return {
				getDataAsString: function (encoding)
				{
					return data;
				}
			};
		},
		base64Decode: function (data)
		{
			return data; // Simple mock, doesn't actually decode
		}
	},
	console: console,
	// Add other GAS services here if needed
};

// Create a sandbox with mocks
const sandbox = vm.createContext(mocks);

// Identify all .js files in the src folder
const srcPath = path.resolve(__dirname, '../src');
const jsFiles = fs.readdirSync(srcPath)
	.filter(file => file.endsWith('.js') && file !== 'Code.js') // Load libraries first, Code.js might depend on them
	.sort();

console.log('--- Loading Source Files ---');
jsFiles.forEach(file => {
	const code = fs.readFileSync(path.join(srcPath, file), 'utf8');
	try {
		vm.runInContext(code, sandbox, { filename: file });
	} catch (e)
	{
		console.error(`Error loading ${file}:`, e);
	}
});

// Load Code.js last if it exists
if (fs.existsSync(path.join(srcPath, 'Code.js'))) {
	const code = fs.readFileSync(path.join(srcPath, 'Code.js'), 'utf8');
	vm.runInContext(code, sandbox, { filename: 'Code.js' });
}

// Identify and load test files (excluding this runner)
const testFiles = fs.readdirSync(__dirname)
	.filter(file => file.endsWith('.test.js'))
	.sort();

console.log('--- Loading Test Files ---');
testFiles.forEach(file => {
	const code = fs.readFileSync(path.join(__dirname, file), 'utf8');
	try {
		vm.runInContext(code, sandbox, { filename: file });
	} catch (e)
	{
		console.error(`Error loading test ${file}:`, e);
	}
});

console.log('--- Starting Local GAS Tests ---');
try {
	let totalFailed = 0;
	// Find all functions starting with run and ending with Tests in the sandbox
	for (const key in sandbox)
	{
		if (typeof sandbox[key] === 'function' && key.startsWith('run') && key.endsWith('Tests'))
		{
			console.log(`\nExecuting: ${key}()`);
			const results = sandbox[key]();
			if (results && results.failed > 0)
			{
				totalFailed += results.failed;
			}
		}
	}
	
	if (totalFailed > 0)
	{
		process.exit(1);
	}
} catch (err)
{
	console.error('Fatal error during test execution:');
	console.error(err);
	process.exit(1);
}
