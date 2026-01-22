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

		for (let i = 1; i < data.length; i++)
		{
			const row = data[i];
			const codeVif = row[codeVifIdx];
			const nom = row[nomIdx];
			const folderLink = row[folderLinkIdx];

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