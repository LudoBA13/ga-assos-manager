/**
 * @file This file contains tests for the InfoPreprocessor.gs file.
 */

function runInfoPreprocessorTests()
{
	const testCases = [
		test_InfoPreprocessor_UD
	];

	const results = {
		passed: 0,
		failed: 0,
		total: testCases.length,
		details: []
	};

	testCases.forEach(test =>
	{
		try
		{
			test();
			results.passed++;
			results.details.push({
				name: test.name,
				status: 'PASSED'
			});
		}
		catch (e)
		{
			results.failed++;
			results.details.push({
				name: test.name,
				status: 'FAILED',
				error: e.message,
				stack: e.stack
			});
		}
	});

	Logger.log(`InfoPreprocessor Test Results: ${results.passed} / ${results.total} passed.`);
	if (results.failed > 0)
	{
		Logger.log('--- FAILED TESTS ---');
		results.details.filter(r => r.status === 'FAILED').forEach(r =>
		{
			Logger.log(`[${r.name}]: ${r.error}`);
			Logger.log(`Stack: ${r.stack}`);
		});
	}

	return results;
}

function test_InfoPreprocessor_UD()
{
	// Basic match
	assertEqual("$ud:1$", InfoPreprocessor.process("UD: 1"), "Basic UD match");

	// With whitespace
	assertEqual("$ud:2$", InfoPreprocessor.process("UD : 2"), "UD with whitespace");

	// With trailing non-word chars (consumed)
	assertEqual("$ud:3$", InfoPreprocessor.process("UD: 3."), "UD with trailing dot");
	
	// With trailing whitespace (consumed)
	assertEqual("$ud:4$", InfoPreprocessor.process("UD: 4   "), "UD with trailing spaces");

	// Case insensitivity
	assertEqual("$ud:5$", InfoPreprocessor.process("ud: 5"), "Lower case ud");
	assertEqual("$ud:6$", InfoPreprocessor.process("Ud: 6"), "Mixed case Ud");

	// Embedded in text
	const input7 = "Contact info. UD: 7. More info.";
	const expected7 = "Contact info. $ud:7$More info.";
	assertEqual(expected7, InfoPreprocessor.process(input7), "Embedded in text");

	// Multiple occurrences (though unlikely for this field, good for robustness)
	const input8 = "UD: 1, UD: 2";
	const expected8 = "$ud:1$$ud:2$"; // Comma and space are \W, so consumed
	assertEqual(expected8, InfoPreprocessor.process(input8), "Multiple occurrences");
	
	// Single digit limitation (per regex [0-9])
	// "UD: 12" -> "UD: 1" matches, replaced by "$ud:1$". "2" remains.
	assertEqual("$ud:1$2", InfoPreprocessor.process("UD: 12"), "Single digit strictness");
	
	// No match
	assertEqual("No tag here", InfoPreprocessor.process("No tag here"), "No match");
	assertEqual("", InfoPreprocessor.process(""), "Empty input");
	assertEqual("", InfoPreprocessor.process(null), "Null input");
}
