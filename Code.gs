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

function importXLSXFromFile(fileData)
{
	let tempSheetFile;

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
		tempSheetFile = Drive.Files.create(resource, blob);

		// 3. Copy data from the new sheet to the active spreadsheet
		const sourceSpreadsheet = SpreadsheetApp.openById(tempSheetFile.id);
		const sourceSheet = sourceSpreadsheet.getSheets()[0];
		const sourceData = sourceSheet.getDataRange().getValues();

		if (sourceData.length === 0)
		{
			throw new Error('The selected XLSX file is empty or could not be read.');
		}

		const targetSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
		const sheetName = sourceSpreadsheet.getName();
		const targetSheet = targetSpreadsheet.insertSheet(sheetName);
		targetSheet.getRange(1, 1, sourceData.length, sourceData[0].length).setValues(sourceData);

		return `Successfully imported '${fileData.name}'.`;
	}
	catch (e)
	{
		console.error('Import Error: ' + e.toString());
		return 'Error: ' + e.message;
	}
	finally
	{
		// 4. Cleanup: Delete the temporary Google Sheet
		if (tempSheetFile && tempSheetFile.id)
		{
			try
			{
				Drive.Files.remove(tempSheetFile.id);
			}
			catch(e)
			{
				console.error('Cleanup Error: Failed to remove temporary file with ID ' + tempSheetFile.id + '. Error: ' + e.message);
			}
		}
	}
}
