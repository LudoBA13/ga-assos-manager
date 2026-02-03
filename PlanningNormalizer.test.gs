/**
 * @file This file contains tests for the PlanningNormalizer class.
 * @license
 * MIT License
 */

/**
 * Runs all tests for the PlanningNormalizer library.
 */
function runPlanningNormalizerTests()
{
	const testCases = [
		test_PlanningNormalizer_Unit,
		test_PlanningNormalizer_Range,
		test_PlanningNormalizer_Idempotency,
		test_PlanningNormalizer_CSVSamples
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

	Logger.log(`PlanningNormalizer Test Results: ${results.passed} / ${results.total} passed.`);
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
		Logger.log('All PlanningNormalizer tests passed successfully!');
	}

	return results;
}

function assertEqual(expected, actual, message)
{
	if (expected !== actual)
	{
		throw new Error(message + `\nExpected: "${expected}"\nActual:   "${actual}"`);
	}
}

function test_PlanningNormalizer_Unit()
{
	// 1. Basic Formatting
	assertEqual("1er lundi 8h30 : Frais.", PlanningNormalizer.normalize("1er lundi 8h30: Frais"), "Basic single entry");

	// 2. Week Normalization
	assertEqual("1er lundi 8h30 : Frais.", PlanningNormalizer.normalize("1 lundi 8h30 Frais"), "Implicit 1er");
	assertEqual("2e mardi 10h : Sec.", PlanningNormalizer.normalize("2 eme mardi 10:00 Sec"), "2 eme -> 2e, 10:00 -> 10h");
	assertEqual("3e mercredi 14h : Surgelé.", PlanningNormalizer.normalize("3ème mercredi 14h Surgeles"), "3ème -> 3e, Surgeles -> Surgelé");
	assertEqual("Tous les jeudi 8h30 : Frais.", PlanningNormalizer.normalize("tout les jeudi 8h30 frais"), "tout les -> Tous les, plural day");

	// 3. Time Normalization
	assertEqual("1er lundi 8h30 : Frais.", PlanningNormalizer.normalize("1er lundi 08:30 Frais"), "08:30 -> 8h30");
	assertEqual("1er lundi 8h30 : Frais.", PlanningNormalizer.normalize("1er lundi 8:30 Frais"), "8:30 -> 8h30");
	assertEqual("1er lundi 10h : Frais.", PlanningNormalizer.normalize("1er lundi 10h00 Frais"), "10h00 -> 10h");
	assertEqual("1er lundi 10h : Frais.", PlanningNormalizer.normalize("1er lundi 10h30 Frais"), "10h30 -> 10h");
	assertEqual("1er lundi 8h30 : Frais.", PlanningNormalizer.normalize("1er lundi 8h45 Frais"), "8h45 -> 8h30");

	assertEqual("1er lundi 10h : Frais.", PlanningNormalizer.normalize("1er lundi 1030 Frais"), "1030 -> 10h");
	assertEqual("1er lundi 8h30 : Frais.", PlanningNormalizer.normalize("1er lundi 830 Frais"), "830 -> 8h30");

	assertEqual("1er lundi 10h : Frais.", PlanningNormalizer.normalize("1er lundi 10 Frais"), "10 -> 10h");
	assertEqual("1er lundi 8h30 : Frais.", PlanningNormalizer.normalize("1er lundi 8 Frais"), "8 -> 8h30");

	// 4. Separators & Structure
	assertEqual("1er lundi 8h30 : Frais, Sec.", PlanningNormalizer.normalize("1er lundi 8h30 Frais Sec"), "Missing commas between products");
	assertEqual("1er lundi 8h30 : Frais, Sec.", PlanningNormalizer.normalize("1er lundi 8h30 Frais+Sec"), "Plus separator");
	assertEqual("1er lundi 8h30 : Frais. 2e mardi 10h : Sec.", PlanningNormalizer.normalize("1er lundi 8h30 Frais\n2e mardi 10h Sec"), "Newline separation");
	assertEqual("1er lundi 8h30 : Frais. 2e mardi 10h : Sec.", PlanningNormalizer.normalize("1er lundi 8h30 Frais. 2e mardi 10h Sec"), "Period separation");

	// 5. Edge cases
	assertEqual("3e mardi 8h30 : Sec, Frais, Surgelé.", PlanningNormalizer.normalize("3e mardi 8h30 : Sec. frais, surgelés"), "Period inside product list");
	assertEqual("4e mercredi 8h30 : Frais, Surgelé.", PlanningNormalizer.normalize("4 mercredi 8h30 frais+surgeles"), "4 mercredi -> 4e, + separator");
}

function test_PlanningNormalizer_Idempotency()
{
	const samples = [
		"1er lundi 8h30: Frais",
		"2e mardi 10h: Sec, Surgelé",
		"Tous les vendredis 14h: Frais"
	];

	for (const sample of samples)
	{
		const normalized = PlanningNormalizer.normalize(sample);
		const twice = PlanningNormalizer.normalize(normalized);
		assertEqual(normalized, twice, `Idempotency check for: ${sample}`);
	}
}

