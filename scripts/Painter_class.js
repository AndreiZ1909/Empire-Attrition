import { GameStorage } from './GameStorage.js';
import { FileManager } from './FileManager_class.js';

export class Painter{
	static paintRegion(region, cssClass, action, castledStatus){
		for(let i=0; i<region.cells.length; i++){
			if(action === 'ON'){
				if(!region.frontlineCells.has(region.cells[i])){
					let isAnchor = false;
					if(region.cells[i] === region.anchorCell){
						isAnchor = true;
					}
					region.cells[i].divElement.classList.add(cssClass);
					region.cells[i].divElement.style.setProperty('background-color', `rgba(${region.owner.arrayRGB[0]}, ${region.owner.arrayRGB[1]}, ${region.owner.arrayRGB[2]}, ${(castledStatus || isAnchor)? 1 : 0.3})`);
					if(castledStatus){
						region.cells[i].divElement.classList.add('castled-transition'); // *Performance expensive property
					}else{
						//Attack transition happens instantaneously
						region.cells[i].divElement.classList.remove('castled-transition');
						void region.cells[i].divElement.offsetWidth;
					}
				}else{
					region.cells[i].divElement.classList.add(cssClass);
				}
			}else if(action === 'OFF'){
				region.cells[i].divElement.classList.remove(cssClass);
				region.cells[i].divElement.style.removeProperty('background-color');
				region.cells[i].divElement.classList.remove('castled-transition');
				void region.cells[i].divElement.offsetWidth;
			}
		}
		region.previousCastledStatus = castledStatus;
	}

	static triggerCastledTransition(region){
		for(let i=0; i<region.cells.length; i++){
			if(!region.frontlineCells.has(region.cells[i]) && region.cells[i] !== region.anchorCell){
				region.cells[i].divElement.style.setProperty('background-color', `rgba(${region.owner.arrayRGB[0]}, ${region.owner.arrayRGB[1]}, ${region.owner.arrayRGB[2]}, 0.3`);
			}
		}
	}

	static paintConqueredRegion(region, newOwner){
		Painter.paintRegion(region, region.owner.colorClass, 'OFF', region.castled);
		Painter.paintRegion(region, newOwner.colorClass, 'ON', false);
	}

	static redrawCastledRegions(alivePlayers){
		for(let i=0; i<alivePlayers.length; i++){
			for(let j=0; j<alivePlayers[i].regions.length; j++){
				if(alivePlayers[i].regions[j].previousCastledStatus !== alivePlayers[i].regions[j].castled){
					Painter.paintRegion(alivePlayers[i].regions[j], alivePlayers[i].regions[j].owner.colorClass, 'ON', alivePlayers[i].regions[j].castled);
				}
			}
		}
	}

	static turnCSSClassForRegion(region, cssClass, action){
		for(let i=0; i<region.cells.length; i++){
			if(region.cells[i] !== region.anchorCell){
				if(action === 'ON'){
					region.cells[i].divElement.classList.add(cssClass);
				}else if(action === 'OFF'){
					region.cells[i].divElement.classList.remove(cssClass);
				}
			}
		}
	}

	static paintBordersAndInitialRegions(coreGrid, regions){
		for(let i=0;i<regions.length;i++){
			for(const FLCell of regions[i].frontlineCells){
				if(FLCell.x < coreGrid[0].length-1){
					if(regions[i].regionID !== coreGrid[FLCell.y][FLCell.x + 1].regionID){
						FLCell.divElement.classList.add('border-right');
					}
				}
				if(FLCell.x > 0){
					if(regions[i].regionID !== coreGrid[FLCell.y][FLCell.x - 1].regionID){
						FLCell.divElement.classList.add('border-left');
					}
				}
				if(FLCell.y < coreGrid.length-1){
					if(regions[i].regionID !== coreGrid[FLCell.y + 1][FLCell.x].regionID){
						FLCell.divElement.classList.add('border-bottom');
					}
				}
				if(FLCell.y > 0){
					if(regions[i].regionID !== coreGrid[FLCell.y - 1][FLCell.x].regionID){
						FLCell.divElement.classList.add('border-top');
					}
				}
			}
			Painter.paintRegion(regions[i], regions[i].owner.colorClass, 'ON', regions[i].castled);
		}
	}

