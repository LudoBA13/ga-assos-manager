/**
 * @file This file contains tests for the normalizeNaturalLanguagePlanning function.
 */

function runNaturalLanguagePlanningTests()
{
	const testCases = [
		{ input: "1ème & 3ème Mercredi mat.", expected: "1er mercredi 8h30 : Frais, Sec, Surgelé. 3e mercredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er & 2ème Mercredi", expected: "1er mercredi 8h30 : Frais, Sec, Surgelé. 2e mercredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er & 3ème Jeudi mat.", expected: "1er jeudi 8h30 : Frais, Sec, Surgelé. 3e jeudi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er & 3ème jeudi.", expected: "1er jeudi 8h30 : Frais, Sec, Surgelé. 3e jeudi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er & 3ème Lundi", expected: "1er lundi 8h30 : Frais, Sec, Surgelé. 3e lundi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er & 3ème Lundi mat.", expected: "1er lundi 8h30 : Frais, Sec, Surgelé. 3e lundi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er & 3ème Mardi", expected: "1er mardi 8h30 : Frais, Sec, Surgelé. 3e mardi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er & 3ème Mercredi", expected: "1er mercredi 8h30 : Frais, Sec, Surgelé. 3e mercredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er & 3ème Vendredi", expected: "1er vendredi 8h30 : Frais, Sec, Surgelé. 3e vendredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er et 3ème jeudi", expected: "1er jeudi 8h30 : Frais, Sec, Surgelé. 3e jeudi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er et 3ème Mardi", expected: "1er mardi 8h30 : Frais, Sec, Surgelé. 3e mardi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er et 3ème Mercredi", expected: "1er mercredi 8h30 : Frais, Sec, Surgelé. 3e mercredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er Jeudi", expected: "1er jeudi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er Jeudi mat.", expected: "1er jeudi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er jeudi, 3ème mercredi", expected: "1er jeudi 8h30 : Frais, Sec, Surgelé. 3e mercredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er Lundi", expected: "1er lundi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er Lundi, 2ème Lundi, 3ème Lundi, 4ème Lundi", expected: "Tous les lundis 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er Lundi, 3ème Lundi", expected: "1er lundi 8h30 : Frais, Sec, Surgelé. 3e lundi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er Mardi", expected: "1er mardi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er Mardi mat.", expected: "1er mardi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er mardi, 3ème mardi", expected: "1er mardi 8h30 : Frais, Sec, Surgelé. 3e mardi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er Mercerdi", expected: "1er mercredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er Mercredi", expected: "1er mercredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er Mercredi & 3éme Mercredi", expected: "1er mercredi 8h30 : Frais, Sec, Surgelé. 3e mercredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er Mercredi mat.", expected: "1er mercredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er mercredi matin", expected: "1er mercredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er Vendredi", expected: "1er vendredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er Vendredi & 3ème Vendredi", expected: "1er vendredi 8h30 : Frais, Sec, Surgelé. 3e vendredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er Vendredi mat.", expected: "1er vendredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er Vendredi, 3ème Vendredi", expected: "1er vendredi 8h30 : Frais, Sec, Surgelé. 3e vendredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er, 2ème & 4ème Jeudi", expected: "1er jeudi 8h30 : Frais, Sec, Surgelé. 2e jeudi 8h30 : Frais, Sec, Surgelé. 4e jeudi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er, 2ème et 3ème vendredi", expected: "1er vendredi 8h30 : Frais, Sec, Surgelé. 2e vendredi 8h30 : Frais, Sec, Surgelé. 3e vendredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er, 2ème, 3ème & 4ème merc.", expected: "Tous les mercredis 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er, 2ème, 3ème,4ème Jeudi", expected: "Tous les jeudis 8h30 : Frais, Sec, Surgelé." },
		{ input: "1er, 3ème et 4ème mardi", expected: "1er mardi 8h30 : Frais, Sec, Surgelé. 3e mardi 8h30 : Frais, Sec, Surgelé. 4e mardi 8h30 : Frais, Sec, Surgelé." },
		{ input: "1ere lundi", expected: "1er lundi 8h30 : Frais, Sec, Surgelé." },
		{ input: "2ème & 4ème jeudi", expected: "2e jeudi 8h30 : Frais, Sec, Surgelé. 4e jeudi 8h30 : Frais, Sec, Surgelé." },
		{ input: "2éme & 4ème Lundi", expected: "2e lundi 8h30 : Frais, Sec, Surgelé. 4e lundi 8h30 : Frais, Sec, Surgelé." },
		{ input: "2ème & 4ème Lundi mat.", expected: "2e lundi 8h30 : Frais, Sec, Surgelé. 4e lundi 8h30 : Frais, Sec, Surgelé." },
		{ input: "2ème & 4ème Mercredi", expected: "2e mercredi 8h30 : Frais, Sec, Surgelé. 4e mercredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "2ème et 4ème jeudi", expected: "2e jeudi 8h30 : Frais, Sec, Surgelé. 4e jeudi 8h30 : Frais, Sec, Surgelé." },
		{ input: "2ème et 4ème lundi", expected: "2e lundi 8h30 : Frais, Sec, Surgelé. 4e lundi 8h30 : Frais, Sec, Surgelé." },
		{ input: "2ème et 4ème lundi matin", expected: "2e lundi 8h30 : Frais, Sec, Surgelé. 4e lundi 8h30 : Frais, Sec, Surgelé." },
		{ input: "2ème et 4ème Lundis après midi", expected: "2e lundi 14h : Frais, Sec, Surgelé. 4e lundi 14h : Frais, Sec, Surgelé." },
		{ input: "2ème et 4ème vendredi matin", expected: "2e vendredi 8h30 : Frais, Sec, Surgelé. 4e vendredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "2ème Jeudi", expected: "2e jeudi 8h30 : Frais, Sec, Surgelé." },
		{ input: "2ème Lundi", expected: "2e lundi 8h30 : Frais, Sec, Surgelé." },
		{ input: "2ème lundi matin", expected: "2e lundi 8h30 : Frais, Sec, Surgelé." },
		{ input: "2ème mardi", expected: "2e mardi 8h30 : Frais, Sec, Surgelé." },
		{ input: "2ème Mardi Mat.", expected: "2e mardi 8h30 : Frais, Sec, Surgelé." },
		{ input: "2ème Mardi matin", expected: "2e mardi 8h30 : Frais, Sec, Surgelé." },
		{ input: "2ème Mardi, 4ème Mardi", expected: "2e mardi 8h30 : Frais, Sec, Surgelé. 4e mardi 8h30 : Frais, Sec, Surgelé." },
		{ input: "2ème Mercredi", expected: "2e mercredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "2ème Mercredi Mat", expected: "2e mercredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "2ème mercredi matin", expected: "2e mercredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "2ème mercredi matin Frais, 2ème mercredi Matin Sec, 2ème mercredi Matin Surgel", expected: "2e mercredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "2ème Mercredi, 4ème Mercredi", expected: "2e mercredi 8h30 : Frais, Sec, Surgelé. 4e mercredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "2ème Vendredi", expected: "2e vendredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "2ème Vendredi mat.", expected: "2e vendredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "3 ème vendredi", expected: "3e vendredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "3ème & 4ème Mardi mat.", expected: "3e mardi 8h30 : Frais, Sec, Surgelé. 4e mardi 8h30 : Frais, Sec, Surgelé." },
		{ input: "3ème Jeudi", expected: "3e jeudi 8h30 : Frais, Sec, Surgelé." },
		{ input: "3ème Jeudi Mat.", expected: "3e jeudi 8h30 : Frais, Sec, Surgelé." },
		{ input: "3ème Lundi", expected: "3e lundi 8h30 : Frais, Sec, Surgelé." },
		{ input: "3ème Mardi", expected: "3e mardi 8h30 : Frais, Sec, Surgelé." },
		{ input: "3ème Mercredi", expected: "3e mercredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "3ème vendredi", expected: "3e vendredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "3ième mardi", expected: "3e mardi 8h30 : Frais, Sec, Surgelé." },
		{ input: "4ème Jeudi", expected: "4e jeudi 8h30 : Frais, Sec, Surgelé." },
		{ input: "4ème lundi après -midi", expected: "4e lundi 14h : Frais, Sec, Surgelé." },
		{ input: "4ème Lundi mat.", expected: "4e lundi 8h30 : Frais, Sec, Surgelé." },
		{ input: "4ème mardi", expected: "4e mardi 8h30 : Frais, Sec, Surgelé." },
		{ input: "4ème mercredi", expected: "4e mercredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "4ème Mercredi Mat.", expected: "4e mercredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "4ème Mercredi Matin", expected: "4e mercredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "4ème Vendredi", expected: "4e vendredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "4ème vendredi mat.", expected: "4e vendredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "à définir", expected: "" },
		{ input: "Chaque mardi et jeudi", expected: "Tous les mardis 8h30 : Frais, Sec, Surgelé. Tous les jeudis 8h30 : Frais, Sec, Surgelé." },
		{ input: "Enlévement chez PRIMEVER", expected: "" },
		{ input: "Livraison le 2ème vendredi (expérimentation)", expected: "" },
		{ input: "Sec : 1er & 3ème Mercredi matin", expected: "1er mercredi 8h30 : Sec. 3e mercredi 8h30 : Sec." },
		{ input: "sec : 1er Jeudi / frais : 1er Jeudi / surgelés : 1er Jeudi", expected: "1er jeudi 8h30 : Frais, Sec, Surgelé." },
		{ input: "SEC : 1er lundi et 3e lundi / Frais : 1er lundi et 3e lundi / surgelés : 1er lundi et 3e lundi", expected: "1er lundi 8h30 : Frais, Sec, Surgelé. 3e lundi 8h30 : Frais, Sec, Surgelé." },
		{ input: "Sec : 1er lundi matin / Frais : 1er lundi matin / Surgelés : 1er lundi matin", expected: "1er lundi 8h30 : Frais, Sec, Surgelé." },
		{ input: "Sec : 1er Lundi/ Frais : 1er Lundi / Surgelés: 1er Lundi", expected: "1er lundi 8h30 : Frais, Sec, Surgelé." },
		{ input: "Sec : 1er mardi / Frais : 1er mardi / Surgelés : 1 er mardi", expected: "1er mardi 8h30 : Frais, Sec, Surgelé." },
		{ input: "SEC : 1er mardi et 3e mardi / frais : 1er mardi et 3e mardi / surgelés : 1er mardi et 3e mardi", expected: "1er mardi 8h30 : Frais, Sec, Surgelé. 3e mardi 8h30 : Frais, Sec, Surgelé." },
		{ input: "SEC : 1er Mardi, 3ème Mardi / SURGELES : 1er mardi et 3e mardi", expected: "1er mardi 8h30 : Sec, Surgelé. 3e mardi 8h30 : Sec, Surgelé." },
		{ input: "sec : 1er,2e ,3e, 4e Vendredi / frais : Tous les jours / Surgelés: 2e et 4e jeudi", expected: "Tous les vendredis 8h30 : Frais, Sec. 2e jeudi 8h30 : Surgelé. 4e jeudi 8h30 : Surgelé." },
		{ input: "sec : 2 éme & 4ème vendredi", expected: "2e vendredi 8h30 : Sec. 4e vendredi 8h30 : Sec." },
		{ input: "sec : 2ème , 3ème et 4ème Mardi", expected: "2e mardi 8h30 : Sec. 3e mardi 8h30 : Sec. 4e mardi 8h30 : Sec." },
		{ input: "Sec : 2ème & 4ème vendredi Mat / Frais : 2ème & 4ème vendredi Mat / Surgelés : 2ème & 4ème vendredi Mat", expected: "2e vendredi 8h30 : Frais, Sec, Surgelé. 4e vendredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "Sec : 2ème et 4ème Lundis matin / Frais : 2ème et 4ème lundis / Surg. : 2ème lundi", expected: "2e lundi 8h30 : Frais, Sec, Surgelé. 4e lundi 8h30 : Frais, Sec." },
		{ input: "Sec : 2ème Jeudi", expected: "2e jeudi 8h30 : Sec." },
		{ input: "SEC : 2ème lundi et 4ème lundi", expected: "2e lundi 8h30 : Sec. 4e lundi 8h30 : Sec." },
		{ input: "Sec : 2ème mardi matin", expected: "2e mardi 8h30 : Sec." },
		{ input: "SEC : 2ème Mercredi", expected: "2e mercredi 8h30 : Sec." },
		{ input: "Sec : 2ème Mercredi / frais : 2ème Mercredi / surgelés: 2ème Mercredi", expected: "2e mercredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "SEC : 3e jeudi / frais: 3e jeudi /surgelés : 3e jeudi", expected: "3e jeudi 8h30 : Frais, Sec, Surgelé." },
		{ input: "Sec : 3ème lundi matin", expected: "3e lundi 8h30 : Sec." },
		{ input: "SEC : 3ème Mardi", expected: "3e mardi 8h30 : Sec." },
		{ input: "SEC : 3ème Mercredi", expected: "3e mercredi 8h30 : Sec." },
		{ input: "SEC : 3ème vendredi", expected: "3e vendredi 8h30 : Sec." },
		{ input: "SEC : 3ème vendredi / Frais : 3ème vendredi / surgelés: 3e vendredi", expected: "3e vendredi 8h30 : Frais, Sec, Surgelé." },
		{ input: "sec : 4e lundi / frais : 4e lundi / surgelés : 4e lundi", expected: "4e lundi 8h30 : Frais, Sec, Surgelé." },
		{ input: "SEC : 4e vendredi / surgeles 4e vendredi", expected: "4e vendredi 8h30 : Sec, Surgelé." },
		{ input: "Sec : 4ème jeudi", expected: "4e jeudi 8h30 : Sec." },
		{ input: "Sec : 4ème Mardi", expected: "4e mardi 8h30 : Sec." },
		{ input: "SEC : 4ème mardi / frais : 4ème mardi / Surgelés ; 4ème mardi", expected: "4e mardi 8h30 : Frais, Sec, Surgelé." },
		{ input: "Sec : 4ème mercredi", expected: "4e mercredi 8h30 : Sec." },
		{ input: "SEC :4ème Mercredi", expected: "4e mercredi 8h30 : Sec." },
		{ input: "SEC le 4ème lundi, FRAIS ts les lundi", expected: "Tous les lundis 8h30 : Frais. 4e lundi 8h30 : Sec." },
		{ input: "Sec, frais et surg : 2ème et 4ème mardis", expected: "2e mardi 8h30 : Frais, Sec, Surgelé. 4e mardi 8h30 : Frais, Sec, Surgelé." },
		{ input: "Sec: 1er, 2ème,3ème et 4ème Lundi", expected: "Tous les lundis 8h30 : Sec." }
	];

	const results = {
		passed: 0,
		failed: 0,
		total: testCases.length,
		details: []
	};

	testCases.forEach(testCase => {
		try {
			const actual = PlanningNormalizer.normalizeNaturalLanguagePlanning(testCase.input);
			if (actual !== testCase.expected) {
				throw new Error(`Normalization mismatch for "${testCase.input}"\nExpected: "${testCase.expected}"\nActual:   "${actual}"`);
			}
			
			// Second verification: can it be parsed?
			if (actual !== "") {
				const encoded = parseFlexiblePlanning(actual);
				if (!encoded) {
					throw new Error(`Normalized output "${actual}" resulted in empty encoded string for input "${testCase.input}"`);
				}
			}
			
			results.passed++;
		} catch (e) {
			results.failed++;
			results.details.push({
				name: `Input: ${testCase.input}`,
				status: 'FAILED',
				error: e.message
			});
		}
	});

	Logger.log(`NaturalLanguagePlanning Test Results: ${results.passed} / ${results.total} passed.`);
	if (results.failed > 0)
	{
		Logger.log('--- FAILED NATURAL LANGUAGE TESTS ---');
		results.details.forEach(r =>
		{
			Logger.log(`[${r.name}]: ${r.error}`);
		});
	}
	return results;
}
