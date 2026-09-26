import { GameStorage } from './GameStorage.js';
import { TurnSystem } from './TurnSystem_class.js';
import { Painter } from './Painter_class.js';
import { AIManager } from './AIManager_class.js';

export class Player{
	constructor(playerID, name, colorClass, colorClassText, arrayRGB){
		//Persistent
		this.playerID = playerID;
		this.name = name;
		this.playerManager = null;
		
		this.colorClass = colorClass;
		this.colorClassText = colorClassText;
		this.arrayRGB = arrayRGB;

		//Changeable
		this.regions = [];
		this.diceRevenue = GameStorage.playerInitialDiceNumber;
		this.strikes = GameStorage.playerInitialAttackNumber;

		//Stats variables
		this.diceThrownTotal = 0;
		this.attackPointsTotal = 0;
		this.lastRound = 1;
		this.maxNumberOfRegions = 1;
		this.diplomaticHistoryVector = new Map();
	}

	updateRegionsMaxNumber(){
		if(this.maxNumberOfRegions < this.regions.length){
			this.maxNumberOfRegions = this.regions.length;
		}
	}

	static checkRegionHasForce(region){
		let result = false;
		if(region.diceNumber > 1){
			result = true;
		}
		return result;
	}

	static initializeAttackHistory(players){
		for(let i=0; i<players.length; i++){
			for(let j=0; j<players.length; j++){
				if(i !== j){
					players[i].diplomaticHistoryVector.set(players[j], 0);
				}
			}
		}
	}

	static checkNeutralAlive(currentTurn){
		if(GameStorage.players[GameStorage.playersNumber].regions.length === 0 &&
			GameStorage.players[GameStorage.playersNumber].lastRound === 1){
			GameStorage.players[GameStorage.playersNumber].lastRound = currentTurn;
		}
	}

	reassignRegionOwnership(oldPlayer, targetRegion){
		if(oldPlayer !== null){
			let oldPlayerPointer = -1;
			for(let i=0;i<oldPlayer.regions.length;i++){
				if(oldPlayer.regions[i].regionID === targetRegion.regionID){
						oldPlayerPointer = i;
						break;
					}				
			}
			if (oldPlayerPointer !== -1) {
			    oldPlayer.regions.splice(oldPlayerPointer, 1);
			}
		}

		//We have to call Painter here: painting before actual reassignment (we need to turn old color OFF)
		Painter.paintConqueredRegion(targetRegion, this);

		if(this.regions.includes(targetRegion) === false){
			//Region instance updates
			targetRegion.owner = this;
			targetRegion.colorClass = this.colorClass;

			//Player instance: pushing to Regions array
			this.regions.push(targetRegion);
		}
	}

	static assignInitialRegions(regions, allPlayers){
	    //Assigning one random region for each of the Players besides Neutral
		const usedRegions = [];
		for(let i=0; i<GameStorage.playersNumber; i++){
			const randomRegion = Math.floor(Math.random() * regions.length);

			if(usedRegions.length < regions.length){
				if(usedRegions.includes(regions[randomRegion].regionID) === false){
					regions[randomRegion].diceNumber = 0;
					regions[randomRegion].castled = false;
					regions[randomRegion].previousCastledStatus = false;

					//allPlayers[i].collectArrayRGB(regions[randomRegion].anchorCell);
					allPlayers[i].reassignRegionOwnership(allPlayers[GameStorage.playersNumber], regions[randomRegion]);

					usedRegions.push(randomRegion);
					for(let j=0; j<regions[randomRegion].adjacentRegions.length; j++){
						if(usedRegions.includes(regions[randomRegion].adjacentRegions[j].regionID) === false){
							usedRegions.push(regions[randomRegion].adjacentRegions[j].regionID);
						}//we are not pushing again if this neighbour has already been put to usedRegions
					}
				}else{
					i--;//try again
				}
			}else{//rare case: all regions and their numbers are marked, but some allPlayers haven't obtained the first region yet
				if(regions[randomRegion].owner === null){
					regions[randomRegion].diceNumber = 0;
					regions[randomRegion].castled = false;
					regions[randomRegion].previousCastledStatus = false;

					//allPlayers[i].collectArrayRGB(regions[randomRegion].anchorCell);
					allPlayers[i].reassignRegionOwnership(allPlayers[GameStorage.playersNumber], regions[randomRegion]);
				}else{
					i--;//try again
				}
			}
		}
	}

	/* disabled
	collectArrayRGB(anchorCell){
		Painter.fillAnchorWithColor(anchorCell, this.colorClass);

		const cssPropertyDescription = window.getComputedStyle(anchorCell.divElement, null).getPropertyValue('background-color');
		//Regular expression: everywhere and case-independent replace rgb(a),brackets,space with nothing. Then split via commas
		const fullArrayRGBA = cssPropertyDescription.replace(/rgba|rgb|[()]|\s/gi, '').split(',');
		
		for(let i=0; i<3; i++){
			this.arrayRGB.push(Number(fullArrayRGBA[i]));
		}
	}

	static fillAnchorWithColor(anchorCell, colorClass){
		Player.divElement.classList.add(colorClass);
	}*/

