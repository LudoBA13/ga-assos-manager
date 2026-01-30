/**
 * @file This file contains the ReportManager class for generating visit reports.
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
 * Generates a visit report for a specific record.
 * @param {string|number|Date} timestamp The unique identifier (timestamp) for the record.
 * @return {GoogleAppsScript.Document.Document} The generated document.
 */
function generateVisitReport(timestamp)
{
	return ReportManager.generateVisitReport(timestamp);
}

/**
 * Manages the generation of visit reports based on CRVisites data.
 */
class ReportManager
{
	/**
	 * Generates a visit report for the given timestamp.
	 * @param {string|number|Date} timestamp The unique identifier (timestamp) for the record.
	 * @return {GoogleAppsScript.Document.Document} The generated document.
	 */
	static generateVisitReport(timestamp)
	{
		const templateDocUrl = getConfig('visitReportTemplateDocUrl');
		const destinationFolderId = getConfig('visitReportFolderId');

		const ss = SpreadsheetApp.getActiveSpreadsheet();
		const sheet = ss.getSheetByName('CRVisites');
		if (!sheet)
		{
			throw new Error(_("La feuille '%s' est introuvable.", 'CRVisites'));
		}

		const lastRow = sheet.getLastRow();
		if (lastRow < 2)
		{
			throw new Error(_("Aucune donnée à traiter dans la feuille '%s'.", 'CRVisites'));
		}

		const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
		const timestampIdx = headers.indexOf('Horodateur');

		if (timestampIdx === -1)
		{
			throw new Error(_("La colonne 'Horodateur' est manquante dans la feuille '%s'.", 'CRVisites'));
		}

		// Find the row matching the timestamp.
		// We use String conversion to ensure comparison works regardless of type (Date object vs string).
		const timestampStr = String(timestamp);
		const timestampValues = sheet.getRange(2, timestampIdx + 1, lastRow - 1, 1).getValues();
		const matchIndex = timestampValues.findIndex(r => String(r[0]) === timestampStr);

		if (matchIndex === -1)
		{
			throw new Error(_("Aucun enregistrement trouvé pour le timestamp '%s'.", timestampStr));
		}

		// Fetch the specific row. matchIndex is 0-based from row 2, so add 2 to get the sheet row number.
		const row = sheet.getRange(matchIndex + 2, 1, 1, sheet.getLastColumn()).getValues()[0];

		const vars = new Map;
		const timeZone = Session.getScriptTimeZone();
		const dateFormat = _('dd/MM/yyyy HH:mm:ss');

		headers.forEach((header, index) =>
		{
			let value = row[index];
			if (value instanceof Date)
			{
				value = Utilities.formatDate(value, timeZone, dateFormat);
			}
			vars.set(header, value);
		});

		const generator = new DocumentGenerator(templateDocUrl);

		// Use a descriptive name for the document: CR Visite yyyy-MM-dd
		const dateVisiteIdx = headers.indexOf('Date de la visite');
		let dateStr = '';
		if (dateVisiteIdx !== -1 && row[dateVisiteIdx] instanceof Date)
		{
			dateStr = Utilities.formatDate(row[dateVisiteIdx], timeZone, 'yyyy-MM-dd');
		}
		else if (dateVisiteIdx !== -1)
		{
			dateStr = String(row[dateVisiteIdx]);
		}

		const documentName = `CR Visite ${dateStr}`;

		return generator.generateDocument(vars, documentName, destinationFolderId);
	}
}
