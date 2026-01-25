/**
 * @file This file handles the Web App serving logic.
 */

function getACStructures()
{
	return (new WebApp).getACStructures();
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
}

/**
 * Handles GET requests to the Web App.
 *
 * @returns {GoogleAppsScript.HTML.HtmlOutput} The evaluated HTML template.
 */
function doGet(e)
{
	const page = e.parameter.page || 'index';

	if (page === 'report')
	{
		return HtmlService.createTemplateFromFile('UI.Report')
			.evaluate()
			.setTitle('Console de pilotage Associations - Compte rendu')
			.addMetaTag('viewport', 'width=device-width, initial-scale=1')
			.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
	}

	const template = HtmlService.createTemplateFromFile('WebApp.Index');
	
	// Pass the user identity to the template
	template.userEmail = Session.getActiveUser().getEmail();
	template.scriptUrl = ScriptApp.getService().getUrl();
	
	return template.evaluate()
		.setTitle('Console de pilotage Associations')
		.addMetaTag('viewport', 'width=device-width, initial-scale=1')
		.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
