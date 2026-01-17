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

	const data = sheet.getDataRange().getValues();
	if (data.length < 2) return [];

	const headers = data[0];
	const idIdx = headers.indexOf('ID du Contact');
	const nomIdx = headers.indexOf('Nom');

	if (idIdx === -1 || nomIdx === -1)
	{
		return [];
	}

	const map = new Map();

	for (let i = 1; i < data.length; i++)
	{
		const row = data[i];
		const id = row[idIdx];
		const nom = row[nomIdx];

		if (id && nom && !map.has(id))
		{
			map.set(id, nom);
		}
	}

	// Return array of [id, nom], sorted by nom
	return Array.from(map.entries())
		.map(([id, nom]) => [id, nom])
		.sort((a, b) => a[1].localeCompare(b[1]));
}

function getVisitReportFormUrl(id)
{
	const rawUrl = getConfigValue('visitReportFormUrl');
	const structure = getAssoConnectRow(id);

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

function getAssoConnectRow(id)
{
	return getRowById('ACStructures', id);
}
