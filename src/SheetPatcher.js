/**
 * SheetPatcher Class
 * Handles structural alignment, column recovery, and granular minimal-diff updates.
 */
class SheetPatcher
{
	constructor(sheet)
	{
		this.sheet = sheet;
	}

	/**
	 * Aligns sheet structure and replaces content with newData.
	 */
	replace(newData)
	{
		if (!newData || newData.length === 0 || !newData[0])
		{
			throw new Error("Invalid Input: newData array is null, empty, or malformed.");
		}

		// 1. Structural Alignment
		this._alignRows(newData);
		this._alignColumns(newData[0]);

		// Ensure structural changes are committed before reading current state
		SpreadsheetApp.flush();

		const numRows = newData.length;
		const numCols = newData[0].length;

		// 2. Recovery & Patching
		this._recoverEmptyColumns(newData, numRows, numCols);

		const range = this.sheet.getRange(1, 1, numRows, numCols);
		const existingData = range.getValues();

		for (let r = 0; r < numRows; r++)
		{
			this._patchRow(r + 1, newData[r], existingData[r]);
		}

		// 3. Final Verification
		if (this.matches(newData))
		{
			return;
		}

		console.warn("Partial patch failed validation. Performing full overwrite.");
		range.setValues(newData);
		if (this.matches(newData))
		{
			return;
		}

		throw new Error("Critical: Sheet content does not match input even after full overwrite.");
	}

	/**
	 * Patches only the cells within a row that have changed.
	 * @private
	 */
	_patchRow(rowNumber, newDataRow, existingDataRow)
	{
		// Fast check if the row is identical
		if (this._rangesMatch(newDataRow, existingDataRow))
		{
			return;
		}

		let startCol = -1;

		for (let c = 0; c < newDataRow.length; c++)
		{
			const changed = this._compare(newDataRow[c], existingDataRow[c]);

			if (startCol === -1)
			{
				if (!changed)
				{
					continue;
				}
				startCol = c;
			}

			if (!changed || c === newDataRow.length - 1)
			{
				const endCol = changed ? c : c - 1;
				const width = endCol - startCol + 1;
				const patchValues = [newDataRow.slice(startCol, endCol + 1)];

				this.sheet.getRange(rowNumber, startCol + 1, 1, width).setValues(patchValues);
				startCol = -1;
			}
		}
	}

	/**
	 * Detects columns effectively empty in the sheet but populated in newData.
	 * @private
	 */
	_recoverEmptyColumns(newData, numRows, numCols)
	{
		for (let c = 0; c < numCols; c++)
		{
			const sheetHeader = this.sheet.getRange(1, c + 1).getValue();
			const newHeader = newData[0][c];

			if (sheetHeader !== "" || newHeader === "")
			{
				continue;
			}

			const columnRange = this.sheet.getRange(1, c + 1, numRows, 1);
			const isSheetColumnEmpty = columnRange.getValues().every(row => row[0] === "");

			if (!isSheetColumnEmpty)
			{
				continue;
			}

			columnRange.setValues(newData.map(row => [row[c]]));
		}
	}

	/**
	 * Adjusts rows based on the first column of newData.
	 * @private
	 */
	_alignRows(newData)
	{
		const existingRows = this.sheet.getRange(1, 1, this.sheet.getLastRow(), 1).getValues().map(r => r[0]);
		const newRows = newData.map(r => r[0]);
		
		if (this._rangesMatch(newRows, existingRows))
		{
			return;
		}

		let sheetIndex = 1;
		let dataIndex = 0;

		while (dataIndex < newData.length)
		{
			const newValue = newData[dataIndex][0];
			let currentSheetValue = null;
			if (sheetIndex <= this.sheet.getLastRow())
			{
				currentSheetValue = this.sheet.getRange(sheetIndex, 1).getValue();
			}

			if (this._compare(newValue, currentSheetValue) === false)
			{
				sheetIndex++;
				dataIndex++;
				continue;
			}

			const remainsInData = newData.slice(dataIndex).some(row => !this._compare(row[0], currentSheetValue));

			if (!remainsInData && sheetIndex <= this.sheet.getLastRow())
			{
				this.sheet.deleteRow(sheetIndex);
				continue;
			}

			this.sheet.insertRowBefore(sheetIndex);
			sheetIndex++;
			dataIndex++;
		}

		const finalSheetRows = this.sheet.getLastRow();
		if (finalSheetRows > newData.length)
		{
			this.sheet.deleteRows(newData.length + 1, finalSheetRows - newData.length);
		}
	}

	/**
	 * Adjusts columns based on the first row of newData.
	 * @private
	 */
	_alignColumns(newHeaderRow)
	{
		const existingCols = this.sheet.getRange(1, 1, 1, this.sheet.getLastColumn()).getValues()[0];
		
		if (this._rangesMatch(newHeaderRow, existingCols))
		{
			return;
		}

		let sheetIndex = 1;
		let dataIndex = 0;

		while (dataIndex < newHeaderRow.length)
		{
			const newValue = newHeaderRow[dataIndex];
			let currentSheetValue = null;

			if (sheetIndex <= this.sheet.getLastColumn())
			{
				currentSheetValue = this.sheet.getRange(1, sheetIndex).getValue();
			}

			if (this._compare(newValue, currentSheetValue) === false)
			{
				sheetIndex++;
				dataIndex++;
				continue;
			}

			const remainsInData = newHeaderRow.slice(dataIndex).some(val => !this._compare(val, currentSheetValue));

			if (!remainsInData && sheetIndex <= this.sheet.getLastColumn())
			{
				this.sheet.deleteColumn(sheetIndex);
				continue;
			}

			this.sheet.insertColumnBefore(sheetIndex);
			sheetIndex++;
			dataIndex++;
		}

		const finalSheetCols = this.sheet.getLastColumn();
		if (finalSheetCols > newHeaderRow.length)
		{
			this.sheet.deleteColumns(newHeaderRow.length + 1, finalSheetCols - newHeaderRow.length);
		}
	}

	/**
	 * Checks if the entire sheet matches the provided 2D array.
	 */
	matches(data)
	{
		const numRows = data.length;
		const numCols = data[0].length;
		if (this.sheet.getLastRow() !== numRows || this.sheet.getLastColumn() !== numCols)
		{
			return false;
		}

		const currentData = this.sheet.getRange(1, 1, numRows, numCols).getValues();

		for (let r = 0; r < numRows; r++)
		{
			const match = this._rangesMatch(data[r], currentData[r]);
			if (!match)
			{
				return false;
			}
		}
		return true;
	}

	/**
	 * Compares two ranges for equality using JSON.stringify.
	 * @private
	 */
	_rangesMatch(range1, range2)
	{
		return JSON.stringify(range1) === JSON.stringify(range2);
	}

	/**
	 * Internal comparison logic.
	 * @private
	 */
	_compare(val1, val2)
	{
		if (val1 instanceof Date && val2 instanceof Date)
		{
			return val1.getTime() !== val2.getTime();
		}
		return val1 !== val2;
	}
}