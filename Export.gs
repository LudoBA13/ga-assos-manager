/**
 * Exports data from sheets prefixed with "Export-" to a specific Google Drive folder.
 */
function exportInterServicesData()
{
	const ss = SpreadsheetApp.getActiveSpreadsheet();
	const ui = SpreadsheetApp.getUi();

	// Retrieve the export folder URL from configuration
	let folderUrl;
	try
	{
		folderUrl = getConfigValue('exportFolderUrl');
	}
	catch (e)
	{
		ui.alert(_('Erreur de configuration : %s', e.message));
		return;
	}

	// Extract Folder ID from URL if necessary
	let folderId = folderUrl;
	if (folderUrl.toString().indexOf('http') !== -1)
	{
		const match = folderUrl.match(/[-\w]{25,}/);
		if (match)
		{
			folderId = match[0];
		}
		else
		{
			ui.alert(_('L\'URL du dossier d\'export semble invalide : %s', folderUrl));
			return;
		}
	}

	// Get the folder
	let folder;
	try
	{
		folder = DriveApp.getFolderById(folderId);
	}
	catch (e)
	{
		ui.alert(_('Impossible d\'accéder au dossier d\'export : %s', e.message));
		return;
	}

	const sheets = ss.getSheets();
	let exportedCount = 0;

	for (const sheet of sheets)
	{
		const sheetName = sheet.getName();

		if (sheetName.startsWith('Export-'))
		{
			const targetName = sheetName.substring('Export-'.length);
			const values = sheet.getDataRange().getValues();

			if (values.length === 0)
			{
				continue;
			}

			// Create the new spreadsheet file
			const newSS = SpreadsheetApp.create(targetName);
			const newFile = DriveApp.getFileById(newSS.getId());

			// Move the file to the target folder
			newFile.moveTo(folder);

			// Write values to the first sheet of the new spreadsheet
			const targetSheet = newSS.getSheets()[0];
			targetSheet.getRange(1, 1, values.length, values[0].length).setValues(values);

			exportedCount++;
		}
	}

	ui.alert(_('Export terminé. %s fichier(s) généré(s).', exportedCount));
}
