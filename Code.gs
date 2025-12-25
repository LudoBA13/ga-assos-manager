/**
 * @OnlyCurrentDoc
 */
function onOpen()
{
	SpreadsheetApp.getUi()
		.createMenu('AssoConnect')
		.addItem(_('Importer les structures'), 'showImporter')
		.addToUi();
}

function showImporter()
{
	const html = HtmlService.createTemplateFromFile('Index').evaluate().setWidth(300);
	SpreadsheetApp.getUi().showSidebar(html);
}

function updateAssoConnectFromFile(fileData)
{
	const sheet = importXLSXFromFile(fileData);

	try
	{
		const data = sheet.getDataRange().getValues();

		if (!data || data.length === 0)
		{
			throw new Error('The imported file appears to be empty.');
		}

		const ss   = SpreadsheetApp.getActiveSpreadsheet();
		const ssId = ss.getId();

		// 1. Find the table named "AssoConnect"
		// We need to request the 'tables' field from the API
		const response = Sheets.Spreadsheets.get(ssId, {
			fields: 'sheets(properties,tables)'
		});

		let targetTable   = null;
		let targetSheetId = null;

		// Iterate through sheets to find the table
		if (response.sheets)
		{
			for (const s of response.sheets)
			{
				if (s.tables)
				{
					for (const t of s.tables)
					{
						// Check displayName. Note: API docs sometimes refer to it as just 'displayName' in 'spec'
						if (t.spec && t.spec.displayName === 'AssoConnect')
						{
							targetTable   = t;
							targetSheetId = s.properties.sheetId;
							break;
						}
					}
				}
				if (targetTable) break;
			}
		}

		if (!targetTable)
		{
			throw new Error('Table named "AssoConnect" not found in the spreadsheet.');
		}

		// 2. Clear the old data range to avoid leftovers if the new data is smaller
		// We use the standard service for clearing content as it's easier
		const targetSheet = ss.getSheets().find(s => s.getSheetId() === targetSheetId);
		if (targetSheet)
		{
			// startRowIndex is 0-based, getRange uses 1-based
			targetSheet.getRange(
				targetTable.range.startRowIndex + 1,
				targetTable.range.startColumnIndex + 1,
				targetTable.range.endRowIndex - targetTable.range.startRowIndex,
				targetTable.range.endColumnIndex - targetTable.range.startColumnIndex
			).clearContent();
		}

		// 3. Resize the table to fit the new data
		const newRange = {
			sheetId: targetSheetId,
			startRowIndex: targetTable.range.startRowIndex,
			startColumnIndex: targetTable.range.startColumnIndex,
			endRowIndex: targetTable.range.startRowIndex + data.length,
			endColumnIndex: targetTable.range.startColumnIndex + data[0].length
		};

		const updateRequest = {
			updateTable: {
				table: {
					tableId: targetTable.tableId,
					range: newRange
				},
				fields: 'range'
			}
		};

		Sheets.Spreadsheets.batchUpdate({ requests: [updateRequest] }, ssId);

		// 4. Write the new data
		targetSheet.getRange(
			newRange.startRowIndex + 1,
			newRange.startColumnIndex + 1,
			data.length,
			data[0].length
		).setValues(data);
	}
	finally
	{
		// Clean up the temporary sheet
		SpreadsheetApp.getActiveSpreadsheet().deleteSheet(sheet);
	}
}

/**
 * Imports an XLSX file from base64 data into a new temporary sheet.
 *
 * @param {Object} fileData The file data object.
 * @param {string} fileData.name The name of the file.
 * @param {string} fileData.mimeType The MIME type of the file.
 * @param {string} fileData.data The base64 encoded data of the file.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} The newly created sheet containing the imported data.
 */
function importXLSXFromFile(fileData)
{
	let tmpSheetFile;

	try
	{
		// 1. Decode base64 and create a blob
		const decodedData = Utilities.base64Decode(fileData.data);
		const blob = Utilities.newBlob(decodedData, fileData.mimeType, fileData.name);

		// 2. Define resource for conversion and create the Google Sheet directly
		const resource = {
			title: fileData.name.split('.').slice(0, -1).join('.'), // Use file name for the new Sheet's title
			mimeType: MimeType.GOOGLE_SHEETS,
		};
		tmpSheetFile = Drive.Files.create(resource, blob);

		// 3. Copy data from the new sheet to the active spreadsheet
		const srcSpreadsheet = SpreadsheetApp.openById(tmpSheetFile.id);
		const srcSheet       = srcSpreadsheet.getSheets()[0];
		const srcData        = srcSheet.getDataRange().getValues();

		if (srcData.length === 0)
		{
			throw new Error('The selected XLSX file is empty or could not be read.');
		}

		const trgSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
		const sheetName      = 'tmp-' + Date.now();
		const trgSheet       = trgSpreadsheet.insertSheet(sheetName);
		trgSheet.getRange(1, 1, srcData.length, srcData[0].length).setValues(srcData);

		return trgSheet;
	}
	finally
	{
		// 4. Cleanup: Delete the temporary Google Sheet
		if (tmpSheetFile && tmpSheetFile.id)
		{
			try
			{
				Drive.Files.remove(tmpSheetFile.id);
			}
			catch (e)
			{
				console.error('Cleanup Error: Failed to remove temporary file with ID ' + tmpSheetFile.id + '. Error: ' + e.message);
			}
		}
	}
}
