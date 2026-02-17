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
	if (folderUrl.toString().includes('http'))
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
	let skippedCnt = 0;

	for (const sheet of sheets)
	{
		const sheetName = sheet.getName();

		if (!sheetName.startsWith('Export-'))
		{
			continue;
		}

		const trgName      = sheetName.substring('Export-'.length);
		const nameParts    = trgName.split('-');
		const trgDocName   = nameParts[0];
		const trgSheetName = nameParts.length > 1 ? nameParts.slice(1).join('-') : trgDocName;

		// Check if the sheet is empty
		if (sheet.getLastRow() === 0)
		{
			console.log(`Skipping "${sheetName}" (0 rows)`);
			continue;
		}

		// Optimization: Check if content has changed since last export
		const currentHash = computeSheetContentHash(sheet);
		const propKey     = 'ga_hash_' + trgSheetName.replace(/[^a-zA-Z0-9_-]/g, '_');

		console.log(`Exporting "${sheetName}" (hash: ${currentHash})`);

		let trgSS;
		let trgFileId;
		const files = folder.getFilesByName(trgDocName);

		if (files.hasNext())
		{
			const file = files.next();
			trgFileId = file.getId();

			// Optimization: Check if content has changed via appProperties (faster than opening the doc)
			try
			{
				const driveFile = Drive.Files.get(trgFileId, { fields: 'appProperties', supportsAllDrives: true });

				console.log('Found a matching document with hash ' + driveFile.appProperties?.[propKey]);

				if (driveFile.appProperties && driveFile.appProperties[propKey] === currentHash)
				{
					console.log(`Skipping export for "${sheetName}" in "${trgDocName}": cache match found.`);
					skippedCnt++;
					continue;
				}
			}
			catch (e)
			{
				console.warn(`Failed to read appProperties for "${trgDocName}":`, e);
			}

			trgSS = SpreadsheetApp.open(file);
		}
		else
		{
			trgSS = SpreadsheetApp.create(trgDocName);
			trgFileId = trgSS.getId();
			const newFile = DriveApp.getFileById(trgFileId);
			newFile.moveTo(folder);
		}

		// Copy the sheet to the trg spreadsheet (preserves formatting)
		const copiedSheet = sheet.copyTo(trgSS);

		// Ensure the copied sheet is visible (it might be hidden in the src)
		copiedSheet.showSheet();

		// Replace formulae with values (using values from src sheet to avoid broken references),
		// but preserve formulas if they have the @preserveFormula note.
		const srcRange = sheet.getDataRange();
		const values   = srcRange.getValues();
		const formulas = srcRange.getFormulas();

		for (const { rowIdx, colIdx, note } of getNotes(srcRange))
		{
			if (note.includes('@preserveFormula'))
			{
				values[rowIdx][colIdx] = formulas[rowIdx][colIdx];
			}
		}

		const trgRange = copiedSheet.getRange(1, 1, srcRange.getNumRows(), srcRange.getNumColumns());
		trgRange.setValues(values);
		trgRange.clearNote();

		// Delete the old sheet with the same name if it exists
		const oldSheet = trgSS.getSheetByName(trgSheetName);
		if (oldSheet)
		{
			trgSS.deleteSheet(oldSheet);
		}

		// Rename the copied sheet to the trg name
		copiedSheet.setName(trgSheetName);

		// Save the hash to skip next time if no changes
		try
		{
			const driveFile = Drive.Files.get(trgFileId, { fields: 'appProperties', supportsAllDrives: true });
			const appProperties = driveFile.appProperties || {};
			appProperties[propKey] = currentHash;
			Drive.Files.update({ appProperties: appProperties }, trgFileId, null, { supportsAllDrives: true });
		}
		catch (e)
		{
			console.error(`Failed to update appProperties for "${trgDocName}":`, e);
		}
		exportedCnt++;
	}

	let msg = _('Export terminé. %s fichier(s) généré(s).', exportedCnt);
	if (skippedCnt > 0)
	{
		msg += '\n' + _('%s fichier(s) ignoré(s) (déjà à jour).', skippedCnt);
	}
	ui.alert(msg);
}

/**
 * Computes an MD5 hash of a sheet's data values.
 * Optimized for speed using join-based serialization.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet The sheet to hash.
 * @return {string} The computed hash.
 */
function computeSheetContentHash(sheet)
{
	const lastRow = sheet.getLastRow();
	if (lastRow === 0)
	{
		return '';
	}

	const values = sheet.getDataRange().getValues();

	// Faster serialization than JSON.stringify for large 2D arrays
	const content = values.map(row => row.join('\t')).join('\n');

	const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, content, Utilities.Charset.UTF_8);
	return rawHash.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}
