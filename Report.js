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
 * @return {string} The ID of the generated document.
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

	const vars = newMapFromArray(headers, e.values);

	generateVisitReport(vars);
}

/**
 * Updates the visit report template document based on the questions in the source form.
 *
 * This function:
 * 1. Opens the active Google Form.
 * 2. Opens the Google Doc specified by 'visitReportTemplateDocUrl'.
 * 3. Attempts to remove all tabs (onglets) except "Couverture".
 * 4. Appends each section and question from the form to the document.
 *    - Sections are formatted as Heading 3.
 *    - Questions are formatted as Normal text.
 *    - Answers are represented by placeholders (e.g., <<Question>>) in Blue.
 */
function updateTemplateFromForm()
{
	return ReportManager.updateTemplateFromForm();
}

/**
 * Generates visit reports for a specified range of rows in the 'CRVisites' sheet.
 * @param {number} startRow The 1-based starting row number (inclusive).
 * @param {number} endRow The 1-based ending row number (inclusive).
 */
function generateVisitReportsByRange(startRow, endRow)
{
	const sheetName = 'CRVisites';
	const ss = SpreadsheetApp.getActiveSpreadsheet();
	const sheet = ss.getSheetByName(sheetName);
	if (!sheet)
	{
		throw new Error(_("La feuille '%s' est introuvable.", sheetName));
	}

	const lastColumn = sheet.getLastColumn();
	const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];

	// Ensure startRow and endRow are within valid bounds
	const actualLastRow = sheet.getLastRow();
	if (startRow < 2 || startRow > actualLastRow)
	{
		throw new Error(_("La ligne de début '%s' est invalide. Doit être entre 2 et %s.", startRow, actualLastRow));
	}
	if (endRow < startRow || endRow > actualLastRow)
	{
		throw new Error(_("La ligne de fin '%s' est invalide. Doit être entre %s et %s.", endRow, startRow, actualLastRow));
	}

	for (let i = startRow; i <= endRow; i++)
	{
		const rowData = sheet.getRange(i, 1, 1, lastColumn).getValues()[0];
		const vars = newMapFromArray(headers, rowData);
		generateVisitReport(vars);
	}
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
		const dateFormat = _('dd/MM/yyyy');

		// Helper to normalize values for comparison (handles Date objects and strings)
		const normalize = (val) =>
		{
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
	 * @return {string} The ID of the generated document.
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

	/**
	 * Updates the visit report template document based on the questions in the source form.
	 */
	static updateTemplateFromForm()
	{
		const docUrl = getConfig('visitReportTemplateDocUrl');
		const ss = SpreadsheetApp.getActiveSpreadsheet();
		const formUrl = ss.getFormUrl();

		console.log(`Updating template from form. Doc: ${docUrl}, Form: ${formUrl}`);

		if (!formUrl)
		{
			throw new Error(_("Aucun formulaire n'est associé à cette feuille de calcul."));
		}

		const form = FormApp.openByUrl(formUrl);
		const doc = DocumentApp.openByUrl(docUrl);
		this._clearContentAfterFirstHR(doc);

		const body = doc.getBody();
		const items = form.getItems();

		items.forEach(item =>
		{
			const title = item.getTitle();
			const type = item.getType();

			if (type === FormApp.ItemType.PAGE_BREAK)
			{
				if (title)
				{
					this._appendOrReuse(body, title).setHeading(DocumentApp.ParagraphHeading.HEADING2);
				}

				const helpText = item.asPageBreakItem().getHelpText();
				if (helpText)
				{
					this._appendOrReuse(body, helpText).setHeading(DocumentApp.ParagraphHeading.SUBTITLE);
				}
			}
			else if (type === FormApp.ItemType.SECTION_HEADER)
			{
				if (title)
				{
					this._appendOrReuse(body, title).setHeading(DocumentApp.ParagraphHeading.HEADING3);
				}

				const helpText = item.asSectionHeaderItem().getHelpText();
				if (helpText)
				{
					this._appendOrReuse(body, helpText).setHeading(DocumentApp.ParagraphHeading.SUBTITLE);
				}
			}
			else if (type !== FormApp.ItemType.IMAGE && type !== FormApp.ItemType.VIDEO)
			{
				if (!title)
				{
					return;
				}

				// Append question title and placeholder on the same line
				const separator = /[\p{L}\p{N}]$/u.test(title) ? ' : ' : ' ';
				const paragraph = this._appendOrReuse(body, title + separator);
				paragraph.setHeading(DocumentApp.ParagraphHeading.NORMAL);

				const placeholder = paragraph.appendText(`<<${title}>>`);
				placeholder.setFontFamily('Asap');
				placeholder.setForegroundColor('#1c4587');
			}
		});
	}

	/**
	 * Appends a paragraph to the body, or reuses the last one if it is empty.
	 * @param {GoogleAppsScript.Document.Body} body
	 * @param {string} text
	 * @return {GoogleAppsScript.Document.Paragraph}
	 * @private
	 */
	static _appendOrReuse(body, text)
	{
		const numChildren = body.getNumChildren();
		if (numChildren > 0)
		{
			const lastChild = body.getChild(numChildren - 1);
			if (lastChild.getType() === DocumentApp.ElementType.PARAGRAPH)
			{
				const para = lastChild.asParagraph();
				if (para.getText() === '')
				{
					para.setText(text);
					return para;
				}
			}
		}
		return body.appendParagraph(text);
	}

	/**
	 * Clears all content after the first horizontal rule in the given document.
	 * @param {GoogleAppsScript.Document.Document} doc
	 * @private
	 */
	static _clearContentAfterFirstHR(doc)
	{
		const body = doc.getBody();
		const searchResult = body.findElement(DocumentApp.ElementType.HORIZONTAL_RULE);

		if (searchResult)
		{
			let element = searchResult.getElement();

			// Navigate up to find the direct child of the body
			while (element.getParent() && element.getParent().getType() !== DocumentApp.ElementType.BODY_SECTION)
			{
				element = element.getParent();
			}

			if (element.getParent() && element.getParent().getType() === DocumentApp.ElementType.BODY_SECTION)
			{
				const hrIndex = body.getChildIndex(element);
				const numChildren = body.getNumChildren();

				// Remove all content after the first horizontal rule
				for (let i = numChildren - 1; i > hrIndex; i--)
				{
					try
					{
						body.removeChild(body.getChild(i));
					}
					catch (e)
					{
						const child = body.getChild(i);
						if (child.getType() === DocumentApp.ElementType.PARAGRAPH)
						{
							child.asParagraph().clear();
							child.asParagraph().setHeading(DocumentApp.ParagraphHeading.NORMAL);
						}
					}
				}
			}
		}
	}
}
