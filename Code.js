/**
 * @file This is the main entry point for the Google Apps Script application.
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
 * @OnlyCurrentDoc
 */
function onOpen()
{
	const ui = getSafeUi();

	ui.createMenu('AssoConnect')
		.addItem(_('Importer les structures'), 'showImporter')
		.addItem(_('Mettre à jour fonctions'), 'deployNamedFunctions')
		.addSeparator()
		.addItem(_('Lancer les tests'), 'runTests')
		.addToUi();

	ui.createMenu('Admin')
		.addItem(_('Exporter les données interservices'), 'exportInterServicesData')
		.addItem(_("Générer les Fiches d'Informations Partenaires"), 'generateFIPDocuments')
		.addItem(_('Importer bons de livraisons VIF'), 'showVifImporter')
		.addItem(_('Ajuster la feuille au contenu'), 'cropCurrentSheet')
		.addToUi();
}

function resetDailyPlanningDate()
{
	const sheetName = 'Export-Planning journalier';

	const ss = SpreadsheetApp.getActiveSpreadsheet();
	const sheet = ss.getSheetByName(sheetName);

	if (!sheet)
	{
		console.error(`La feuille '${sheetName}' est introuvable.`);
		return;
	}

	const dataRange = sheet.getDataRange();
	const values = dataRange.getValues();

	for (let row = 0; row < values.length; row++)
	{
		for (let col = 0; col < values[row].length; col++)
		{
			if (!(values[row][col] instanceof Date))
			{
				continue;
			}

			try
			{
				sheet.getRange(row + 1, col + 1).setValue(new Date);
			}
			catch (e)
			{
				console.error(`Impossible de définir la valeur de la cellule à la ligne ${row + 1}, colonne ${col + 1} dans '${sheetName}' : ` + e.message);
			}

			return;
		}
	}

	console.warn(`Aucune cellule contenant une date n'a été trouvée dans '${sheetName}'.`);
}

function showImporter()
{
	Importer.show();
}

function showVifImporter()
{
	VifImporter.show();
}

function updateACStructuresFromFile(fileData)
{
	Importer.updateACStructuresFromFile(fileData);
}

function startFIPGeneration()
{
	DocumentManager.processFIPBatch();
}

function getFIPGenerationStatus()
{
	return DocumentManager.getBatchProgress();
}

function runTests()
{
	const encoderResults = runPlanningEncoderTests();
	const preprocessorResults = runInfoPreprocessorTests();

	const totalPassed = encoderResults.passed + preprocessorResults.passed;
	const totalTotal = encoderResults.total + preprocessorResults.total;

	Logger.log(`Total Tests: ${totalPassed} / ${totalTotal} passed.`);
}

/**
 * Resizes a sheet to match its content by removing empty rows and columns from the end.
 *
 * @param {string|number} sheetNameOrId The name or the ID of the sheet to resize.
 */
function resizeSheetToContent(sheetNameOrId)
{
	const ss = SpreadsheetApp.getActiveSpreadsheet();
	let sheet = ss.getSheetByName(sheetNameOrId);

	if (!sheet)
	{
		sheet = ss.getSheets().find(s =>
		{
			return s.getSheetId() == sheetNameOrId;
		});
	}

	if (!sheet)
	{
		throw new Error(_("La feuille '%s' est introuvable.", sheetNameOrId));
	}

	const maxRows = sheet.getMaxRows();
	const maxCols = sheet.getMaxColumns();

	// Quick path: if the last cell at the bottom right is not empty, return early.
	if (sheet.getRange(maxRows, maxCols).getValue() !== '')
	{
		return;
	}

	const lastRow = Math.max(1, sheet.getLastRow());
	const lastCol = Math.max(1, sheet.getLastColumn());

	if (maxRows > lastRow)
	{
		sheet.deleteRows(lastRow + 1, maxRows - lastRow);
	}

	if (maxCols > lastCol)
	{
		sheet.deleteColumns(lastCol + 1, maxCols - lastCol);
	}
}

/**
 * Wrapper function for the UI menu to crop the current sheet.
 */
function cropCurrentSheet()
{
	const sheet = SpreadsheetApp.getActiveSheet();
	resizeSheetToContent(sheet.getSheetId());
}


