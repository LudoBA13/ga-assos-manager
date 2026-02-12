/**
 * @file This file contains functions for encoding and decoding a planning schedule.
 * The schedule is represented as a string of 7-character entries.
 * This file is intended to be used in a Google Apps Script environment.
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

// Google Apps Script Configuration
// These constants are defined in the global scope for GAS.

/**
 * Planning Encoding Format
 * Each planning entry is encoded as a 7-character string:
 *
 * 1. Week (1 char):
 *    - '1', '2', '3', '4': Specific week of the month.
 *    - '0': "Tous les" (Every week).
 *
 * 2. Day (2 chars):
 *    - 'Lu': Lundi (Monday)
 *    - 'Ma': Mardi (Tuesday)
 *    - 'Me': Mercredi (Wednesday)
 *    - 'Je': Jeudi (Thursday)
 *    - 'Ve': Vendredi (Friday)
 *
 * 3. Time Slot (2 chars):
 *    - 'Md': Matin début (08:30)
 *    - 'Mf': Matin fin (10:00)
 *    - 'Ap': Après-midi (14:00)
 *
 * 4. Product Type (2 chars):
 *    - 'Fr': Frais
 *    - 'Se': Sec
 *    - 'Su': Surgelé
 *
 * Example: "1LuMdFr" -> 1st Monday, 08:30, Frais
 *          "0JeMdSe" -> Every Thursday, 08:30, Sec
 */

/**
 * Planning Formats
 *
 * 1. Encoded Format (Compact):
 *    - 7-character string per entry (e.g., "1LuMdFr").
 *    - See details below in parseSchedule.
 *
 * 2. Canonical Human-Readable Format (Storage):
 *    - Structure: "[Week] [Day] [Time] : [Products]."
 *    - Week: "1er", "2e", "3e", "4e", or "Tous les" (ASCII only).
 *    - Day: "lundi" to "vendredi"; plural ("lundis") if week is "Tous les".
 *    - Time: "8h30", "10h", or "14h".
 *    - Products: "Frais", "Sec", "Surgelé" in lexicographic order, comma-separated.
 *    - Separators: Space before and after colon (" : ").
 *    - Terminator: Each entry ends with a period ".".
 *    - Layout: All entries on a single line, separated by a space.
 *    - Example: "1er lundi 8h30 : Frais. 2e mardi 10h : Sec."
 *
 * 3. Display Format:
 *    - Week: Uses Unicode superscripts ("1ᵉʳ", "2ᵉ", "3ᵉ", "4ᵉ").
 *    - Layout: Each entry on a new line.
 *    - Ditto Marks: If consecutive entries have the same product list, the second list
 *      is replaced by a ditto mark ("〃") centered using spaces (half the product list length).
 *    - Example:
 *      1ᵉʳ lundi 8h30 : Frais.
 *      2ᵉ mardi 10h :   〃
 *
 * 4. Flexible Input Format (for parsing):
 *    - Case: Case-insensitive.
 *    - Week (Specific): [1-4] followed by any amount of [eèrmᵉʳ] (e.g., "1er", "2ᵉ", "3è", "4em").
 *      Superscript ᵉ (\u1D49) and ʳ (\u02B3) are transcribed to "e" and "r".
 *    - Week (Every): Matches /to[iu][st] les/ (e.g., "Tous les", "Tout les", "Touts les").
 *    - Day: Matches any of the five weekdays, singular or plural (e.g., "lundi" or "lundis").
 *    - Time: Hour part (8, 10, 14) determines the slot; any minutes are accepted but ignored (e.g., "8h44" is treated as "8h30").
 *      If omitted, defaults to the time mentioned in other planning entries, or "8h30" if none are present.
 *    - Products: Matches "Frais", "Sec", "Surgelé" (case-insensitive).
 *    - Separators: Optional space around colon.
 */

const PLANNING_CONSTANTS = {
	WEEKS: {
		'0': 'Tous les',
		'1': '1er',
		'2': '2e',
		'3': '3e',
		'4': '4e'
	},
	DAYS: {
		'Lu': 'lundi',
		'Ma': 'mardi',
		'Me': 'mercredi',
		'Je': 'jeudi',
		'Ve': 'vendredi'
	},
	DAY_ORDER: {
		'Lu': 0,
		'Ma': 1,
		'Me': 2,
		'Je': 3,
		'Ve': 4
	},
	TIMES: {
		'Md': '8h30',
		'Mf': '10h',
		'Ap': '14h'
	},
	TIME_ORDER: {
		'Md': 0,
		'Mf': 1,
		'Ap': 2
	},
	PRODUCTS: {
		'Fr': 'Frais',
		'Se': 'Sec',
		'Su': 'Surgelé'
	}
};

