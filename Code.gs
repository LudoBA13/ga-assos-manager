/**
 * @OnlyCurrentDoc
 */
function onOpen()
{
	SpreadsheetApp.getUi()
		.createMenu('AssoConnect')
		.addItem(_('Importer les structures'), 'showImporter')
		.addItem(_('Mettre à jour fonctions'), 'deployNamedFunctions')
		.addToUi();
}

function showImporter()
{
	const html = HtmlService.createTemplateFromFile('Import').evaluate().setWidth(300);
	SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Deploys (creates or updates) the Named Functions in the current spreadsheet.
 * Run this manually whenever you update the definitions in the code.
 */
function deployNamedFunctions()
{
	const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();

	// Definitions of the functions to deploy
	const functions = [
		{
			name: 'AC',
			description: 'Returns a full column from the DonnéesAssoConnect sheet by its header name.',
			definition: "=INDEX('DonnéesAssoConnect'!$A$2:$DZ; 0; MATCH(col_name; 'DonnéesAssoConnect'!$1:$1; 0))",
			argumentPlaceholders: [{ name: 'col_name' }]
		}
	];

	// Functions to explicitly remove
	const toRemove = ['ASSOCONNECT_COL', 'FILTER_ASSOCONNECT_FUTURE'];

	try
	{
		const response = Sheets.Spreadsheets.get(ssId, {
			fields: 'namedFunctions'
		});
		
		const existingFunctions = response.namedFunctions || [];
		const requests = [];

		// Handle Deletions
		toRemove.forEach(name => {
			const existing = existingFunctions.find(f => f.name === name);
			if (existing)
			{
				requests.push({
					deleteNamedFunction: {
						namedFunctionId: existing.namedFunctionId
					}
				});
				console.log(`Deleting: ${name}`);
			}
		});

		// Handle Creation / Updates
		functions.forEach(funcDef => {
			const existing = existingFunctions.find(f => f.name === funcDef.name);
			if (existing)
			{
				requests.push({
					updateNamedFunction: {
						namedFunctionId: existing.namedFunctionId,
						namedFunction: funcDef,
						fields: '*'
					}
				});
				console.log(`Updating: ${funcDef.name}`);
			}
			else
			{
				requests.push({
					addNamedFunction: {
						namedFunction: funcDef
					}
				});
				console.log(`Creating: ${funcDef.name}`);
			}
		});

		if (requests.length > 0)
		{
			Sheets.Spreadsheets.batchUpdate({ requests: requests }, ssId);
			SpreadsheetApp.getUi().alert(`${requests.length} opération(s) sur les fonctions effectuée(s) avec succès !`);
		}
		else
		{
			SpreadsheetApp.getUi().alert('Aucune modification nécessaire.');
		}
	}
	catch (e)
	{
		console.error('Error deploying Named Functions: ' + e.message);
		SpreadsheetApp.getUi().alert('Erreur lors du déploiement : ' + e.message);
	}
}

function getTableFromSheet(sheet, tableName)
{
	for (const table of sheet.tables)
	{
		if (table.name === tableName)
		{
			return table;
		}
	}
}

function getAssoConnectTable()
{
	const ss   = SpreadsheetApp.getActiveSpreadsheet();
	const ssId = ss.getId();

	// 1. Find the table named "AssoConnect"
	// We need to request the 'tables' field from the API
	const response = Sheets.Spreadsheets.get(ssId, {
		fields: 'sheets(properties,tables)'
	});
	if (!response.sheets)
	{
		throw new Error('Cannot get a response sheet.');
	}

	// Iterate through sheets to find the table
	for (const s of response.sheets)
	{
		if (s.tables)
		{
			const table = getTableFromSheet(s, 'AssoConnect');
			if (table)
			{
				return table;
			}
		}
	}
}

function updateAssoConnectData(data)
{
	if (!data || data.length === 0)
	{
		throw new Error('No data passed to updateAssoConnectData.');
	}

	const table = getAssoConnectTable();
	if (!table)
	{
		throw new Error('Cannot locate the AssoConnect table.');
	}

	// Clear the old data range to avoid leftovers if the new data is smaller.
	// We use the standard service for clearing content as it's easier
	const ss = SpreadsheetApp.getActiveSpreadsheet();
	const ssId = ss.getId();
	const sheetId = table.range.sheetId;
	const sheet = ss.getSheets().find(s => s.getSheetId() === sheetId);
	if (sheet)
	{
		// startRowIndex is 0-based, getRange uses 1-based
		sheet.getRange(
			table.range.startRowIndex + 1,
			table.range.startColumnIndex + 1,
			table.range.endRowIndex - table.range.startRowIndex,
			table.range.endColumnIndex - table.range.startColumnIndex
		).clearContent();
	}

	// 3. Resize the table to fit the new data
	const newRange = {
		sheetId:          sheetId,
		startRowIndex:    table.range.startRowIndex,
		startColumnIndex: table.range.startColumnIndex,
		endRowIndex:      table.range.startRowIndex + data.length,
		endColumnIndex:   table.range.startColumnIndex + data[0].length
	};

	const updateRequest = {
		updateTable: {
			table: {
				tableId: table.tableId,
				range:   newRange
			},
			fields: 'range'
		}
	};

	Sheets.Spreadsheets.batchUpdate({ requests: [updateRequest] }, ssId);

	// 4. Write the new data
	sheet.getRange(
		newRange.startRowIndex + 1,
		newRange.startColumnIndex + 1,
		data.length,
		data[0].length
	).setValues(data);
}

function updateAssoConnectFromFile(fileData)
{
	const data = getDataFromXLSXFile(fileData);
	if (!data || data.length === 0)
	{
		throw new Error('No data in file.');
	}
	updateAssoConnectData(data);
}

/**
 * Creates a new hidden sheet in the active spreadsheet using the Advanced Sheets API.
 *
 * @param {string} sheetName The name of the new sheet.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} The newly created hidden sheet.
 */
function createHiddenSheet(sheetName)
{
	const ss   = SpreadsheetApp.getActiveSpreadsheet();
	const ssId = ss.getId();

	const resource = {
		requests: [{
			addSheet: {
				properties: {
					title: sheetName,
					hidden: true
				}
			}
		}]
	};

	const response = Sheets.Spreadsheets.batchUpdate(resource, ssId);
	const newSheetId = response.replies[0].addSheet.properties.sheetId;

	return ss.getSheetByName(sheetName);
}

/**
 * Imports an XLSX file from base64 data into a new temporary sheet.
 *
 * @param {Object} fileData The file data object.
 * @param {string} fileData.name The name of the file.
 * @param {string} fileData.mimeType The MIME type of the file.
 * @param {string} fileData.data The base64 encoded data of the file.
 */
function getDataFromXLSXFile(fileData)
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
		const tmpSpreadsheet = SpreadsheetApp.openById(tmpSheetFile.id);
		const tmpSheet       = tmpSpreadsheet.getSheets()[0];
		const data           = tmpSheet.getDataRange().getValues();

		if (data.length === 0)
		{
			throw new Error('The selected XLSX file is empty or could not be read.');
		}

		return data;
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
