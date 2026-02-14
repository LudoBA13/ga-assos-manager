/**
 * @file This file contains the DocumentGenerator class for manipulating Google Docs.
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
		/** @type {string} */
		this._outputDocumentId = null;

		try
		{
			const fileInfo = Drive.Files.get(this._templateFile.getId(),
			{ fields: 'headRevisionId', supportsAllDrives: true });
			this._templateHeadRevisionId = fileInfo.headRevisionId;
		}
		catch (e)
		{
			console.warn('Could not fetch template revision ID:', e);
			this._templateHeadRevisionId = 'unknown-' + Math.floor(Math.random() * 1000000);
		}

		this._templateId = `${this._templateFile.getId()}:${this._templateHeadRevisionId}`;
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
			throw new Error('Output document not initialized. Call generateDocument() first.');
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
	 * Returns the ID of the last generated document.
	 * @return {string|null} The ID of the document or null.
	 */
	getOutputDocumentId()
	{
		return this._outputDocumentId;
	}

	/**
	 * Returns the last generated document.
	 * @return {GoogleAppsScript.Document.Document} The last generated document.
	 */
	getOutputDocument()
	{
		if (!this._outputDocument && this._outputDocumentId)
		{
			this._outputDocument = DocumentApp.openById(this._outputDocumentId);
		}
		return this._outputDocument;
	}

	/**
	 * Generates a new document from the template, replacing placeholders with the provided variables.
	 * @param {Iterable<[string, string]>} vars An iterable of key-value pairs for placeholder replacement.
	 * @param {string} documentName The name for the new document.
	 * @param {string} destinationFolderId The ID of the destination folder.
	 */
	generateDocument(vars, documentName, destinationFolderId)
	{
		this._outputDocument = null;
		this._outputDocumentId = null;
		if (!documentName || !destinationFolderId)
		{
			throw new Error('documentName and destinationFolderId are required.');
		}

		vars = this._filterVars(vars);

		// Prepare metadata for comparison
		const varsObject = Object.fromEntries(vars);
		const metadataHash = this._computeMetadataHash({
			templateId: this._templateId,
			vars: varsObject
		});

		const destinationFolder = DriveApp.getFolderById(destinationFolderId);
		const existingFiles = destinationFolder.getFilesByName(documentName);
		let fileToReturn = null;

		while (existingFiles.hasNext())
		{
			const file = existingFiles.next();

			// Check if we can reuse this file
			if (!fileToReturn)
			{
				try
				{
					const fileInfo = Drive.Files.get(file.getId(),
					{ fields: 'appProperties', supportsAllDrives: true });
					if (fileInfo.appProperties && fileInfo.appProperties.ga_metadata_hash === metadataHash)
					{
						console.log(`Skipping generation for "${documentName}": cache match found.`);
						fileToReturn = file;
						continue; // Keep this file, don't trash it
					}
				}
				catch (e)
				{
					console.warn('Failed to read file metadata for caching check:', e);
				}
			}

			file.setTrashed(true);
		}

		if (fileToReturn)
		{
			this._outputDocumentId = fileToReturn.getId();
			return;
		}

		const copyResource = {
			name: documentName,
			parents: [destinationFolderId],
			appProperties: { ga_metadata_hash: metadataHash }
		};
		const newFile = Drive.Files.copy(copyResource, this._templateFile.getId(),
		{ supportsAllDrives: true });
		this._outputDocumentId = newFile.id;

		this._outputDocument = DocumentApp.openById(this._outputDocumentId);
		this._replacePlaceholders(vars);
		this._outputDocument.getBody().replaceText(this._placeholderRegex.source, '');
		this._saveAndCloseDocument();
		this._outputDocument = null;
	}

	/**
	 * Computes a SHA-256 hash of the metadata object.
	 * @param {Object} metadata The metadata object.
	 * @return {string} The computed hash.
	 * @private
	 */
	_computeMetadataHash(metadata)
	{
		const json = JSON.stringify(metadata);
		const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, json);
		return rawHash.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
	}

	/**
	 * Filters variables: keeps only non-empty values that are present in the template.
	 * @param {Iterable<[string, any]>} vars The variables to filter.
	 * @return {Map<string, any>} The filtered variables.
	 * @private
	 */
	_filterVars(vars)
	{
		const filteredVars = new Map;
		for (const [key, value] of vars)
		{
			if (value !== '' && this._placeholders.has(key))
			{
				filteredVars.set(key, value);
			}
		}
		return filteredVars;
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