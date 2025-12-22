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
		if (tmpSheetFile && tmpSheetFile.id)
		{
			try
			{
				Drive.Files.remove(tmpSheetFile.id);
			}
			catch(e)
			{
				console.error('Cleanup Error: Failed to remove temporary file with ID ' + tmpSheetFile.id + '. Error: ' + e.message);
			}
		}
	}
}
