/**
 * @OnlyCurrentDoc
 */
function onOpen()
{
	SpreadsheetApp.getUi()
		.createMenu('AssoConnect')
		.addItem(_('Importer les structures'), 'showImporter')
		.addItem(_('Mettre à jour fonctions'), 'deployNamedFunctions')
		.addToUi();
}


function showImporter()
{
	Importer.show();
}

function updateAssoConnectFromFile(fileData)
{
	Importer.updateAssoConnectFromFile(fileData);
}