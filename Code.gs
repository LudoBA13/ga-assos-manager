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
	const ui = SpreadsheetApp.getUi();

	ui.createMenu('AssoConnect')
		.addItem(_('Importer les structures'), 'showImporter')
		.addItem(_('Mettre à jour fonctions'), 'deployNamedFunctions')
		.addSeparator()
		.addItem(_('Lancer les tests'), 'runTests')
		.addToUi();

	ui.createMenu('Admin')
		.addItem(_('Exporter les données interservices'), 'exportInterServicesData')
		.addItem(_("Générer les Fiches d'Informations Partenaires"), 'generateFIPDocuments')
		.addToUi();

	ui.createMenu('CAR')
		.addItem(_('Créer un rapport de visite'), 'showReportDialog')
		.addToUi();
}

function showImporter()
{
	Importer.show();
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
