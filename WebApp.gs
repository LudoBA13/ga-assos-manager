/**
 * @file This file handles the Web App serving logic.
 */

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
			.setTitle('GA Assos Manager - Compte rendu')
			.addMetaTag('viewport', 'width=device-width, initial-scale=1')
			.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
	}

	const template = HtmlService.createTemplateFromFile('WebApp.Index');
	
	// Pass the row count and user identity to the template
	template.rowCount = getACStructuresRowCount();
	template.userEmail = Session.getActiveUser().getEmail();
	template.scriptUrl = ScriptApp.getService().getUrl();
	
	return template.evaluate()
		.setTitle('GA Assos Manager - Web App')
		.addMetaTag('viewport', 'width=device-width, initial-scale=1')
		.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Gets the number of rows in the ACStructures sheet.
 *
 * @returns {number} The last row index or 0 if sheet doesn't exist.
 */
function getACStructuresRowCount()
{
	const ss = SpreadsheetApp.getActiveSpreadsheet();
	const sheet = ss.getSheetByName('ACStructures');
	if (!sheet)
	{
		return 0;
	}
	return sheet.getLastRow();
}
