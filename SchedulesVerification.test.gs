function test_schedulesCSV_Verification()
{
	const samples = [
		{
			input: '2e vendredi 10h: Frais, Sec, Surgelé.\n\n4e vendredi 10h: Frais, Sec, Surgelé.',
			expected: '2VeMfFr2VeMfSe2VeMfSu4VeMfFr4VeMfSe4VeMfSu'
		},
		{
			input: '3e jeudi 8h30: Sec., Frais, Surgelés',
			expected: '3JeMdFr3JeMdSe3JeMdSu'
		},
		{
			input: '3e mardi 8h30 : Sec. frais, surgelés',
			expected: '3MaMdFr3MaMdSe3MaMdSu'
		},
		{
			input: '4e mardi8h30: Frais, Sec.',
			expected: '4MaMdFr4MaMdSe'
		},
		{
			input: '2e jeudi 8h30: Frais, Sec. Surgeles',
			expected: '2JeMdFr2JeMdSe2JeMdSu'
		},
		{
			input: '2e vendredi 10h: Sec, frais, Surgelé.',
			expected: '2VeMfFr2VeMfSe2VeMfSu'
		},
		{
			input: '1er mercredi 10h: Frais, Sec. 2ème lundi : surgelés\n2e mercredi 10h: Frais, Sec.',
			expected: '1MeMfFr1MeMfSe2LuMfSu2MeMfFr2MeMfSe'
		},
		{
			input: '2e vendredi 14h: Surgelé.\n3e jeudi 8h30: Frais, Sec, Surgelé.',
			expected: '2VeApSu3JeMdFr3JeMdSe3JeMdSu'
		},
		{
			input: 'Tous les lundi 8h30:  Sec, Surgelé.\nTois les jeudi frais, surgeles\nTous les vendredis 8h30:  Sec,',
			expected: '0LuMdSe0LuMdSu0JeMdFr0JeMdSu0VeMdSe'
		},
		{
			input: '4e vendredi 8h30: Frais, Sec, Surgelé.',
			expected: '4VeMdFr4VeMdSe4VeMdSu'
		},
		{
			input: '1er mercredi 10h: Frais, Sec, Surgelé.\n3e mercredi 10h: Frais, Sec, Surgelé.',
			expected: '1MeMfFr1MeMfSe1MeMfSu3MeMfFr3MeMfSe3MeMfSu'
		},
		{
			input: '1er lundi 8h30:  Sec',
			expected: '1LuMdSe'
		},
		{
			input: '1er mardi 8h30: Frais, Sec, Surgelé.',
			expected: '1MaMdFr1MaMdSe1MaMdSu'
		},
		{
			input: '1er jeudi 8h30: Frais, Sec, Surgelé.\n3e jeudi 8h30: Frais, Sec, Surgelé.',
			expected: '1JeMdFr1JeMdSe1JeMdSu3JeMdFr3JeMdSe3JeMdSu'
		},
		{
			input: '\n4e vendredi 8h30: Frais, Sec.',
			expected: '4VeMdFr4VeMdSe'
		},
		{
			input: '3 eme mercredi frais sec surgele\n3e mercredi 10h: Frais, Sec, Surgelé.',
			expected: '3MeMfFr3MeMfSe3MeMfSu'
		},
		{
			input: '2e jeudi 10h: Sec.',
			expected: '2JeMfSe'
		},
		{
			input: '4 mercredi frais+surgeles',
			expected: '4MeMdFr4MeMdSu'
		},
		{
			input: '2e mercredi 10h: Frais, Sec, Surgelé.',
			expected: '2MeMfFr2MeMfSe2MeMfSu'
		},
		{
			input: 'Tous les mercredis 10h: Sec.',
			expected: '0MeMfSe'
		},
		{
			input: '3e vendredi 8h30: Frais, Sec, Surgelé.',
			expected: '3VeMdFr3VeMdSe3VeMdSu'
		},
		{
			input: '2e lundi 8h30: Frais, Sec, Surgelé.',
			expected: '2LuMdFr2LuMdSe2LuMdSu'
		},
		{
			input: '3e mercredi 8h30: sec',
			expected: '3MeMdSe'
		},
		{
			input: '1er mercredi 8h30: Sec.',
			expected: '1MeMdSe'
		},
		{
			input: '1er mardi 8h30: Sec.',
			expected: '1MaMdSe'
		},
		{
			input: '2e jeudi 10h: Frais, Sec',
			expected: '2JeMfFr2JeMfSe'
		},
		{
			input: '3e mardi 8h30: Frais, Sec, Surgelé.',
			expected: '3MaMdFr3MaMdSe3MaMdSu'
		},
		{
			input: '3e mardi 8h30: Frais, Sec, Surgelé.\n4e mardi 8h30: Frais, Sec, ',
			expected: '3MaMdFr3MaMdSe3MaMdSu4MaMdFr4MaMdSe'
		},
		{
			input: '2e mardi 8h30: Frais, Sec, Surgelé.',
			expected: '2MaMdFr2MaMdSe2MaMdSu'
		},
		{
			input: '3e mardi 10h30: Frais, Sec, Surgelé.',
			expected: '3MaMfFr3MaMfSe3MaMfSu'
		},
		{
			input: '1er lundi 8h30: Frais, Sec, Surgelé.',
			expected: '1LuMdFr1LuMdSe1LuMdSu'
		},
		{
			input: '2e lundi 8h30: Frais, Sec, Surgelé.\n4e lundi 8h30: Frais, Sec, Surgelé.',
			expected: '2LuMdFr2LuMdSe2LuMdSu4LuMdFr4LuMdSe4LuMdSu'
		},
		{
			input: '\n2e lundi 8h30: Sec, Frais, Surgelé.\n4e lundi 8h30: Sec, Frais, Surgelé.',
			expected: '2LuMdFr2LuMdSe2LuMdSu4LuMdFr4LuMdSe4LuMdSu'
		},
		{
			input: '1er mercredi 10h: Frais, Sec, Surgelé.\n3e mercredi 10h: Frais, Sec, Surgelé.',
			expected: '1MeMfFr1MeMfSe1MeMfSu3MeMfFr3MeMfSe3MeMfSu'
		},
		{
			input: '\n4e vendredi 10h: Frais, Sec, Surgelé.',
			expected: '4VeMfFr4VeMfSe4VeMfSu'
		}
	];

	samples.forEach((sample, index) =>
	{
		const actual = parseFlexiblePlanning(sample.input);
		assertPlanningEqual(sample.expected, actual, `Sample ${index + 1}: ${sample.input.split('\n')[0]}`);
	});
}
