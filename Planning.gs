class Planning
{
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