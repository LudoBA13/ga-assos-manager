/**
 * @file This file contains the InfoPreprocessor for normalizing "Informations complémentaires".
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

		// Normalize superscript letters for "e" and "r"
		processed = processed.replaceAll("\u1D49", 'e');
		processed = processed.replaceAll("\u02B3", 'r');

		// Rule: /UD\s*:\s*(\d+)\W*/ -> "$ud:$1$"
		// Expands "UD: 1" or "UD : 5." into "$ud:1$" or "$ud:5$"
		processed = processed.replace(/UD\s*:\s*(\d+)\W*/gi, '$$ud:$1$$');

		// Rule: /(\d+)\s*UD\W*/ -> "$ud:$1$"
		// Expands "100 UD." into "$ud:100$"
		processed = processed.replace(/(\d+)\s*UD\W*/gi, '$$ud:$1$$');

		// Rule: /Planning\s*:((?:\s*[a-z ]+[0-9]+h[0-9]*\s*:\s*[^.]+\.)+)/i -> "$planning:<encoded>$"
		// Expands "Planning: Tous les lundis 8h30: Frais." into "$planning:0LuMdFr$"
		// We use a callback to encode the captured schedule string.
		processed = processed.replace(/Planning\s*:((?:\s*[0-4]*[a-z ]+[0-9]+h[0-9]*\s*:\s*[^.]+\.)+)/gi, (match, p1) =>
		{
			const encoded = parseHumanReadable(p1.trim());
			return `$planning:${encoded}$`;
		});

		return processed;
	}
};