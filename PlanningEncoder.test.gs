/**
 * @file This file contains tests for the PlanningEncoder.gs file.
 * @license
 * MIT License
 *
 * Copyright (c) Ludovic ARNAUD
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * Runs all tests for the PlanningEncoder library.
 * Logs the results to the Apps Script logger.
 * @returns {{passed: number, failed: number, total: number, details: Array<{name: string, status: string, error: string, stack: string}>}}
 */
function runPlanningEncoderTests()
{
	const testCases = [
		test_decodePlanning,
		test_compressPlanning,
		test_decompressPlanning,
		test_canonicalizeSchedule,
		test_encodePlanning,
		test_parseHumanReadable,
		test_parseCanonicalPlanning,
		test_parseFlexiblePlanning,
		test_decodePlannings,
		test_formatPlanningForDisplay,
		test_formatPlannings,
		test_countProductOccurrences
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

	// Log summary to the console
	Logger.log(`Test Results: ${results.passed} / ${results.total} passed.`);
	if (results.failed > 0)
	{
		Logger.log('--- FAILED TESTS ---');
		results.details.filter(r => r.status === 'FAILED').forEach(r =>
		{
			Logger.log(`[${r.name}]: ${r.error}`);
			Logger.log(`Stack: ${r.stack}`);
		});
	}
	else
	{
		Logger.log('All tests passed successfully!');
	}

	return results;
}

/**
 * Assertion helper
 */
function assertEqual(expected, actual, message)
{
	// For 2D arrays, compare stringified versions
	if (Array.isArray(expected) && Array.isArray(actual) && Array.isArray(expected[0]) && Array.isArray(actual[0]))
	{
		if (JSON.stringify(expected) !== JSON.stringify(actual))
		{
			throw new Error(message + `\nExpected: "${JSON.stringify(expected)}"\nActual:   "${JSON.stringify(actual)}"`);
		}
	}
	// For objects (including 1D arrays)
	else if (typeof expected === 'object' && expected !== null && typeof actual === 'object' && actual !== null)
	{
		if (JSON.stringify(expected) !== JSON.stringify(actual))
		{
			throw new Error(message + `\nExpected: "${JSON.stringify(expected)}"\nActual:   "${JSON.stringify(actual)}"`);
		}
	}
	else if (expected !== actual)
	{
		throw new Error(message + `\nExpected: "${expected}"\nActual:   "${actual}"`);
	}
}

// --- Test Cases ---

function test_decodePlanning()
{
	const schedule1 = "1LuMdFr";
	const expected1 = "1er lundi 8h30 : Frais.";
	assertEqual(expected1, decodePlanning(schedule1), "Test 1: Single entry");

	const schedule2 = "1LuMdFr2MaApSe";
	const expected2 = "1er lundi 8h30 : Frais. 2e mardi 14h : Sec.";
	assertEqual(expected2, decodePlanning(schedule2), "Test 2: Multiple entries");

	const schedule3 = "1LuMdFr1LuMdSe";
	const expected3 = "1er lundi 8h30 : Frais, Sec.";
	assertEqual(expected3, decodePlanning(schedule3), "Test 3: Multiple products same slot");

	const schedule4 = "1LuMdFr2LuMdFr3LuMdFr4LuMdFr";
	const expected4 = "Tous les lundis 8h30 : Frais.";
	assertEqual(expected4, decodePlanning(schedule4), "Test 4: Every week compression");

	const schedule5 = "0JeMdSe";
	const expected5 = "Tous les jeudis 8h30 : Sec.";
	assertEqual(expected5, decodePlanning(schedule5), "Test 5: Every week pre-compressed");

	assertEqual('', decodePlanning(''), "Test 6: Empty schedule");
	assertEqual('', decodePlanning(null), "Test 7: Null schedule");
}

function test_compressPlanning()
{
	const schedule1 = "1LuMdFr2LuMdFr3LuMdFr4LuMdFr";
	const expected1 = "0LuMdFr";
	assertEqual(expected1, compressPlanning(schedule1), "Test 1: Full week compression");

	const schedule2 = "1LuMdFr2LuMdFr3LuMdFr";
	const expected2 = "1LuMdFr2LuMdFr3LuMdFr";
	assertEqual(expected2, compressPlanning(schedule2), "Test 2: Partial week no compression");

	const schedule3 = "1LuMdFr2MaApSe3LuMdFr4LuMdFr1MaApSe2LuMdFr";
	const expected3 = "0LuMdFr1MaApSe2MaApSe";
	assertEqual(expected3, compressPlanning(schedule3), "Test 3: Mixed compression");

	const schedule4 = "1LuMdFr2LuMdFr3LuMdFr4LuMdFr1MaApSe2MaApSe3MaApSe4MaApSe";
	const expected4 = "0LuMdFr0MaApSe";
	assertEqual(expected4, compressPlanning(schedule4), "Test 4: Multiple full week compressions");

	assertEqual('', compressPlanning(''), "Test 5: Empty schedule");
	assertEqual('', compressPlanning(null), "Test 6: Null schedule");
}

function test_decompressPlanning()
{
	const schedule1 = "0LuMdFr";
	const expected1 = "1LuMdFr2LuMdFr3LuMdFr4LuMdFr";
	assertEqual(expected1, decompressPlanning(schedule1), "Test 1: Expand all weeks");

	const schedule2 = "1LuMdFr";
	const expected2 = "1LuMdFr";
	assertEqual(expected2, decompressPlanning(schedule2), "Test 2: Already expanded");

	const schedule3 = "0LuMdFr1MaApSe";
	const expected3 = "1LuMdFr1MaApSe2LuMdFr3LuMdFr4LuMdFr";
	assertEqual(expected3, decompressPlanning(schedule3), "Test 3: Mixed expansion and sorting");

	assertEqual('', decompressPlanning(''), "Test 4: Empty schedule");
	assertEqual('', decompressPlanning(null), "Test 5: Null schedule");
}

function test_canonicalizeSchedule()
{
	const schedule1 = "2MaApSe1LuMdFr";
	const expected1 = "1LuMdFr2MaApSe";
	assertEqual(expected1, canonicalizeSchedule(schedule1), "Test 1: Simple sort");

	const schedule2 = "1LuMdSe1LuMdFr";
	const expected2 = "1LuMdFr1LuMdSe";
	assertEqual(expected2, canonicalizeSchedule(schedule2), "Test 2: Product sort");

	const schedule3 = "1LuMfFr1LuMdFr";
	const expected3 = "1LuMdFr1LuMfFr";
	assertEqual(expected3, canonicalizeSchedule(schedule3), "Test 3: Time sort");

	const schedule4 = "1MaMdFr1LuMdFr";
	const expected4 = "1LuMdFr1MaMdFr";
	assertEqual(expected4, canonicalizeSchedule(schedule4), "Test 4: Day sort");

	const schedule5 = "2LuMdFr1LuMdFr";
	const expected5 = "1LuMdFr2LuMdFr";
	assertEqual(expected5, canonicalizeSchedule(schedule5), "Test 5: Week sort");

	const schedule6 = "4LuMdFr3LuMdFr2LuMdFr1LuMdFr";
	const expected6 = "0LuMdFr";
	assertEqual(expected6, canonicalizeSchedule(schedule6), "Test 6: Compression and sort");

	assertEqual('', canonicalizeSchedule(''), "Test 7: Empty schedule");
	assertEqual('', canonicalizeSchedule(null), "Test 8: Null schedule");
}

function test_encodePlanning()
{
	const entries1 = [
		['1', 'Lu', 'Md', 'Fr']
	];
	const expected1 = "1LuMdFr";
	assertEqual(expected1, encodePlanning(entries1), "Test 1: Single entry from 2D array");

	const entries2 = [
		['1', 'Lu', 'Md', 'Fr'],
		['2', 'Ma', 'Ap', 'Se']
	];
	const expected2 = "1LuMdFr2MaApSe";
	assertEqual(expected2, encodePlanning(entries2), "Test 2: Multiple entries from 2D array");

	const entries3 = [
		['1', 'Lu', 'Md', 'Fr'],
		['1', 'Lu', 'Md', 'Se']
	];
	const expected3 = "1LuMdFr1LuMdSe";
	assertEqual(expected3, encodePlanning(entries3), "Test 3: Multiple products same slot from 2D array");

	const entries4 = [
		['1', 'Lu', 'Md', 'Fr'],
		['2', 'Lu', 'Md', 'Fr'],
		['3', 'Lu', 'Md', 'Fr'],
		['4', 'Lu', 'Md', 'Fr']
	];
	const expected4 = "0LuMdFr";
	assertEqual(expected4, encodePlanning(entries4), "Test 4: Every week compression from 2D array");

	const entries5 = [
		['0', 'Je', 'Md', 'Se']
	];
	const expected5 = "0JeMdSe";
	assertEqual(expected5, encodePlanning(entries5), "Test 5: Every week pre-compressed from 2D array");

	assertEqual('', encodePlanning([]), "Test 6: Empty schedule (2D array)");
	assertEqual('', encodePlanning(null), "Test 7: Null schedule (2D array)");
	assertEqual('', encodePlanning([[]]), "Test 8: Invalid entry (empty inner array)");
}

function test_parseHumanReadable()
{
	const text1 = "1ᵉʳ lundi 8h30 : Frais.";
	const expected1 = "1LuMdFr";
	assertEqual(expected1, parseHumanReadable(text1), "Test 1: Single entry");

	const text2 = "1ᵉʳ lundi 8h30 : Frais. 2ᵉ mardi 14h : Sec.";
	const expected2 = "1LuMdFr2MaApSe";
	assertEqual(expected2, parseHumanReadable(text2), "Test 2: Multiple entries");

	const text3 = "1ᵉʳ lundi 8h30 : Frais, Sec.";
	const expected3 = "1LuMdFr1LuMdSe";
	assertEqual(expected3, parseHumanReadable(text3), "Test 3: Multiple products same slot");

	const text4 = "Tous les lundis 8h30 : Frais.";
	const expected4 = "0LuMdFr";
	assertEqual(expected4, parseHumanReadable(text4), "Test 4: Every week");

	const text5 = "Tous les jeudis 8h30 : Sec.";
	const expected5 = "0JeMdSe";
	assertEqual(expected5, parseHumanReadable(text5), "Test 5: Every week pre-compressed");

	assertEqual('', parseHumanReadable(''), "Test 6: Empty schedule");
	assertEqual('', parseHumanReadable(null), "Test 7: Null schedule");
	assertEqual('', parseHumanReadable('Invalid text'), "Test 8: Invalid text");

	const text9 = "1er lundi 8h30 : Frais. 2e mardi 14h : Sec. 3e mercredi 10h : Surgelé. 4e jeudi 8h30 : Frais.";
	assertEqual("1LuMdFr2MaApSe3MeMfSu4JeMdFr", parseHumanReadable(text9), "Test 9: Standard ordinal strings (backward compatibility for 1er, 2e, 3e, 4e)");
}

function test_decodePlannings()
{
	const range1 = [
		["1LuMdFr"],
		["2MaApSe"]
	];
	const expected1 = [
		["1er lundi 8h30 : Frais."],
		["2e mardi 14h : Sec."]
	];
	assertEqual(expected1, decodePlannings(range1), "Test 1: Multiple rows, single column");

	const range2 = [
		["1LuMdFr", "2MaApSe"]
	];
	const expected2 = [
		["1er lundi 8h30 : Frais.", "2e mardi 14h : Sec."]
	];
	assertEqual(expected2, decodePlannings(range2), "Test 2: Single row, multiple columns");

	const range3 = [
		["1LuMdFr", "2MaApSe"],
		["3MeMfSu", "4JeMdFr"]
	];
	const expected3 = [
		["1er lundi 8h30 : Frais.", "2e mardi 14h : Sec."],
		["3e mercredi 10h : Surgelé.", "4e jeudi 8h30 : Frais."]
	];
	assertEqual(expected3, decodePlannings(range3), "Test 3: Multiple rows, multiple columns");

	const range4 = [
		[""],
		[null]
	];
	const expected4 = [
		[""],
		[""]
	];
	assertEqual(expected4, decodePlannings(range4), "Test 4: Empty and null cells");

	const range5 = [];
	const expected5 = [['']]; // Expected behavior for empty range for custom functions
	assertEqual(expected5, decodePlannings(range5), "Test 5: Empty input range");
}

function test_formatPlanningForDisplay()
{
	const text1 = "1er lundi 8h30 : Frais. 2e mardi 14h : Sec.";
	const expected1 = "1ᵉʳ lundi 8h30 : Frais.\n2ᵉ mardi 14h : Sec.";
	assertEqual(expected1, formatPlanningForDisplay(text1), "Test 1: Simple line break and Unicode conversion");

	const text2 = "1er lundi 8h30 : Frais. 2e mardi 14h : Frais.";
	const expected2 = "1ᵉʳ lundi 8h30 : Frais.\n2ᵉ mardi 14h :   \u3003"; // "Frais." is 6 chars, 3 spaces
	assertEqual(expected2, formatPlanningForDisplay(text2), "Test 2: Ditto mark for same product list");

	const text3 = "1er lundi 8h30 : Frais. 2e mardi 14h : Frais. 3e mercredi 10h : Sec.";
	const expected3 = "1ᵉʳ lundi 8h30 : Frais.\n2ᵉ mardi 14h :   \u3003\n3ᵉ mercredi 10h : Sec.";
	assertEqual(expected3, formatPlanningForDisplay(text3), "Test 3: Mixed ditto and new list");

	const text4 = "1er lundi 8h30 : Product A. 2e mardi 14h : Product A.";
	// "Product A." is 10 chars, ceil(10/2) = 5 spaces
	const expected4 = "1ᵉʳ lundi 8h30 : Product A.\n2ᵉ mardi 14h :     \u3003";
	assertEqual(expected4, formatPlanningForDisplay(text4), "Test 4: Ditto mark with longer string");

	const textGrouping = "1er lundi 8h30 : Frais. 2e mardi 14h : Sec. 3e mercredi 10h : Frais.";
	const expectedGrouping = "1ᵉʳ lundi 8h30 : Frais.\n3ᵉ mercredi 10h :   \u3003\n2ᵉ mardi 14h : Sec.";
	assertEqual(expectedGrouping, formatPlanningForDisplay(textGrouping), "Test 5: Grouping same product lists together");

	const textOdd = "1er lundi 8h30 : Frais, Sec. 2e mardi 14h : Frais, Sec.";
	// "Frais, Sec." is 11 chars. ceil(11/2) = 6 spaces.
	const expectedOdd = "1ᵉʳ lundi 8h30 : Frais, Sec.\n2ᵉ mardi 14h :      \u3003";
	assertEqual(expectedOdd, formatPlanningForDisplay(textOdd), "Test 6: Rounding up spaces for odd-length strings");

	assertEqual('', formatPlanningForDisplay(''), "Test 7: Empty input");
	assertEqual('', formatPlanningForDisplay(null), "Test 8: Null input");
}

function test_parseCanonicalPlanning()
{
	const text1 = "1er lundi 8h30 : Frais.";
	const expected1 = "1LuMdFr";
	assertEqual(expected1, parseCanonicalPlanning(text1), "Test 1: Single entry");

	const text2 = "1er lundi 8h30 : Frais. 2e mardi 14h : Sec.";
	const expected2 = "1LuMdFr2MaApSe";
	assertEqual(expected2, parseCanonicalPlanning(text2), "Test 2: Multiple entries");

	const text3 = "Tous les lundis 8h30 : Frais.";
	const expected3 = "0LuMdFr";
	assertEqual(expected3, parseCanonicalPlanning(text3), "Test 3: Every week");

	assertEqual('', parseCanonicalPlanning('Invalid format'), "Test 4: Invalid format");
	assertEqual('', parseCanonicalPlanning('1er lundi 8h30: Frais.'), "Test 5: Missing space before colon (strict)");
}

function test_parseFlexiblePlanning()
{
	const text1 = "1ᵉʳ lundi 8h30 : Frais.";
	assertEqual("1LuMdFr", parseFlexiblePlanning(text1), "Test 1: Unicode support");

	const text2 = "1er lundi : Frais. 2e mardi 14h : Sec.";
	assertEqual("1LuApFr2MaApSe", parseFlexiblePlanning(text2), "Test 2: Missing time default (uses 14h from later)");
	
	const text3 = "1er lundi 8h30 : Frais.\n2e mardi : 〃";
	assertEqual("1LuMdFr2MaMdFr", parseFlexiblePlanning(text3), "Test 3: Newline and ditto mark");

	const text4 = "tout les lundis 8h: Frais";
	assertEqual("0LuMdFr", parseFlexiblePlanning(text4), "Test 4: Case-insensitive and flexible keywords");
}

function test_formatPlannings()
{
	const range1 = [
		["1LuMdFr2MaApFr"],
		["3MeMfSu"]
	];
	const expected1 = [
		["1ᵉʳ lundi 8h30 : Frais.\n2ᵉ mardi 14h :   \u3003"],
		["3ᵉ mercredi 10h : Surgelé."]
	];
	assertEqual(expected1, formatPlannings(range1), "Test 1: Multiple rows with internal formatting");

	const range2 = [
		["1LuMdFr", "2MaApFr"]
	];
	const expected2 = [
		["1ᵉʳ lundi 8h30 : Frais.", "2ᵉ mardi 14h : Frais."]
	];
	// Note: formatPlanningForDisplay only does ditto marks WITHIN a single cell's decoded text (sentences),
	// not across different cells of the range.
	assertEqual(expected2, formatPlannings(range2), "Test 2: Multiple columns, no cross-cell ditto marks");
}

function test_countProductOccurrences()
{
	const schedule1 = "1LuMdFr";
	const expected1 = { 'Frais': 1, 'Sec': 0, 'Surgelé': 0 };
	assertEqual(expected1, countProductOccurrences(schedule1), "Test 1: Single Frais");

	const schedule2 = "0LuMdFr";
	const expected2 = { 'Frais': 4, 'Sec': 0, 'Surgelé': 0 };
	assertEqual(expected2, countProductOccurrences(schedule2), "Test 2: Every week Frais (counts 4)");

	const schedule3 = "1LuMdFr2MaApSe";
	const expected3 = { 'Frais': 1, 'Sec': 1, 'Surgelé': 0 };
	assertEqual(expected3, countProductOccurrences(schedule3), "Test 3: Mixed products");

	const schedule4 = "0JeMdSe3MeMfSu";
	const expected4 = { 'Frais': 0, 'Sec': 4, 'Surgelé': 1 };
	assertEqual(expected4, countProductOccurrences(schedule4), "Test 4: Mixed with every week");

	const schedule5 = "";
	const expected5 = { 'Frais': 0, 'Sec': 0, 'Surgelé': 0 };
	assertEqual(expected5, countProductOccurrences(schedule5), "Test 5: Empty schedule");
}
