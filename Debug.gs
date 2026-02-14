/**
 * @file This file contains debug utilities for manual execution in the Google Apps Script Editor.
 * @license
 * MIT License
 *
 * Copyright (c) Ludovic ARNAUD
 */

/**
 * Generates visit reports for the timestamps found in CRVisites!A2:A8.
 * This is intended for manual testing and debugging within the GAS Editor.
 */
function debugGenerateReportsInRange()
{
	const sheetName = 'CRVisites';
	const rangeAddress = 'A2:A8';

	const ss = SpreadsheetApp.getActiveSpreadsheet();
	const sheet = ss.getSheetByName(sheetName);

	if (!sheet)
	{
		console.error(`Error: Sheet "${sheetName}" not found.`);
		return;
	}

	const timestamps = sheet.getRange(rangeAddress).getValues();
	console.log(`Starting batch report generation for range ${sheetName}!${rangeAddress}`);

	timestamps.forEach((row, index) =>
	{
		const timestamp = row[0];
		const rowIndex = index + 2;

		if (!timestamp)
		{
			console.warn(`[Row ${rowIndex}] Skipping: Empty timestamp.`);
			return;
		}

		console.log(`[Row ${rowIndex}] Processing record with timestamp: ${timestamp}`);

		try
		{
			// 1. Retrieve the full set of values for this record
			const vars = getReportValuesFromTimestamp(timestamp);

			// 2. Generate the report
			const docId = generateVisitReport(vars);

			console.log(`[Row ${rowIndex}] Success! Document ID: ${docId}`);
		}
		catch (e)
		{
			console.error(`[Row ${rowIndex}] Failed: ${e.message}`);
		}
	});

	console.log('Batch generation process finished.');
}

/**
 * Hashes the content of all sheets starting with "Export-".
 * Measures and logs the time taken for each hashing operation.
 */
function debugHashExportSheets()
{
	const ss = SpreadsheetApp.getActiveSpreadsheet();
	const sheets = ss.getSheets();

	console.log('Starting hash computation for Export- sheets...');

	sheets.forEach(sheet =>
	{
		const sheetName = sheet.getName();
		if (sheetName.startsWith('Export-'))
		{
			const startTime = Date.now();
			try
			{
				const hash = computeSheetContentHash(sheet);
				const duration = Date.now() - startTime;
				console.log(`[${sheetName}] Hash: ${hash || 'Empty'} (Duration: ${duration}ms)`);
			}
			catch (e)
			{
				console.error(`[${sheetName}] Failed to compute hash: ${e.message}`);
			}
		}
	});

	console.log('Hash computation finished.');
}
