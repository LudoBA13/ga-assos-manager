/**
 * @file This file contains common utility functions and configuration retrievers.
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

function getAllConfigs()
{
	const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Config');
	if (!sheet)
	{
		throw new Error("The 'Config' sheet was not found.");
	}

	const data = sheet.getDataRange().getValues();
	const config = {};

	data.forEach(row =>
	{
		if (row[0])
		{
			config[row[0]] = row[1];
		}
	});

	return config;
}

function getConfig(name)
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
 * Extracts the ID from a Google Drive URL (file or folder).
 * Supports formats like:
 * - https://drive.google.com/drive/folders/ID
 * - https://docs.google.com/document/d/ID/edit
 * - https://drive.google.com/open?id=ID
 *
 * @param {string} url The URL to parse.
 * @return {string} The extracted ID, or the input string if no URL structure is detected.
 */
function extractDriveIdFromUrl(url)
{
	if (!url || !url.startsWith('https://'))
	{
		return url;
	}

	const match = url.match(/[-\w]{25,}/);
	return match ? match[0] : url;
}

/**
 * Safely retrieves the Spreadsheet UI.
 * When executed via a trigger (non-interactive mode), SpreadsheetApp.getUi() throws an error.
 * This function catches that error and returns a mock UI object to prevent the script from crashing.
 *
 * @return {GoogleAppsScript.Base.Ui} The Spreadsheet UI or a mock object.
 */
function getSafeUi()
{
	try
	{
		return SpreadsheetApp.getUi();
	}
	catch (e)
	{
		return {
			alert: function()
			{ return null; },
			showModalDialog: function()
			{ return null; },
			showModelessDialog: function()
			{ return null; },
			showSidebar: function()
			{ return null; },
			createMenu: function()
			{
				const menu = {
					addItem: function()
					{ return menu; },
					addSeparator: function()
					{ return menu; },
					addSubMenu: function()
					{ return menu; },
					addToUi: function()
					{ return menu; }
				};
				return menu;
			},
			createAddonMenu: function()
			{
				const menu = {
					addItem: function()
					{ return menu; },
					addSeparator: function()
					{ return menu; },
					addSubMenu: function()
					{ return menu; },
					addToUi: function()
					{ return menu; }
				};
				return menu;
			}
		};
	}
}

function getAssoByVif(vif)
{
	const sheetName = 'ACStructures';
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

	const vifColIndex = headers.indexOf('Code VIF');
	if (vifColIndex === -1)
	{
		throw new Error(`Column 'Code VIF' not found in '${sheetName}'.`);
	}

	const vifs = sheet.getRange(2, vifColIndex + 1, lastRow - 1, 1).getValues().flat();
	const rowIdx = vifs.findIndex(val => val == vif);

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
 * Returns an array of objects for non-empty notes in a range.
 * @param {GoogleAppsScript.Spreadsheet.Range} range The range to inspect.
 * @return {Array<{rowIdx: number, colIdx: number, note: string}>} Array of note objects.
 */
function getNotes(range)
{
	const notes = range.getNotes();
	const results = [];

	for (let r = 0; r < notes.length; r++)
	{
		for (let c = 0; c < notes[r].length; c++)
		{
			const note = notes[r][c];
			if (note && note !== '')
			{
				results.push({
					rowIdx: r,
					colIdx: c,
					note: note
				});
			}
		}
	}

	return results;
}

/**
 * Creates a Map from two arrays (keys and values).
 * @param {Array} keys The array of keys.
 * @param {Array} values The array of values.
 * @return {Map} The resulting Map.
 */
function newMapFromArray(keys, values)
{
	const map = new Map;
	keys.forEach((key, index) =>
	{
		map.set(key, values[index]);
	});
	return map;
}
