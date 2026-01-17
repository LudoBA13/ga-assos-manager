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

	ui.createMenu('CAR')
		.addItem(_('Créer un rapport de visite'), 'showReportDialog')
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

function runTests()
{
	const encoderResults = runPlanningEncoderTests();
	const preprocessorResults = runInfoPreprocessorTests();
	
	const totalPassed = encoderResults.passed + preprocessorResults.passed;
	const totalTotal = encoderResults.total + preprocessorResults.total;
	
	Logger.log(`Total Tests: ${totalPassed} / ${totalTotal} passed.`);
}

