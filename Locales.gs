// Configuration
const ACTIVE_LOCALE = 'fr';

const CATALOG = {
	'fr': {
	}
};

/**
 * The gettext function alias.
 * Translates a string and formats it with optional arguments.
 *
 * Usage:
 *   _('Hello World')
 *   _('Deleted %s files', count)
 */
function _(str, ...args)
{
	// 1. Look up translation (defaulting to the original string if not found)
	let translated = str;

	if (CATALOG[ACTIVE_LOCALE] && CATALOG[ACTIVE_LOCALE][str])
	{
		translated = CATALOG[ACTIVE_LOCALE][str];
	}

	// 2. Format string (simple %s replacement)
	// This allows you to handle variables in strings: _('Hello %s', name)
	if (args.length > 0)
	{
		args.forEach(arg => translated = translated.replace('%s', arg));
	}

	return translated;
}
