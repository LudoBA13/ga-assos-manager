/**
 * @file This file handles the Web App serving logic.
 */

function getACStructures()
{
	return (new WebApp).getACStructures();
}

function getFipUrl(id)
{
	return (new WebApp).getFipUrl(id);
}


class WebApp
{
	getACStructures()
	{
		const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ACStructures');
		if (!sheet)
		{
			throw new Error("La feuille 'ACStructures' est introuvable.");
		}

		const data = sheet.getDataRange().getValues();
		if (data.length < 2) return {};

		const headers = data[0];
		const idIdx = headers.indexOf('ID du Contact');
		const vifIdx = headers.indexOf('Code VIF');
		const nomIdx = headers.indexOf('Nom');
		const dateIdx = headers.indexOf('Date de la dernière visite');
		const driveIdx = headers.indexOf('Lien vers les documents stockés sur le Drive');

		if (idIdx === -1)
		{
			throw new Error("La colonne 'ID du Contact' est introuvable.");
		}

		const result = {};

		for (let i = 1; i < data.length; i++)
		{
			const row = data[i];
			const id = row[idIdx];

			if (!id) continue;

			const dateVal = dateIdx !== -1 ? row[dateIdx] : '';
			let dateStr = '';
			if (dateVal instanceof Date)
			{
				dateStr = dateVal.toLocaleDateString('fr-FR');
			}
			else
			{
				dateStr = dateVal;
			}

			result[id] = {
				'Code VIF': vifIdx !== -1 ? row[vifIdx] : '',
				'Nom': nomIdx !== -1 ? row[nomIdx] : '',
				'Date de la dernière visite': dateStr,
				'Lien vers les documents stockés sur le Drive': driveIdx !== -1 ? row[driveIdx] : ''
			};
		}

		return result;
	}

	getFipUrl(id)
	{
		const structures = this.getACStructures();
		const structure = structures[id];

		if (!structure)
		{
			throw new Error("Structure introuvable.");
		}

		const driveUrl = structure['Lien vers les documents stockés sur le Drive'];
		if (!driveUrl)
		{
			throw new Error("Aucun lien Drive configuré pour cette structure.");
		}

		let folderId = null;
		// Pattern for folders/ID
		const matchFolders = driveUrl.match(/folders\/([a-zA-Z0-9-_]+)/);
		if (matchFolders)
		{
			folderId = matchFolders[1];
		}
		else
		{
			// Pattern for id=ID
			const matchId = driveUrl.match(/[?&]id=([a-zA-Z0-9-_]+)/);
			if (matchId)
			{
				folderId = matchId[1];
			}
		}

		if (!folderId)
		{
			// Fallback: assume the whole URL is the redirect if we can't parse it,
			// or try to open it to see if it redirects (not possible here).
			// If we can't get the folder ID, we can't search inside it.
			// Just return the drive URL.
			return driveUrl;
		}

		try
		{
			const folder = DriveApp.getFolderById(folderId);
			const files = folder.getFiles();
			while (files.hasNext())
			{
				const file = files.next();
				if (file.getName().startsWith("FIP "))
				{
					return file.getUrl();
				}
			}
		}
		catch (e)
		{
			// Permission error or invalid ID, fallback to Drive URL
			console.error("Error searching Drive: " + e.message);
		}

		return driveUrl;
	}
}

/**
 * Handles GET requests to the Web App.
 *
 * @returns {GoogleAppsScript.HTML.HtmlOutput} The evaluated HTML template.
 */
function doGet(e)
{
	const template = HtmlService.createTemplateFromFile('WebApp.Index');
	
	// Pass the user identity to the template
	template.userEmail = Session.getActiveUser().getEmail();
	template.scriptUrl = ScriptApp.getService().getUrl();
	template.configs = getAllConfigs();
	
	return template.evaluate()
		.setTitle('Console de pilotage Associations')
		.addMetaTag('viewport', 'width=device-width, initial-scale=1')
		.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
