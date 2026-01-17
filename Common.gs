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
