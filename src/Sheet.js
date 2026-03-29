/**
 * @file This file contains functions related to sheet operations.
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

function getRowById(sheetName, id)
{
	const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
	if (!sheet)
	{
		throw new Error(`Sheet '${sheetName}' not found.`);
	}

	const lastRow = sheet.getLastRow();
	if (lastRow < 2)
	{
		return null;
	}

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
	headers.forEach((header, index) =>
	{
		if (header)
		{
			result[header] = rowData[index];
		}
	});

	return result;
}

/**
 * Copies the given 2D data array to a sheet, creating it if it doesn't exist.
 * The sheet is resized to exactly match the dimensions of the data.
 *
 * @param {string} sheetName The name of the target sheet.
 * @param {any[][]} data The 2D array of data to copy.
 */
function copyDataToSheet(sheetName, data)
{
	if (!data || data.length === 0 || !data[0] || data[0].length === 0)
	{
		return;
	}

	const ss = SpreadsheetApp.getActiveSpreadsheet();
	let sheet = ss.getSheetByName(sheetName);

	if (!sheet)
	{
		sheet = ss.insertSheet(sheetName);
	}

	const rows = data.length;
	const cols = data[0].length;

	const maxRows = sheet.getMaxRows();
	const maxCols = sheet.getMaxColumns();

	// Resize rows if necessary
	if (maxRows > rows)
	{
		sheet.deleteRows(rows + 1, maxRows - rows);
	}
	else if (maxRows < rows)
	{
		sheet.insertRowsAfter(maxRows, rows - maxRows);
	}

	// Resize columns if necessary
	if (maxCols > cols)
	{
		sheet.deleteColumns(cols + 1, maxCols - cols);
	}
	else if (maxCols < cols)
	{
		sheet.insertColumnsAfter(maxCols, cols - maxCols);
	}

	// Copy data
	sheet.getRange(1, 1, rows, cols).setValues(data);
}
