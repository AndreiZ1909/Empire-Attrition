import { StartMenu } from './StartMenu_class.js';
import { HumanManager } from './HumanManager_class.js';

export class InputHandler{
	static handleStartMenuChoice(player){
		StartMenu.processStartMenu(player);
	}
	
	static handleCellClick(regionID){
		if(HumanManager.handleClickEnabled){
			HumanManager.processMapClick(regionID);
		}
	}

	static handleEndTurnClick(){
		if(HumanManager.handleClickEnabled){
			HumanManager.processEndTurnClick();
		}
	}

	static handleTooltipMouseEnter(statusBar){
		statusBar.showResourcesTooltip();
	}
	
	static handleTooltipMouseLeave(statusBar){
		statusBar.hideResourcesTooltip();
	}
}