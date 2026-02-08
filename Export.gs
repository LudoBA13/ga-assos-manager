/**
 * @file This file handles data export functionalities.
 * @license
 * MIT License
 *
 * Copyright (c) Ludovic ARNAUD
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * Exports data from sheets prefixed with "Export-" to a specific Google Drive folder.
 */
function exportInterServicesData()
{
	const ss = SpreadsheetApp.getActiveSpreadsheet();
	const ui = getSafeUi();

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

			// Ensure the copied sheet is visible (it might be hidden in the source)
			copiedSheet.showSheet();

			// Replace formulae with values (using values from source sheet to avoid broken references)
			const sourceRange = sheet.getDataRange();
			const targetRange = copiedSheet.getRange(1, 1, sourceRange.getNumRows(), sourceRange.getNumColumns());
			targetRange.setValues(sourceRange.getValues());

			// Delete all other sheets in the target spreadsheet
			SpreadsheetApp.flush();
			const targetSheets = targetSS.getSheets();
			for (const s of targetSheets)
			{
				if (s.getSheetId() !== copiedSheet.getSheetId())
				{
					targetSS.deleteSheet(s);
				}
			}
			SpreadsheetApp.flush();

			// Rename the copied sheet to the target name
			copiedSheet.setName(targetName);

			exportedCnt++;
		}
	}

	ui.alert(_('Export terminé. %s fichier(s) généré(s).', exportedCnt));
}
