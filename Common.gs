function getConfigValue(name)
{
	const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Config');
	if (!sheet)
	{
		throw new Error("The 'Config' sheet was not found.");
	}

	const data = sheet.getDataRange().getValues();
	const row = data.find(r => r[0] === name);

	if (!row)
	{
		throw new Error(`The configuration '${name}' is missing in the Config sheet.`);
	}

	return row[1];
}

function getRowById(sheetName, id)
{
	const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
	if (!sheet)
	{
		throw new Error(`Sheet '${sheetName}' not found.`);
	}

	const lastRow = sheet.getLastRow();
	if (lastRow < 2) return null;

	const lastCol = sheet.getLastColumn();
	const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

	const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
	const rowIdx = ids.findIndex(val => val == id);

	if (rowIdx === -1)
	{
		return null;
	}

	const rowData = sheet.getRange(rowIdx + 2, 1, 1, lastCol).getValues()[0];

	const result = {};
	headers.forEach((header, index) => {
		if (header)
		{
			result[header] = rowData[index];
		}
	});

	return result;
}
