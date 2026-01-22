/**
 * @file This file handles anomaly detection and reporting.
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
