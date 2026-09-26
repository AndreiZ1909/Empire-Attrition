import { GameStorage } from './GameStorage.js';
import { PlayerManager } from './PlayerManager_class.js';
import { TurnSystem } from './TurnSystem_class.js';

export class AIManager extends PlayerManager{
    static strikesCompletedStats = new Map();

    constructor(playerInstanceReference){
        //Persistent
        super(false);
        this.playerInstanceReference = playerInstanceReference;             //backward player instance reference
        this.behaviorVector = [];

        this.turnStrikesNumber = 0;
        this.legacyRegions = new Set();                                     //instances
        this.competitorsAnalysis = new Map();                               //{player: stats} pairs
        this.powerfulNeighbours = new Set();                                //player instances
        this.weakNeighbours = new Set();                                    //player instances
        this.playersNotActedInCurrentRound = new Set();                     //player instances
        this.enemyCastledRegionsDisruption = [];                            //possibleAttack instances
        this.fullDiceInvaders = [];                                         //possibleAttack instances
        this.enemyNeighboursList = new Set();                               //player instances
        this.adjacentEnemyRegions = new Set();                              //region instances
        this.diplomaticHistory = new Map();                                 //{player:influence} pairs
        this.dominatingEnemies = new Set();                                 //player instances
        this.ally = null;                                                   //player instance
        this.focusVictim = null;                                            //player instance        
    }

    async processStartTurn(){
        let attackPossible = false;

        for(let i=0; i<this.playerInstanceReference.regions.length; i++){
            if(this.playerInstanceReference.regions[i].diceNumber !== 1){
                for(let j=0; j<this.playerInstanceReference.regions[i].adjacentRegions.length; j++){
                    if(this.playerInstanceReference.regions[i].adjacentRegions[j].owner !== this.playerInstanceReference){
                        attackPossible = true;
                        break;
                    }
                }
            }
        }
        if(attackPossible){
            this.turnPreAnalysis();

            let decision;
            while(this.playerInstanceReference.strikes > 0 && TurnSystem.humanIsAlive){
                decision = this.decideNextMove(this.playerInstanceReference);

                if(decision.verdict){
                    await this.processAction(decision.regionInvader, decision.regionDefender);
                }else{
                    break;
                }
            }
        }
        if(TurnSystem.humanIsAlive){ // The game is over check - stop AI process if human has been defeated
            this.competitorsAnalysis.clear();
            this.playersNotActedInCurrentRound.clear();
            this.diplomaticHistory.clear();
            this.dominatingEnemies.clear();
            this.powerfulNeighbours.clear();
            this.weakNeighbours.clear();   
            this.turnStrikesNumber = 0;
 
            //Rarely Bot's behavior alters completely
            if(Math.random() < 0.02){
                this.behaviorVector = [];
                for(let i=0; i<6; i++){
                    let option = Math.floor(Math.random() * 3);
                    this.behaviorVector.push(GameStorage.botBehaviorVectors[i][option]);
                }
            }

            //No more attacks planned - filling out LegacyRegions, if the empire has been integrated at the beginning of the turn
            if(this.legacyRegions.size === 0){
                for(let i=0; i<this.playerInstanceReference.regions.length; i++){
                    this.legacyRegions.add(this.playerInstanceReference.regions[i]);
                } 
            }

            this.processEndTurn();
        }
    }

    async processAction(regionInvader, regionDefender){
        await TurnSystem.delayedAttack(regionInvader, regionDefender);
    }

    async processEndTurn(){
        if(TurnSystem.roundPlayersPointer < TurnSystem.playersSequence.length-1){
            await TurnSystem.passToNextPlayer();
        }else{
            await TurnSystem.startNextRound();
        }
    }

