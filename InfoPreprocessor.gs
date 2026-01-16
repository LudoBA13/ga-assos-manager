/**
 * @file This file contains the InfoPreprocessor for normalizing "Informations complémentaires".
 */

const InfoPreprocessor = {
	/**
	 * Preprocesses the "Informations complémentaires" field to normalize human-readable data
	 * into machine-parsable tags.
	 * 
	 * @param {string} text The raw text from the info field.
	 * @returns {string} The processed text with tags.
	 */
	process: (text) =>
	{
		if (!text)
		{
			return '';
		}

		let processed = text;

		// Rule: /UD\s*:\s*([0-9])\W*/ -> "$ud:$1$"
		// Expands "UD: 1" or "UD : 5." into "$ud:1$" or "$ud:5$"
		processed = processed.replace(/UD\s*:\s*([0-9])\W*/gi, '$$ud:$1$$');

		return processed;
	}
};
