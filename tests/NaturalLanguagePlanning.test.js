/**
 * @file This file contains tests for the normalizeNaturalLanguagePlanning function.
 */

function runNaturalLanguagePlanningTests()
{
	const csvContent = [
		"1ème & 3ème Mercredi mat.",
		"1er & 2ème Mercredi",
		"1er & 3ème Jeudi mat.",
		"1er & 3ème jeudi.",
		"1er & 3ème Lundi",
		"1er & 3ème Lundi mat.",
		"1er & 3ème Mardi",
		"1er & 3ème Mercredi",
		"1er & 3ème Vendredi",
		"1er et 3ème jeudi",
		"1er et 3ème Mardi",
		"1er et 3ème Mercredi",
		"1er Jeudi",
		"1er Jeudi mat.",
		"1er jeudi, 3ème mercredi",
		"1er Lundi",
		"1er Lundi, 2ème Lundi, 3ème Lundi, 4ème Lundi",
		"1er Lundi, 3ème Lundi",
		"1er Mardi",
		"1er Mardi mat.",
		"1er mardi, 3ème mardi",
		"1er Mercerdi",
		"1er Mercredi",
		"1er Mercredi & 3éme Mercredi",
		"1er Mercredi mat.",
		"1er mercredi matin",
		"1er Vendredi",
		"1er Vendredi & 3ème Vendredi",
		"1er Vendredi mat.",
		"1er Vendredi, 3ème Vendredi",
		"1er, 2ème & 4ème Jeudi",
		"1er, 2ème et 3ème vendredi",
		"1er, 2ème, 3ème & 4ème merc.",
		"1er, 2ème, 3ème,4ème Jeudi",
		"1er, 3ème et 4ème mardi",
		"1ere lundi",
		"2ème & 4ème jeudi",
		"2éme & 4ème Lundi",
		"2ème & 4ème Lundi mat.",
		"2ème & 4ème Mercredi",
		"2ème et 4ème jeudi",
		"2ème et 4ème lundi",
		"2ème et 4ème lundi matin",
		"2ème et 4ème Lundis après midi",
		"2ème et 4ème vendredi matin",
		"2ème Jeudi",
		"2ème Lundi",
		"2ème lundi matin",
		"2ème mardi",
		"2ème Mardi Mat.",
		"2ème Mardi matin",
		"2ème Mardi, 4ème Mardi",
		"2ème Mercredi",
		"2ème Mercredi Mat",
		"2ème mercredi matin",
		"2ème mercredi matin Frais, 2ème mercredi Matin Sec, 2ème mercredi Matin Surgel",
		"2ème Mercredi, 4ème Mercredi",
		"2ème Vendredi",
		"2ème Vendredi mat.",
		"3 ème vendredi",
		"3ème & 4ème Mardi mat.",
		"3ème Jeudi",
		"3ème Jeudi Mat.",
		"3ème Lundi",
		"3ème Mardi",
		"3ème Mercredi",
		"3ème vendredi",
		"3ième mardi",
		"4ème Jeudi",
		"4ème lundi après -midi",
		"4ème Lundi mat.",
		"4ème mardi",
		"4ème mercredi",
		"4ème Mercredi Mat.",
		"4ème Mercredi Matin",
		"4ème Vendredi",
		"4ème vendredi mat.",
		"à définir",
		"Chaque mardi et jeudi",
		"Enlévement chez PRIMEVER",
		"Livraison le 2ème vendredi (expérimentation)",
		"Sec : 1er & 3ème Mercredi matin",
		"sec : 1er Jeudi / frais : 1er Jeudi / surgelés : 1er Jeudi",
		"SEC : 1er lundi et 3e lundi / Frais : 1er lundi et 3e lundi / surgelés : 1er lundi et 3e lundi",
		"Sec : 1er lundi matin / Frais : 1er lundi matin / Surgelés : 1er lundi matin",
		"Sec : 1er Lundi/ Frais : 1er Lundi / Surgelés: 1er Lundi",
		"Sec : 1er mardi / Frais : 1er mardi / Surgelés : 1 er mardi",
		"SEC : 1er mardi et 3e mardi / frais : 1er mardi et 3e mardi / surgelés : 1er mardi et 3e mardi",
		"SEC : 1er Mardi, 3ème Mardi / SURGELES : 1er mardi et 3e mardi",
		"sec : 1er,2e ,3e, 4e Vendredi / frais : Tous les jours / Surgelés: 2e et 4e jeudi",
		"sec : 2 éme & 4ème vendredi",
		"sec : 2ème , 3ème et 4ème Mardi",
		"Sec : 2ème & 4ème vendredi Mat / Frais : 2ème & 4ème vendredi Mat / Surgelés : 2ème & 4ème vendredi Mat",
		"Sec : 2ème et 4ème Lundis matin / Frais : 2ème et 4ème lundis / Surg. : 2ème lundi",
		"Sec : 2ème Jeudi",
		"SEC : 2ème lundi et 4ème lundi",
		"Sec : 2ème mardi matin",
		"SEC : 2ème Mercredi",
		"Sec : 2ème Mercredi / frais : 2ème Mercredi / surgelés: 2ème Mercredi",
		"SEC : 3e jeudi / frais: 3e jeudi /surgelés : 3e jeudi",
		"Sec : 3ème lundi matin",
		"SEC : 3ème Mardi",
		"SEC : 3ème Mercredi",
		"SEC : 3ème vendredi",
		"SEC : 3ème vendredi / Frais : 3ème vendredi / surgelés: 3e vendredi",
		"sec : 4e lundi / frais : 4e lundi / surgelés : 4e lundi",
		"SEC : 4e vendredi / surgeles 4e vendredi",
		"Sec : 4ème jeudi",
		"Sec : 4ème Mardi",
		"SEC : 4ème mardi / frais : 4ème mardi / Surgelés ; 4ème mardi",
		"Sec : 4ème mercredi",
		"SEC :4ème Mercredi",
		"SEC le 4ème lundi, FRAIS ts les lundi",
		"Sec, frais et surg : 2ème et 4ème mardis",
		"Sec: 1er, 2ème,3ème et 4ème Lundi"
	];

	const results = {
		passed: 0,
		failed: 0,
		total: csvContent.length,
		details: []
	};

	csvContent.forEach(line => {
		try {
			const normalized = PlanningNormalizer.normalizeNaturalLanguagePlanning(line);
			
			if (line.toLowerCase().includes("livraison")) {
				if (normalized !== "") {
					throw new Error(`Expected empty string for "livraison", got "${normalized}"`);
				}
			} else if (normalized === "" && line !== "à définir" && line !== "Enlévement chez PRIMEVER") {
				throw new Error(`Line resulted in empty normalization: "${line}"`);
			} else if (normalized !== "") {
				// Try to parse with parseFlexiblePlanning
				const encoded = parseFlexiblePlanning(normalized);
				if (!encoded) {
					throw new Error(`Normalization "${normalized}" resulted in empty encoded string for line "${line}"`);
				}
				
				// Verify "no product" case
				const hasProductInput = /frais|f&l|sec|surg/i.test(line);
				if (!hasProductInput) {
					if (!normalized.includes("Frais") || !normalized.includes("Sec") || !normalized.includes("Surgelé")) {
						throw new Error(`Expected all products in normalization for "${line}", got "${normalized}"`);
					}
				}
			}
			results.passed++;
		} catch (e) {
			results.failed++;
			results.details.push({
				name: `Line: ${line}`,
				status: 'FAILED',
				error: e.message
			});
		}
	});

	// Add some specific hardcoded checks
	const specificChecks = [
		{
			input: "1ème & 3ème Mercredi mat.",
			expected: "1er mercredi 8h30 : Frais, Sec, Surgelé. 3e mercredi 8h30 : Frais, Sec, Surgelé."
		},
		{
			input: "Chaque mardi et jeudi",
			expected: "Tous les mardis 8h30 : Frais, Sec, Surgelé. Tous les jeudis 8h30 : Frais, Sec, Surgelé."
		},
		{
			input: "Sec : 1er & 3ème Mercredi matin",
			expected: "1er mercredi 8h30 : Sec. 3e mercredi 8h30 : Sec."
		}
	];

	specificChecks.forEach(check => {
		results.total++;
		try {
			const actual = PlanningNormalizer.normalizeNaturalLanguagePlanning(check.input);
			if (actual !== check.expected) {
				throw new Error(`Specific check failed for "${check.input}"\nExpected: "${check.expected}"\nActual:   "${actual}"`);
			}
			results.passed++;
		} catch (e) {
			results.failed++;
			results.details.push({
				name: `Specific: ${check.input}`,
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
