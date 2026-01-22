/**
 * @file This file manages the deployment of Named Functions in the spreadsheet.
 * @license
 * MIT License
 *
 * Copyright (c) Ludovic ARNAUD
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

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
			description: _('Renvoie une colonne complète de la feuille AssoConnect via son nom d\'en-tête.'),
			definition: "=INDEX('ACStructures'!$A$2:$DZ, 0, MATCH(col_name, 'ACStructures'!$1:$1, 0))",
			argumentPlaceholders: [{ name: 'col_name' }]
		},
		{
			name: 'AC_COLS',
			description: _('Renvoie les colonnes de AssoConnect correspondant aux en-têtes de la plage fournie.'),
			definition: "=CHOOSECOLS(REDUCE(0, headers, LAMBDA(acc, h, HSTACK(acc, INDEX('ACStructures'!$A$2:$DZ, 0, MATCH(h, 'ACStructures'!$1:$1, 0))))), SEQUENCE(1, COLUMNS(headers), 2))",
			argumentPlaceholders: [{ name: 'headers' }]
		},
		{
			name: 'GET_VIF_FROM_APPROXIMATE_NAME',
			description: _('Recherche la valeur associée à un nom dans la feuille FuzzyDB.'),
			definition: "=XLOOKUP(name, FuzzyDB!$A:$A, FuzzyDB!$B:$B)",
			argumentPlaceholders: [{ name: 'name' }]
		},
		{
			name: 'CONFIG',
			description: _('Récupère une valeur de configuration par son nom depuis la feuille Config.'),
			definition: "=XLOOKUP(name, Config!$A:$A, Config!$B:$B)",
			argumentPlaceholders: [{ name: 'name' }]
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
