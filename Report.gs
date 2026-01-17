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
	const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DonnéesAssoConnect');
	if (!sheet)
	{
		throw new Error("La feuille 'DonnéesAssoConnect' est introuvable.");
	}

	const data = sheet.getDataRange().getValues();
	if (data.length < 2) return [];

	const headers = data[0];
	const vifIdx = headers.indexOf('Code VIF');
	const nomIdx = headers.indexOf('Nom');

	if (vifIdx === -1 || nomIdx === -1)
	{
		return [];
	}

	const map = new Map();

	for (let i = 1; i < data.length; i++)
	{
		const row = data[i];
		const vif = row[vifIdx];
		const nom = row[nomIdx];

		if (vif && nom && !map.has(vif))
		{
			map.set(vif, nom);
		}
	}

	// Return array of [vif, nom], sorted by nom
	return Array.from(map.entries())
		.map(([vif, nom]) => [vif, nom])
		.sort((a, b) => a[1].localeCompare(b[1]));
}

function getVisitReportFormUrl()
{
	const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Config');
	if (!sheet)
	{
		throw new Error("La feuille 'Config' est introuvable.");
	}

	const data = sheet.getDataRange().getValues();
	const row = data.find(r => r[0] === 'visitReportFormUrl');

	if (!row)
	{
		throw new Error("La configuration 'visitReportFormUrl' est manquante dans la feuille Config.");
	}

	return row[1];
}

function getAssoConnectRow(id)
{
	const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DonnéesAssoConnect');
	if (!sheet)
	{
		throw new Error("La feuille 'DonnéesAssoConnect' est introuvable.");
	}

	const lastRow = sheet.getLastRow();
	if (lastRow < 2) return null;

	// 1. Read headers (Row 1)
	const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

	// 2. Read IDs (Column A) - Search for the ID
	// Note: We read A2:A... to match data rows
	const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
	const rowIdx = ids.findIndex(val => val == id); // Loose equality for ID matching

	if (rowIdx === -1)
	{
		return null;
	}

	// 3. Fetch specific row (Row index + 2 because of 0-based index and 1 header row)
	const rowData = sheet.getRange(rowIdx + 2, 1, 1, sheet.getLastColumn()).getValues()[0];

	// 4. Map to object
	const result = {};
	headers.forEach((header, index) => {
		if (header) {
			result[header] = rowData[index];
		}
	});

	return result;
}