	static attack(regionInvader, regionDefender){
		let statusCode = 0; //failed attempt

		function diceRoll(diceNumber){
			let result = 0;
			for(let i=0; i<diceNumber; i++){
				result += Math.floor(Math.random()*6)+1;
			}	
			return result;
		}

		GameStorage.players[regionInvader.owner.playerID].strikes--;

		regionInvader.castledCounter = 0;
		regionDefender.castledCounter = 0;
		regionInvader.castled = false;
		regionDefender.castled = false;

		//Global game stats
		regionInvader.owner.diceThrownTotal += regionInvader.diceNumber;
		regionDefender.owner.diceThrownTotal += regionDefender.diceNumber;

		let attackPointsInvader = diceRoll(regionInvader.diceNumber);
		let attackPointsDefender = diceRoll(regionDefender.diceNumber);

		regionInvader.owner.attackPointsTotal += attackPointsInvader;
		regionDefender.owner.attackPointsTotal += attackPointsDefender;

		//AI-related logic for diplomaticHistoryVector and Strikes stats
        let currentInvasionAttemptsNumber = regionDefender.owner.diplomaticHistoryVector.get(regionInvader.owner);
        regionDefender.owner.diplomaticHistoryVector.set(regionInvader.owner, currentInvasionAttemptsNumber + 1);

        let currentStrikesStatsInv = AIManager.strikesCompletedStats.get(regionInvader.owner);        
        AIManager.strikesCompletedStats.set(regionInvader.owner, [currentStrikesStatsInv[0], (currentStrikesStatsInv[1]+1), currentStrikesStatsInv[2], currentStrikesStatsInv[3]]);
        if(regionDefender.owner !== GameStorage.players[GameStorage.playersNumber]){
        	let currentStrikesStatsDef = AIManager.strikesCompletedStats.get(regionDefender.owner);
        	AIManager.strikesCompletedStats.set(regionDefender.owner, [currentStrikesStatsDef[0], currentStrikesStatsDef[1], currentStrikesStatsDef[2], (currentStrikesStatsDef[3]+1)]);
        }

		if(attackPointsInvader > attackPointsDefender){
			statusCode = 2;
			if(regionInvader.owner.playerManager.playerHuman && regionInvader.diceNumber < regionDefender.diceNumber){
				statusCode = 1; // An audacious attack attempt has been successful
			}

			regionDefender.diceNumber = regionInvader.diceNumber - 1;
			regionInvader.diceNumber = 1;

			Painter.displayDuelResults(regionInvader, regionDefender, attackPointsInvader, attackPointsDefender);
			GameStorage.players[regionInvader.owner.playerID].reassignRegionOwnership(GameStorage.players[regionDefender.owner.playerID], regionDefender);
		}else{
    		//User-friendly enhancement: attacking Neutral player during the first round is always successful for Human, and 85% chance for AI
			if(TurnSystem.roundNumber === 1 && regionDefender.owner === GameStorage.players[GameStorage.playersNumber]
				&& (regionInvader.owner.playerManager.playerHuman || Math.random() > 0.15)){
				statusCode = 2;

				//Game stats corrections: we imply that intial player's Dice Number is > initial Neutral's Dice number
				regionInvader.owner.attackPointsTotal = attackPointsDefender + diceRoll(regionInvader.diceNumber-GameStorage.neutralDiceNumber);
				
				regionDefender.diceNumber = regionInvader.diceNumber - 1;
				regionInvader.diceNumber = 1;

				Painter.displayDuelResults(regionInvader, regionDefender, regionInvader.owner.attackPointsTotal, attackPointsDefender);
				GameStorage.players[regionInvader.owner.playerID].reassignRegionOwnership(GameStorage.players[regionDefender.owner.playerID], regionDefender);
			}else{
				Painter.displayDuelResults(regionInvader, regionDefender, attackPointsInvader, attackPointsDefender);
				if(regionDefender.diceNumber === 6 && regionInvader.diceNumber === 6){
					regionDefender.diceNumber = 4;
				}else if(regionDefender.diceNumber > 1){
					regionDefender.diceNumber--;
				}
				regionInvader.diceNumber = 1;
			}
		}

		return statusCode;
	}

