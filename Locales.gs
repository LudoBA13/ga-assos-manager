/**
 * @file This file contains localization constants and configuration.
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

// Configuration
const ACTIVE_LOCALE = 'fr';

const CATALOG = {
	'fr': {
		"FraisSansRéfrigérateur"  : "Souhaite recevoir du Frais mais n'est pas équippé de Chambre froide positive ou Réfrigérateur",
		"SurgeléSansCongélateur"  : "Souhaite recevoir du Surgelé mais n'est pas équippé de Chambre froide negative ou Congélateur",
		"HabilitationExpirée"     : "La date d'habilitation régionale a expiré",
		"SansDateHabilitation"    : "La date d'habilitation régionale est manquante",
		"SansHabilitation"        : "Pas d'habilitation régionale, nationale, ou CCAS/CIAS",
		"SiretManquant"           : "Numéro SIRET manquant",
		"HabilitationIncohérente" : "Les données d'habilitation sont incohérentes",
		"ConventionExpirée"       : "La date de dernière signature de la convention est antérieure à 5 ans",
		"Générer les Fiches d'Informations Partenaires": "Générer les Fiches d'Informations Partenaires",
		"Génération de %s (%s/%s)": "Génération de %s (%s/%s)",
		"Toutes les fiches ont été générées.": "Toutes les fiches ont été générées.",
		"Génération terminée": "Génération terminée",
		"Initialisation...": "Initialisation...",
		"Préparation des données...": "Préparation des données...",
		"Génération des fiches": "Génération des fiches",
		"Aucune donnée à traiter.": "Aucune donnée à traiter.",
		"Terminé.": "Terminé.",
		"Génération terminée avec succès.": "Génération terminée avec succès.",
		"Erreur critique : ": "Erreur critique : ",
		"Fermer": "Fermer"
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