/**
 * Helper to parse the raw schedule string into structured objects.
 * Yields entries: { weekCode, dayCode, timeCode, productCode, suffix }
 */
const parseSchedule = function* (schedule)
{
	if (!schedule)
	{
		return;
	}

	for (let i = 0; i < schedule.length; i += 7)
	{
		const entry = schedule.substring(i, i + 7);
		yield {
			weekCode: entry.charAt(0),
			dayCode: entry.substring(1, 3),
			timeCode: entry.substring(3, 5),
			productCode: entry.substring(5, 7),
			suffix: entry.substring(1) // day + time + product
		};
	}
};

const compressPlanning = (schedule) =>
{
	if (!schedule)
	{
		return '';
	}

	const groupedBySuffix = new Map;

	for (const { weekCode, suffix } of parseSchedule(schedule))
	{
		if (!groupedBySuffix.has(suffix))
		{
			groupedBySuffix.set(suffix, new Set);
		}
		groupedBySuffix.get(suffix).add(weekCode);
	}

	let result = '';
	const requiredWeeks = new Set(['1', '2', '3', '4']);

	for (const [suffix, weeks] of groupedBySuffix.entries())
	{
		const hasAllWeeks = requiredWeeks.size === weeks.size && [...requiredWeeks].every(w =>
		{
			return weeks.has(w);
		});

		if (hasAllWeeks)
		{
			result += '0' + suffix;
		}
		else
		{
			const sortedWeeks = Array.from(weeks).sort();
			for (const w of sortedWeeks)
			{
				result += w + suffix;
			}
		}
	}

	return result;
};

/**
 * Expands a compressed planning schedule into its full representation.
 * Replaces '0' (all weeks) with individual entries for weeks 1, 2, 3, and 4.
 * Use this when you need to manipulate individual occurrences.
 *
 * @param {string} schedule The compressed schedule string.
 * @returns {string} The expanded schedule string, sorted canonically.
 */
const decompressPlanning = (schedule) =>
{
	if (!schedule)
	{
		return '';
	}

	const entries = [];
	const allWeeks = ['1', '2', '3', '4'];

	for (const { weekCode, dayCode, timeCode, productCode } of parseSchedule(schedule))
	{
		if (weekCode === '0')
		{
			for (const week of allWeeks)
			{
				entries.push({
					weekCode: week,
					dayCode,
					timeCode,
					productCode
				});
			}
		}
		else
		{
			entries.push({
				weekCode,
				dayCode,
				timeCode,
				productCode
			});
		}
	}

	const { DAY_ORDER, TIME_ORDER, PRODUCTS } = PLANNING_CONSTANTS;

	entries.sort((a, b) =>
	{
		// Sort by Week Code (0 comes before 1, 2, 3, 4)
		if (a.weekCode !== b.weekCode)
		{
			return a.weekCode.localeCompare(b.weekCode);
		}
		// Sort by Day Order
		if (a.dayCode !== b.dayCode)
		{
			return DAY_ORDER[a.dayCode] - DAY_ORDER[b.dayCode];
		}
		// Sort by Time Order
		if (a.timeCode !== b.timeCode)
		{
			return TIME_ORDER[a.timeCode] - TIME_ORDER[b.timeCode];
		}
		// Sort by Product Label (alphabetical)
		const labelA = PRODUCTS[a.productCode] || '';
		const labelB = PRODUCTS[b.productCode] || '';
		return labelA.localeCompare(labelB, 'fr');
	});

	return entries.map(e =>
	{
		return e.weekCode + e.dayCode + e.timeCode + e.productCode;
	}).join('');
};

/**
 * Groups entries by time slot and sorts them chronologically.
 * Also sorts the product list alphabetically within each group.
 */