    decideNextMove(AIplayer){
        let decision = {
            verdict: false,
            regionInvader: null,
            regionDefender: null
        }

        //Clearing instance variables related to one attack
        this.enemyCastledRegionsDisruption = [];
        this.fullDiceInvaders = [];
        this.enemyNeighboursList.clear();
        this.adjacentEnemyRegions.clear();

        //Finding all possible attacks
        let possibleAttacks = [];
        for(let i=0; i<AIplayer.regions.length; i++){
            if(AIplayer.regions[i].diceNumber > 1){
                for(let j=0; j<AIplayer.regions[i].adjacentRegions.length; j++){
                    if(AIplayer.regions[i].adjacentRegions[j].owner !== AIplayer){
                        let possibleAttack = {
                            regionInvader: AIplayer.regions[i],
                            regionDefender: AIplayer.regions[i].adjacentRegions[j],
                            rating: 50
                        }
                        possibleAttacks.push(possibleAttack);
                    }
                }
            }

            //Collecting all regions, which are adjacent to player's regions
            for(let j=0; j<AIplayer.regions[i].adjacentRegions.length; j++){
                if(AIplayer.regions[i].adjacentRegions[j].owner !== AIplayer &&
                    AIplayer.regions[i].adjacentRegions[j].owner !== GameStorage.players[GameStorage.playersNumber]){
                    this.adjacentEnemyRegions.add(AIplayer.regions[i].adjacentRegions[j]);
                }
            }
        }

        if(possibleAttacks.length > 0){
            let bestAttack = null;

            //Collecting all non-neutral neighbours
            for(let i=0; i<AIplayer.regions.length; i++){
                for(let j=0; j<AIplayer.regions[i].adjacentRegions.length; j++){
                    if(AIplayer.regions[i].adjacentRegions[j].owner !== AIplayer &&
                        AIplayer.regions[i].adjacentRegions[j].owner !== GameStorage.players[GameStorage.playersNumber]){
                        this.enemyNeighboursList.add(AIplayer.regions[i].adjacentRegions[j].owner);
                    }
                }
            }

            //Collecting current Invader's status
            let invaderCurrentStatus = this.playerInstanceReference.computePlayerResources();

            //Evaluating each possible attack
            for(let i=0; i<possibleAttacks.length; i++){
                let currentStatusDefender;
                let integrityOfDefenderAfterInvasion;            
                if(possibleAttacks[i].regionDefender.owner !== GameStorage.players[GameStorage.playersNumber]){
                    currentStatusDefender = possibleAttacks[i].regionDefender.owner.computePlayerResources();
                    integrityOfDefenderAfterInvasion = AIManager.exploreEmpireIntegrityRegionMinus(possibleAttacks[i].regionDefender.owner, possibleAttacks[i].regionDefender);
                }


                ////Turn-overview rules
                //Exposure bonus
                possibleAttacks[i].rating -= this.powerfulNeighbours.size; //[static]
                
                //An attack is safer, if defender player already had their turn within current round
                if(!this.playersNotActedInCurrentRound.has(possibleAttacks[i].regionDefender.owner) && 
                    possibleAttacks[i].regionDefender.owner !== GameStorage.players[GameStorage.playersNumber]){
                    possibleAttacks[i].rating += 3; //[static]
                }

                //An attack is safer, if Invader player possesses more strikes within current turn
                if(TurnSystem.playersSequence.length > 2){
                    let strikesFactor = AIplayer.strikes - ((this.powerfulNeighbours.size>0 || possibleAttacks[i].regionInvader.owner.regions.length>5) ? (2*this.turnStrikesNumber+(TurnSystem.playersSequence.length>3 ? 0 : -2)) : (this.turnStrikesNumber+1));
                    possibleAttacks[i].rating += (AIplayer.strikes !== this.turnStrikesNumber ? strikesFactor : AIplayer.strikes); //[static]
                }

                //Slightly prioritize an attack, if the region has reached dice maximum 
                if(possibleAttacks[i].regionInvader.diceNumber === GameStorage.regionDiceLimit){
                    possibleAttacks[i].rating += 2; //[static]
                }


                ////Neutral-related rules
                //It is safer to attack once a player doesn't have enemy neighbours yet
                if(this.enemyNeighboursList.size === 0){
                    possibleAttacks[i].rating += 10; //[static]
                }

                //Calm players are more likely to expand via neutral territories
                if(possibleAttacks[i].regionDefender.owner === GameStorage.players[GameStorage.playersNumber]){
                    possibleAttacks[i].rating += Math.floor(Math.random()*4) + (this.enemyNeighboursList.size===1 ? 2 : 0) + 2*this.behaviorVector[4]; //[hostile]
                }


                ////Castled regions rules
                //Checking Castled statuses
                if(possibleAttacks[i].regionDefender.castled && possibleAttacks[i].regionDefender.owner !== GameStorage.players[GameStorage.playersNumber]){
                    possibleAttacks[i].rating += 2; //[static]
                }
                if(possibleAttacks[i].regionInvader.castled){
                    possibleAttacks[i].rating -= 1; //[static]                    
                    for(let j=0; j<possibleAttacks[i].regionInvader.adjacentRegions.length; j++){
                        if(possibleAttacks[i].regionInvader.adjacentRegions[j].owner !== GameStorage.players[GameStorage.playersNumber] &&
                            possibleAttacks[i].regionInvader.adjacentRegions[j].owner !== AIplayer){
                            possibleAttacks[i].rating -= (2-this.behaviorVector[1]); //[prudent]
                            break;
                        }
                    }                 
                }

                //Checking whether an attack would convert enemy's empire core into a stable frontier
                if(possibleAttacks[i].regionDefender.owner !== GameStorage.players[GameStorage.playersNumber]){
                    let coreRearguardCounter = (possibleAttacks[i].regionDefender.castled ? -1 : 0);
                    for(let j=0; j<possibleAttacks[i].regionDefender.adjacentRegions.length; j++){
                        if(possibleAttacks[i].regionDefender.adjacentRegions[j].owner === possibleAttacks[i].regionDefender.owner && 
                            possibleAttacks[i].regionDefender.adjacentRegions[j].castled){
                            let empireCoreCheck = true;
                            for(let k=0; k<possibleAttacks[i].regionDefender.adjacentRegions[j].adjacentRegions.length; k++){
                                if(possibleAttacks[i].regionDefender.adjacentRegions[j].adjacentRegions[k].owner !== GameStorage.players[GameStorage.playersNumber] &&
                                    possibleAttacks[i].regionDefender.adjacentRegions[j].adjacentRegions[k].owner !== possibleAttacks[i].regionDefender.owner){
                                        empireCoreCheck = false;
                                }
                            }
                            if(empireCoreCheck){
                                coreRearguardCounter++;
                            }
                        }
                    }
                    possibleAttacks[i].rating -= Math.round(1.5*Math.max(coreRearguardCounter, 0));
                }

                //Prioritizing invading non-castled regions in case its owner has limited attacks number
                if(possibleAttacks[i].regionDefender.owner !== GameStorage.players[GameStorage.playersNumber]){
                    let invaderNonCastledRegionsNumber = 0;
                    for(let j=0; j<possibleAttacks[i].regionInvader.owner.regions.length; j++){
                        if(!possibleAttacks[i].regionInvader.owner.regions[j].castled){
                            invaderNonCastledRegionsNumber++;
                        }
                    }
                    let defenderNonCastledRegionsNumber = currentStatusDefender.nonCastledRegionsNumber;
                    if(invaderNonCastledRegionsNumber>defenderNonCastledRegionsNumber && possibleAttacks[i].regionDefender.castled){
                        possibleAttacks[i].rating -= 3; //[static]
                    }
                }


                ////General map frontline overview rules
                //Checking how many additional friendly regions will the conquered region possess
                let friendlyRegionsAtTargetCounter = -1;
                let neutralNewNeighbourRegionsExist = false;
                for(let j=0; j<possibleAttacks[i].regionDefender.adjacentRegions.length; j++){
                    if(possibleAttacks[i].regionDefender.adjacentRegions[j].owner === AIplayer){
                        friendlyRegionsAtTargetCounter++;
                    }
                    if(possibleAttacks[i].regionDefender.adjacentRegions[j].owner === GameStorage.players[GameStorage.playersNumber]){
                        neutralNewNeighbourRegionsExist = true;
                    }
                }
                if(friendlyRegionsAtTargetCounter > 0){
                    possibleAttacks[i].rating += 2*friendlyRegionsAtTargetCounter; //[static]
                }else if(!neutralNewNeighbourRegionsExist){
                    possibleAttacks[i].rating -= 16;
                }

                //Checking whether a successful attack will bring new enemy neighbours
                let enemyNeighboursListOneAttack = new Set();
                for(let j=0; j<possibleAttacks[i].regionDefender.adjacentRegions.length; j++){
                    if(possibleAttacks[i].regionDefender.adjacentRegions[j].owner !== GameStorage.players[GameStorage.playersNumber] &&
                        possibleAttacks[i].regionDefender.adjacentRegions[j].owner !== AIplayer &&
                        !this.enemyNeighboursList.has(possibleAttacks[i].regionDefender.adjacentRegions[j].owner) &&
                        !enemyNeighboursListOneAttack.has(possibleAttacks[i].regionDefender.adjacentRegions[j].owner)){
                        possibleAttacks[i].rating += 2*this.behaviorVector[2]; //[reserved]
                        enemyNeighboursListOneAttack.add(possibleAttacks[i].regionDefender.adjacentRegions[j].owner);
                    }
                }

                //Decrease rating of the attack, if new region is already surrounded with enemy regions
                if(possibleAttacks[i].regionDefender.owner !== GameStorage.players[GameStorage.playersNumber]
                    && possibleAttacks[i].regionInvader.owner.regions.length>2){
                    let invadingNest = true;
                    for(let j=0; j<possibleAttacks[i].regionDefender.adjacentRegions.length; j++){
                        if(possibleAttacks[i].regionDefender.adjacentRegions[j].owner !== possibleAttacks[i].regionDefender.owner
                            && possibleAttacks[i].regionDefender.adjacentRegions[j] !== possibleAttacks[i].regionInvader){
                            invadingNest = false;
                            break;
                        }
                    }
                    if(invadingNest){
                        possibleAttacks[i].rating -= 16; //[static]
                    }
                }

                //Checking if it is safe to attack considering a back-stab attack perspective towards the Invader region
                if(possibleAttacks[i].regionInvader.owner.regions.length>1){
                    let rearguardAttackFactor = 0;
                    let probabilityFactor = 0;
                    for(let j=0; j<possibleAttacks[i].regionInvader.adjacentRegions.length; j++){
                        if(possibleAttacks[i].regionInvader.adjacentRegions[j].owner !== GameStorage.players[GameStorage.playersNumber]
                           && possibleAttacks[i].regionInvader.adjacentRegions[j].owner !== AIplayer){
                            if(possibleAttacks[i].regionInvader.adjacentRegions[j] !== possibleAttacks[i].regionDefender){
                                if(possibleAttacks[i].regionInvader.adjacentRegions[j].diceNumber > 1){
                                    probabilityFactor = possibleAttacks[i].regionInvader.adjacentRegions[j].diceNumber-1;
                                    if(probabilityFactor > rearguardAttackFactor){
                                        rearguardAttackFactor = probabilityFactor;
                                    }
                                }
                            }else{ //In case the considered attack fails
                                if(possibleAttacks[i].regionInvader.adjacentRegions[j].diceNumber-1 > 1){
                                    probabilityFactor = possibleAttacks[i].regionInvader.adjacentRegions[j].diceNumber-2;
                                    if(probabilityFactor > rearguardAttackFactor){
                                        rearguardAttackFactor = probabilityFactor;
                                    }
                                }
                            }
                        }
                    }
                    possibleAttacks[i].rating -= Math.round(rearguardAttackFactor*(1+this.behaviorVector[3])); //[self-concerned]
                }

                //Checking how global frontier expands in case the attack is successful
                let newEnemyAdjacentRegionsCounter = 0;
                for(let j=0; j<possibleAttacks[i].regionDefender.adjacentRegions.length; j++){
                    if(!this.adjacentEnemyRegions.has(possibleAttacks[i].regionDefender.adjacentRegions[j])
                        && possibleAttacks[i].regionDefender.adjacentRegions[j].owner !== GameStorage.players[GameStorage.playersNumber]
                        && possibleAttacks[i].regionDefender.adjacentRegions[j].owner !== AIplayer){
                        newEnemyAdjacentRegionsCounter++;
                    }
                }
                possibleAttacks[i].rating += Math.round(newEnemyAdjacentRegionsCounter*this.behaviorVector[0]); //[passive]

                //Prioritizing attacks based on diplomatic relationships, stored in diplomaticHistory
                if(possibleAttacks[i].regionDefender.owner !== GameStorage.players[GameStorage.playersNumber]){
                    possibleAttacks[i].rating += Math.floor(this.diplomaticHistory.get(possibleAttacks[i].regionDefender.owner)*(2.25-this.behaviorVector[4])); //[hostile]
                }


                //Core Integrity rules
                //Cancelling an attack in case it will make Defender's empire integrated again
                if(possibleAttacks[i].regionDefender.owner !== GameStorage.players[GameStorage.playersNumber]){
                    if(([3,4].includes(possibleAttacks[i].regionDefender.owner.regions.length) && possibleAttacks[i].regionInvader.owner.regions.length>possibleAttacks[i].regionDefender.owner.regions.length)
                    || possibleAttacks[i].regionDefender.owner.regions.length > 4){
                        if(currentStatusDefender.isolation){
                            if(integrityOfDefenderAfterInvasion){
                                possibleAttacks[i].rating -= 40; //[static]
                            }
                        }
                    }
                }

                //Keeping the Empire integrated - prioritizing those regions, which have already been possessed
                if(invaderCurrentStatus.isolation && this.legacyRegions.has(possibleAttacks[i].regionDefender)){
                    possibleAttacks[i].rating += 4; //[static]
                }

                //Main integrity engine: checking whether a non-legacyRegion may also lead to recovering empire's integrity
                if(invaderCurrentStatus.isolation){
                    if(AIManager.exploreEmpireIntegrityRegionPlus(AIplayer, possibleAttacks[i].regionDefender)){
                        let fatalityFactor = ((possibleAttacks[i].regionDefender.diceNumber > possibleAttacks[i].regionInvader.diceNumber+1) ? Math.round(5*(possibleAttacks[i].regionDefender.diceNumber-possibleAttacks[i].regionInvader.diceNumber)) : 0);
                        possibleAttacks[i].rating += 12 - fatalityFactor + 2*this.behaviorVector[1]; //[prudent]
                    }
                }

                //Checking if this attack may lead to disconnection of an enemy empire
                if(possibleAttacks[i].regionDefender.owner !== GameStorage.players[GameStorage.playersNumber]
                    && possibleAttacks[i].regionInvader.owner.regions.length>2){
                    if(!currentStatusDefender.isolation && !integrityOfDefenderAfterInvasion){
                        possibleAttacks[i].rating += Math.round((possibleAttacks[i].regionDefender.owner.regions.length>5 ? 6 : 4)*(1.5-this.behaviorVector[3])); //[self-concerned]
                    }
                }


                ////Most crucial rules
                //Hold any attack, if there are neighbours, which have more dice available
                if(this.powerfulNeighbours.size>0 && AIplayer.regions.length>2 &&
                    // alleviating the rule if the defender is much stronger than the Invader AIplayer
                    ((this.powerfulNeighbours.has(possibleAttacks[i].regionDefender.owner) && (possibleAttacks[i].regionDefender.owner.regions.length<1.5*possibleAttacks[i].regionInvader.owner.regions.length))
                    || (!this.powerfulNeighbours.has(possibleAttacks[i].regionDefender.owner) && possibleAttacks[i].regionDefender.owner.regions.length < 5))){
                    possibleAttacks[i].rating -= (4+this.behaviorVector[5]); //[tactical]
                }else if(this.powerfulNeighbours.size>0 && AIplayer.regions.length===1){
                    possibleAttacks[i].rating += 8; // [static]
                }

                //Calculating win probability %
                let winProbability = AIManager.winProbabilityMatrix(possibleAttacks[i].regionInvader.diceNumber, possibleAttacks[i].regionDefender.diceNumber);
                possibleAttacks[i].rating += Math.round((winProbability<0 ? winProbability : winProbability/3) + this.behaviorVector[0]*(TurnSystem.playersSequence.length>5 ? 1 : 2)); //[passive]

                //Prioritizing an attack, which focuses the strongest enemy in the neighbourhood
                let strongestNeighbourDiceNumber = 1;
                for(let j=0; j<possibleAttacks[i].regionInvader.adjacentRegions.length; j++){
                    if(possibleAttacks[i].regionInvader.adjacentRegions[j].owner !== AIplayer 
                        && possibleAttacks[i].regionInvader.adjacentRegions[j].owner !== GameStorage.players[GameStorage.playersNumber]
                        && possibleAttacks[i].regionInvader.diceNumber > possibleAttacks[i].regionInvader.adjacentRegions[j].diceNumber
                        && possibleAttacks[i].regionInvader.adjacentRegions[j].diceNumber > strongestNeighbourDiceNumber){
                            strongestNeighbourDiceNumber = possibleAttacks[i].regionInvader.adjacentRegions[j].diceNumber;
                    }
                    if(possibleAttacks[i].regionInvader.diceNumber < possibleAttacks[i].regionInvader.adjacentRegions[j].diceNumber){
                        strongestNeighbourDiceNumber = 7;
                        break;
                    }
                }
                if(possibleAttacks[i].regionDefender.diceNumber === strongestNeighbourDiceNumber && strongestNeighbourDiceNumber > 1 &&
                    possibleAttacks[i].regionDefender.owner !== GameStorage.players[GameStorage.playersNumber] && possibleAttacks[i].regionDefender.owner!== this.ally){
                    possibleAttacks[i].rating += 2*strongestNeighbourDiceNumber; //[static]
                }

                //Focusing one enemy once player has reached certain dominance
                if(TurnSystem.playersSequence.length > 3){
                    if(this.focusVictim === possibleAttacks[i].regionDefender.owner){
                        possibleAttacks[i].rating += 4; //[static]
                    }
                }

                //Checking whether this defender enemy may be potentially defeated within the current round
                if(possibleAttacks[i].regionDefender.owner !== GameStorage.players[GameStorage.playersNumber]){
                    if(AIplayer.strikes >= possibleAttacks[i].regionDefender.owner.regions.length){
                        let defeatPossible = true;
                        for(let j=0; j<possibleAttacks[i].regionDefender.owner.regions.length; j++){
                            if(possibleAttacks[i].regionDefender.owner.regions[j].diceNumber >= possibleAttacks[i].regionInvader.diceNumber){
                                defeatPossible = false;
                                break;
                            }
                        }
                        if(defeatPossible){
                            possibleAttacks[i].rating += (12 - 3*this.behaviorVector[4] + this.behaviorVector[1]); //[hostile][prudent]
                        }
                    }
                }

                //Checking whether this enemy may be defeated during this attack, and if it makes to save him from economical perspective
                 if(possibleAttacks[i].regionDefender.owner !== GameStorage.players[GameStorage.playersNumber] && TurnSystem.playersSequence.length < 5){
                    if(possibleAttacks[i].regionDefender.owner.regions.length === 1 && possibleAttacks[i].regionDefender.diceNumber < possibleAttacks[i].regionInvader.diceNumber){
                        let usefulPuppet = true;
                        if(this.powerfulNeighbours.size>0){
                            for(let j=0; j<possibleAttacks[i].regionDefender.adjacentRegions.length; j++){
                                if(this.powerfulNeighbours.has(possibleAttacks[i].regionDefender.adjacentRegions[j].owner)){
                                    usefulPuppet = false;
                                    break;
                                }
                            }
                        }
                        possibleAttacks[i].rating += ((usefulPuppet && this.powerfulNeighbours.size>0) ? 3 : 8); //[static]
                    }
                }

                //Prioritizing those enemies, who turtled and didn't attack in the past round
                if(possibleAttacks[i].regionDefender.owner !== GameStorage.players[GameStorage.playersNumber] && 
                    AIplayer.regions.length > 3 && AIplayer.strikes > 1 && possibleAttacks[i].regionDefender.owner!== this.ally){
                    if((AIManager.strikesCompletedStats.get(possibleAttacks[i].regionDefender.owner)[0]<1 || AIManager.strikesCompletedStats.get(possibleAttacks[i].regionDefender.owner)[2]<2)
                        && (possibleAttacks[i].regionDefender.diceNumber-possibleAttacks[i].regionInvader.diceNumber)<2 && possibleAttacks[i].regionDefender.owner.regions.length>1){
                        if(this.weakNeighbours.size === 0){
                            let defenderActivityStatus = AIManager.strikesCompletedStats.get(possibleAttacks[i].regionDefender.owner)[0] + AIManager.strikesCompletedStats.get(possibleAttacks[i].regionDefender.owner)[2];
                            possibleAttacks[i].rating += (defenderActivityStatus === 0 ? 8 : 0) + (defenderActivityStatus>0 && AIManager.strikesCompletedStats.get(possibleAttacks[i].regionDefender.owner)[2] === 0 ? 8 : 0);
                        }
                    }
                }
                //Once a weak neighbour found, disabling turtle rule to focus him
                if(possibleAttacks[i].regionDefender.owner !== GameStorage.players[GameStorage.playersNumber]){
                    if(this.weakNeighbours.has(possibleAttacks[i].regionDefender.owner) && possibleAttacks[i].regionDefender.owner !== this.ally){
                        possibleAttacks[i].rating += 20;
                    }
                }

                //Prioritizing those attacks, which focus dominating enemy players
                if(this.dominatingEnemies.size > 0 && AIplayer.strikes > 1 && TurnSystem.playersSequence.length > 2){
                    if(this.dominatingEnemies.has(possibleAttacks[i].regionDefender.owner) && possibleAttacks[i].regionDefender.owner!== this.ally){
                        possibleAttacks[i].rating += 10 + 4*this.behaviorVector[5]; //[tactical]
                    }else if(possibleAttacks[i].regionDefender.owner !== GameStorage.players[GameStorage.playersNumber] &&
                            (!this.dominatingEnemies.has(possibleAttacks[i].regionDefender.owner) && this.behaviorVector[5] === 2)){
                        possibleAttacks[i].rating -= 10; //[tactical]
                    }
                }


                //Preparation for special attack case to bother castled status, if no other attack options are worthy
                if([2,3].includes(possibleAttacks[i].regionInvader.diceNumber) && possibleAttacks[i].regionDefender.castled && 
                    possibleAttacks[i].regionDefender.owner !== GameStorage.players[GameStorage.playersNumber]){
                    this.enemyCastledRegionsDisruption.push([possibleAttacks[i], currentStatusDefender.isolation]);
                }

                //Collecting all options where invaders are equipped with maximum dice, if no other attack options are worthy
                if(possibleAttacks[i].regionInvader.diceNumber === GameStorage.regionDiceLimit){
                    let isolatedNeighbour = false;
                    if(possibleAttacks[i].regionDefender.owner !== GameStorage.players[GameStorage.playersNumber]){
                        isolatedNeighbour = currentStatusDefender.isolation;
                    }
                    this.fullDiceInvaders.push([possibleAttacks[i], isolatedNeighbour]);
                }

                if(bestAttack === null){
                    bestAttack = possibleAttacks[i];
                }else if(possibleAttacks[i].rating > bestAttack.rating){
                    bestAttack = possibleAttacks[i];
                }
            }

            //Assembling ultimate decision
            if(bestAttack !== null){
                if(bestAttack.rating >= 50){
                    decision.verdict = true;
                    decision.regionInvader = bestAttack.regionInvader;
                    decision.regionDefender = bestAttack.regionDefender;
                }else if(bestAttack.rating < 50){   //Checking special attacks opportunities
                    
                    //Trade off a die or two against castled status of an enemy region
                    if(this.enemyCastledRegionsDisruption.length > 0){
                        let localRandomIndex = Math.floor(Math.random()*this.enemyCastledRegionsDisruption.length);
                        let localProbability = Math.floor(Math.random()*7)+this.behaviorVector[1]; //[prudent]
                        if((localProbability > 5.25 && this.enemyCastledRegionsDisruption[localRandomIndex][0].regionInvader.diceNumber === 2) || (localProbability > 6)){
                            if(this.enemyCastledRegionsDisruption[localRandomIndex][0].regionDefender.owner !== GameStorage.players[GameStorage.playersNumber]){
                                if(this.enemyCastledRegionsDisruption[localRandomIndex][1]){
                                    if(!AIManager.exploreEmpireIntegrityRegionMinus(this.enemyCastledRegionsDisruption[localRandomIndex][0].regionDefender.owner, this.enemyCastledRegionsDisruption[localRandomIndex][0].regionDefender)){
                                        //Attacking Enemy player who's empire is non-integrated, and will NOT become integrated even if the invasion is successful
                                        decision.verdict = true;
                                        decision.regionInvader = this.enemyCastledRegionsDisruption[localRandomIndex][0].regionInvader;
                                        decision.regionDefender = this.enemyCastledRegionsDisruption[localRandomIndex][0].regionDefender;
                                    }
                                }else{
                                    //Attacking Enemy player who's empire is already integrated
                                    decision.verdict = true;
                                    decision.regionInvader = this.enemyCastledRegionsDisruption[localRandomIndex][0].regionInvader;
                                    decision.regionDefender = this.enemyCastledRegionsDisruption[localRandomIndex][0].regionDefender;
                                }
                            }
                        }
                    }

                    //Don't hold fully armored regions
                    if(!decision.verdict && this.fullDiceInvaders.length>0 && Math.random() < 0.7){
                        let localRandomIndexSecond = Math.floor(Math.random()*this.fullDiceInvaders.length);

                        if(this.fullDiceInvaders[localRandomIndexSecond][0].regionDefender.owner === GameStorage.players[GameStorage.playersNumber]){
                            //Attacking Neutral player
                            decision.verdict = true;
                            decision.regionInvader = this.fullDiceInvaders[localRandomIndexSecond][0].regionInvader;
                            decision.regionDefender = this.fullDiceInvaders[localRandomIndexSecond][0].regionDefender;
                        }else{
                            if(this.fullDiceInvaders[localRandomIndexSecond][1]){
                                if(!AIManager.exploreEmpireIntegrityRegionMinus(this.fullDiceInvaders[localRandomIndexSecond][0].regionDefender.owner, this.fullDiceInvaders[localRandomIndexSecond][0].regionDefender)){
                                    //Attacking Enemy player who's empire is non-integrated, and will NOT become integrated even if the invasion is successful
                                    decision.verdict = true;
                                    decision.regionInvader = this.fullDiceInvaders[localRandomIndexSecond][0].regionInvader;
                                    decision.regionDefender = this.fullDiceInvaders[localRandomIndexSecond][0].regionDefender;
                                }
                            }else{
                                //Attacking Enemy player who's empire is already integrated
                                decision.verdict = true;
                                decision.regionInvader = this.fullDiceInvaders[localRandomIndexSecond][0].regionInvader;
                                decision.regionDefender = this.fullDiceInvaders[localRandomIndexSecond][0].regionDefender;
                            }
                        }
                    }
                }
            }

            //Clearing instance variables related to one strike's analysis
            this.enemyCastledRegionsDisruption = [];
            this.fullDiceInvaders = [];
            this.enemyNeighboursList.clear();
            this.adjacentEnemyRegions.clear();

            //Aiming a victim, if this player has already reached certain dominance level
            if(this.focusVictim === null && decision.verdict){
                if(decision.regionInvader.owner.regions.length > (7-this.behaviorVector[5])// [tactical]
                && decision.regionDefender.owner !== GameStorage.players[GameStorage.playersNumber]){ 
                    this.focusVictim = decision.regionDefender.owner;
                }
            }
        }
        return decision;
    }

