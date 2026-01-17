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
	return getConfigValue('visitReportFormUrl');
}

function getAssoConnectRow(id)
{
	return getRowById('DonnéesAssoConnect', id);
}
