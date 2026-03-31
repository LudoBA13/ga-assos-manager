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
	 * Normalizes a natural language planning string to be compatible with parseFlexiblePlanning.
	 * It expands multiple weeks/days and handles missing product types by assuming all three.
	 *
	 * @param {string} input The raw natural language input.
	 * @returns {string} The normalized string.
	 */
	static normalizeNaturalLanguagePlanning(input)
	{
		if (!input)
		{
			return '';
		}

		let text = input.toString().trim();

		// Handle "livraison" special case
		if (/livraison/i.test(text))
		{
			return '';
		}

		// Skip unparseable placeholders
		if (/à définir|Enlévement/i.test(text))
		{
			return '';
		}

		// 1. Pre-normalize superscripts and common separators
		text = text.replaceAll('\u1D49', 'e').replaceAll('\u02B3', 'r');
		
		// Handle typos and abbreviations found in CSV
		text = text.replace(/\bmercerdi\b/gi, 'mercredi');
		text = text.replace(/\bmerc\.?\b/gi, 'mercredi');
		text = text.replace(/\blun\.?\b/gi, 'lundi');
		text = text.replace(/\bmar\.?\b/gi, 'mardi');
		text = text.replace(/\bmer\.?\b/gi, 'mercredi');
		text = text.replace(/\bjeu\.?\b/gi, 'jeudi');
		text = text.replace(/\bven\.?\b/gi, 'vendredi');
		
		// Handle "matin", "mat.", "après-midi"
		text = text.replace(/\bmat(?:in|\.)?\b/gi, '8h30');
		text = text.replace(/\bapr[èe]s\s*-?\s*midi\b/gi, '14h');
		
		// Normalize weeks (1er, 2e, 3e, 4e)
		// 1er, 1eme, 1ère etc.
		text = text.replace(/\b1\s*(?:er|ere|ère|ier|eme|ème|ième|ieme)\b/gi, '1er');
		// 2e, 2eme etc.
		text = text.replace(/\b([2-4])\s*(?:e|eme|ème|èm|ième|ieme|éme)\b/gi, '$1e');
		
		// 2. Normalize and Expand multi-week lists
		// "1er & 3e" -> "1er, 3e"
		text = text.replace(/(\b1er|[2-4]e)\s*(?:&|et)\s*(\b1er|[2-4]e)\b/gi, '$1, $2');
		
		// Handle "ts les", "tous les", "Chaque"
		text = text.replace(/\bts\s+les\b/gi, 'Tous les');
		text = text.replace(/\bto[iu][st]\s+les\b/gi, 'Tous les');
		text = text.replace(/\bChaque\s+((?:lun|mar|mercre|jeu|vendre)di)s?\b/gi, 'Tous les $1s');

		// 3. Expansion and Distribution
		// Normalize commas to dots ONLY if they separate what looks like different rules
		// e.g., "SEC : ..., FRAIS : ..."
		text = text.replace(/([a-z])\s*,\s*([a-z\s]+:)/gi, '$1. $2');

		// Handle cases where "le [week] [day]" is used after product
		// e.g., "SEC le 4e lundi, FRAIS ts les lundi"
		text = text.replace(/([a-z]+)\s+le\s+(\b1er|[2-4]e|Tous les)\b/gi, '$1 : $2');

		// Handle cases where comma is used as a rule separator but without product prefix
		// e.g., "1er jeudi, 3e mercredi" -> "1er jeudi. 3e mercredi"
		text = text.replace(/((?:lun|mar|mercre|jeu|vendre)di)s?\s*,\s*(\b1er|[2-4]e|Tous les)\b/gi, '$1. $2');

		// Expand "Week et Week Day" or "Week & Week Day" or "Week Day & Week Day" -> "Week Day. Week Day"
		let expandedText = text;
		let prevText;
		do {
			prevText = expandedText;
			// Case 1: "1er et 3e Lundi" -> "1er Lundi. 3e Lundi"
			expandedText = expandedText.replace(/\b(1er|[2-4]e|Tous les)\s*(?:,|\s+et|\s+&)\s*(1er|[2-4]e|Tous les|(?:\d\s*(?:er|e)))\s+((?:lun|mar|mercre|jeu|vendre)di)s?\b/gi, '$1 $3. $2 $3');
			// Case 2: "Lundi et Mardi" (without explicit weeks, assume recurring or same week if part of a list)
			expandedText = expandedText.replace(/(Tous les)\s+((?:lun|mar|mercre|jeu|vendre)di)s?\s+(?:et|&)\s+((?:lun|mar|mercre|jeu|vendre)di)s?/gi, '$1 $2s. $1 $3s');
			// Case 3: "1er Mercredi & 3e Mercredi" -> "1er Mercredi. 3e Mercredi"
			expandedText = expandedText.replace(/\b(1er|[2-4]e|Tous les)\s+((?:lun|mar|mercre|jeu|vendre)di)s?\s+(?:et|&)\s+(1er|[2-4]e|Tous les)\s+\2s?\b/gi, '$1 $2. $3 $2');
		} while (expandedText !== prevText);
		text = expandedText;

		// Split by "/" or ";" or " . "
		let ruleSegments = text.split(/\s*(?:\/|;)\s*|\s+\.\s+/).map(s => s.trim()).filter(s => s.length > 0);
		
		// If only one segment, try to split by comma if it looks like "Product : Rule, Product : Rule"
		if (ruleSegments.length === 1 && ruleSegments[0].includes(',') && ruleSegments[0].includes(':'))
		{
			const commaSplit = ruleSegments[0].split(/\s*,\s*(?=(?:frais|f&l|sec|surgel[ée])\b)/i);
			if (commaSplit.length > 1) ruleSegments = commaSplit;
		}

		let expandedRules = [];

		for (let ruleSegment of ruleSegments)
		{
			// Check for product prefix or suffix
			const colonParts = ruleSegment.split(/\s*:\s*/);
			let products = null;
			let content = ruleSegment;

			if (colonParts.length >= 2)
			{
				if (/frais|f&l|sec|surg/i.test(colonParts[0]))
				{
					products = colonParts[0].trim();
					content = colonParts.slice(1).join(' : ').trim();
				}
				else if (/frais|f&l|sec|surg/i.test(colonParts[colonParts.length - 1]))
				{
					products = colonParts[colonParts.length - 1].trim();
					content = colonParts.slice(0, -1).join(' : ').trim();
				}
			}

			let expandedRule = content;
			if (products)
			{
				// Distribute products to each separate sentence in content (which might have been expanded above)
				expandedRule = expandedRule.split(/\.\s+/).map(e => e.trim()).filter(e => e.length > 0).map(e => e + ' : ' + products).join('. ');
			}
			expandedRules.push(expandedRule);
		}

		text = expandedRules.join('. ');

		// Special case for multi-product prefix rules that didn't split correctly
		// e.g., "SEC : 1er lundi et 3e lundi / Frais : 1er lundi et 3e lundi"
		// The split above handles "/", but let's ensure we didn't miss "Product : ... Product : ..."
		text = text.replace(/([a-z])\s+(frais|sec|surgel[ée]|f&l)\s*:/gi, '$1. $2 :');

		// 4. Default Products
		const hasAnyProductGlobal = /frais|f&l|sec|surg/i.test(text);
		let finalSegments = text.split(/\.\s+/).map(s => s.trim()).filter(s => s.length > 0);
		
		finalSegments = finalSegments.map(segment => {
			if (/tous les jours/i.test(segment) && !/frais|f&l|sec|surg/i.test(segment))
			{
				return segment + ' : Frais';
			}
			if (!hasAnyProductGlobal && /(?:1er|[2-4]e|Tous les|(?:lun|mar|mercre|jeu|vendre)di)/i.test(segment))
			{
				if (!segment.includes(':')) segment += ' : Frais, Sec, Surgelé';
				else if (segment.endsWith(':')) segment += ' Frais, Sec, Surgelé';
			}
			return segment;
		});

		text = finalSegments.join('. ');

		// 5. Final pass through parseFlexiblePlanning -> decodePlanning
		try
		{
			const encoded = parseFlexiblePlanning(text);
			if (encoded)
			{
				return decodePlanning(encoded);
			}
		}
		catch (e)
		{
			// Fallback: use standard normalize on each segment if combined fails
			return finalSegments.map(s =>
			{
				return PlanningNormalizer.normalize(s);
			}).join(' ').trim();
		}

		return PlanningNormalizer.normalize(text);
	}

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

		// 0. Convert superscripts to standard characters
		text = text.replaceAll('\u1D49', 'e').replaceAll('\u02B3', 'r');

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
		// Pluralize day for recurring entries
		text = text.replace(/(Tous les)\s+((?:lun|mar|mercre|jeu|vendre)di)\b/gi, '$1 $2s');

		// 4. Normalize Times (8h30, 10h, 14h)
		// Fix missing space between day and time (e.g., "mardi8h30")
		text = text.replace(/([a-z])(0?8|1[04])/gi, '$1 $2');

		// 8h30: match 08 or 8 followed by optional h/H/: and optional 2 digits
		text = text.replace(/\b0?8(?:[:hH]\d{0,2}|[0-5]\d)?\b/g, '8h30');
		// 10h
		// 14h
		text = text.replace(/\b(1[04])(?:[:hH]\d{0,2}|[0-5]\d)?\b/g, '$1h');

		// 5. Normalize Products
		text = text.replace(/\b(frais|f&l)\b/gi, 'Frais');
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

		// Handle missing times: reuse existing time or default to 8h30
		const timesFound = text.match(/\b(8h30|10h|14h)\b/);
		const inferredTime = timesFound ? timesFound[0] : '8h30';

		const entries = text.split('. ').filter(e =>
		{
			return e.trim().length > 0;
		});
		const updatedEntries = entries.map(entry =>
		{
			if (!/\b(8h30|10h|14h)\b/.test(entry))
			{
				// Insert inferredTime after the day name
				return entry.replace(/\b((?:lun|mar|mercre|jeu|vendre)di)s?\b/i, '$& ' + inferredTime);
			}
			return entry;
		});
		text = updatedEntries.join('. ');

		// Ensure colon after newly inserted times
		text = text.replace(/(8h30|10h|14h)\s*[:.]?\s*/g, '$1 : ');

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

		// Final canonicalization via encode/decode
		const encoded = parseHumanReadable(text);
		if (encoded)
		{
			return decodePlanning(encoded);
		}

		console.warn('PlanningNormalizer: Could not encode normalized text: ' + text);
		return text;
	}

	/**
	 * Normalizes a 2D array (range) of planning schedules.
	 *
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
				return row.map(cell =>
				{
					return PlanningNormalizer.normalize(cell);
				});
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
 */
const NORMALIZE_PLANNING = (range) =>
{
	return PlanningNormalizer.normalizeRange(range);
};
