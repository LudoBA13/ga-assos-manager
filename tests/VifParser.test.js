/**
 * @file This file contains tests for the VifParser.js file.
 */

/**
 * Runs all tests for the VifParser class.
 * @returns {{passed: number, failed: number, total: number, details: Array<{name: string, status: string, error: string, stack: string}>}}
 */
function runVifParserTests()
{
	const testCases = [
		test_parseBL_Standard,
		test_parseBLStats,
		test_parseBLStats_SpecialArticle,
		test_parseBLStats_FL,
		test_parseBLStats_IgnoreArticle
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

	Logger.log(`VifParser Test Results: ${results.passed} / ${results.total} passed.`);
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
		Logger.log('All VifParser tests passed successfully!');
	}

	return results;
}

function test_parseBL_Standard()
{
	const mockContent = `Client : 12345
2023-01-01	BL001	CDE001	101	Article 1	LOT1	10.5	11.0	P1	COL1
			102	Article 2	LOT2	5.0	5.5	P2	COL2
Client : 67890
2023-01-02	BL002	CDE002	201	Article 3	LOT3	20.0	21.0	P3	COL3
`;

	const expected = [
		['Code VIF', 'Date', 'n° BL', 'n° Cde', 'Article', 'Libellé', 'Lot', 'Kg Net', 'Kg Brut', 'P', 'COL'],
		['12345', '2023-01-01', 'BL001', 'CDE001', '101', 'Article 1', 'LOT1', '10.5', '11.0', 'P1', 'COL1'],
		['12345', '2023-01-01', 'BL001', 'CDE001', '102', 'Article 2', 'LOT2', '5.0', '5.5', 'P2', 'COL2'],
		['67890', '2023-01-02', 'BL002', 'CDE002', '201', 'Article 3', 'LOT3', '20.0', '21.0', 'P3', 'COL3']
	];

	const actual = VifParser.parseBL(mockContent);

	if (JSON.stringify(actual) !== JSON.stringify(expected))
	{
		throw new Error(`test_parseBL_Standard failed.
Expected: ${JSON.stringify(expected)}
Actual:   ${JSON.stringify(actual)}`);
	}
}

function test_parseBLStats()
{
	const mockContent = `Client : 12345
2023-01-01	BL001	CDE001	10009	Article 1	LOT1	10,5	11.0	P1	COL1
			10003	Article 2	proxidon001	5.0	5.5	P2	COL2
Client : 67890
2023-01-02	BL002	CDE002	45203	Article 3	LOT3	20.0	21.0	P3	COL3
			30009	Article 4	LOT4	1.0	1.5	P4	COL4
`;

	const expected = [
		{
			'Code VIF': '12345',
			'Date': '2023-01-01',
			'n° BL': 'BL001',
			'Type BL': 'Proxidon',
			'Kg Net': 15.5,
			'Produits Sec': 2,
			'Produits Frais': 0,
			'Produits Surgelé': 0,
			'Produits F&L': 0,
			'Produits FSE': 1,
			'Produits CNES': 1,
			'Produits Proxidon': 1
		},
		{
			'Code VIF': '67890',
			'Date': '2023-01-02',
			'n° BL': 'BL002',
			'Type BL': 'Surgelé',
			'Kg Net': 21.0,
			'Produits Sec': 0,
			'Produits Frais': 0,
			'Produits Surgelé': 1,
			'Produits F&L': 0,
			'Produits FSE': 1,
			'Produits CNES': 1,
			'Produits Proxidon': 0
		}
	];

	const results = [];
	const data = VifParser.parseBL(mockContent);
	for (const res of VifParser.parseBLStats(data))
	{
		results.push(res);
	}

	if (JSON.stringify(results) !== JSON.stringify(expected))
	{
		throw new Error(`test_parseBLStats failed.
Expected: ${JSON.stringify(expected)}
Actual:   ${JSON.stringify(results)}`);
	}
}

function test_parseBLStats_SpecialArticle()
{
	const mockContent = `Client : 99999
2023-01-01	BL003	CDE003	4210011	Special Article	LOT1	10.0	10.0	P1	COL1
`;

	const expected = [
		{
			'Code VIF': '99999',
			'Date': '2023-01-01',
			'n° BL': 'BL003',
			'Type BL': 'Frais',
			'Kg Net': 10.0,
			'Produits Sec': 0,
			'Produits Frais': 1,
			'Produits Surgelé': 0,
			'Produits F&L': 0,
			'Produits FSE': 0,
			'Produits CNES': 0,
			'Produits Proxidon': 0
		}
	];

	const results = [];
	const data = VifParser.parseBL(mockContent);
	for (const res of VifParser.parseBLStats(data))
	{
		results.push(res);
	}

	if (JSON.stringify(results) !== JSON.stringify(expected))
	{
		throw new Error(`test_parseBLStats_SpecialArticle failed.
Expected: ${JSON.stringify(expected)}
Actual:   ${JSON.stringify(results)}`);
	}
}

function test_parseBLStats_FL()
{
	const mockContent = `Client : 99999
2023-01-01	BL004	CDE004	4520000	Fruits Test	LOT1	10.0	10.0	P1	COL1
`;

	const expected = [
		{
			'Code VIF': '99999',
			'Date': '2023-01-01',
			'n° BL': 'BL004',
			'Type BL': 'F&L',
			'Kg Net': 10.0,
			'Produits Sec': 0,
			'Produits Frais': 1,
			'Produits Surgelé': 0,
			'Produits F&L': 1,
			'Produits FSE': 0,
			'Produits CNES': 0,
			'Produits Proxidon': 0
		}
	];

	const results = [];
	const data = VifParser.parseBL(mockContent);
	for (const res of VifParser.parseBLStats(data))
	{
		results.push(res);
	}

	if (JSON.stringify(results) !== JSON.stringify(expected))
	{
		throw new Error(`test_parseBLStats_FL failed.
Expected: ${JSON.stringify(expected)}
Actual:   ${JSON.stringify(results)}`);
	}
}

function test_parseBLStats_IgnoreArticle()
{
	const mockContent = `Client : 99999
2023-01-01	BL005	CDE005	5010010	Ignored Article	LOT1	10.0	10.0	P1	COL1
			10009	Valid Article	LOT2	5.0	5.0	P2	COL2
`;

	const expected = [
		{
			'Code VIF': '99999',
			'Date': '2023-01-01',
			'n° BL': 'BL005',
			'Type BL': 'Sec',
			'Kg Net': 5.0,
			'Produits Sec': 1,
			'Produits Frais': 0,
			'Produits Surgelé': 0,
			'Produits F&L': 0,
			'Produits FSE': 1,
			'Produits CNES': 0,
			'Produits Proxidon': 0
		}
	];

	const results = [];
	const data = VifParser.parseBL(mockContent);
	for (const res of VifParser.parseBLStats(data))
	{
		results.push(res);
	}

	if (JSON.stringify(results) !== JSON.stringify(expected))
	{
		throw new Error(`test_parseBLStats_IgnoreArticle failed.
Expected: ${JSON.stringify(expected)}
Actual:   ${JSON.stringify(results)}`);
	}
}