const groupAndSortEntries = (schedule) =>
{
	const { DAY_ORDER, TIME_ORDER, WEEKS, DAYS, TIMES, PRODUCTS } = PLANNING_CONSTANTS;
	const grouped = new Map;

	for (const { weekCode, dayCode, timeCode, productCode } of parseSchedule(schedule))
	{
		// Create a sortable key: Week (1-4), Day Index, Time Index
		const sortKey = `${weekCode}-${DAY_ORDER[dayCode]}-${TIME_ORDER[timeCode]}`;

		if (!grouped.has(sortKey))
		{
			grouped.set(sortKey, {
				week: WEEKS[weekCode],
				day: DAYS[dayCode],
				time: TIMES[timeCode],
				productList: [],
				isRecurring: weekCode === '0'
			});
		}

		const productLabel = PRODUCTS[productCode];
		if (productLabel)
		{
			grouped.get(sortKey).productList.push(productLabel);
		}
	}

	const sortedKeys = Array.from(grouped.keys()).sort();

	return sortedKeys.map(key =>
	{
		const item = grouped.get(key);
		item.productList.sort((a, b) =>
		{
			return a.localeCompare(b, 'fr');
		});
		return item;
	});
};

/**
 * Decodes a planning schedule from its encoded string representation into a human-readable format.
 * This function can be used as a custom function in Google Sheets.
 * @customfunction
 * @param {string|Array<Array<string>>} input The encoded schedule string or a 2D array of strings.
 * @returns {string|Array<Array<string>>} The human-readable planning schedule or a 2D array of schedules.
 */
const FORMAT_STORAGE_PLANNING = (input) =>
{
	if (!Array.isArray(input))
	{
		return decodePlanning(input);
	}

	return input.map(row =>
	{
		if (Array.isArray(row))
		{
			return row.map(cell =>
			{
				return decodePlanning(cell);
			});
		}
		else
		{
			return [decodePlanning(row)];
		}
	});
};

/**
 * Decodes a planning schedule from its encoded string representation into a human-readable format.
 *
 * @param {string} schedule The encoded schedule string (e.g., "1LuMdFr").
 * @returns {string} The human-readable planning schedule (e.g., "1er lundi 8h30: Frais.").
 */
const decodePlanning = (schedule) =>
{
	if (!schedule)
	{
		return '';
	}

	schedule = compressPlanning(schedule);
	const sortedItems = groupAndSortEntries(schedule);

	return sortedItems.map(item =>
	{
		const productString = item.productList.join(', ');
		let dayLabel = item.day;
		if (item.isRecurring)
		{
			dayLabel += 's';
		}
		return `${item.week} ${dayLabel} ${item.time} : ${productString}.`;
	}).join(' ');
};

/**
 * Decodes a 2D array (range) of planning schedules, applying decodePlanning to each value.
 *
 * @param {Array<Array<string>>} range The 2D array (range) of encoded schedule strings.
 * @returns {Array<Array<string>>} A 2D array with the decoded planning schedules.
 */
const decodePlannings = (range) =>
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
				return decodePlanning(cell);
			});
		}
		else
		{
			// Handle single cell input
			return [decodePlanning(row)];
		}
	});
};

/**
 * Decodes and formats a 2D array (range) of planning schedules for display.
 *
 * @param {Array<Array<string>>} range The 2D array (range) of encoded schedule strings.
 * @returns {Array<Array<string>>} A 2D array with the formatted planning schedules.
 */
const formatPlannings = (range) =>
{
	return decodePlannings(range).map(row =>
	{
		return row.map(cell =>
		{
			return formatPlanningForDisplay(cell);
		});
	});
};

/**
 * Takes an encoded schedule, compresses it, and returns it in a sorted canonical form.
 */
const canonicalizeSchedule = (schedule) =>
{
	if (!schedule)
	{
		return '';
	}

	const compressed = compressPlanning(schedule);
	const entries = Array.from(parseSchedule(compressed));

	const { DAY_ORDER, TIME_ORDER, PRODUCTS } = PLANNING_CONSTANTS;

	entries.sort((a, b) =>
	{
		// Sort by Week Code (0 comes before 1, 2, 3, 4)
		if (a.weekCode !== b.weekCode)
		{
			return a.weekCode.localeCompare(b.weekCode);
		}
		// Sort by Day Order
		if (a.dayCode !== b.dayCode)
		{
			return DAY_ORDER[a.dayCode] - DAY_ORDER[b.dayCode];
		}
		// Sort by Time Order
		if (a.timeCode !== b.timeCode)
		{
			return TIME_ORDER[a.timeCode] - TIME_ORDER[b.timeCode];
		}
		// Sort by Product Label (alphabetical)
		const labelA = PRODUCTS[a.productCode] || '';
		const labelB = PRODUCTS[b.productCode] || '';
		return labelA.localeCompare(labelB, 'fr');
	});

	return entries.map(e =>
	{
		return e.weekCode + e.dayCode + e.timeCode + e.productCode;
	}).join('');
};

