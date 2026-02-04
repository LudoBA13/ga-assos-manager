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

/**
 * Updates the visit report template document based on the questions in the source form.
 *
 * This function:
 * 1. Opens the Google Form specified by 'visitReportFormUrl'.
 * 2. Opens the Google Doc specified by 'visitReportTemplateDocUrl'.
 * 3. Attempts to remove all tabs (onglets) except "Couverture".
 * 4. Appends each section and question from the form to the document.
 *    - Sections are formatted as Heading 3.
 *    - Questions are formatted as Normal text.
 *    - Answers are represented by placeholders (e.g., <<Question>>) in Blue.
 */
function updateTemplateFromForm()
{
	const formUrl = getConfig('visitReportFormUrl');
	const docUrl = getConfig('visitReportTemplateDocUrl');

	const form = FormApp.openByUrl(formUrl);
	const doc = DocumentApp.openByUrl(docUrl);

	let targetContainer = doc.getBody();

	// Attempt to find and clear the "Questionnaire" tab if the feature is supported.
	try
	{
		if (typeof doc.getTabs === 'function')
		{
			const tabs = doc.getTabs();
			const questionnaireTab = tabs.find(tab =>
			{
				let title = '';
				if (typeof tab.getTitle === 'function') title = tab.getTitle();
				else if (typeof tab.getName === 'function') title = tab.getName();
				return title === 'Questionnaire';
			});

			if (questionnaireTab)
			{
				// In Apps Script, Tab objects usually have a asDocumentTab().getBody() or similar.
				if (typeof questionnaireTab.asDocumentTab === 'function')
				{
					targetContainer = questionnaireTab.asDocumentTab().getBody();
					targetContainer.clear();
				}
				else
				{
					console.warn("Found 'Questionnaire' tab but cannot access its body. Falling back to main body.");
				}
			}
			else
			{
				console.warn("'Questionnaire' tab not found. Falling back to main body.");
			}
		}
		else
		{
			console.warn("Tabs API not detected. Appending to main document body.");
		}
	}
	catch (e)
	{
		console.warn("Error while trying to manage Doc Tabs:", e);
	}

	const items = form.getItems();

	items.forEach(item =>
	{
		const type = item.getType();

		// Exclude non-question/section items
		if (type === FormApp.ItemType.IMAGE || type === FormApp.ItemType.VIDEO)
		{
			return;
		}

		if (type === FormApp.ItemType.SECTION_HEADER)
		{
			const section = item.asSectionHeaderItem();
			const title = section.getTitle();
			if (title)
			{
				targetContainer.appendParagraph(title).setHeading(DocumentApp.ParagraphHeading.HEADING3);
			}
		}
		else if (type === FormApp.ItemType.PAGE_BREAK)
		{
			const pageBreak = item.asPageBreakItem();
			const title = pageBreak.getTitle();
			if (title)
			{
				targetContainer.appendParagraph(title).setHeading(DocumentApp.ParagraphHeading.HEADING3);
			}
		}
		else
		{
			// Assume it's a question
			const title = item.getTitle();
			if (title)
			{
				// Question Text
				targetContainer.appendParagraph(title).setHeading(DocumentApp.ParagraphHeading.NORMAL);

				// Answer Placeholder
				const placeholder = `<<${title}>>`;
				const answerPara = targetContainer.appendParagraph(placeholder);
				answerPara.setHeading(DocumentApp.ParagraphHeading.NORMAL);
				answerPara.setForegroundColor('#0000FF');
			}
		}
	});

	doc.saveAndClose();
}
