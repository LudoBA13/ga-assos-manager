/**
 * @file This file contains debug utilities for manual execution in the Google Apps Script Editor.
 * @license
 * MIT License
 *
 * Copyright (c) Ludovic ARNAUD
 */

function debugGenerateReports()
{
  generateVisitReportsByRange(34, 34);
}

/**
 * Generates visit reports for a specified range of rows in the 'CRVisites' sheet.
 * @param {number} startRow The 1-based starting row number (inclusive).
 * @param {number} endRow The 1-based ending row number (inclusive).
 */
function debugGenerateReportsInRange(startRow, endRow)
{
	generateVisitReportsByRange(startRow, endRow);
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