function test_PlanningNormalizer_CSVSamples()
{
	// Samples extracted from provided CSV content
	const rawSamples = [
		"2e vendredi 10h: Frais, Sec, Surgelé.\n\n4e vendredi 10h: Frais, Sec, Surgelé.",
		"3e jeudi 8h30: Sec., Frais, Surgelés",
		"3e mardi 8h30 : Sec. frais, surgelés",
		"4e mardi8h30: Frais, Sec.",
		"2e jeudi 8h30: Frais, Sec. Surgeles",
		"2e vendredi 10h: Sec, frais, Surgelé.",
		"1er mercredi 10h: Frais, Sec. 2ème lundi : surgelés\n2e mercredi 10h: Frais, Sec.", // Note: "2ème lundi : surgelés" missing time!
		"2e vendredi 14h: Surgelé.\n3e jeudi 8h30: Frais, Sec, Surgelé.",
		"Tous les lundi 8h30:  Sec, Surgelé.\nTois les jeudi frais, surgeles\nTous les vendredis 8h30:  Sec,", // Middle one missing time
		"4e vendredi 8h30: Frais, Sec, Surgelé.",
		"1er mercredi 10h: Frais, Sec, Surgelé.\n3e mercredi 10h: Frais, Sec, Surgelé.",
		"1er lundi 8h30:  Sec",
		"1er mardi 8h30: Frais, Sec, Surgelé.",
		"1er jeudi 8h30: Frais, Sec, Surgelé.\n3e jeudi 8h30: Frais, Sec, Surgelé.",
		"\n4e vendredi 8h30: Frais, Sec.",
		"3 eme mercredi frais sec surgele\n3e mercredi 10h: Frais, Sec, Surgelé.", // First one missing time
		"2e jeudi 10h: Sec.",
		"4 mercredi 8h30 frais+surgeles", // Added 8h30 for testing validity if time exists
		"2e mercredi 10h: Frais, Sec, Surgelé.",
		"Tous les mercredis 10h: Sec.",
		"3e vendredi 8h30: Frais, Sec, Surgelé.",
		"2e lundi 8h30: Frais, Sec, Surgelé.",
		"3e mercredi 8h30: sec",
		"1er mercredi 8h30: Sec.",
		"1er mardi 8h30: Sec.",
		"2e jeudi 10h: Frais, Sec",
		"3e mardi 8h30: Frais, Sec, Surgelé.",
		"3e mardi 8h30: Frais, Sec, Surgelé.\n4e mardi 8h30: Frais, Sec, ",
		"2e mardi 8h30: Frais, Sec, Surgelé.",
		"3e mardi 10h30: Frais, Sec, Surgelé.", // 10h30 -> should normalize to 10h? Or fail? My regex is strict on 10h/10:00.
		"1er lundi 8h30: Frais, Sec, Surgelé.",
		"2e lundi 8h30: Frais, Sec, Surgelé.\n4e lundi 8h30: Frais, Sec, Surgelé.",
		"\n2e lundi 8h30: Sec, Frais, Surgelé.\n4e lundi 8h30: Sec, Frais, Surgelé.",
		"1er mercredi 10h: Frais, Sec, Surgelé.\n3e mercredi 10h: Frais, Sec, Surgelé.",
		"\n4e vendredi 10h: Frais, Sec, Surgelé."
	];

	// Note: Entries with missing times will be normalized but parseHumanReadable will skip them.
	// This test verifies that VALID entries are preserved and parseable.

	for (const raw of rawSamples)
	{
		const normalized = PlanningNormalizer.normalize(raw);

		// Attempt to parse
		const encoded = parseHumanReadable(normalized);

		// We expect at least something to be encoded if the input had valid time/day info.
		// Some raw samples above are intentionally broken (missing time), so encoded might be empty or partial.

		// Round trip check for the parts that survived
		const decoded = decodePlanning(encoded);

		// Re-encode to verify stability of the encoded form
		const reEncoded = parseHumanReadable(decoded);

		assertEqual(encoded, reEncoded, `Round-trip stability for: ${normalized}`);
	}
}

function test_PlanningNormalizer_Range()
{
	const range = [
		["1er lundi 8h30: Frais", "2e mardi 10h: Sec"],
		["Tous les vendredis 14h: Surgelé", ""]
	];
	const expected = [
		["1er lundi 8h30 : Frais.", "2e mardi 10h : Sec."],
		["Tous les vendredi 14h : Surgelé.", ""]
	];
	const actual = PlanningNormalizer.normalizeRange(range);

	if (JSON.stringify(expected) !== JSON.stringify(actual))
	{
		throw new Error("test_PlanningNormalizer_Range FAILED\nExpected: " + JSON.stringify(expected) + "\nActual: " + JSON.stringify(actual));
	}
}
