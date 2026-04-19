/**
 * @file This file contains the Importer class for processing ACStructures data.
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

class Importer
{
	static show(type = 'structures')
	{
		const template = HtmlService.createTemplateFromFile('UI.Importer');
		template.type = type;
		const html = template.evaluate()
			.setWidth(400);
		getSafeUi().showModalDialog(html, _('Importer les ' + type));
	}

	static updateACStructuresFromFile(fileData)
	{
		const data = this.getDataFromXLSXFile(fileData);
		if (!data || data.length === 0)
		{
			throw new Error('No data in file.');
		}

		// Validate headers
		const headers = data[0];
		if (!headers.includes('Code VIF'))
		{
			throw new Error(_('Format incorrect. Impossible de trouver le champ Code VIF.'));
		}

		this.updateACStructuresData(data);
		SpreadsheetApp.getActiveSpreadsheet().toast(_('Importation réussie'));
	}

	static updateACPersonnesFromFile(fileData)
	{
		const data = this.getDataFromXLSXFile(fileData);
		if (!data || data.length === 0)
		{
			throw new Error('No data in file.');
		}

		// Validate headers
		const headers = data[0];
		if (!headers.includes('Prénom'))
		{
			throw new Error(_('Format incorrect. Impossible de trouver le champ Prénom.'));
		}

		this.updateACPersonnesData(data);
		SpreadsheetApp.getActiveSpreadsheet().toast(_('Importation réussie'));
	}

	static updateACPersonnesData(data)
	{
		const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ACPersonnes') || SpreadsheetApp.getActiveSpreadsheet().insertSheet('ACPersonnes');
		const patcher = new SheetPatcher(sheet);
		patcher.replace(data);

		// Update cache buster
		this.updateCacheBuster();
	}

	static updateACStructuresData(data)
	{
		if (!data || data.length === 0)
		{
			throw new Error('No data passed to updateACStructuresData.');
		}

		console.time('ImportStructures');

		// 1. Locate headers and extend them
		const headers = data[0];
		const infoIdx = headers.indexOf('Informations complémentaires');

		headers.push('$planning', 'UD', 'Planning', 'Passages Frais', 'Passages Sec', 'Passages Surgelé');

		// 2. Process rows to extract extra data
		console.time('ProcessRows');
		const udRegex = /\[UD\]\s*(\d+)/;
		const planningRegex = /\[Planning\]\s*((?:[ \w\u1D49\u02B3]+:\s*(?:\p{L}+,\s*)+\p{L}+(?:\.\s*|$))+)/u;

		for (let i = 1; i < data.length; i++)
		{
			const row = data[i];
			let planning = '';
			let ud = '';

			if (infoIdx !== -1)
			{
				const infoRaw = row[infoIdx] ? String(row[infoIdx]) : '';
				const info = InfoPreprocessor.process(infoRaw);

				const udMatch = info.match(udRegex);
				const planningMatch = info.match(planningRegex);

				if (udMatch)
				{
					const udVal = udMatch[1];
					ud = udVal !== '' ? Number(udVal) : '';
				}
				if (planningMatch)
				{
					planning = parseHumanReadable(planningMatch[1]);
				}
			}

			const formattedPlanning = formatPlanningForDisplay(decodePlanning(planning));
			const counts = countProductOccurrences(planning);
			row.push(planning, ud, formattedPlanning, counts['Frais'], counts['Sec'], counts['Surgelé']);
		}
		console.timeEnd('ProcessRows');

		// 3. Update Sheet
		console.time('SheetPatcher');
		const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ACStructures') || SpreadsheetApp.getActiveSpreadsheet().insertSheet('ACStructures');
		const patcher = new SheetPatcher(sheet);
		patcher.replace(data);
		console.timeEnd('SheetPatcher');

		// Update cache buster
		this.updateCacheBuster();

		// Process and update FuzzyDB
		console.time('FuzzyDBUpdate');
		try
		{
			this.updateFuzzyDB(data);
		}
		catch (e)
		{
			console.warn('Failed to update FuzzyDB: ' + e.message);
		}
		console.timeEnd('FuzzyDBUpdate');

		console.timeEnd('ImportStructures');
	}

	/**
	 * Retrieves the cached timestamp used as a cache buster.
	 * If no timestamp is cached, it defaults to '0'.
	 *
	 * @returns {string} The cache buster timestamp.
	 */
	static getCacheBuster()
	{
		const props = PropertiesService.getScriptProperties();
		return props.getProperty('cacheBuster') || '0';
	}

	/**
	 * Updates the cached timestamp to the current time.
	 */
	static updateCacheBuster()
	{
		const props = PropertiesService.getScriptProperties();
		props.setProperty('cacheBuster', Date.now().toString());
	}

	static updateFuzzyDB(acStructuresData)
	{
		// 1. Locate headers
		const headers = acStructuresData[0];
		const nomIdx = headers.indexOf('Nom');
		const codeIdx = headers.indexOf('Code VIF');

		if (nomIdx === -1 || codeIdx === -1)
		{
			console.warn('Cannot update FuzzyDB: Missing required columns (Nom, Code VIF) in source data.');
			return;
		}

		// 2. Access FuzzyDB sheet
		const ss = SpreadsheetApp.getActiveSpreadsheet();
		const fuzzySheet = ss.getSheetByName('FuzzyDB');
		if (!fuzzySheet)
		{
			console.warn('FuzzyDB sheet not found.');
			return;
		}

		// 3. Get existing names from FuzzyDB!$A:$A
		const lastRow = fuzzySheet.getLastRow();
		const existingNames = new Set;

		if (lastRow > 0)
		{
			const values = fuzzySheet.getRange(1, 1, lastRow, 1).getValues();
			for (let i = 0; i < values.length; i++)
			{
				existingNames.add(values[i][0]);
			}
		}

		// 4. Identify new values
		const newEntries = [];
		const seenInBatch = new Set;

		for (let i = 1; i < acStructuresData.length; i++)
		{
			const row = acStructuresData[i];
			const nom = row[nomIdx];
			const code = row[codeIdx];

			if (nom && !existingNames.has(nom) && !seenInBatch.has(nom))
			{
				newEntries.push([nom, code]);
				seenInBatch.add(nom);
			}
		}

		// 5. Append new entries
		if (newEntries.length > 0)
		{
			fuzzySheet.getRange(lastRow + 1, 1, newEntries.length, 2).setValues(newEntries);
		}
	}

	/**
	 * Creates a new hidden sheet in the active spreadsheet using the Advanced Sheets API.
	 *
	 * @param {string} sheetName The name of the new sheet.
	 * @returns {GoogleAppsScript.Spreadsheet.Sheet} The newly created hidden sheet.
	 */
	static createHiddenSheet(sheetName)
	{
		const ss   = SpreadsheetApp.getActiveSpreadsheet();
		const ssId = ss.getId();

		const resource = {
			requests: [{
				addSheet: {
					properties: {
						title: sheetName,
						hidden: true
					}
				}
			}]
		};

		const response = Sheets.Spreadsheets.batchUpdate(resource, ssId);
		const newSheetId = response.replies[0].addSheet.properties.sheetId;

		return ss.getSheetByName(sheetName);
	}

	/**
	 * Imports an XLSX file from base64 data into a new temporary sheet.
	 *
	 * @param {Object} fileData The file data object.
	 * @param {string} fileData.name The name of the file.
	 * @param {string} fileData.mimeType The MIME type of the file.
	 * @param {string} fileData.data The base64 encoded data of the file.
	 */
	static getDataFromXLSXFile(fileData)
	{
		console.time('getDataFromXLSXFile');
		let tmpSheetFile;

		try
		{
			// 1. Decode base64 and create a blob
			console.time('DecodeAndBlob');
			const decodedData = Utilities.base64Decode(fileData.data);
			const blob = Utilities.newBlob(decodedData, fileData.mimeType, fileData.name);
			console.timeEnd('DecodeAndBlob');

			// 2. Define resource for conversion and create the Google Sheet directly
			console.time('DriveCreate');
			const resource = {
				title: fileData.name.split('.').slice(0, -1).join('.'), // Use file name for the new Sheet's title
				mimeType: MimeType.GOOGLE_SHEETS,
			};
			tmpSheetFile = Drive.Files.create(resource, blob);
			console.timeEnd('DriveCreate');

			// 3. Copy data from the new sheet to the active spreadsheet
			console.time('ReadSheetData');
			const tmpSpreadsheet = SpreadsheetApp.openById(tmpSheetFile.id);
			const tmpSheet       = tmpSpreadsheet.getSheets()[0];
			const data           = tmpSheet.getDataRange().getValues();
			console.timeEnd('ReadSheetData');

			if (data.length === 0)
			{
				throw new Error('The selected XLSX file is empty or could not be read.');
			}

			return data;
		}
		finally
		{
			// 4. Cleanup: Delete the temporary Google Sheet
			if (tmpSheetFile && tmpSheetFile.id)
			{
				console.time('DriveCleanup');
				try
				{
					Drive.Files.remove(tmpSheetFile.id);
				}
				catch (e)
				{
					console.error('Cleanup Error: Failed to remove temporary file with ID ' + tmpSheetFile.id + '. Error: ' + e.message);
				}
				console.timeEnd('DriveCleanup');
			}
			console.timeEnd('getDataFromXLSXFile');
		}
	}
}