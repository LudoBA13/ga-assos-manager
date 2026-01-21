/**
 * A class for generating and manipulating Google Documents.
 */
class DocumentGenerator
{
	/**
	 * @param {string} docUrlOrId The URL or ID of the Google Document.
	 * @param {string=} placeholderStart Optional. The starting delimiter for placeholders. Defaults to '<<'.
	 * @param {string=} placeholderEnd Optional. The ending delimiter for placeholders. Defaults to '>>'.
	 */
	constructor(docUrlOrId, placeholderStart = '<<', placeholderEnd = '>>')
	{
		if (docUrlOrId.startsWith('https://'))
		{
			const doc = DocumentApp.openByUrl(docUrlOrId);
			this._templateFile = DriveApp.getFileById(doc.getId());
		}
		else
		{
			this._templateFile = DriveApp.getFileById(docUrlOrId);
		}

		this._templateDocument = DocumentApp.openById(this._templateFile.getId());

		this._placeholderStart = placeholderStart;
		this._placeholderEnd = placeholderEnd;

		this._escapedPlaceholderStart = this._escapeRegExp(placeholderStart);
		this._escapedPlaceholderEnd = this._escapeRegExp(placeholderEnd);

		this._placeholderRegex = new RegExp(this._escapedPlaceholderStart + '(.*?)' + this._escapedPlaceholderEnd, 'g');

		this._placeholders = this._getPlaceholders();
		
		/** @type {GoogleAppsScript.Document.Document} */
		this._outputDocument = null;
	}

	/**
	 * Escapes special characters in a string for use in a regular expression.
	 * @param {string} str The string to escape.
	 * @return {string} The escaped string.
	 */
	_escapeRegExp(str)
	{
		return str.replace(/[.*+?^${}()|[\\]/g, '\\$&'); // $& means the whole matched string
	}

	/**
	 * Returns the currently managed template file.
	 * @return {GoogleAppsScript.Drive.File} The Google Drive File.
	 */
	getTemplateFile()
	{
		return this._templateFile;
	}

	/**
	 * Returns the ID of the currently managed template file.
	 * @return {string} The ID of the Google Drive File.
	 */
	getTemplateFileId()
	{
		return this._templateFile.getId();
	}

	/**
	 * Returns all unique placeholder keys found in the document.
	 * @return {Set<string>} A set of unique placeholder keys.
	 */
	getAllPlaceholders()
	{
		return this._placeholders;
	}

	/**
	 * Replaces all occurrences of placeholder keys with given values in the managed document.
	 * @param {Map<string, any>} vars A map of key-value pairs for placeholder replacement.
	 */
	_replacePlaceholders(vars)
	{
		if (!this._outputDocument)
		{
			throw new Error("Output document not initialized. Call generateDocument() first.");
		}

		const body = this._outputDocument.getBody();
		for (const [key, value] of vars)
		{
			if (!this._placeholders.has(key))
			{
				continue;
			}

			const specificPlaceholderPattern =
				this._escapedPlaceholderStart +
				this._escapeRegExp(key) +
				this._escapedPlaceholderEnd;
			body.replaceText(specificPlaceholderPattern, String(value));
		}
	}

	/**
	 * Collects all unique placeholder keys from the document.
	 * @return {Set<string>} A set of unique placeholder keys.
	 */
	_getPlaceholders()
	{
		const text = this._templateDocument.getBody().getText();
		const matches = text.matchAll(this._placeholderRegex);
		return new Set(Array.from(matches, match => match[1]));
	}

	/**
	 * Generates a new document from the template, replacing placeholders with the provided variables.
	 * @param {Iterable<[string, string]>} vars An iterable of key-value pairs for placeholder replacement.
	 * @param {string} documentName The name for the new document.
	 * @param {string} destinationFolderId The ID of the destination folder.
	 * @return {GoogleAppsScript.Document.Document} The newly generated document.
	 */
	generateDocument(vars, documentName, destinationFolderId)
	{
		if (!documentName || !destinationFolderId)
		{
			throw new Error("documentName and destinationFolderId are required.");
		}

		const destinationFolder = DriveApp.getFolderById(destinationFolderId);
		const existingFiles = destinationFolder.getFilesByName(documentName);

		while (existingFiles.hasNext())
		{
			existingFiles.next().setTrashed(true);
		}

		const newFile = this._templateFile.makeCopy(documentName, destinationFolder);

		this._outputDocument = DocumentApp.openById(newFile.getId());
		this._replacePlaceholders(vars);
		this._outputDocument.getBody().replaceText(this._placeholderRegex.source, '');
		this._saveAndCloseDocument();

		// Return the new document, reopened to ensure it's fresh.
		return DocumentApp.openById(newFile.getId());
	}

	/**
	 * Saves and closes the currently managed document.
	 */
	_saveAndCloseDocument()
	{
		if (this._outputDocument)
		{
			this._outputDocument.saveAndClose();
		}
	}

	/**
	 * Deletes a document from Google Drive.
	 * @param {string} documentId The ID of the document to delete.
	 */
	static deleteDocument(documentId)
	{
		DriveApp.getFileById(documentId).setTrashed(true);
	}
}