	static highlightRegionClick(pointedRegion, action){
		if(action === 'ON'){
			for(let i=0; i<pointedRegion.adjacentRegions.length; i++){
				if(pointedRegion.adjacentRegions[i].owner !== pointedRegion.owner){
					Painter.turnCSSClassForRegion(pointedRegion.adjacentRegions[i], 'highlight-adjacent-region-animation', 'ON');
				}
			}
		}else if(action === 'OFF'){
			for(let i=0; i<pointedRegion.adjacentRegions.length; i++){
				//Not checking whether adjacent region belongs to owner due to possible inconsistencies in attack method
				Painter.turnCSSClassForRegion(pointedRegion.adjacentRegions[i], 'highlight-adjacent-region-animation', 'OFF');
			}
		}
	}

	static zoomInChosenDie(divElement, action){
		if(action === 'ON'){
			divElement.classList.add('die-image-chosen');
		}else if(action === 'OFF'){
			divElement.classList.remove('die-image-chosen');
		}
	}

	static highlightDuelingRegion(pointedRegion, action, isDefender){
		if(action === 'ON'){
			if(isDefender){
				Painter.turnCSSClassForRegion(pointedRegion, 'highlight-adjacent-region-animation', 'OFF');
			}
			Painter.turnCSSClassForRegion(pointedRegion, 'highlight-dueling-region', 'ON');
		}
		if(action === 'OFF'){
			Painter.turnCSSClassForRegion(pointedRegion, 'highlight-dueling-region', 'OFF');
		}
	}

	static displayDuelResults(regionInvader, regionDefender, scoreInvader, scoreDefender){
   		FileManager.removeDiceImage(regionInvader.dieImage);
   		FileManager.removeDiceImage(regionDefender.dieImage);
   		regionInvader.dieImage.classList.remove('die-image');
   		regionDefender.dieImage.classList.remove('die-image');

   		regionInvader.anchorCell.divElement.classList.add('anchor-cell-attack');
   		regionDefender.anchorCell.divElement.classList.add('anchor-cell-attack');
   		regionInvader.anchorCell.spanLink.textContent = scoreInvader;
   		regionDefender.anchorCell.spanLink.textContent = scoreDefender;
	}

	static focusEndTurnButton(player, action){
		if(action === 'ON'){
			GameStorage.statusBars[player.playerID].divButtonElement.classList.add('endturn-button-focus');
		} else if(action === 'OFF'){
			GameStorage.statusBars[player.playerID].divButtonElement.classList.remove('endturn-button-focus');
		}
	}

	static endTurnButtonHide(player){
		GameStorage.statusBars[player.playerID].divButtonElement.classList.add('endturn-button-invisible');
	}

	static endTurnButtonShow(player){
		GameStorage.statusBars[player.playerID].divButtonElement.classList.remove('endturn-button-invisible');
	}

	//End Round&turn css assignment - cosmetic split of shifting is implemented in the below 2 methods
	static endTurnTileRemoval(currentPlayer){
		if(currentPlayer.playerManager.playerHuman){
			Painter.endTurnButtonHide(currentPlayer);
		}
		GameStorage.statusBars[currentPlayer.playerID].divElement.classList.remove('status-bar-tile-highlighted');
	}
	static endTurnTileDisplay(nextPlayer){
		if(nextPlayer.playerManager.playerHuman){
			Painter.endTurnButtonShow(nextPlayer);
		}
		GameStorage.statusBars[nextPlayer.playerID].divElement.classList.add('status-bar-tile-highlighted');
	}

	static updateStatusBarValues(statusBar, diceRevenue, strikes){
		if(diceRevenue !== null){
			if(diceRevenue === 1){
				statusBar.spanDiceCount.textContent = `Revenue: 1 die`;
			}else{
				statusBar.spanDiceCount.textContent = `Revenue: ${diceRevenue} dice`;
			}
		}

		if(strikes !== null){
			switch(strikes){
				case 0:
					statusBar.spanAttackCount.textContent = `No strikes left`;
					break;
				case 1:
					statusBar.spanAttackCount.textContent = `1 strike left`;
					break;
				default:
					statusBar.spanAttackCount.textContent = `${strikes} strikes left`;
					break;
			}
		}
	}
}