/**
 * Encodes a list of planning objects into a schedule string.
 *
 * When used in Google Sheets, the input `entries` should be a 2D array where each inner array
 * represents a planning entry with properties in a defined order (e.g., [week, day, time, product]).
 *
 * @param {Array<Array<string>>} entries An array of arrays, where each inner array represents a planning entry.
 *                                       Example: `[['1', 'Lu', 'Md', 'Fr'], ['2', 'Ma', 'Ap', 'Se']]`
 * @returns {string} The encoded schedule string.
 */
const encodePlanning = (entries) =>
{
	if (!Array.isArray(entries))
	{
		return '';
	}

	let formattedEntries = [];
	// Check if the input is a 2D array from Google Sheets
	if (entries.length > 0 && Array.isArray(entries[0]))
	{
		formattedEntries = entries.map(row =>
		{
			return {
				week: row[0],
				day: row[1],
				time: row[2],
				product: row[3]
			};
		});
	}
	else
	{
		formattedEntries = entries;
	}

	let schedule = '';

	for (const entry of formattedEntries)
	{
		const { week, day, time, product, products } = entry;
		const productList = products || (product ? [product] : []);

		for (const p of productList)
		{
			// Basic validation could be added here checking against PLANNING_CONSTANTS
			if (week && day && time && p)
			{
				schedule += week + day + time + p;
			}
		}
	}

	return canonicalizeSchedule(schedule);
};

/**
 * Strictly parses a canonical human-readable planning string into the encoded format.
 * Expects the "Canonical Human-Readable Format (Storage)" as defined in the documentation.
 *
 * @param {string} text The canonical planning string.
 * @returns {string} The encoded schedule string.
 */
const parseCanonicalPlanning = (text) =>
{
	if (!text)
	{
		return '';
	}

	const { DAYS, TIMES, PRODUCTS } = PLANNING_CONSTANTS;
	const daysRev = Object.fromEntries(Object.entries(DAYS).map(([k, v]) =>
	{
		return [v, k];
	}));
	const timesRev = Object.fromEntries(Object.entries(TIMES).map(([k, v]) =>
	{
		return [v, k];
	}));
	const productsRev = Object.fromEntries(Object.entries(PRODUCTS).map(([k, v]) =>
	{
		return [v, k];
	}));

	const segments = text.split('. ').map(s =>
	{
		return s.trim();
	}).filter(s =>
	{
		return s.length > 0;
	});
	const entries = [];

	for (let segment of segments)
	{
		if (segment.endsWith('.'))
		{
			segment = segment.slice(0, -1);
		}

		const parts = segment.split(' : ');
		if (parts.length !== 2)
		{
			return '';
		}

		const [header, products] = parts;
		const headerParts = header.split(' ');
		if (headerParts.length < 3)
		{
			return '';
		}

		const timeLabel = headerParts.pop();
		const timeCode = timesRev[timeLabel];

		let dayLabel = headerParts.pop();
		const weekLabel = headerParts.join(' ');

		let weekCode = null;
		if (weekLabel === 'Tous les')
		{
			weekCode = '0';
			if (!dayLabel.endsWith('s'))
			{
				return '';
			}
			dayLabel = dayLabel.slice(0, -1);
		}
		else
		{
			const weekMap = { '1er': '1', '2e': '2', '3e': '3', '4e': '4' };
			weekCode = weekMap[weekLabel];
		}

		const dayCode = daysRev[dayLabel];
		if (!weekCode || !dayCode || !timeCode)
		{
			return '';
		}

		const productLabels = products.split(', ');
		for (const pLabel of productLabels)
		{
			const productCode = productsRev[pLabel];
			if (!productCode)
			{
				return '';
			}
			entries.push({ week: weekCode, day: dayCode, time: timeCode, product: productCode });
		}
	}

	return encodePlanning(entries);
};

/**
 * Parses a flexible or display-formatted planning string into the encoded format.
 * This function can be used as a custom function in Google Sheets.
 * @customfunction
 * @param {string|Array<Array<string>>} input The flexible planning string or a 2D array of strings.
 * @returns {string|Array<Array<string>>} The encoded schedule string or a 2D array of encoded strings.
 */
const PARSE_FLEXIBLE_PLANNING = (input) =>
{
	if (!Array.isArray(input))
	{
		return parseFlexiblePlanning(input);
	}

	return input.map(row =>
	{
		if (Array.isArray(row))
		{
			return row.map(cell =>
			{
				return parseFlexiblePlanning(cell);
			});
		}
		else
		{
			return [parseFlexiblePlanning(row)];
		}
	});
};

