/**
 * @file This file contains the DocumentManager class for batch document generation.
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

function generateFIPDocuments()
{
	DocumentManager.generateFIPDocuments();
}

/**
 * Manages the batch generation of documents based on ACStructures data.
 */
class DocumentManager
{
	/**
	 * Generates FIP documents for all structures in the ACStructures sheet.
	 * It uses a template defined in the Config sheet under 'FIP Template ID'.
	 */
	static generateFIPDocuments()
	{
		const templateId = getConfig('fipTemplateDocUrl');
		const generator = new DocumentGenerator(templateId);

		const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ACStructures');
		if (!sheet)
		{
			throw new Error("Sheet 'ACStructures' not found.");
		}

		const data = sheet.getDataRange().getValues();
		if (data.length < 2)
		{
			return; // No data to process
		}

		const headers = data[0];
		const codeVifIdx = headers.indexOf('Code VIF');
		const nomIdx = headers.indexOf('Nom');
		const folderLinkIdx = headers.indexOf('Lien vers les documents stockés sur le Drive');

		if (codeVifIdx === -1 || nomIdx === -1 || folderLinkIdx === -1)
		{
			throw new Error("Missing required columns: 'Code VIF', 'Nom', or 'Lien vers les documents stockés sur le Drive'.");
		}

		const total = data.length - 1;
		const ss = SpreadsheetApp.getActiveSpreadsheet();

		for (let i = 1; i < data.length; i++)
		{
			const row = data[i];
			const codeVif = row[codeVifIdx];
			const nom = row[nomIdx];
			const folderLink = row[folderLinkIdx];

			// Update Progress
			const progress = Math.round(((i - 1) / total) * 100);
			const bar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
			ss.toast(`${bar} ${progress}%`, _('Génération de %s (%s/%s)', nom, i, total));

			if (!folderLink)
			{
				console.warn(`Skipping row ${i + 1}: Missing folder link.`);
				continue;
			}

			const folderId = this._extractFolderId(folderLink);
			if (!folderId)
			{
				console.warn(`Skipping row ${i + 1}: Invalid folder link '${folderLink}'.`);
				continue;
			}

			const vars = new Map;
			const timeZone = Session.getScriptTimeZone();
			headers.forEach((header, index) =>
			{
				let value = row[index];
				if (value instanceof Date || (typeof value === 'object' && Object.prototype.toString.call(value) === '[object Date]'))
				{
					value = Utilities.formatDate(value, timeZone, _('dd/MM/yyyy'));
				}
				vars.set(header, value);
			});

			const documentName = `FIP ${codeVif} ${nom}`;

			try
			{
				generator.generateDocument(vars, documentName, folderId);
			}
			catch (e)
			{
				console.error(`Failed to generate document for '${nom}' (Row ${i + 1}): ${e.message}`);
			}
		}

		ss.toast(_('Toutes les fiches ont été générées.'), _('Génération terminée'), 5);
	}

	/**
	 * Extracts the Folder ID from a Google Drive URL.
	 * @param {string} url The Google Drive URL or ID.
	 * @return {string|null} The extracted Folder ID or null if invalid.
	 */
	static _extractFolderId(url)
	{
		if (typeof url !== 'string' || !url)
		{
			return null;
		}

		// If it's already a clean ID (alphanumeric, no slashes)
		if (/^[a-zA-Z0-9_-]+$/.test(url))
		{
			return url;
		}

		// Match /folders/ID
		const matchFolders = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
		if (matchFolders)
		{
			return matchFolders[1];
		}

		// Match id=ID
		const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
		if (matchId)
		{
			return matchId[1];
		}

		return null;
	}
}