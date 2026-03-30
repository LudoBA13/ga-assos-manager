/**
 * @file This file handles the Web App serving logic.
 */

function getACStructures()
{
	return (new WebApp).getACStructures();
}

function getFipUrl(id)
{
	return (new WebApp).getFipUrl(id);
}

function getRecentVisits(filter)
{
	return (new WebApp).getRecentVisits(filter);
}


class WebApp
{
	getRecentVisits(filter = null)
	{
		const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CRVisites');
		if (!sheet)
		{
			throw new Error("La feuille 'CRVisites' est introuvable.");
		}

		const data = sheet.getDataRange().getValues();
		if (data.length < 2)
		{
			return [];
		}

		const headers = data[0];
		const vifIdx = headers.indexOf('N° VIF de la structure visitée');
		const structureIdx = headers.indexOf('Nom de la structure visitée');
		const dateIdx = headers.indexOf('Date de la visite');
		const personIdx = headers.indexOf('Personnes qui ont fait la visite');

		if (vifIdx === -1 || dateIdx === -1)
		{
			throw new Error("Colonnes requises introuvables dans 'CRVisites'.");
		}

		// Filter and map data
		let results = [];
		for (let i = 1; i < data.length; i++)
		{
			const row = data[i];
			const person = personIdx !== -1 ? row[personIdx] : '';

			if (filter && person)
			{
				if (!person.toLowerCase().includes(filter.toLowerCase()))
				{
					continue;
				}
			}

			results.push({
				vif: row[vifIdx],
				structure: structureIdx !== -1 ? row[structureIdx] : '',
				date: row[dateIdx],
				person: person
			});
		}

		// Sort by date descending (most recent first)
		results.sort((a, b) =>
		{
			const dateA = a.date instanceof Date ? a.date : new Date(a.date);
			const dateB = b.date instanceof Date ? b.date : new Date(b.date);
			return dateB - dateA;
		});

		// Format dates for JSON
		results = results.slice(0, 10).map(r =>
		{
			if (r.date instanceof Date)
			{
				r.date = r.date.toLocaleDateString('fr-FR');
			}
			return r;
		});

		return results;
	}

	getACStructures()
	{
		const configs = getAllConfigs();
		const cacheBuster = configs.cacheBuster || 'v1';
		const cache = CacheService.getScriptCache();
		const cacheKey = 'ACStructures_' + cacheBuster;
		const cached = cache.get(cacheKey);

		console.log('Server cache buster:', cacheBuster, '| Cache key:', cacheKey);

		if (cached)
		{
			try
			{
				console.log('Server cache hit.');
				return JSON.parse(cached);
			}
			catch (e)
			{
				console.warn('Server cache corrupted, fetching from sheet.');
			}
		}

		console.log('Server cache miss, fetching from spreadsheet.');

		const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ACStructures');
		if (!sheet)
		{
			throw new Error("La feuille 'ACStructures' est introuvable.");
		}

		const data = sheet.getDataRange().getValues();
		if (data.length < 2)
		{
			return {};
		}

		const headers = data[0];
		const idIdx = headers.indexOf('ID du Contact');
		const vifIdx = headers.indexOf('Code VIF');
		const nomIdx = headers.indexOf('Nom');
		const dateIdx = headers.indexOf('Date de la dernière visite');
		const driveIdx = headers.indexOf('Lien vers les documents stockés sur le Drive');

		if (idIdx === -1)
		{
			throw new Error("La colonne 'ID du Contact' est introuvable.");
		}

		const result = {};

		for (let i = 1; i < data.length; i++)
		{
			const row = data[i];
			const id = row[idIdx];

			if (!id)
			{
				continue;
			}

			const dateVal = dateIdx !== -1 ? row[dateIdx] : '';
			let dateStr = '';
			if (dateVal instanceof Date)
			{
				dateStr = dateVal.toLocaleDateString('fr-FR');
			}
			else
			{
				dateStr = dateVal;
			}

			result[id] = {
				'Code VIF': vifIdx !== -1 ? row[vifIdx] : '',
				'Nom': nomIdx !== -1 ? row[nomIdx] : '',
				'Date de la dernière visite': dateStr,
				'Lien vers les documents stockés sur le Drive': driveIdx !== -1 ? row[driveIdx] : ''
			};
		}

		try
		{
			cache.put(cacheKey, JSON.stringify(result), 21600); // 6 hours
		}
		catch (e)
		{
			// Probably exceeding cache size limit (100KB)
			console.warn("Could not cache structures: " + e.message);
		}

		return result;
	}

	getFipUrl(id)
	{
		const structures = this.getACStructures();
		const structure = structures[id];

		if (!structure)
		{
			throw new Error("Structure introuvable.");
		}

		const driveUrl = structure['Lien vers les documents stockés sur le Drive'];
		if (!driveUrl)
		{
			throw new Error("Aucun lien Drive configuré pour cette structure.");
		}

		let folderId = null;
		// Pattern for folders/ID
		const matchFolders = driveUrl.match(/folders\/([a-zA-Z0-9-_]+)/);
		if (matchFolders)
		{
			folderId = matchFolders[1];
		}
		else
		{
			// Pattern for id=ID
			const matchId = driveUrl.match(/[?&]id=([a-zA-Z0-9-_]+)/);
			if (matchId)
			{
				folderId = matchId[1];
			}
		}

		if (!folderId)
		{
			// Fallback: assume the whole URL is the redirect if we can't parse it,
			// or try to open it to see if it redirects (not possible here).
			// If we can't get the folder ID, we can't search inside it.
			// Just return the drive URL.
			return driveUrl;
		}

		try
		{
			const folder = DriveApp.getFolderById(folderId);
			const files = folder.getFiles();
			while (files.hasNext())
			{
				const file = files.next();
				if (file.getName().startsWith("FIP "))
				{
					return file.getUrl();
				}
			}
		}
		catch (e)
		{
			// Permission error or invalid ID, fallback to Drive URL
			console.error("Error searching Drive: " + e.message);
		}

		return driveUrl;
	}
}

/**
 * Handles GET requests to the Web App.
 *
 * @returns {GoogleAppsScript.HTML.HtmlOutput} The evaluated HTML template.
 */
function doGet(e)
{
	const template = HtmlService.createTemplateFromFile('WebApp.Index');

	// Pass the initial screen from the URL parameter 'p'
	template.initialScreen = e.parameter.p || 'car:visites';
	template.initialVif = e.parameter.vif || null;

	// Pass the user identity to the template (display name only)
	template.userEmail = Session.getActiveUser().getEmail().replace('@banquealimentaire.org', '');
	template.scriptUrl = ScriptApp.getService().getUrl();
	template.configs = getAllConfigs();

	return template.evaluate()
		.setTitle('Console Associations')
		.addMetaTag('viewport', 'width=device-width, initial-scale=1')
		.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