    turnPreAnalysis(){
        if(this.focusVictim !== null){
            if(!TurnSystem.playersSequence.includes(this.focusVictim)){
                this.focusVictim = null;
            }else if(Math.random() > 0.65){
                this.focusVictim = null;
            }
        }

        let playerTurnIndex = TurnSystem.playersSequence.indexOf(this.playerInstanceReference);
        for(let i=playerTurnIndex+1; i<TurnSystem.playersSequence.length; i++){
            this.playersNotActedInCurrentRound.add(TurnSystem.playersSequence[i]);
        }

        this.turnStrikesNumber = this.playerInstanceReference.strikes;

        let neighbourEmpires = new Set();
        for(let i=0; i<this.playerInstanceReference.regions.length; i++){
            for(let j=0; j<this.playerInstanceReference.regions[i].adjacentRegions.length; j++){
                if(this.playerInstanceReference.regions[i].adjacentRegions[j].owner !== GameStorage.players[GameStorage.playersNumber]
                    && this.playerInstanceReference.regions[i].adjacentRegions[j].owner !== this.playerInstanceReference){
                        neighbourEmpires.add(this.playerInstanceReference.regions[i].adjacentRegions[j].owner);
                }
            }
        }

        //Determining which players could be considered as allies or enemies
        let ASCsortedVector = new Map([...this.playerInstanceReference.diplomaticHistoryVector.entries()].sort((a, b) => a[1] - b[1]));
        for (const [key, value] of ASCsortedVector){
            if(!TurnSystem.playersSequence.includes(key)){
                ASCsortedVector.delete(key);
            }
        }

        let indexOfMap = 0;
        let previousRatingPlayerAttacksNumber = 0;
        for (const [key, value] of ASCsortedVector){
            if(value > previousRatingPlayerAttacksNumber){
                previousRatingPlayerAttacksNumber = value;
                indexOfMap++;
            }
            this.diplomaticHistory.set(key, indexOfMap);
        }

        //Collecting statistics&rating of each neighbour enemy player before the first potential attack
        let regionMaximum = 1;
        for(let i=0; i<TurnSystem.playersSequence.length; i++){
            let enemyInitialStatus = TurnSystem.playersSequence[i].computePlayerResources();
            let diceAvailableTotal = 0;

            for(let j=0; j<TurnSystem.playersSequence[i].regions.length; j++){
                diceAvailableTotal += (TurnSystem.playersSequence[i].regions[j].diceNumber - 1);
            }

            let enemyStats = {
                regionsNumber: TurnSystem.playersSequence[i].regions.length,
                revenue: TurnSystem.playersSequence[i].diceRevenue,
                contacts: enemyInitialStatus.enemyNeighbours,
                integrity: (enemyInitialStatus.isolation ? false : true),
                diceAvailable: diceAvailableTotal
            }
            this.competitorsAnalysis.set(TurnSystem.playersSequence[i], enemyStats);

            //Checking if some enemies already dominate
            if(TurnSystem.playersSequence[i] !== this.playerInstanceReference &&
                TurnSystem.playersSequence[i] !== GameStorage.players[GameStorage.playersNumber] &&
                TurnSystem.playersSequence[i].regions.length > (25 - 3*TurnSystem.playersSequence.length) &&
                TurnSystem.playersSequence[i].regions.length > regionMaximum){ 
                regionMaximum = TurnSystem.playersSequence[i].regions.length;
            }

        }

        //Checking if some enemies already dominate
        if(TurnSystem.playersSequence.length > 2){
            for(let i=0; i<TurnSystem.playersSequence.length; i++){
                 if(TurnSystem.playersSequence[i] !== this.playerInstanceReference &&
                    TurnSystem.playersSequence[i] !== GameStorage.players[GameStorage.playersNumber] &&
                    TurnSystem.playersSequence[i].regions.length === regionMaximum && regionMaximum>7){
                    this.dominatingEnemies.add(TurnSystem.playersSequence[i]);
                }
            }
        }

        //Checking whether powerful or weak neighbours are there at player's borders
        for(let i=0; i<TurnSystem.playersSequence.length; i++){
            if(TurnSystem.playersSequence[i] !== this.playerInstanceReference && neighbourEmpires.has(TurnSystem.playersSequence[i])
                && TurnSystem.playersSequence[i].regions.length > 5){
                if(this.competitorsAnalysis.get(TurnSystem.playersSequence[i]).diceAvailable > this.competitorsAnalysis.get(this.playerInstanceReference).diceAvailable){
                    this.powerfulNeighbours.add(TurnSystem.playersSequence[i]);
                }

                if(2*this.competitorsAnalysis.get(TurnSystem.playersSequence[i]).diceAvailable < this.competitorsAnalysis.get(this.playerInstanceReference).diceAvailable && 
                   2*this.competitorsAnalysis.get(TurnSystem.playersSequence[i]).regionsNumber < this.competitorsAnalysis.get(this.playerInstanceReference).regionsNumber){
                    this.weakNeighbours.add(TurnSystem.playersSequence[i]);
                }
            }
        }
        if(this.weakNeighbours.size > 0){
            for(let i=0; i<TurnSystem.playersSequence.length; i++){
                if(TurnSystem.playersSequence[i] !== this.playerInstanceReference && neighbourEmpires.has(TurnSystem.playersSequence[i])){
                    if(this.competitorsAnalysis.get(TurnSystem.playersSequence[i]).diceAvailable > 1.5*this.competitorsAnalysis.get(this.playerInstanceReference).diceAvailable ||
                        this.competitorsAnalysis.get(TurnSystem.playersSequence[i]).regionsNumber > 1.5*this.competitorsAnalysis.get(this.playerInstanceReference).regionsNumber){
                            this.weakNeighbours.clear();
                            break;
                    }
                }
            }

            //Don't neglect turtle players sometimes even if weak neighbours exist
            if(this.weakNeighbours.size > 0 && Math.random() > 0.8){
                this.weakNeighbours.clear();
            }
        }

        //Purging legacyRegions in case player's empire is integrated in the beginning of the turn
        if(this.competitorsAnalysis.get(this.playerInstanceReference).integrity){
            this.legacyRegions.clear();
        }
    }

