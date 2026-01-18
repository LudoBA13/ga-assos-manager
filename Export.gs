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

			let targetSS;
			const files = folder.getFilesByName(targetName);

			if (files.hasNext())
			{
				const file = files.next();
				targetSS = SpreadsheetApp.open(file);
			}
			else
			{
				targetSS = SpreadsheetApp.create(targetName);
				const newFile = DriveApp.getFileById(targetSS.getId());
				newFile.moveTo(folder);
			}

			// Copy the sheet to the target spreadsheet (preserves formatting)
			const copiedSheet = sheet.copyTo(targetSS);

			// Replace formulae with values (using values from source sheet to avoid broken references)
			const sourceRange = sheet.getDataRange();
			const targetRange = copiedSheet.getRange(1, 1, sourceRange.getNumRows(), sourceRange.getNumColumns());
			targetRange.setValues(sourceRange.getValues());

			// Delete all other sheets in the target spreadsheet
			const targetSheets = targetSS.getSheets();
			for (const s of targetSheets)
			{
				if (s.getSheetId() !== copiedSheet.getSheetId())
				{
					targetSS.deleteSheet(s);
				}
			}

			// Rename the copied sheet to the target name
			copiedSheet.setName(targetName);

			exportedCnt++;
		}
	}

	ui.alert(_('Export terminé. %s fichier(s) généré(s).', exportedCnt));
}