/**
 * Parses a flexible or display-formatted planning string into the encoded format.
 * Handles Unicode ordinals, ditto marks, case-insensitivity, and missing times.
 *
 * @param {string} text The flexible planning string.
 * @returns {string} The encoded schedule string.
 */
const parseFlexiblePlanning = (text) =>
{
	if (!text)
	{
		return '';
	}

	// 1. Pre-process: Unicode to ASCII
	text = text.replaceAll('\u1D49', 'e').replaceAll('\u02B3', 'r');

	// 2. Identify a global default time
	let defaultTimeCode = 'Md'; // Default to 8h30
	const allTimesMatch = text.match(/(\d+)h/i);
	if (allTimesMatch)
	{
		const hour = parseInt(allTimesMatch[1], 10);
		if (hour === 8)
		{
			defaultTimeCode = 'Md';
		}
		else if (hour === 10)
		{
			defaultTimeCode = 'Mf';
		}
		else if (hour === 14)
		{
			defaultTimeCode = 'Ap';
		}
	}

	// 3. Split into segments (sentences or lines)
	let segments = text.split(/[\n\r]+|\.\s+/).map(s =>
	{
		return s.trim();
	}).filter(s =>
	{
		return s.length > 0;
	});

	if (segments.length > 0)
	{
		const lastIdx = segments.length - 1;
		if (segments[lastIdx].endsWith('.'))
		{
			segments[lastIdx] = segments[lastIdx].slice(0, -1).trim();
		}
	}

	const entries = [];
	let lastProductCodes = [];
	let lastTimeCode = defaultTimeCode;
	let lastWeekCode = null;
	let lastDayCode = null;

	for (const segment of segments)
	{
		const hasDitto = segment.includes('\u3003') || segment.includes('\u3003');
		const colonIdx = segment.indexOf(':');
		let headerStr = colonIdx !== -1 ? segment.substring(0, colonIdx).trim() : segment;
		let productsStr = colonIdx !== -1 ? segment.substring(colonIdx + 1).trim() : '';

		// Parse Week
		let weekCode = null;
		const everyMatch = headerStr.match(/to[iu][st]\s+les/i);
		if (everyMatch)
		{
			weekCode = '0';
		}
		else
		{
			const specMatch = headerStr.match(/([1-4])\s*[eèrm]+/i);
			if (specMatch)
			{
				weekCode = specMatch[1];
			}
		}

		if (weekCode)
		{
			lastWeekCode = weekCode;
		}

		// Parse Day
		let dayCode = null;
		const dayMatch = headerStr.match(/(lun|mar|mercre|jeu|vendre)dis?/i);
		if (dayMatch)
		{
			const dayMap = { 'lun': 'Lu', 'mar': 'Ma', 'mercre': 'Me', 'jeu': 'Je', 'vendre': 'Ve' };
			dayCode = dayMap[dayMatch[1].toLowerCase()];
		}

		if (dayCode)
		{
			lastDayCode = dayCode;
		}

		// Parse Time
		const tMatch = headerStr.match(/(\d+)h/i);
		if (tMatch)
		{
			const hour = parseInt(tMatch[1], 10);
			let timeCode = null;
			if (hour === 8)
			{
				timeCode = 'Md';
			}
			else if (hour === 10)
			{
				timeCode = 'Mf';
			}
			else if (hour === 14)
			{
				timeCode = 'Ap';
			}

			if (timeCode)
			{
				lastTimeCode = timeCode;
			}
		}

		// Parse Products
		let currentProductCodes = [];
		if (hasDitto && lastProductCodes.length > 0)
		{
			currentProductCodes = [...lastProductCodes];
		}
		else
		{
			const pLower = (productsStr || headerStr).toLowerCase();
			if (pLower.includes('frais'))
			{
				currentProductCodes.push('Fr');
			}
			if (pLower.includes('sec'))
			{
				currentProductCodes.push('Se');
			}
			if (pLower.includes('surgel'))
			{
				currentProductCodes.push('Su');
			}

			if (currentProductCodes.length > 0)
			{
				lastProductCodes = [...currentProductCodes];
			}
		}

		if (lastWeekCode && lastDayCode && currentProductCodes.length > 0)
		{
			for (const pCode of currentProductCodes)
			{
				entries.push({ week: lastWeekCode, day: lastDayCode, time: lastTimeCode, product: pCode });
			}
		}
	}

	return encodePlanning(entries);
};

