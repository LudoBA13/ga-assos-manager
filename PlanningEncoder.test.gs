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
		test_canonicalizeSchedule,
		test_encodePlanning,
		test_parseHumanReadable
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
	if (expected !== actual)
	{
		throw new Error(message + `\nExpected: "${expected}"\nActual:   "${actual}"`);
	}
}

// --- Test Cases ---

function test_decodePlanning()
{
	const schedule1 = "1LuMdFr";
	const expected1 = "1er lundi 8h30: Frais.";
	assertEqual(expected1, decodePlanning(schedule1), "Test 1: Single entry");

	const schedule2 = "1LuMdFr2MaApSe";
	const expected2 = "1er lundi 8h30: Frais. 2e mardi 14h00: Sec.";
	assertEqual(expected2, decodePlanning(schedule2), "Test 2: Multiple entries");

	const schedule3 = "1LuMdFr1LuMdSe";
	const expected3 = "1er lundi 8h30: Frais, Sec.";
	assertEqual(expected3, decodePlanning(schedule3), "Test 3: Multiple products same slot");

	const schedule4 = "1LuMdFr2LuMdFr3LuMdFr4LuMdFr";
	const expected4 = "Tous les lundis 8h30: Frais.";
	assertEqual(expected4, decodePlanning(schedule4), "Test 4: Every week compression");
	
	const schedule5 = "0JeMdSe";
	const expected5 = "Tous les jeudis 8h30: Sec.";
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
	const text1 = "1er lundi 8h30: Frais.";
	const expected1 = "1LuMdFr";
	assertEqual(expected1, parseHumanReadable(text1), "Test 1: Single entry");

	const text2 = "1er lundi 8h30: Frais. 2e mardi 14h00: Sec.";
	const expected2 = "1LuMdFr2MaApSe";
	assertEqual(expected2, parseHumanReadable(text2), "Test 2: Multiple entries");

	const text3 = "1er lundi 8h30: Frais, Sec.";
	const expected3 = "1LuMdFr1LuMdSe";
	assertEqual(expected3, parseHumanReadable(text3), "Test 3: Multiple products same slot");

	const text4 = "Tous les lundis 8h30: Frais.";
	const expected4 = "0LuMdFr";
	assertEqual(expected4, parseHumanReadable(text4), "Test 4: Every week");
	
	const text5 = "Tous les jeudis 8h30: Sec.";
	const expected5 = "0JeMdSe";
	assertEqual(expected5, parseHumanReadable(text5), "Test 5: Every week pre-compressed");

	assertEqual('', parseHumanReadable(''), "Test 6: Empty schedule");
	assertEqual('', parseHumanReadable(null), "Test 7: Null schedule");
	assertEqual('', parseHumanReadable('Invalid text'), "Test 8: Invalid text");
}
