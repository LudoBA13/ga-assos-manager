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
	const props = PropertiesService.getScriptProperties();

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
			continue;
		}

		// Optimization: Check if content has changed since last export
		const currentHash = computeSheetContentHash(sheet);
		const propKey = `LAST_EXPORT_HASH_${sheetName}`;
		const lastHash = props.getProperty(propKey);

		if (currentHash && currentHash === lastHash)
		{
			console.log(`Skipping export for "${sheetName}": no changes detected.`);
			skippedCnt++;
			continue;
		}

		let trgSS;
		const files = folder.getFilesByName(trgDocName);

		if (files.hasNext())
		{
			const file = files.next();
			trgSS = SpreadsheetApp.open(file);
		}
		else
		{
			trgSS = SpreadsheetApp.create(trgDocName);
			const newFile = DriveApp.getFileById(trgSS.getId());
			newFile.moveTo(folder);
		}

		// Copy the sheet to the trg spreadsheet (preserves formatting)
		const copiedSheet = sheet.copyTo(trgSS);

		// Ensure the copied sheet is visible (it might be hidden in the src)
		copiedSheet.showSheet();

		// Replace formulae with values (using values from src sheet to avoid broken references)
		const srcRange = sheet.getDataRange();
		const trgRange = copiedSheet.getRange(1, 1, srcRange.getNumRows(), srcRange.getNumColumns());
		trgRange.setValues(srcRange.getValues());

		// Delete the old sheet with the same name if it exists
		const oldSheet = trgSS.getSheetByName(trgSheetName);
		if (oldSheet)
		{
			trgSS.deleteSheet(oldSheet);
		}

		// Rename the copied sheet to the trg name
		copiedSheet.setName(trgSheetName);

		// Save the hash to skip next time if no changes
		props.setProperty(propKey, currentHash);
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