/**
 * Parses a human-readable schedule string back into the encoded format.
 * This is a flexible parser that handles various formats.
 *
 * @param {string} text The human-readable schedule.
 * @returns {string} The encoded schedule string.
 */
const parseHumanReadable = (text) =>
{
	return parseFlexiblePlanning(text);
};

/**
 * Formats an encoded planning schedule for display.
 * This function can be used as a custom function in Google Sheets.
 * @customfunction
 * @param {string|Array<Array<string>>} input The encoded schedule or a 2D array of encoded schedules.
 * @returns {string|Array<Array<string>>} The formatted schedule(s) for display.
 */
const FORMAT_DISPLAY_PLANNING = (input) =>
{
	const process = (val) =>
	{
		if (!val || typeof val !== 'string')
		{
			return val || '';
		}

		return formatPlanningForDisplay(decodePlanning(val));
	};

	if (!Array.isArray(input))
	{
		return process(input);
	}

	return input.map(row =>
	{
		if (Array.isArray(row))
		{
			return row.map(cell =>
			{
				return process(cell);
			});
		}
		else
		{
			return [process(row)];
		}
	});
};

/**
 * Formats a human-readable planning schedule for display.
 * Breaks lines at periods and uses ditto marks (\u3003) for repeated product lists.
 *
 * @param {string} text The human-readable schedule (e.g., from decodePlanning).
 * @returns {string} The formatted schedule for display.
 */
const formatPlanningForDisplay = (text) =>
{
	if (!text)
	{
		return '';
	}

	// 0. Convert to display ordinals (Unicode superscripts)
	text = text.replace(/\b1er\b/g, '1\u1D49\u02B3')
		.replace(/\b([2-4])e\b/g, '$1\u1D49');

	// 1. Split into lines
	const rawLines = text.replace(/\. /g, '.\n').split('\n').filter(l =>
	{
		return l.trim().length > 0;
	});

	// 2. Parse lines
	const parsedLines = rawLines.map(line =>
	{
		const colonIdx = line.indexOf(':');
		if (colonIdx === -1)
		{
			return { full: line, left: line, trimmedRight: null };
		}
		const left = line.substring(0, colonIdx + 1);
		const right = line.substring(colonIdx + 1);
		return {
			full: line,
			left: left,
			trimmedRight: right.trim()
		};
	});

	// 3. Group by trimmedRight, preserving order of first appearance
	const groups = new Map;

	for (const parsed of parsedLines)
	{
		const key = parsed.trimmedRight === null ? Symbol('no_colon') : parsed.trimmedRight;
		if (!groups.has(key))
		{
			groups.set(key, []);
		}
		groups.get(key).push(parsed);
	}

	const reorderedLines = [];
	for (const group of groups.values())
	{
		for (const parsed of group)
		{
			reorderedLines.push(parsed);
		}
	}

	// 4. Generate result with ditto marks
	const result = [];
	let lastRight = null;

	for (const parsed of reorderedLines)
	{
		if (parsed.trimmedRight === null)
		{
			result.push(parsed.full);
			lastRight = null;
			continue;
		}

		if (lastRight !== null && parsed.trimmedRight === lastRight)
		{
			const halfSpaces = ' '.repeat(Math.ceil(parsed.trimmedRight.length / 2));
			result.push(parsed.left + halfSpaces + '\u3003');
		}
		else
		{
			result.push(parsed.full);
			lastRight = parsed.trimmedRight;
		}
	}

	return result.join('\n');
};

/**
 * Counts the occurrences of each product type in the schedule.
 * Values 1, 2, 3, 4 for the week count as 1.
 * Value 0 for the week counts as 4.
 *
 * @param {string} schedule The encoded planning schedule.
 * @returns {Object} An object with counts for 'Frais', 'Sec', and 'Surgelé'.
 */
const countProductOccurrences = (schedule) =>
{
	const counts = {
		'Frais': 0,
		'Sec': 0,
		'Surgelé': 0
	};

	if (!schedule)
	{
		return counts;
	}

	const regex = /([0-4])\w{4}(Fr|Se|Su)/g;
	let match;

	while ((match = regex.exec(schedule)) !== null)
	{
		const week = match[1];
		const productCode = match[2];
		const count = (week === '0') ? 4 : 1;
		const productMap = {
			'Fr': 'Frais',
			'Se': 'Sec',
			'Su': 'Surgelé'
		};
		const productName = productMap[productCode];

		if (productName)
		{
			counts[productName] += count;
		}
	}

	return counts;
};
