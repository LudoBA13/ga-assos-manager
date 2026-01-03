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

/**
 * Deploys (creates or updates) the Named Functions in the current spreadsheet.
 * Run this manually whenever you update the definitions in the code.
 */
function deployNamedFunctions()
{
	const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();

	// Definitions of the functions to deploy
	const functions = [
		{
			name: 'AC',
			description: _('Renvoie une colonne complète de la feuille DonnéesAssoConnect via son nom d\'en-tête.'),
			definition: "=INDEX('DonnéesAssoConnect'!$A$2:$DZ, 0, MATCH(col_name, 'DonnéesAssoConnect'!$1:$1, 0))",
			argumentPlaceholders: [{ name: 'col_name' }]
		},
		{
			name: 'AC_COLS',
			description: _('Renvoie les colonnes de DonnéesAssoConnect correspondant aux en-têtes de la plage fournie.'),
			definition: "=CHOOSECOLS(REDUCE(0, headers, LAMBDA(acc, h, HSTACK(acc, INDEX('DonnéesAssoConnect'!$A$2:$DZ, 0, MATCH(h, 'DonnéesAssoConnect'!$1:$1, 0))))), SEQUENCE(1, COLUMNS(headers), 2))",
			argumentPlaceholders: [{ name: 'headers' }]
		}
	];

	// Functions to explicitly remove
	const toRemove = ['ASSOCONNECT_COL', 'FILTER_ASSOCONNECT_FUTURE'];

	try
	{
		const response = Sheets.Spreadsheets.get(ssId, {
			fields: 'namedFunctions'
		});
		
		const existingFunctions = response.namedFunctions || [];
		const requests = [];

		// Handle Deletions
		toRemove.forEach(name => {
			const existing = existingFunctions.find(f => f.name === name);
			if (existing)
			{
				requests.push({
					deleteNamedFunction: {
						namedFunctionId: existing.namedFunctionId
					}
				});
				console.log(`Deleting: ${name}`);
			}
		});

		// Handle Creation / Updates
		functions.forEach(funcDef => {
			const existing = existingFunctions.find(f => f.name === funcDef.name);
			if (existing)
			{
				requests.push({
					updateNamedFunction: {
						namedFunctionId: existing.namedFunctionId,
						namedFunction: funcDef,
						fields: '*'
					}
				});
				console.log(`Updating: ${funcDef.name}`);
			}
			else
			{
				requests.push({
					addNamedFunction: {
						namedFunction: funcDef
					}
				});
				console.log(`Creating: ${funcDef.name}`);
			}
		});

		if (requests.length > 0)
		{
			Sheets.Spreadsheets.batchUpdate({ requests: requests }, ssId);
			SpreadsheetApp.getUi().alert(_('%s opération(s) sur les fonctions effectuée(s) avec succès !', requests.length));
		}
		else
		{
			SpreadsheetApp.getUi().alert(_('Aucune modification nécessaire.'));
		}
	}
	catch (e)
	{
		console.error('Error deploying Named Functions: ' + e.message);
		SpreadsheetApp.getUi().alert(_('Erreur lors du déploiement : %s', e.message));
	}
}

function showImporter()
{
	Importer.show();
}

function updateAssoConnectFromFile(fileData)
{
	Importer.updateAssoConnectFromFile(fileData);
}