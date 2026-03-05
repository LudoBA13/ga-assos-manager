class VifParser
{
	/**
	 * Parses the raw text content from VIF export into a 1NF 2D array.
	 * @param {string} content - The raw string content of the file.
	 * @return {string[][]} A 2D array representing the parsed data with headers.
	 */
	static parseBL(content)
	{
		const result = [];
		for (const entry of VifParser._parseBLEntries(content))
		{
			result.push(entry);
		}
		return result;
	}

	/**
	 * Private generator to yield entries from the raw VIF content.
	 * @param {string} content - The raw string content of the file.
	 * @yields {string[]} A single row of the 2D array.
	 * @private
	 */
	static * _parseBLEntries(content)
	{
		const lines = content.split(/\r?\n/);
		
		let currentState = {
			customerID: '',
			date: '',
			bl: '',
			cde: ''
		};

		yield [
			'Code VIF', 'Date', 'n° BL', 'n° Cde', 'Article', 
			'Libellé', 'Lot', 'Kg Net', 'Kg Brut', 'P', 'COL'
		];

		for (let i = 0; i < lines.length; i++)
		{
			const line = lines[i];
			if (!line.trim())
			{
				continue;
			}

			const cols = line.split('\t');
			const firstCol = cols[0]?.trim() || '';

			if (firstCol.includes('Client :'))
			{
				const clientMatch = line.match(/Client\s*:\s*(\d+)/);
				if (clientMatch && clientMatch[1])
				{
					currentState.customerID = clientMatch[1];
				}
				continue;
			}

			if (firstCol.includes('Date livr.') || line.includes('Rappel de la sélection'))
			{
				continue;
			}

			const dateVal = firstCol;
			const blVal = cols[1]?.trim();
			const cdeVal = cols[2]?.trim();
			const articleVal = cols[3]?.trim();

			if (dateVal)
			{
				currentState.date = dateVal;
			}

			if (blVal)
			{
				currentState.bl = blVal;
				currentState.cde = cdeVal || '';
			}

			if (articleVal && /^\d+$/.test(articleVal))
			{
				yield [
					currentState.customerID,
					currentState.date,
					currentState.bl,
					currentState.cde,
					articleVal,
					cols[4]?.trim() || '',
					cols[5]?.trim() || '',
					cols[6]?.trim() || '',
					cols[7]?.trim() || '',
					cols[8]?.trim() || '',
					cols[9]?.trim() || ''
				];
			}
		}
	}

	/**
	 * Parses the raw text content and yields statistics grouped by 'n° BL'.
	 * @param {string} content - The raw string content of the file.
	 * @yields {Object} Statistics for a single 'n° BL'.
	 */
	static * parseBLStats(content)
	{
		const entries = VifParser._parseBLEntries(content);
		entries.next(); // Skip headers

		let currentBL = null;
		let stats = null;

		for (const row of entries)
		{
			const bl = row[2];
			const article = row[4];

			if (bl !== currentBL)
			{
				if (stats)
				{
					stats['Type BL'] = VifParser._determineBLType(stats);
					yield stats;
				}
				currentBL = bl;
				stats = {
					'Code VIF': row[0],
					'Date': row[1],
					'n° BL': bl,
					'Type BL': '',
					'Kg Net': 0,
					'Produits Sec': 0,
					'Produits Frais': 0,
					'Produits Surgelé': 0,
					'Produits FSE': 0,
					'Produits CNES': 0,
					'Produits Proxidon': 0
				};
			}

			if (article)
			{
				const kgNetStr = row[7] || '';
				const kgNet = parseFloat(kgNetStr.replace(',', '.')) || 0;
				stats['Kg Net'] += kgNet;

				const len = article.length;
				if (len >= 5)
				{
					const familyChar = article.charAt(len - 5);
					if (familyChar === '1')
					{
						++stats['Produits Sec'];
					}
					else if (familyChar === '2')
					{
						++stats['Produits Frais'];
					}
					else if (familyChar === '3')
					{
						++stats['Produits Surgelé'];
					}
				}

				if (article.endsWith('9'))
				{
					++stats['Produits FSE'];
				}
				if (article.endsWith('3'))
				{
					++stats['Produits CNES'];
				}

				const lot = row[6];
				if (lot && lot.toLowerCase().startsWith('proxidon'))
				{
					++stats['Produits Proxidon'];
				}
			}
		}

		if (stats)
		{
			stats['Type BL'] = VifParser._determineBLType(stats);
			yield stats;
		}
	}

	/**
	 * Determines the 'Type BL' based on statistics.
	 * @param {Object} stats - The statistics for a single 'n° BL'.
	 * @return {string} The determined type.
	 * @private
	 */
	static _determineBLType(stats)
	{
		if (stats['Produits Proxidon'] > 0)
		{
			return 'Proxidon';
		}
		if (stats['Produits Surgelé'] > 0)
		{
			return 'Surgelé';
		}
		if (stats['Produits Frais'] > 0)
		{
			return 'Complément/Frais/F&L';
		}
		if (stats['Produits Sec'] > 0)
		{
			return 'Sec';
		}
		return '';
	}

	/**
	 * Handles sheet creation/selection and data injection.
	 * @param {string} sheetName - The name of the target sheet.
	 * @param {string[][]} data - The 2D array of data to write.
	 */
	static writeToSheet(sheetName, data)
	{
		const ss = SpreadsheetApp.getActiveSpreadsheet();
		let sheet = ss.getSheetByName(sheetName);
		
		if (!sheet)
		{
			sheet = ss.insertSheet(sheetName);
		}

		const rows = data.length;
		const cols = data[0].length;

		// Sync Columns
		const currentMaxCols = sheet.getMaxColumns();
		if (cols > currentMaxCols)
		{
			sheet.insertColumnsAfter(currentMaxCols, cols - currentMaxCols);
		}
		else if (cols < currentMaxCols)
		{
			sheet.deleteColumns(cols + 1, currentMaxCols - cols);
		}

		// Sync Rows
		const currentMaxRows = sheet.getMaxRows();
		if (rows > currentMaxRows)
		{
			sheet.insertRowsAfter(currentMaxRows, rows - currentMaxRows);
		}
		else if (rows < currentMaxRows)
		{
			sheet.deleteRows(rows + 1, currentMaxRows - rows);
		}

		sheet.getRange(1, 1, rows, cols).setValues(data);
		sheet.activate();
	}
}

/**
 * Updated server-side trigger for the upload UI
 */
function processUpload(fileObj)
{
	try
	{
		const blob = Utilities.newBlob(Utilities.base64Decode(fileObj.data), fileObj.mimeType);
		const content = blob.getDataAsString('ISO-8859-1');
		
		// Import detailed BL data
		const parsedData = VifParser.parseBL(content);
		VifParser.writeToSheet('VIF_BL', parsedData);

		// Import BL statistics
		const statsRows = [];
		const headers = ['Code VIF', 'Date', 'n° BL', 'Type BL', 'Kg Net', 'Produits Sec', 'Produits Frais', 'Produits Surgelé', 'Produits FSE', 'Produits CNES', 'Produits Proxidon'];
		statsRows.push(headers);

		for (const stat of VifParser.parseBLStats(content))
		{
			statsRows.push(headers.map(h => stat[h]));
		}
		VifParser.writeToSheet('VIF_BL_Stats', statsRows);
		
		return 'Importation réussie : ' + (parsedData.length - 1) + ' lignes traitées.';
	}
	catch (e)
	{
		return 'Erreur : ' + e.toString();
	}
}