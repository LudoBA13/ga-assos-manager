/**
 * @file This file contains tests for the InfoPreprocessor.gs file.
 */

function runInfoPreprocessorTests()
{
	const testCases = [
		test_InfoPreprocessor_UD,
		test_InfoPreprocessor_Planning,
		test_InfoPreprocessor_Normalization
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

	// Multiple occurrences
	const input8 = "UD: 1, UD: 2";
	const expected8 = "$ud:1$$ud:2$";
	assertEqual(expected8, InfoPreprocessor.process(input8), "Multiple occurrences");
	
	// Single digit limitation (Updated to support multiple)
	assertEqual("$ud:12$", InfoPreprocessor.process("UD: 12"), "Multi digit support");

	// New format "N UD"
	assertEqual("$ud:100$", InfoPreprocessor.process("100 UD."), "Format N UD with dot");
	assertEqual("$ud:50$", InfoPreprocessor.process("50 ud"), "Format N ud lowercase");

	// No match
	assertEqual("No tag here", InfoPreprocessor.process("No tag here"), "No match");
	assertEqual("", InfoPreprocessor.process(""), "Empty input");
	assertEqual("", InfoPreprocessor.process(null), "Null input");
}

function test_InfoPreprocessor_Planning()
{
	// Note: We depend on parseHumanReadable from PlanningEncoder.gs
	// "Tous les lundis 8h30: Frais." -> "0LuMdFr"
	
	// Basic single entry
	const input1 = "Planning: Tous les lundis 8h30: Frais.";
	const expected1 = "$planning:0LuMdFr$";
	assertEqual(expected1, InfoPreprocessor.process(input1), "Basic Planning match");

	// Multiple entries
	// "1er lundi 8h30: Frais. 2e mardi 14h: Sec." -> "1LuMdFr2MaApSe"
	const input2 = "Planning: 1er lundi 8h30: Frais. 2e mardi 14h: Sec.";
	const expected2 = "$planning:1LuMdFr2MaApSe$";
	assertEqual(expected2, InfoPreprocessor.process(input2), "Multiple Planning entries");

	// With context
	const input3 = "Info start. Planning: 3e mercredi 10h: Surgelé. Info end.";
	const expected3 = "Info start. $planning:3MeMfSu$ Info end.";
	assertEqual(expected3, InfoPreprocessor.process(input3), "Planning with context");

	// Case insensitivity (for "Planning:" keyword)
	const input4 = "planning: 4e jeudi 8h30: Frais.";
	const expected4 = "$planning:4JeMdFr$";
	assertEqual(expected4, InfoPreprocessor.process(input4), "Lower case planning keyword");

	// Whitespace handling in the keyword part
	// "Planning : " matches. The captured part is "   Tous les vendredis 8h30: Frais."
	// parseHumanReadable trims input, so it should handle leading spaces.
	const input5 = "Planning :   Tous les vendredis 8h30: Frais.  "; 
	const expected5 = "$planning:0VeMdFr$  "; // Trailing spaces after the match are preserved
	assertEqual(expected5, InfoPreprocessor.process(input5), "Planning with whitespace");

	// Invalid planning string (parseHumanReadable returns empty string for invalid input)
	// If parseHumanReadable returns '', the result is "$planning:$"
	// But the regex ensures the format "word time: product." somewhat.
	// If parseHumanReadable fails to parse components, it returns ''.
	const input6 = "Planning: Invalid Text.";
	// "Invalid Text." matches "word time: product."?
	// Regex: [a-z ]+ [0-9]+h[0-9]* \s*:\s* [^.]+ \.
	// "Invalid Text." does NOT match the regex (no "h" time, no colon).
	// So it should NOT be replaced.
	assertEqual(input6, InfoPreprocessor.process(input6), "Planning regex mismatch");
	
	// Regex match but parser fail?
	// "Tous les lundis 99h99: Inconnu." -> Matches regex.
	// parseHumanReadable("Tous les lundis 99h99: Inconnu.")
	// timesRev["99h99"] -> undefined.
	// dayRev["lundis"] -> undefined (logic handles 's'?) -> 'lundi' -> 'Lu'.
	// weekRev["Tous les"] -> '0'.
	// productsRev["Inconnu"] -> undefined.
	// entries pushed: 0. Return ''.
	const input7 = "Planning: Tous les lundis 99h99: Inconnu.";
	const expected7 = "$planning:$";
	assertEqual(expected7, InfoPreprocessor.process(input7), "Planning regex match but parser fail");

	// Complex multi-entry test with extra text
	const input8 = "100 UD. Planning : 1er jeudi 14h : Frais, Sec, Surgelé. 2e mardi 14h : Frais. 3e lundi 14h : Frais. 3e jeudi 14h : Frais.";
	const expected8 = "$ud:100$$planning:1JeApFr1JeApSe1JeApSu2MaApFr3LuApFr3JeApFr$";
	assertEqual(expected8, InfoPreprocessor.process(input8), "Complex multi-entry Planning with extra text");
}

function test_InfoPreprocessor_Normalization()
{
	// Test Unicode superscript ordinals normalization
	const input1 = "Planning: 1ᵉʳ lundi 8h30: Frais."; // ᵉʳ (U+1D49 U+02B3)
	const expected1 = "$planning:1LuMdFr$";
	assertEqual(expected1, InfoPreprocessor.process(input1), "Unicode 1er normalization");

	const input2 = "Planning: 2ᵉ mardi 14h: Sec."; // ᵉ (U+1D49)
	const expected2 = "$planning:2MaApSe$";
	assertEqual(expected2, InfoPreprocessor.process(input2), "Unicode 2e normalization");

	const input4 = "Planning: 3ᵉ mercredi 10h: Sec."; // ᵉ (U+1D49)
	const expected4 = "$planning:3MeMfSe$";
	assertEqual(expected4, InfoPreprocessor.process(input4), "Unicode 3e normalization");

	const input5 = "Planning: 4ᵉ jeudi 8h30: Frais."; // ᵉ (U+1D49)
	const expected5 = "$planning:4JeMdFr$";
	assertEqual(expected5, InfoPreprocessor.process(input5), "Unicode 4e normalization");

	const input6 = "60 UD. Planning : 1ᵉʳ mercredi 8h30 : Frais, Sec, Surgelé.";
	const expected6 = "$ud:60$$planning:1MeMdFr1MeMdSe1MeMdSu$";
	assertEqual(expected6, InfoPreprocessor.process(input6), "Mixed UD and Unicode 1er");
}

