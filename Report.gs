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
 * @param {Map<string, any>} values The values for the report.
 * @return {GoogleAppsScript.Document.Document} The generated document.
 */
function generateVisitReport(values)
{
	return ReportManager.generateVisitReport(values);
}

/**
 * Retrieves report values for the given timestamp.
 * @param {string|number|Date} timestamp The unique identifier (timestamp) for the record.
 * @return {Map<string, any>} The values as a Map.
 */
function getReportValuesFromTimestamp(timestamp)
{
	return ReportManager.getReportValuesFromTimestamp(timestamp);
}

/**
 * Triggered when a form is submitted.
 * @param {Object} e The form submission event.
 */
function onFormSubmit(e)
{
	const ss = SpreadsheetApp.getActiveSpreadsheet();
	const sheet = ss.getSheetByName('CRVisites');
	if (!sheet)
	{
		throw new Error(_("La feuille '%s' est introuvable.", 'CRVisites'));
	}

	const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

	const vars = new Map;
	headers.forEach((header, index) =>
	{
		vars.set(header, e.values[index]);
	});

	generateVisitReport(vars);
}

/**
 * Manages the generation of visit reports based on CRVisites data.
 */
class ReportManager
{
	/**
	 * Retrieves report values for the given timestamp.
	 * @param {string|number|Date} timestamp The unique identifier (timestamp) for the record.
	 * @return {Map<string, any>} The values as a Map.
	 */
	static getReportValuesFromTimestamp(timestamp)
	{
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

		const timeZone = Session.getScriptTimeZone();
		const dateFormat = _('dd/MM/yyyy HH:mm:ss');

		// Helper to normalize values for comparison (handles Date objects and strings)
		const normalize = (val) => {
			if (val instanceof Date)
			{
				return Utilities.formatDate(val, timeZone, dateFormat);
			}
			return String(val);
		};

		// Find the row matching the timestamp.
		const targetTimestamp = normalize(timestamp);
		const timestampValues = sheet.getRange(2, timestampIdx + 1, lastRow - 1, 1).getValues();
		const matchIndex = timestampValues.findIndex(r => normalize(r[0]) === targetTimestamp);

		if (matchIndex === -1)
		{
			throw new Error(_("Aucun enregistrement trouvé pour le timestamp '%s'.", targetTimestamp));
		}

		// Fetch the specific row. matchIndex is 0-based from row 2, so add 2 to get the sheet row number.
		const row = sheet.getRange(matchIndex + 2, 1, 1, sheet.getLastColumn()).getValues()[0];

		const vars = new Map;

		headers.forEach((header, index) =>
		{
			let value = row[index];
			if (value instanceof Date)
			{
				value = Utilities.formatDate(value, timeZone, dateFormat);
			}
			vars.set(header, value);
		});

		return vars;
	}

	/**
	 * Generates a visit report for the given values.
	 * @param {Map<string, any>} vars The values for the report.
	 * @return {GoogleAppsScript.Document.Document} The generated document.
	 */
	static generateVisitReport(vars)
	{
		const templateDocUrl = getConfig('visitReportTemplateDocUrl');

		const vif = vars.get('N° VIF de la structure visitée');
		if (!vif)
		{
			throw new Error(_("Le 'N° VIF de la structure visitée' est manquant pour cet enregistrement."));
		}

		const asso = getAssoByVif(vif);
		if (!asso)
		{
			throw new Error(_("L'association avec le VIF '%s' est introuvable.", vif));
		}

		const folderUrl = asso['Lien vers les documents stockés sur le Drive'];
		if (!folderUrl)
		{
			throw new Error(_("Le lien vers le dossier Drive est manquant pour l'association VIF '%s'.", vif));
		}

		const destinationFolderId = extractDriveIdFromUrl(folderUrl);

		const generator = new DocumentGenerator(templateDocUrl);

		// Use a descriptive name for the document: CR Visite yyyy-MM-dd
		let dateStr = vars.get('Date de la visite') || '';
		if (dateStr instanceof Date)
		{
			dateStr = Utilities.formatDate(dateStr, Session.getScriptTimeZone(), 'yyyy-MM-dd');
		}
		else if (typeof dateStr === 'string' && dateStr.includes('/'))
		{
			// Simple attempt to format dd/MM/yyyy to yyyy-MM-dd for the filename
			const parts = dateStr.split(' ')[0].split('/');
			if (parts.length === 3)
			{
				if (parts[2].length === 4) // dd/MM/yyyy
				{
					dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
				}
				else if (parts[0].length === 4) // yyyy/MM/dd
				{
					dateStr = `${parts[0]}-${parts[1]}-${parts[2]}`;
				}
			}
		}

		const documentName = `CR Visite ${dateStr}`;

		return generator.generateDocument(vars, documentName, destinationFolderId);
	}
}
