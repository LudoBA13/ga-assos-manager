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
		folderUrl = getConfig('exportFolderUrl');
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
	let exportedCnt = 0;

	for (const sheet of sheets)
	{
		const sheetName = sheet.getName();

		if (sheetName.startsWith('Export-'))
		{
			const targetName = sheetName.substring('Export-'.length);
			
			// Check if the sheet is empty
			if (sheet.getLastRow() === 0)
			{
				continue;
			}

			// Create the new spreadsheet file
			const newSS = SpreadsheetApp.create(targetName);
			const newFile = DriveApp.getFileById(newSS.getId());

			// Move the file to the target folder
			newFile.moveTo(folder);

			// Copy the sheet to the new spreadsheet (preserves formatting)
			const copiedSheet = sheet.copyTo(newSS);
			copiedSheet.setName(targetName);

			// Replace formulae with values
			const range = copiedSheet.getDataRange();
			range.setValues(range.getValues());

			// Delete the default "Feuille 1" (or "Sheet1") created with the new spreadsheet
			// We iterate to find the one that is NOT our target sheet
			const sheets = newSS.getSheets();
			if (sheets.length > 1)
			{
				const defaultSheet = sheets.find(s => s.getSheetId() !== copiedSheet.getSheetId());
				if (defaultSheet)
				{
					newSS.deleteSheet(defaultSheet);
				}
			}

			exportedCnt++;
		}
	}

	ui.alert(_('Export terminé. %s fichier(s) généré(s).', exportedCnt));
}
