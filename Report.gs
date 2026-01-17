function showReportDialog()
{
	const html = HtmlService.createTemplateFromFile('UI.Report')
		.evaluate()
		.setWidth(400)
		.setHeight(300);
		
	SpreadsheetApp.getUi().showModalDialog(html, _('Créer un rapport'));
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
	const vifIndex = headers.indexOf('Code VIF');
	const nomIndex = headers.indexOf('Nom');

	if (vifIndex === -1 || nomIndex === -1)
	{
		return [];
	}

	const map = new Map();

	for (let i = 1; i < data.length; i++)
	{
		const row = data[i];
		const vif = row[vifIndex];
		const nom = row[nomIndex];

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
