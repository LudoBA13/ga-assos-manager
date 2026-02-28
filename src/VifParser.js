class VifParser
{
	/**
	 * Parses the raw text content from VIF export into a 1NF 2D array.
	 * @param {string} content - The raw string content of the file.
	 * @return {string[][]} A 2D array representing the parsed data with headers.
	 */
	static parseBL(content)
	{
		const lines = content.split(/\r?\n/);
		
		let currentState = {
			customerID: '',
			date: '',
			bl: '',
			cde: ''
		};

		const result = [];

		result.push([
			'Code VIF', 'Date', 'n° BL', 'n° Cde', 'Article', 
			'Libellé', 'Lot', 'Kg Net', 'Kg Brut', 'P', 'COL'
		]);

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
				result.push([
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
				]);
			}
		}

		return result;
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
		
		const parsedData = VifParser.parseBL(content);
		VifParser.writeToSheet('VIF_BL', parsedData);
		
		return 'Importation réussie : ' + (parsedData.length - 1) + ' lignes traitées.';
	}
	catch (e)
	{
		return 'Erreur : ' + e.toString();
	}
}