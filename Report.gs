/**
 * @file This file handles report generation and UI.
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

function showReportDialog()
{
	const html = HtmlService.createTemplateFromFile('UI.Report')
		.evaluate()
		.setWidth(400)
		.setHeight(300);
		
	SpreadsheetApp.getUi().showModalDialog(html, _('Créer un rapport de visite'));
}

function getStructureList()
{
	const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ACStructures');
	if (!sheet)
	{
		throw new Error("La feuille 'ACStructures' est introuvable.");
	}

	const urlTemplate = getConfig('visitReportFormUrl');

	const data = sheet.getDataRange().getValues();
	if (data.length < 2) return [];

	const headers = data[0];
	const idIdx = headers.indexOf('ID du Contact');
	const nomIdx = headers.indexOf('Nom');
	const codeVifIdx = headers.indexOf('Code VIF');
	const dateLastVisitIdx = headers.indexOf('Date de la dernière visite');

	if (idIdx === -1 || nomIdx === -1)
	{
		return [];
	}

	const map = new Map;

	for (let i = 1; i < data.length; i++)
	{
		const row = data[i];
		const id = row[idIdx];
		const nom = row[nomIdx];
		const codeVif = codeVifIdx !== -1 ? row[codeVifIdx] : '';
		const dateLastVisit = dateLastVisitIdx !== -1 ? row[dateLastVisitIdx] : '';

		if (id && nom && !map.has(id))
		{
			let dateStr = '';

			if (dateLastVisit instanceof Date)
			{
				const year = dateLastVisit.getFullYear();
				const month = String(dateLastVisit.getMonth() + 1).padStart(2, '0');
				const day = String(dateLastVisit.getDate()).padStart(2, '0');
				dateStr = `${year}-${month}-${day}`;
			}
			else if (typeof dateLastVisit === 'string')
			{
				const parts = dateLastVisit.split('/');
				if (parts.length === 3)
				{
					dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
				}
				else
				{
					dateStr = dateLastVisit;
				}
			}

			const url = urlTemplate
				.replace('<<Nom>>', encodeURIComponent(nom || ''))
				.replace('<<Code VIF>>', encodeURIComponent(codeVif || ''))
				.replace('<<Date de la dernière visite>>', encodeURIComponent(dateStr));

			map.set(id, [url, nom]);
		}
	}

	// Return array of [url, nom], sorted by nom
	return Array.from(map.values())
		.map(([url, nom]) => [url, nom])
		.sort((a, b) => a[1].localeCompare(b[1]));
}

function getVisitReportFormUrl(id)
{
	const rawUrl = getConfig('visitReportFormUrl');
	const structure = getACStructuresRow(id);

	if (!structure)
	{
		throw new Error(`Structure with ID ${id} not found.`);
	}

	let dateLastVisit = structure['Date de la dernière visite'];
	let dateStr = '';

	if (dateLastVisit instanceof Date)
	{
		const year = dateLastVisit.getFullYear();
		const month = String(dateLastVisit.getMonth() + 1).padStart(2, '0');
		const day = String(dateLastVisit.getDate()).padStart(2, '0');
		dateStr = `${year}-${month}-${day}`;
	}
	else if (typeof dateLastVisit === 'string')
	{
		const parts = dateLastVisit.split('/');
		if (parts.length === 3)
		{
			dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
		}
		else
		{
			dateStr = dateLastVisit;
		}
	}

	return rawUrl
		.replace('<<Nom>>', encodeURIComponent(structure['Nom'] || ''))
		.replace('<<Code VIF>>', encodeURIComponent(structure['Code VIF'] || ''))
		.replace('<<Date de la dernière visite>>', encodeURIComponent(dateStr));
}

function getACStructuresRow(id)
{
	return getRowById('ACStructures', id);
}
