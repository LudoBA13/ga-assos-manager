/**
 * @file This file contains the Planning class for managing planning sheets.
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

const ICON_TIMESLOT_ADD    = '\u2795';
const ICON_TIMESLOT_DELETE = '\u274C';

class Planning
{
	static hasDataValidation(sheet, row, col)
	{
		const range = sheet.getRange(row, col);

		// If the cell is part of a merge, checking the specific cell might return null
		// even if the merged range has validation. We must check the top-left cell.
		const cell = (range.isPartOfMerge()) ? range.getMergedRanges()[0] : range;

		return cell.getDataValidation() !== null;
	}

	static isPlanning(cell)
	{
		const cellCol = cell.getColumn();
		const cellRow = cell.getRow();
		const sheet   = cell.getSheet();

		// Locate top left corner of the planning (headers have no validation)
		let col = cellCol;
		while (col > 0 && Planning.hasDataValidation(sheet, cellRow, col))
		{
			--col;
		}

		let row = cellRow;
		while (row > 0 && Planning.hasDataValidation(sheet, row, cellCol))
		{
			--row;
		}

		return (col > 0 && row > 0) && sheet.getRange(row, col).getValue() === 'tplPlanning';
	}

	static getCellInfo(cell)
	{
		const info = {
			isPlanning:          false,
			isTimeslot:          false,
			isProducts:          false,
			isFullTimeslot:      false,
			isMorningTimeslot:   false,
			isAfternoonTimeslot: false
		};

		const criteria = cell.getDataValidation()?.getCriteriaType();
		if (criteria !== SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST)
		{
			return info;
		}

		info.isPlanning = Planning.isPlanning(cell);
		if (!info.isPlanning)
		{
			return info;
		}

		const timeslotRegexp = /(?:08:3|1[04]:0)0$/;
		const values = cell.getDataValidation().getCriteriaValues()[0];
		if (timeslotRegexp.test(values?.[0]))
		{
			info.isTimeslot = true;
			if (values[values.length - 1].startsWith(ICON_TIMESLOT_ADD))
			{
				// The last option of a full timeslot starts with U+2795
				info.isFullTimeslot = true;
			}
			else if (values.length >= 3)
			{
				info.isMorningTimeslot = true;
			}
			else
			{
				// Only one time slot in the afternoon
				info.isAfternoonTimeslot = true;
			}
		}

		const productsRegexp = /^[\u2744\u{1F969}\u{1F4E6}]/u;
		if (productsRegexp.test(values?.[0]))
		{
			info.isProducts = true;
		}

		return info;
	}

	static initUI(address)
	{
		const ss = SpreadsheetApp.getActiveSpreadsheet();
		const tplRange = ss.getRangeByName('tplPlanning');

		if (!tplRange)
		{
			throw new Error('Named range "tplPlanning" not found.');
		}

		const trgRange = ss.getRange(address);
		const sheet    = trgRange.getSheet();
		const startRow = trgRange.getRow();
		const startCol = trgRange.getColumn();

		const numRows = tplRange.getNumRows();
		const numCols = tplRange.getNumColumns();

		sheet.getRange(startRow, startCol, numRows, numCols).insertCells(SpreadsheetApp.Dimension.ROWS);

		// Destination range at the original coordinates (now empty)
		const dstRange = sheet.getRange(startRow, startCol);

		// Decompose copyTo to avoid "Unexpected error" with PASTE_ALL
		tplRange.copyTo(dstRange, SpreadsheetApp.CopyPasteType.PASTE_VALUES, false);
		tplRange.copyTo(dstRange, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
		tplRange.copyTo(dstRange, SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
		tplRange.copyTo(dstRange, SpreadsheetApp.CopyPasteType.PASTE_CONDITIONAL_FORMATTING, false);
		tplRange.copyTo(dstRange, SpreadsheetApp.CopyPasteType.PASTE_COLUMN_WIDTHS, false);

		const tplSheet = tplRange.getSheet();
		const tplRow   = tplRange.getRow();

		for (let i = 0; i < numRows; i++)
		{
			const height = tplSheet.getRowHeight(tplRow + i);
			sheet.setRowHeight(startRow + i, height);
		}
	}
}