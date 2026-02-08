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
	 * Opens the modal dialog to start the batch generation of FIP documents.
	 */
	static generateFIPDocuments()
	{
		const html = HtmlService.createTemplateFromFile('UI.Progress')
			.evaluate()
			.setWidth(400)
			.setHeight(250);
		getSafeUi().showModalDialog(html, _('Génération des fiches'));
	}

	/**
	 * Gets the current batch process status from the cache.
	 * @return {string} JSON string containing progress and message.
	 */
	static getBatchProgress()
	{
		return CacheService.getUserCache().get('FIP_PROGRESS');
	}

	/**
	 * Generates FIP documents for all structures in the ACStructures sheet.
	 * Updates progress in CacheService for the UI to poll.
	 */
	static processFIPBatch()
	{
		const cache = CacheService.getUserCache();
		const updateProgress = (pct, msg) =>
		{
			cache.put('FIP_PROGRESS', JSON.stringify({ progress: pct, message: msg }), 21600);
		};

		updateProgress(0, _('Initialisation...'));

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
			updateProgress(100, _('Aucune donnée à traiter.'));
			return;
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

		for (let i = 1; i < data.length; i++)
		{
			const row = data[i];
			const codeVif = row[codeVifIdx];
			const nom = row[nomIdx];
			const folderLink = row[folderLinkIdx];

			// Update Progress
			const progress = (((i - 1) / total) * 100).toFixed(1);
			updateProgress(progress, _('Génération de %s (%s/%s)', nom, i, total));

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

		updateProgress(100, _('Terminé.'));
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