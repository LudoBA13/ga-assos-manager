/**
 * @OnlyCurrentDoc
 */
function onOpen()
{
	SpreadsheetApp.getUi()
		.createMenu('AssoConnect')
		.addItem(_('Importer les structures'), 'showImporter')
		.addItem(_('Mettre à jour fonctions'), 'deployNamedFunctions')
		.addSeparator()
		.addItem(_('Lancer les tests'), 'runTests')
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

/**
 * Runs all tests in the project.
 */
function runTests()
{
	runPlanningEncoderTests();
}