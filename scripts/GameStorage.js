export const GameStorage = {
	//Game default set-up
	playersNumber: 8,
	regionsNumber: 40,
	cellsYaxis: 30,
	cellsXaxis: 77, // 2.57 ratio for in-tab gaming on a 16:9' ratio monitors as a default set-up

	//Economy set-up
	neutralDiceNumber: 2,
	regionDiceLimit: 6,
	castleThreshold: 2,
	playerInitialDiceNumber: 3,
	playerInitialAttackNumber: 1,
	
	botNames: [
		'Alpha',
		'Bravo',
		'Charlie',
		'Delta',
		'Echo',
		'Foxtrot',
		'Golf',
		//'Hotel',
		//'India',
		'Juliett',
		'Kilo',
		'Lima',
		'Mike',
		'November',
		'Oscar',
		//'Papa',
		'Quebec',
		'Romeo',
		'Sierra',
		'Tango',
		'Uniform',
		'Victor',
		'Whiskey',
		'X-ray',
		//'Yankee',
		'Zulu'
	],
	botBehaviorVectors: [
	    [-1, 0, 1],						// passive -> aggressive
	    [0, 1, 2],						// prudent -> wasteful
	    [-1, 0, 1],						// reserved -> extravertive
	    [1, 0.7, 0.5],					// self-concerned -> foreign-focused
	    [0, 1, 2],						// hostile -> friendly
	    [0, 1, 2]						// tactical -> strategical
	],

	RGBcolors: [					// to substitute REGEX execution bug on slow browsers:
		[145, 35, 55],					//Bordeaux
		[45, 185, 110],					//Green
		[60, 215, 255],					//Light blue
		[239, 200, 42],					//Yellow
		[17, 17, 202],					//Deep blue
		[222, 220, 210],				//Ivory
		[240, 123, 5],					//Orange
		[245, 145, 185],				//Pink
		[90, 96, 108] 					//Neutral player
	],

	//Game status changeable information
	players: [],
	statusBars: [],
	regions: [],
	gameGrid: null,
	DIVGrid: null
};