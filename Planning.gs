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
		
		// Ensure the target range has the same dimensions as the template
		const numRows = tplRange.getNumRows();
		const numCols = tplRange.getNumColumns();
		
		const dstRange = trgRange.getSheet().getRange(
			trgRange.getRow(),
			trgRange.getColumn(),
			numRows,
			numCols
		);

		tplRange.copyTo(dstRange, SpreadsheetApp.CopyPasteType.PASTE_ALL, false);
		tplRange.copyTo(dstRange, SpreadsheetApp.CopyPasteType.PASTE_COLUMN_WIDTHS, false);

		const tplSheet = tplRange.getSheet();
		const dstSheet = dstRange.getSheet();
		const tplRow   = tplRange.getRow();
		const dstRow   = dstRange.getRow();

		for (let i = 0; i < numRows; i++)
		{
			const height = tplSheet.getRowHeight(tplRow + i);
			dstSheet.setRowHeight(dstRow + i, height);
		}
	}
}
