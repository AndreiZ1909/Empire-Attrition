import { GameStorage } from './GameStorage.js';
import { Grid } from './Map_classes.js';
import { Region } from './Region_class.js';
import { Painter } from './Painter_class.js';
import { Player } from './Player_class.js';
import { Statusbar } from './StatusBar_class.js';
import { TurnSystem } from './TurnSystem_class.js';
import { StartMenu } from './StartMenu_class.js';
import { AIManager } from './AIManager_class.js';
import { FileManager } from './FileManager_class.js';


export function startMenuWindow(){
	//Initializing Players and their StatusBars 
	for(let i=0;i<GameStorage.playersNumber;i++){
		let playerName = GameStorage.botNames[Math.floor(Math.random() * GameStorage.botNames.length)];
		let index = GameStorage.botNames.indexOf(playerName);
		GameStorage.botNames.splice(index, 1);

		const playerNext = new Player(i, playerName, `player-color-${i}`, `player-color-text-${i}`, GameStorage.RGBcolors[i]);
		GameStorage.players.push(playerNext);

		//Initializing a StatusBar for the player
		const singleBar = new Statusbar(playerNext);
		GameStorage.statusBars.push(singleBar);  //Neutral Player doesn't get a statusBar

		//Also adding player to the global Game Turn System
		TurnSystem.playersSequence.push(playerNext);

		//Initializing map for strikes' stats for AI: previous and current turns' strikes ##
        AIManager.strikesCompletedStats.set(playerNext, [2, 0, 0, 0]);
	}
	//Opening Start Menu as soon as possible
	StartMenu.showStartMenu('StartMenuTitle', 'ColorButtonsPane');

	//Proceed with the initialization
	Player.initializeAttackHistory(GameStorage.players);

	//Initializing Neutral Player lastly
	const playerNeutral = new Player(GameStorage.playersNumber, 'Neutral player', `player-color-${GameStorage.playersNumber}`, `player-color-text-${GameStorage.playersNumber}`, GameStorage.RGBcolors[GameStorage.playersNumber]);
	playerNeutral.diceRevenue = 0;
	GameStorage.players.push(playerNeutral);

	//Caching resources
	FileManager.initializeImageResources();

	//Initializing regions - at the very start everything belongs to Neutral player
	for(let i=0; i<GameStorage.regionsNumber; i++){
		const regularRegion = new Region(i, GameStorage.players[GameStorage.playersNumber], GameStorage.players[GameStorage.playersNumber].colorClass);
		GameStorage.regions.push(regularRegion);
		GameStorage.players[GameStorage.playersNumber].regions.push(regularRegion);
	}

	//Array: Grid of logical cells initialization
	GameStorage.gameGrid = new Grid(GameStorage.cellsYaxis, GameStorage.cellsXaxis, 'GlobalGrid', GameStorage.regions);
	//Array: cells' DIVs initialization happens in the instance method
	GameStorage.DIVGrid = GameStorage.gameGrid.initializeGrid();

	//Status Bars initialization
	Statusbar.initialization(GameStorage.statusBars, 'StatusBar');

	//Initial assignment of one random region to each of the players
	Player.assignInitialRegions(GameStorage.regions, GameStorage.players);

	//Finishing map initialization
	Painter.paintBordersAndInitialRegions(GameStorage.gameGrid.coreGrid, GameStorage.regions);
	Painter.redrawCastledRegions(TurnSystem.playersSequence);
	Region.neutralUpdateAllDiceOnMap();
	Region.delayedUpdateAllDiceOnMap(null);

	//Initial sequence of turns generation
	TurnSystem.classicFisherYatesMethod(TurnSystem.playersSequence);
}

export function startGame(){
	FileManager.playSound('gameStarted');
	TurnSystem.initializeFirstRound();
}