    static exploreEmpireIntegrityRegionMinus(player, eliminatedRegion){
        let integrityStatus = true;
        let isolatedRegions = new Set();

        AIManager.manipulateRegionTemporarily(player, GameStorage.players[GameStorage.playersNumber], eliminatedRegion, 'REMOVE');

        for(let i=0; i<eliminatedRegion.adjacentRegions.length; i++){
            if(eliminatedRegion.adjacentRegions[i].owner === player){
                let isolationCheck = false;
                for(let j=0; j<eliminatedRegion.adjacentRegions[i].adjacentRegions.length; j++){
                    if(eliminatedRegion.adjacentRegions[i].adjacentRegions[j].owner === player){
                        isolationCheck = true;
                        break;
                    }
                }
                if(!isolationCheck){
                    isolatedRegions.add(eliminatedRegion.adjacentRegions[i]);
                }
            }
        }

        if(player.regions.length <= 1){
            integrityStatus = true;
        }else if(isolatedRegions.size > 0){
            integrityStatus = false;
        }else{  //More complex check needed in case there isn't a single isolated region
            let regionsGraph = new Map();
            let reachedVertices = [];

            for(let i=0; i<player.regions.length; i++){
                let friendlyAdjacentRegions = [];

                for(let j=0; j<player.regions[i].adjacentRegions.length; j++){
                    if(player === player.regions[i].adjacentRegions[j].owner){
                        friendlyAdjacentRegions.push(player.regions[i].adjacentRegions[j].regionID);
                    }
                }
                regionsGraph.set(player.regions[i].regionID, friendlyAdjacentRegions);
            }

            reachedVertices.push(player.regions[0].regionID);
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
        AIManager.manipulateRegionTemporarily(player, GameStorage.players[GameStorage.playersNumber], eliminatedRegion, 'RESTORE');
        return integrityStatus;
    }

    static exploreEmpireIntegrityRegionPlus(player, potentialRegion){
        let enhancedRegions = [];
        let currentOwner = potentialRegion.owner;
        for(let i=0; i<player.regions.length; i++){
            enhancedRegions.push(player.regions[i]);
        }
        enhancedRegions.push(potentialRegion);
        AIManager.manipulateRegionTemporarily(player, GameStorage.players[GameStorage.playersNumber], potentialRegion, 'RESTORE');

        let integrityStatus = true;
        let isolatedRegions = new Set();

        for(let i=0; i<enhancedRegions.length; i++){
            let isolationCheck = false;

            for(let j=0; j<enhancedRegions[i].adjacentRegions.length; j++){
                if(enhancedRegions[i].adjacentRegions[j].owner === player){
                    isolationCheck = true;
                }
            }
            if(!isolationCheck){
                isolatedRegions.add(enhancedRegions[i]);
            }
        }

        if(isolatedRegions.size > 0 && enhancedRegions.length > 1){
            integrityStatus = false;
        }else if(enhancedRegions.length > 3){  //More complex check needed in case there isn't a single isolated region
            let regionsGraph = new Map();
            let reachedVertices = [];

            for(let i=0; i<enhancedRegions.length; i++){
                let friendlyAdjacentRegions = [];

                for(let j=0; j<enhancedRegions[i].adjacentRegions.length; j++){
                    if(player === enhancedRegions[i].adjacentRegions[j].owner){
                        friendlyAdjacentRegions.push(enhancedRegions[i].adjacentRegions[j].regionID);
                    }
                }
                regionsGraph.set(enhancedRegions[i].regionID, friendlyAdjacentRegions);
            }

            reachedVertices.push(enhancedRegions[0].regionID);
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
        AIManager.manipulateRegionTemporarily(player, currentOwner, potentialRegion, 'REMOVE');
        return integrityStatus;
    }

    static manipulateRegionTemporarily(player, temporaryPlayer, eliminatedRegion, action){
        if(action === 'REMOVE'){
            let currentPlayerPointer = -1;
            for(let i=0;i<player.regions.length;i++){
                if(player.regions[i] === eliminatedRegion){
                        currentPlayerPointer = i;
                        break;
                    }               
            }
            if(currentPlayerPointer !== -1) {
                player.regions.splice(currentPlayerPointer, 1);
            }
        }else if(action === 'RESTORE'){
            player.regions.push(eliminatedRegion);
        }

        if(action === 'REMOVE'){
            eliminatedRegion.owner = temporaryPlayer;
        }else if(action === 'RESTORE'){
            eliminatedRegion.owner = player;
        }
    }

    static strikesStatsRefresh(){
        for (const [key, value] of AIManager.strikesCompletedStats){
            AIManager.strikesCompletedStats.set(key, [value[1], 0, value[3], 0]); //[previousTurnAttacks, currentTurnAttacks, previousTurnDefences, currentTurnDefences]
        }
    }

    static chooseAllies(players){
        let copied = [...players];
        TurnSystem.classicFisherYatesMethod(copied);
        let allies = [copied[0], copied[1]];

        for(let i=0; i<players.length; i++){
            if(!players[i].playerManager.playerHuman){
                if(players[i] === allies[0]){
                    players[i].playerManager.ally = allies[1];
                }
                if(players[i] === allies[1]){
                    players[i].playerManager.ally = allies[0];
                }
            }
        }
    }

    static refreshAllies(players){
        if(players.length < 4){
            for(let i=0; i<players.length; i++){
                if(!players[i].playerManager.playerHuman){
                    players[i].playerManager.ally = null;
                }
            }
        }else if(Math.random() < 0.04){
            AIManager.chooseAllies(players);
        }
    }

    static winProbabilityMatrix(invaderDice, defenderDice){
        const probabilityMatrix = AIManager.probabilityMatrixSet;
        if(invaderDice>1 && defenderDice>0 && invaderDice<7 && defenderDice<7){
            return probabilityMatrix[invaderDice-2][defenderDice-1];
        }else{
            return -100;
        }
    }

    static probabilityMatrixSet = [                  //row - invader, column - defender
            [ 9, -3, -9, -12, -13, -14 ],            //2 attack 1, 2 attack 2, etc.
            [12,  7, -2,  -8, -11, -13 ], 
            [15, 12,  6,  -2,  -7, -10 ], 
            [18, 15, 12,   5,  -2,  -6 ], 
            [18, 18, 15,   9,   5,  -1 ]
            ];
}