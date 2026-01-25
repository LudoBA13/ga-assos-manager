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