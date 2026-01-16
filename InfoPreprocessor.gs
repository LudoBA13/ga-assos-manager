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

		// Rule: /UD\s*:\s*(\d+)\W*/ -> "$ud:$1$"
		// Expands "UD: 1" or "UD : 5." into "$ud:1$" or "$ud:5$"
		processed = processed.replace(/UD\s*:\s*(\d+)\W*/gi, '$$ud:$1$$');

		// Rule: /(\d+)\s*UD\W*/ -> "$ud:$1$"
		// Expands "100 UD." into "$ud:100$"
		processed = processed.replace(/(\d+)\s*UD\W*/gi, '$$ud:$1$$');

		// Rule: /Planning\s*:((?:\s*[a-z ]+[0-9]+h[0-9]*\s*:\s*[^.]+\.)+)/i -> "$planning:<encoded>$"
		// Expands "Planning: Tous les lundis 8h30: Frais." into "$planning:0LuMdFr$"
		// We use a callback to encode the captured schedule string.
		processed = processed.replace(/Planning\s*:((?:\s*[0-9]*[a-z ]+[0-9]+h[0-9]*\s*:\s*[^.]+\.)+)/gi, (match, p1) => {
			const encoded = parseHumanReadable(p1.trim());
			return `$planning:${encoded}$`;
		});

		return processed;
	}
};