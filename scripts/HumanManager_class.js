import { GameStorage } from './GameStorage.js';
import { PlayerManager } from './PlayerManager_class.js';
import { TurnSystem } from './TurnSystem_class.js';
import { Statusbar } from './StatusBar_class.js';
import { Player } from './Player_class.js';
import { Painter } from './Painter_class.js';
import { FileManager } from './FileManager_class.js';

export class HumanManager extends PlayerManager{
    static handleClickEnabled = false;

    constructor(playerInstanceReference){
        super(true);
        this.playerInstanceReference = playerInstanceReference;   //backward player instance reference
    }

    processStartTurn(){
        HumanManager.handleClickEnabled = true;
        FileManager.playSound('humanTurnStart');

        //In case a player doesn't have any moves right from the start of their turn
        Statusbar.checkEndTurnButtonFocus(this.playerInstanceReference);
    }

    async processAction(regionID){
        if(this.playerInstanceReference.strikes > 0){
            if(TurnSystem.selectedRegion === null){
                if(GameStorage.regions[regionID].owner === this.playerInstanceReference){
                    if(Player.checkRegionHasForce(GameStorage.regions[regionID])){
                        for(let i=0; i<GameStorage.regions[regionID].adjacentRegions.length; i++){
                            if(GameStorage.regions[regionID].adjacentRegions[i].owner !== this.playerInstanceReference){
                                TurnSystem.selectedRegion = GameStorage.regions[regionID];
                                Painter.highlightRegionClick(TurnSystem.selectedRegion, 'ON');
                                Painter.zoomInChosenDie(TurnSystem.selectedRegion.anchorCell.divElement, 'ON');
                                FileManager.playSound('regionChosen');
                                break;
                            }
                        }
                    }
                }
            }else{
                if(TurnSystem.selectedRegion === GameStorage.regions[regionID]){ 
                    Painter.highlightRegionClick(TurnSystem.selectedRegion, 'OFF');
                    Painter.zoomInChosenDie(TurnSystem.selectedRegion.anchorCell.divElement, 'OFF');
                    FileManager.playSound('regionChosen');
                    TurnSystem.selectedRegion = null;
                }else if(TurnSystem.selectedRegionAttacked === null){
                    if(TurnSystem.selectedRegion.adjacentRegions.includes(GameStorage.regions[regionID]) 
                        && TurnSystem.selectedRegion.owner !== GameStorage.regions[regionID].owner){
                        TurnSystem.selectedRegionAttacked = GameStorage.regions[regionID];

                        HumanManager.handleClickEnabled = false;    
                        await TurnSystem.delayedAttack(TurnSystem.selectedRegion, TurnSystem.selectedRegionAttacked);
                        if(TurnSystem.playersSequence.length !== 1){ // The game is over check - human player won
                            HumanManager.handleClickEnabled = true;
                        }else if(TurnSystem.playersSequence.length === 1){ // The game is over - hide human's EndTurn button
                            Painter.endTurnButtonHide(TurnSystem.playersSequence[0]);
                        }
                    }
                }
            }
        }
    }

    async processEndTurn(){
        HumanManager.handleClickEnabled = false;

        //Deactivating selected regions automatically
        if(TurnSystem.selectedRegion !== null){
            Painter.highlightRegionClick(TurnSystem.selectedRegion, 'OFF');
            Painter.zoomInChosenDie(TurnSystem.selectedRegion.anchorCell.divElement, 'OFF');
            TurnSystem.selectedRegion = null;
            TurnSystem.selectedRegionAttacked = null;
        }

        //Next turn: either next player or next round
        if(TurnSystem.roundPlayersPointer < TurnSystem.playersSequence.length-1){
            await TurnSystem.passToNextPlayer();
        }else{
            await TurnSystem.startNextRound();           
        }
    }

    //InputHandler's redirect static methods
    static async processEndTurnClick(){
        await TurnSystem.operativePlayer.playerManager.processEndTurn();
    }

    static async processMapClick(regionID){
        await TurnSystem.operativePlayer.playerManager.processAction(regionID);
    }
}