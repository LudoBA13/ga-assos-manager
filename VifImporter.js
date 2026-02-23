class VifImporter
{
	static show()
	{
		const html = HtmlService.createTemplateFromFile('UI.VifImporter')
			.evaluate()
			.setWidth(600) // Adjust width as needed
			.setHeight(250); // Adjust height as needed
		getSafeUi().showModalDialog(html, _('Importer bons de livraisons VIF'));
	}
}

// Ensure _ function is available globally or define it if this is a standalone file for Apps Script
// This is typically defined in a common file like Common.js or Code.js
// function _(text) { return text; }
