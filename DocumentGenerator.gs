/**
 * A class for generating and manipulating Google Documents.
 */
class DocumentGenerator
{
	/** @type {GoogleAppsScript.Drive.File} */
	#templateFile;

	/** @type {GoogleAppsScript.Document.Document} */
	#templateDocument;

	/** @type {GoogleAppsScript.Document.Document} */
	#outputDocument;

	/** @type {string} */
	#placeholderStart;

	/** @type {string} */
	#placeholderEnd;

	/** @type {RegExp} */
	#placeholderRegex;

	/** @type {string} */
	#escapedPlaceholderStart;

	/** @type {string} */
	#escapedPlaceholderEnd;

	/** @type {Set<string>} */
	#placeholders;

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
			this.#templateFile = DriveApp.getFileById(doc.getId());
		}
		else
		{
			this.#templateFile = DriveApp.getFileById(docUrlOrId);
		}

		this.#templateDocument = DocumentApp.openById(this.#templateFile.getId());

		this.#placeholderStart = placeholderStart;
		this.#placeholderEnd = placeholderEnd;

		this.#escapedPlaceholderStart = this.#escapeRegExp(placeholderStart);
		this.#escapedPlaceholderEnd = this.#escapeRegExp(placeholderEnd);

		this.#placeholderRegex = new RegExp(this.#escapedPlaceholderStart + '(.*?)' + this.#escapedPlaceholderEnd, 'g');

		this.#placeholders = this.#getPlaceholders();
	}

	/**
	 * Escapes special characters in a string for use in a regular expression.
	 * @param {string} str The string to escape.
	 * @return {string} The escaped string.
	 */
	#escapeRegExp(str)
	{
		return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
	}

	/**
	 * Returns the currently managed template file.
	 * @return {GoogleAppsScript.Drive.File} The Google Drive File.
	 */
	getTemplateFile()
	{
		return this.#templateFile;
	}

	/**
	 * Returns the ID of the currently managed template file.
	 * @return {string} The ID of the Google Drive File.
	 */
	getTemplateFileId()
	{
		return this.#templateFile.getId();
	}

	/**
	 * Returns all unique placeholder keys found in the document.
	 * @return {Set<string>} A set of unique placeholder keys.
	 */
	getAllPlaceholders()
	{
		return this.#placeholders;
	}

	/**
	 * Replaces all occurrences of placeholder keys with given values in the managed document.
	 * @param {Map<string, string>} vars A map of key-value pairs for placeholder replacement.
	 */
	#replacePlaceholders(vars)
	{
		if (!this.#outputDocument)
		{
			throw new Error("Output document not initialized. Call generateDocument() first.");
		}

		const body = this.#outputDocument.getBody();
		for (const [key, value] of vars)
		{
			if (this.#placeholders.has(key))
			{
				const specificPlaceholderPattern =
					this.#escapedPlaceholderStart +
					this.#escapeRegExp(key) +
					this.#escapedPlaceholderEnd;
				body.replaceText(specificPlaceholderPattern, value);
			}
		}
	}

	/**
	 * Collects all unique placeholder keys from the document.
	 * @return {Set<string>} A set of unique placeholder keys.
	 */
	#getPlaceholders()
	{
		const text = this.#templateDocument.getBody().getText();
		const matches = text.matchAll(this.#placeholderRegex);
		return new Set(Array.from(matches, match => match[1]));
	}

	/**
	 * Generates a new document from the template, replacing placeholders with the provided variables.
	 * @param {Iterable<[string, string]>} vars An iterable of key-value pairs for placeholder replacement.
	 * @param {string=} documentName Optional. The name for the new document. If not provided, a default name will be used.
	 * @param {string=} destinationFolderId Optional. The ID of the destination folder. If provided, the new document will be moved to this folder.
	 * @return {GoogleAppsScript.Document.Document} The newly generated document.
	 */
	generateDocument(vars, documentName, destinationFolderId)
	{
		// 1. Create a copy
		const finalName = documentName || `Copy of ${this.#templateFile.getName()} - ${(new Date).toLocaleString()}`;
		let newFile;

		if (destinationFolderId)
		{
			const destinationFolder = DriveApp.getFolderById(destinationFolderId);
			newFile = this.#templateFile.makeCopy(finalName, destinationFolder);
		}
		else
		{
			newFile = this.#templateFile.makeCopy(finalName);
		}

		this.#outputDocument = DocumentApp.openById(newFile.getId());
		this.#replacePlaceholders(vars);
		this.#outputDocument.getBody().replaceText(this.#placeholderRegex.source, '');
		this.#saveAndCloseDocument();

		// 4. Return the new document, reopened to ensure it's fresh.
		return DocumentApp.openById(newFile.getId());
	}

	/**
	 * Saves and closes the currently managed document.
	 */
	#saveAndCloseDocument()
	{
		if (this.#outputDocument)
		{
			this.#outputDocument.saveAndClose();
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