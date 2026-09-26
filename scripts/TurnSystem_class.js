import { GameStorage } from './GameStorage.js';
import { Region } from './Region_class.js';
import { Player } from './Player_class.js';
import { Statusbar } from './StatusBar_class.js';
import { Painter } from './Painter_class.js';
import { StatsTable } from './StatsTable_class.js';
import { HumanManager } from './HumanManager_class.js';
import { AIManager } from './AIManager_class.js';
import { FileManager } from './FileManager_class.js';

export class TurnSystem{
	static roundNumber = 1;
	static humanIsAlive = true;

    static selectedRegion = null;
    static selectedRegionAttacked = null;

	static operativePlayer = null;
	static roundPlayersPointer = 0;
	static playersSequence = [];

	static async initializeFirstRound(){
		TurnSystem.roundPlayersPointer = 0;
		TurnSystem.operativePlayer = TurnSystem.playersSequence[TurnSystem.roundPlayersPointer];

		if(TurnSystem.operativePlayer.playerManager.playerHuman){
			GameStorage.statusBars[TurnSystem.operativePlayer.playerID].divButtonElement.classList.remove('endturn-button-invisible');
		}
		GameStorage.statusBars[TurnSystem.operativePlayer.playerID].divElement.classList.add('status-bar-tile-highlighted');

		Statusbar.setStatusBarNames(GameStorage.statusBars);
		Statusbar.updateStatusBarInfoInitialization(TurnSystem.playersSequence);

		await TurnSystem.forceDelay(1300);
		if(!TurnSystem.operativePlayer.playerManager.playerHuman){
	        FileManager.playSound('aiTurnStart');
			await TurnSystem.forceDelay(400);
		}
		TurnSystem.operativePlayer.playerManager.processStartTurn();
	}

	static async passToNextPlayer(){
		let currentPlayer = TurnSystem.operativePlayer;
		currentPlayer.updateRegionsMaxNumber();

		TurnSystem.roundPlayersPointer++;
		TurnSystem.operativePlayer = TurnSystem.playersSequence[TurnSystem.roundPlayersPointer];

		//A pause before highlighting the following status bar
		await TurnSystem.forceDelay(200);
		Painter.endTurnTileRemoval(currentPlayer);
		Painter.focusEndTurnButton(currentPlayer, 'OFF');

		//A pause before passing the turn to the next player
		await TurnSystem.forceDelay(300);
		Painter.endTurnTileDisplay(TurnSystem.operativePlayer);

		//An additional pause before the AI turn begins in fact
		if(!TurnSystem.operativePlayer.playerManager.playerHuman){
	        FileManager.playSound('aiTurnStart');
			await TurnSystem.forceDelay(500);
		}

		TurnSystem.operativePlayer.playerManager.processStartTurn();
	}

	static async startNextRound(){
		let reshuffled = true;
		let currentPlayer = TurnSystem.operativePlayer;
		currentPlayer.updateRegionsMaxNumber();

		if(TurnSystem.playersSequence.length>2){
			let currentSequenceArray = [...TurnSystem.playersSequence];
			do{
				TurnSystem.classicFisherYatesMethod(TurnSystem.playersSequence);
			}while(TurnSystem.playersSequence[0] === currentPlayer); //A player can't have their turn twice in a row
			if(TurnSystem.playersSequence.every((item, i) => item === currentSequenceArray[i])){
				reshuffled = false;
			}
		}else if(TurnSystem.playersSequence.length === 2){
			//When only two player are left, the reshuffling happens in 15% cases
			if(Math.random() > 0.85){
				[TurnSystem.playersSequence[0], TurnSystem.playersSequence[1]] = [TurnSystem.playersSequence[1], TurnSystem.playersSequence[0]];
			}else{
				reshuffled = false;
			}
		}

		TurnSystem.roundPlayersPointer = 0;
		TurnSystem.operativePlayer = TurnSystem.playersSequence[TurnSystem.roundPlayersPointer];

		Player.checkNeutralAlive(TurnSystem.roundNumber);
		TurnSystem.roundNumber++;

		Painter.endTurnTileRemoval(currentPlayer);
		Painter.focusEndTurnButton(currentPlayer, 'OFF');

		AIManager.strikesStatsRefresh();
		if([4,5].includes(TurnSystem.playersSequence.length)){
			AIManager.refreshAllies(TurnSystem.playersSequence);
		}

		//End-round's reinforcements
		Player.processEndRoundEconomy(GameStorage.regions, TurnSystem.playersSequence);
		
		if(reshuffled){
			FileManager.playSound('reshuffling');
		}
		Statusbar.updateStatusBarInfoEndRound(TurnSystem.playersSequence);
		await TurnSystem.forceDelay(1250);

		Painter.redrawCastledRegions(TurnSystem.playersSequence);
		await Region.delayedUpdateAllDiceOnMap('DELAYED');

		Painter.endTurnTileDisplay(TurnSystem.operativePlayer);
		await TurnSystem.forceDelay(900);
		TurnSystem.operativePlayer.playerManager.processStartTurn();
	}