	static processEndRoundEconomy(allRegions, alivePlayers){
		//Firstly we assign Castled status for all qualified regions (besides Neutral player)
		for(let i=0; i<allRegions.length; i++){
			if(!allRegions[i].castled && allRegions[i].owner.playerID !== GameStorage.playersNumber){
				allRegions[i].castledCounter++;
				if(allRegions[i].castledCounter >= GameStorage.castleThreshold){
					allRegions[i].castled = true;
				}
			}
		}

		for(let i=0; i<alivePlayers.length; i++){
			let isolationPower = 1;
			let playerResources = alivePlayers[i].computePlayerResources();

			if(playerResources.isolation){
				isolationPower = (TurnSystem.playersSequence.length>2 ? 0.65 : 0.8);
			}

			//Economy recalculation main formulas
			if(TurnSystem.playersSequence.length > 2){
				alivePlayers[i].diceRevenue = Math.round(Math.pow((0.7*playerResources.castledFrontierRegions + 2*playerResources.castledNonFrontierRegions/alivePlayers.length), isolationPower) + playerResources.enemyNeighbours);
				alivePlayers[i].strikes = Math.round((GameStorage.playersNumber-alivePlayers.length)/3 + Math.pow(playerResources.nonCastledRegionsNumber, 0.7));
			}else{
				//When only 2 players are left, economy recalculations are simplified - balance becomes fragile now
				alivePlayers[i].diceRevenue = Math.round(Math.pow(Math.max((playerResources.castledNonFrontierRegions+playerResources.castledFrontierRegions) - 8, 0), isolationPower));
				alivePlayers[i].strikes = playerResources.nonCastledRegionsNumber;
			}

			if(alivePlayers[i].diceRevenue < 1){
				alivePlayers[i].diceRevenue = 1;
			}
			//Special case - punishing turtle players
			if(AIManager.strikesCompletedStats.get(alivePlayers[i])[0] === 0 && AIManager.strikesCompletedStats.get(alivePlayers[i])[2] === 0
				&& alivePlayers[i].regions.length === 1
				&& playerResources.enemyNeighbours === 1 && !alivePlayers[i].regions[0].castled){
					alivePlayers[i].diceRevenue = 0;
			}			
			//Last Hope rule
			if(alivePlayers[i].regions.length === 1 && alivePlayers[i].diceRevenue < 2){
				for(let j=0; j<alivePlayers[i].regions[0].adjacentRegions.length; j++){
					if(alivePlayers[i].regions[0].adjacentRegions[j].diceNumber > alivePlayers[i].regions[0].diceNumber
						&& alivePlayers[i].regions[0].adjacentRegions[j].owner !== GameStorage.players[GameStorage.playersNumber]){
						alivePlayers[i].diceRevenue = 2;
						break;
					}
				}
			}

			if(alivePlayers[i].strikes < 2){
				if(playerResources.nonCastledRegionsNumber > 0){
					alivePlayers[i].strikes = 2;
				}else{
					alivePlayers[i].strikes = 1;
				}

			}
		}
	}

	computePlayerResources(){
		let castledRegionsNumber = 0;
		let integrityStatus = true;

		let castledFrontierRegionsNumber = new Set();
		let adjacentEnemyPlayers = new Set();
		let isolatedRegions = new Set();

		for(let i=0; i<this.regions.length; i++){
			let isolationCheck = false;

			if(this.regions[i].castled === true){
				castledRegionsNumber++;
			}

			for(let j=0; j<this.regions[i].adjacentRegions.length; j++){
				if(this.regions[i].adjacentRegions[j].owner !== this &&
				   this.regions[i].adjacentRegions[j].owner !== GameStorage.players[GameStorage.playersNumber]){
					adjacentEnemyPlayers.add(this.regions[i].adjacentRegions[j].owner);
					if(this.regions[i].castled === true){
						castledFrontierRegionsNumber.add(this.regions[i]);
					}
				}
				if(this.regions[i].adjacentRegions[j].owner === this){
					isolationCheck = true;
				}
			}
			if(!isolationCheck){
				isolatedRegions.add(this.regions[i]);
			}
		}

		if(isolatedRegions.size > 0 && this.regions.length > 1){
			integrityStatus = false;
		}else if(this.regions.length > 3){ 	//More complex check needed in case there isn't a single isolated region
			let regionsGraph = new Map();
			let reachedVertices = [];

			for(let i=0; i<this.regions.length; i++){
				let friendlyAdjacentRegions = [];

				for(let j=0; j<this.regions[i].adjacentRegions.length; j++){
					if(this === this.regions[i].adjacentRegions[j].owner){
						friendlyAdjacentRegions.push(this.regions[i].adjacentRegions[j].regionID);
					}
				}
				regionsGraph.set(this.regions[i].regionID, friendlyAdjacentRegions);
			}

			reachedVertices.push(this.regions[0].regionID);
			let localIndex = 0;

			do{
				for(let adjacentVertex of regionsGraph.get(reachedVertices[localIndex])){
					let alreadyReached = reachedVertices.indexOf(adjacentVertex);
					if(alreadyReached === -1){
						reachedVertices.push(adjacentVertex);
					}
				}
				localIndex++;
			}while(localIndex < reachedVertices.length)

			if(reachedVertices.length < regionsGraph.size){
				integrityStatus = false;
			}
		}

		let result = {
			isolation: (!integrityStatus ? true : false),											//Empire integrity
			castledNonFrontierRegions: (castledRegionsNumber - castledFrontierRegionsNumber.size),	//Empire core
			castledFrontierRegions: castledFrontierRegionsNumber.size,								//Stable frontier
			enemyNeighbours: adjacentEnemyPlayers.size,												//Contacts
			nonCastledRegionsNumber: (this.regions.length - castledRegionsNumber)					//Open frontier
		}
		return result;
	}
}