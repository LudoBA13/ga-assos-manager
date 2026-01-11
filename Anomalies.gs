/**
 * Automatically updates a VSTACK formula in the 'Anomalies' sheet.
 * Adds a 3rd column with the sheet name (minus prefix).
 * Formatted with Allman style, 4-space indentation, and French syntax (;).
 */
function updateAnomaliesFormula(e)
{
	// Only run if the change was structural (add, remove, rename, etc.)
	if (e && !["INSERT_GRID", "REMOVE_GRID", "OTHER"].includes(e.changeType))
	{
		return;
	}

	const ss = SpreadsheetApp.getActiveSpreadsheet();
	const sheets = ss.getSheets();
	const trgSheetName = "Anomalies";
	const prefix = "Anomalie-";

	const rangeStrings = [];

	// 1. Loop through sheets and build the formatted HSTACK logic
	sheets.forEach(sheet =>
	{
		const name = sheet.getName();
		if (name.startsWith(prefix))
		{
			// Strip the prefix for the 3rd column
			const shortName = name.replace(prefix, "");

			const range = "'" + name + "'!$A$2:$B";
			const criteria = "'" + name + "'!$A$2:$A";

			// Building a multi-line, indented formula string for this specific sheet
			const sheetFormula =
				"    IFERROR\n" +
				"    (\n" +
				"        LET\n" +
				"        (\n" +
				"            f; FILTER(" + range + "; " + criteria + " <> \"\");\n" +
				"            HSTACK(f; ARRAYFORMULA(IF(SEQUENCE(ROWS(f)); \"" + _(shortName) + "\")))\n" +
				"        )\n" +
				"    )";

			rangeStrings.push(sheetFormula);
		}
	});

	const trgSheet = ss.getSheetByName(trgSheetName);
	if (!trgSheet)
	{
		console.error("Sheet '" + trgSheetName + "' not found.");
		return;
	}

	// 2. Build and write the final multi-line VSTACK formula
	const trgRange = trgSheet.getRange("A1");
	if (rangeStrings.length > 0)
	{
		const formula = "=SORT(VSTACK\n(\n" + rangeStrings.join(";\n") + "\n); 2; TRUE)";
		if (trgRange.getFormula() !== formula)
		{
			trgRange.setFormula(formula);
		}
	}
	else
	{
		trgRange.setValue("No matching sheets found.");
	}
}