	static eliminatingPlayers(){
		for(let i=0;i<TurnSystem.playersSequence.length;i++){
			if(TurnSystem.playersSequence[i].regions.length === 0){
				GameStorage.players[TurnSystem.playersSequence[i].playerID].lastRound = TurnSystem.roundNumber;
				if(TurnSystem.playersSequence[i].playerManager.playerHuman){
					TurnSystem.humanIsAlive = false; 
				}else{
					if(TurnSystem.playersSequence.length !== 2){
						FileManager.playSound('defeatedAI');
					}
				}

				TurnSystem.playersSequence.splice(i,1);
				i--;

				TurnSystem.checkGameOver();
				if(TurnSystem.roundPlayersPointer > TurnSystem.playersSequence.length - 1){
					TurnSystem.roundPlayersPointer = TurnSystem.playersSequence.length - 1;
				}

				if(TurnSystem.playersSequence.length === 5){ //Setting initial allies
					AIManager.chooseAllies(TurnSystem.playersSequence);
				}else if(TurnSystem.playersSequence.length < 4){ //Removing all allies
					AIManager.refreshAllies(TurnSystem.playersSequence);
				}
			}
		}
	}

	static async checkGameOver(){
		if(TurnSystem.playersSequence.length === 1 || !TurnSystem.humanIsAlive){
			HumanManager.handleClickEnabled = false;

			for(let i=0; i<TurnSystem.playersSequence.length; i++){
				GameStorage.statusBars[TurnSystem.playersSequence[i].playerID].divButtonElement.classList.add('endturn-button-invisible');
				GameStorage.statusBars[TurnSystem.playersSequence[i].playerID].divElement.classList.remove('status-bar-tile-highlighted');
				TurnSystem.playersSequence[i].updateRegionsMaxNumber();	
				GameStorage.players[TurnSystem.playersSequence[i].playerID].lastRound = TurnSystem.roundNumber + 1;//for sorting always
			}
			await TurnSystem.forceDelay(700);
			StatsTable.prepareFinalStatsTable();
			StatsTable.showFinalStatsTable('StatsDiv', 'tbody-stats-table', 'WinTitle');
		}
	}

	static async delayedAttack(regionInvader, regionDefender){
		if(regionInvader.diceNumber>1 && regionInvader.owner.playerID !== regionDefender.owner.playerID){
			if(regionInvader.owner.playerManager.playerHuman){
				Painter.endTurnButtonHide(regionInvader.owner);
			}

			//Highlighting dueling regions with delays before actual attack and triggering "uncastling"
			Painter.highlightDuelingRegion(regionInvader, 'ON', false);
			Painter.triggerCastledTransition(regionInvader);
			await TurnSystem.forceDelay(280);
			Painter.highlightDuelingRegion(regionDefender, 'ON', true);
			Painter.triggerCastledTransition(regionDefender);
			await TurnSystem.forceDelay(300);

			let currentOwner = regionDefender.owner;
	   		
	   		FileManager.playSound('rollingDice');
	   		let statusCode = Player.attack(regionInvader, regionDefender);
			await TurnSystem.forceDelay(350);
			switch(statusCode){
				case 0: 
					FileManager.playSound('failedAttempt');
					break;
				case 1: 
					FileManager.playSound('audaciousAttempt');
					break;
				default: 
					//no sound for default success
					break;
			}
			await TurnSystem.forceDelay(250); //Attack results dependent delays in css: 250+350ms

			Painter.paintRegion(regionInvader, regionInvader.owner.colorClass, 'ON', regionInvader.castled);
			Painter.paintRegion(regionDefender, regionDefender.owner.colorClass, 'ON', regionDefender.castled);
			TurnSystem.eliminatingPlayers();

	    	await Statusbar.updateStatusBarInfoUponAttack(GameStorage.statusBars[regionInvader.owner.playerID], currentOwner, TurnSystem.playersSequence);
			Statusbar.checkEndTurnButtonFocus(regionInvader.owner);
			
			//Update sequence pointer if a non-neutral player has been defeated
			if(currentOwner.regions.length === 0 &&	currentOwner !== GameStorage.players[GameStorage.playersNumber]){
				TurnSystem.roundPlayersPointer = TurnSystem.playersSequence.indexOf(regionInvader.owner);
			}

			//Manipulating static selected Regions only for human attacks
			if(regionInvader.owner.playerManager.playerHuman){
				Painter.highlightRegionClick(TurnSystem.selectedRegion, 'OFF');
	            Painter.zoomInChosenDie(TurnSystem.selectedRegion.anchorCell.divElement, 'OFF');
				TurnSystem.selectedRegion = null;
				TurnSystem.selectedRegionAttacked = null;
			}

			Region.refreshRegionDiceImage(regionInvader);
			Region.refreshRegionDiceImage(regionDefender);

			Painter.highlightDuelingRegion(regionInvader, 'OFF', false);
			Painter.highlightDuelingRegion(regionDefender, 'OFF', true);

	    	if(currentOwner.regions.length === 0 && currentOwner !== GameStorage.players[GameStorage.playersNumber]){
				await TurnSystem.forceDelay(1400);// to cope with potential calculation bug during AI caused elimination
	    	}

			if(regionInvader.owner.playerManager.playerHuman){
				Painter.endTurnButtonShow(regionInvader.owner);
			}

			//Adding an additional delay between AI players' strikes
			if(!regionInvader.owner.playerManager.playerHuman){
				await TurnSystem.forceDelay(350);
			}
		}
	}

	static classicFisherYatesMethod(array){
		for (let i = array.length-1; i>0; i--){
   		 	const j = Math.floor(Math.random()*(i+1));
    		[array[i], array[j]] = [array[j], array[i]];
  		}
	}

	static async forceDelay(delayDuration){
		return new Promise(resolveFunction => setTimeout(resolveFunction, delayDuration));
	}
}	