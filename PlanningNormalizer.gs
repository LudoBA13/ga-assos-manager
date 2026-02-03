/**
 * @file This file contains the PlanningNormalizer class for normalizing user input.
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

class PlanningNormalizer
{
	/**
	 * Normalizes a user-supplied schedule string to be compatible with parseHumanReadable.
	 *
	 * Target format for each entry: "Week Day Time : Product, Product."
	 * Example: "1er lundi 8h30 : Frais, Sec."
	 *
	 * @param {string} input The raw user input.
	 * @returns {string} The normalized string.
	 */
	static normalize(input)
	{
		if (!input)
		{
			return '';
		}

		let text = input.toString();

		// 1. Unify whitespace and handle newlines
		// Use double backslash for literal backslash in regex source string
		text = text.replace(/[\r\n]+/g, ' . '); // Treat newlines as potential separators
		text = text.replace(/\s+/g, ' ').trim();

		// 2. Normalize Weeks (1er, 2e, 3e, 4e, Tous les)
		// 1er
		text = text.replace(/\b1\s*(?:er|ere|ère|ier)\b/gi, '1er');
		// 2e-4e
		text = text.replace(/\b([2-4])\s*(?:e|eme|ème|èm)\b/gi, '$1e');
		// Handle "4 mercredi" -> "4e mercredi" (implicit ordinal before day)
		text = text.replace(/\b([2-4])\s+(?=(?:lun|mar|mercre|jeu|vendre)di)/gi, '$1e ');
		text = text.replace(/\b1\s+(?=(?:lun|mar|mercre|jeu|vendre)di)/gi, '1er ');
		// Tous les
		text = text.replace(/\bto[iu][st]\s*les?\b/gi, 'Tous les');

		// 3. Normalize Days
		text = text.replace(/\b((?:lun|mar|mercre|jeu|vendre)di)s?\b/gi, '$1');

		// 4. Normalize Times (8h30, 10h, 14h)
		// Fix missing space between day and time (e.g., "mardi8h30")
		text = text.replace(/([a-z])(0?8|1[04])/gi, '$1 $2');

		// 8h30: match 08 or 8 followed by optional h/H/: and optional 2 digits
		text = text.replace(/\b0?8(?:[:hH]\d{0,2}|[0-5]\d)?\b/g, '8h30');
		// 10h
		// 14h
		text = text.replace(/\b(1[04])(?:[:hH]\d{0,2}|[0-5]\d)?\b/g, '$1h');

		// 5. Normalize Products
		text = text.replace(/\bfrais\b/gi, 'Frais');
		text = text.replace(/\bsec[s.]?\b/gi, 'Sec'); // Consumes following dot or 's'
		text = text.replace(/\bsurgel[ée]s?\b/gi, 'Surgelé');

		// 6. Fix structure and separators

		// Ensure colon after time
		text = text.replace(/(8h30|10h|14h)\s*[:.]?\s*/g, '$1 : ');

		// Replace "+" with comma
		text = text.replace(/\+/g, ', ');

		// Replace ALL periods with commas initially to avoid breaking mid-sentence
		// (e.g. "Sec. Frais" -> "Sec, Frais")
		// We will re-insert periods for entry separation later.
		text = text.replace(/\./g, ', ');

		// Insert periods before new entries (Week keywords)
		// Look for pattern: [Separator] [WeekKeyword]
		// Week keywords: 1er, 2e, 3e, 4e, Tous les
		text = text.replace(/,?\s*\b(1er|[2-4]e|Tous les)\b/g, '. $1');

		// Ensure products are comma separated if spaces are used
		// e.g. "Frais Sec" -> "Frais, Sec"
		// Run twice to handle "A B C" -> "A, B, C"
		const productRegex = /(Frais|Sec|Surgelé)\s+(Frais|Sec|Surgelé)/g;
		text = text.replace(productRegex, '$1, $2');
		text = text.replace(productRegex, '$1, $2');

		// 7. Final Cleanup
		// Ensure ends with period
		if (!text.endsWith('.'))
		{
			text += '.';
		}

		// Fix double separators
		text = text.replace(/,\s*,/g, ', ');
		text = text.replace(/\.\s*\./g, '. ');
		text = text.replace(/:\s*[:,]/g, ': '); // Colon followed by comma
		text = text.replace(/,\s*\./g, '.'); // Comma followed by dot

		// Remove leading period if any (from " . 1er")
		text = text.replace(/^\.\s*/, '');

		// Remove space before period
		text = text.replace(/\s+\./g, '.');

		// Normalize spaces again
		text = text.replace(/\s+/g, ' ').trim();
		// Ensure space after punctuation
		text = text.replace(/([.,:])(?=[^\s])/g, '$1 ');

		return text;
	}

	/**
	 * Normalizes a 2D array (range) of planning schedules.
	 * This function can be used as a custom function in Google Sheets.
	 * @customfunction
	 * @param {Array<Array<string>>} range The 2D array (range) of planning schedules.
	 * @returns {Array<Array<string>>} A 2D array with the normalized planning schedules.
	 */
	static normalizeRange(range)
	{
		if (!Array.isArray(range) || range.length === 0)
		{
			return [['']];
		}

		return range.map(row =>
		{
			if (Array.isArray(row))
			{
				return row.map(cell => PlanningNormalizer.normalize(cell));
			}
			else
			{
				return [PlanningNormalizer.normalize(row)];
			}
		});
	}
}

/**
 * Normalizes a range of planning schedules.
 * @customfunction
 */
const NORMALIZE_PLANNING = (range) => PlanningNormalizer.normalizeRange(range);