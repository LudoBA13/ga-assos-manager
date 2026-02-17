/**
 * @file This file contains utility functions for inspecting Google Document structures.
 * @license
 * MIT License
 *
 * Copyright (c) Ludovic ARNAUD
 */

/**
 * Inspects the document specified by the 'debugVisitReportTemplateDocUrl' configuration.
 * Iterates through all elements in the document body and logs their types and content.
 */
function inspectTemplateDocument()
{
	let docUrlOrId;
	try
	{
		docUrlOrId = getConfig('debugVisitReportTemplateDocUrl');
	}
	catch (e)
	{
		console.error('Configuration error: ' + e.message);
		return;
	}

	let doc;
	try
	{
		if (docUrlOrId.startsWith('https://'))
		{
			doc = DocumentApp.openByUrl(docUrlOrId);
		}
		else
		{
			doc = DocumentApp.openById(docUrlOrId);
		}
	}
	catch (e)
	{
		console.error('Failed to open document: ' + e.message);
		return;
	}

	console.log('--- Inspecting Document: ' + doc.getName() + ' ---');
	const body = doc.getBody();
	_inspectElementRecursive(body, 0);
	console.log('--- End of Inspection ---');
}

/**
 * Inspects the Google Form associated with the active spreadsheet.
 * Iterates through all items in the form and logs their types, titles, and details.
 */
function inspectAssociatedForm()
{
	const ss = SpreadsheetApp.getActiveSpreadsheet();
	const formUrl = ss.getFormUrl();

	if (!formUrl)
	{
		console.error("No form is associated with this spreadsheet.");
		return;
	}

	let form;
	try
	{
		form = FormApp.openByUrl(formUrl);
	}
	catch (e)
	{
		console.error('Failed to open form: ' + e.message);
		return;
	}

	console.log('--- Inspecting Form: ' + form.getTitle() + ' ---');
	const items = form.getItems();

	items.forEach((item, index) =>
	{
		const type = item.getType();
		const title = item.getTitle();
		const id = item.getId();

		let details = '';

		// Add details based on item type
		try
		{
			if (type === FormApp.ItemType.MULTIPLE_CHOICE)
			{
				const choices = item.asMultipleChoiceItem().getChoices();
				if (choices.length > 0)
				{
					details = ' [Choices: ' + choices.map(c => c.getValue()).join(', ') + ']';
				}
			}
			else if (type === FormApp.ItemType.CHECKBOX)
			{
				const choices = item.asCheckboxItem().getChoices();
				if (choices.length > 0)
				{
					details = ' [Choices: ' + choices.map(c => c.getValue()).join(', ') + ']';
				}
			}
			else if (type === FormApp.ItemType.LIST)
			{
				const choices = item.asListItem().getChoices();
				if (choices.length > 0)
				{
					details = ' [Choices: ' + choices.map(c => c.getValue()).join(', ') + ']';
				}
			}
			else if (type === FormApp.ItemType.SECTION_HEADER)
			{
				const help = item.asSectionHeaderItem().getHelpText();
				if (help)
				{
					details = ' [Help: ' + help + ']';
				}
			}
			else if (type === FormApp.ItemType.PAGE_BREAK)
			{
				const help = item.asPageBreakItem().getHelpText();
				if (help)
				{
					details = ' [Help: ' + help + ']';
				}
			}
		}
		catch (e)
		{
			details = ' [Error reading details: ' + e.message + ']';
		}

		console.log(`${index + 1}. [${type}] ${title}${details} (ID: ${id})`);
	});

	console.log('--- End of Inspection ---');
}

/**
 * Recursively traverses a document element and logs its type and content.
 * @param {GoogleAppsScript.Document.Element} element The element to inspect.
 * @param {number} level The current nesting level for indentation.
 * @private
 */
function _inspectElementRecursive(element, level)
{
	const prefix = '  '.repeat(level);
	const type = element.getType();
	let content = '';

	// Extract meaningful content based on element type
	try
	{
		if (type === DocumentApp.ElementType.TEXT)
		{
			content = element.asText().getText();
		}
		else if (type === DocumentApp.ElementType.PARAGRAPH)
		{
			content = element.asParagraph().getText();
		}
		else if (type === DocumentApp.ElementType.LIST_ITEM)
		{
			content = element.asListItem().getText();
		}
		else if (type === DocumentApp.ElementType.TABLE_CELL)
		{
			content = '(Table Cell)';
		}
		else if (type === DocumentApp.ElementType.TABLE_ROW)
		{
			content = '(Table Row)';
		}
		else if (type === DocumentApp.ElementType.TABLE)
		{
			content = '(Table)';
		}
	}
	catch (e)
	{
		content = '(Error reading content)';
	}

	// Format content snippet for logging
	const snippet = content.length > 60 ? content.substring(0, 57) + '...' : content;
	console.log(`${prefix}[${type}] ${snippet}`);

	// Recurse into children
	if (element.getNumChildren && typeof element.getNumChildren === 'function')
	{
		const numChildren = element.getNumChildren();
		for (let i = 0; i < numChildren; i++)
		{
			_inspectElementRecursive(element.getChild(i), level + 1);
		}
	}
}
