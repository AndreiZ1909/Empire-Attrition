import { GameStorage } from './GameStorage.js';
import { InputHandler } from './InputHandler_class.js';
import { Painter } from './Painter_class.js';
import { FileManager } from './FileManager_class.js';

export class Region{
	constructor(regionID, neutralOwner, initialColorClass){
		//Persistent: map-related
		this.regionID = regionID;				//permanently identical to the region's index in GameStorage.regions
		this.cells = [];						//instances
		this.adjacentRegions = [];				//instances
		this.frontlineCells = new Set();		//instances

		this.anchorCell = null;					//instance
		this.dieImage = null;					//IMG element

		//Changeable: game-related
		this.owner = neutralOwner;				//player instance
		this.colorClass = initialColorClass;
		this.diceNumber = GameStorage.neutralDiceNumber;

		this.castled = true;
		this.castledCounter = 0;
		this.previousCastledStatus = true;		//needed only for repainting - doesn't influence economy
	}

	static createSeeds(coreGrid, regions){
		for(let i=0; i<regions.length; i++){
			const randomY = Math.floor(Math.random() * coreGrid.length);
			const randomX = Math.floor(Math.random() * coreGrid[0].length);
			if (coreGrid[randomY][randomX].regionID === null){
				coreGrid[randomY][randomX].regionID = i; //initial cell is assigned to a region
				regions[i].cells.push(coreGrid[randomY][randomX]); //initial cell is added to region's array

				//initial cell's DIV Event Listener enablement
				coreGrid[randomY][randomX].divElement.addEventListener("click", ()=>{InputHandler.handleCellClick(i)});
			} else{
				i--; //already taken, try again
			}
		}
	}

	static conquerCell(coreGrid, region){
		const freeNeighbours = [];
		let neighbourCell;

		const regionExstCells = region.cells;
		const regionID = region.regionID;
		let result = false;

		//Three core activities take place here:
		//1- finding all free neighbour cells for the list of Existing cells
		//2- filling out adjacent regions of Existing cells, if encountered
		//3- filling out frontline cells, if neighbours belong to a different region
		for(let governor = 0; governor < regionExstCells.length; governor++){
			if(regionExstCells[governor].y < coreGrid.length-1){
				neighbourCell = coreGrid[regionExstCells[governor].y + 1][regionExstCells[governor].x];
				if(neighbourCell.regionID === null){
					freeNeighbours.push(neighbourCell);
				}else{
					region.adjacentRegions.push(GameStorage.regions[neighbourCell.regionID]);
					if(neighbourCell.regionID !== regionID){
						region.frontlineCells.add(regionExstCells[governor]);
					}
				}
			}
			if(regionExstCells[governor].x < coreGrid[0].length-1){
				neighbourCell = coreGrid[regionExstCells[governor].y][regionExstCells[governor].x + 1];
				if(neighbourCell.regionID === null){
					freeNeighbours.push(neighbourCell);
				}else{
					region.adjacentRegions.push(GameStorage.regions[neighbourCell.regionID]);
					if(neighbourCell.regionID !== regionID){
						region.frontlineCells.add(regionExstCells[governor]);
					}
				}
			}
			if(regionExstCells[governor].y > 0){
				neighbourCell = coreGrid[regionExstCells[governor].y - 1][regionExstCells[governor].x];
				if(neighbourCell.regionID === null){
					freeNeighbours.push(neighbourCell);
				}else{
					region.adjacentRegions.push(GameStorage.regions[neighbourCell.regionID]);
					if(neighbourCell.regionID !== regionID){
						region.frontlineCells.add(regionExstCells[governor]);
					}
				}
			}
			if(regionExstCells[governor].x > 0){
				neighbourCell = coreGrid[regionExstCells[governor].y][regionExstCells[governor].x-1];
				if(neighbourCell.regionID === null){
					freeNeighbours.push(neighbourCell);
				}else{
					region.adjacentRegions.push(GameStorage.regions[neighbourCell.regionID]);
					if(neighbourCell.regionID !== regionID){
						region.frontlineCells.add(regionExstCells[governor]);
					}
				}
			}
		}

		//Assingment takes place among possible neighbours randomly
		if(freeNeighbours.length !== 0){
			const randomNeighbCell = Math.floor(Math.random() * freeNeighbours.length);

			//Making the random neighbour cell belong to regionID
			coreGrid[freeNeighbours[randomNeighbCell].y][freeNeighbours[randomNeighbCell].x].regionID = regionID;
			//Add Event Listener to this cell's DIV
			coreGrid[freeNeighbours[randomNeighbCell].y][freeNeighbours[randomNeighbCell].x].divElement.addEventListener("click", ()=>{InputHandler.handleCellClick(regionID)});
			
			//Adding cellID to region's Array of cells
			const newestCell = coreGrid[freeNeighbours[randomNeighbCell].y][freeNeighbours[randomNeighbCell].x];
			region.cells.push(newestCell);

			result = true;
		}
		return result;
	}

	static refineRegionsAndFrontline(coreGrid, regions){
		let neighbourCell;

		//Adding the last added cell to Frontline cells/Adjacent Regions info after Seed&Conquer phases are completed, if eligible
		for(let i=0; i<regions.length; i++){
			{
				if(regions[i].cells[regions[i].cells.length-1].y < coreGrid.length-1){
					neighbourCell = coreGrid[regions[i].cells[regions[i].cells.length-1].y + 1][regions[i].cells[regions[i].cells.length-1].x];
					if(neighbourCell.regionID !== null && neighbourCell.regionID !== regions[i].cells[regions[i].cells.length-1].regionID){
						regions[i].frontlineCells.add(regions[i].cells[regions[i].cells.length-1]);
						regions[i].adjacentRegions.push(GameStorage.regions[neighbourCell.regionID]);
					}
				}
				if(regions[i].cells[regions[i].cells.length-1].x < coreGrid[0].length-1){
					neighbourCell = coreGrid[regions[i].cells[regions[i].cells.length-1].y][regions[i].cells[regions[i].cells.length-1].x + 1];
					if(neighbourCell.regionID !== null && neighbourCell.regionID !== regions[i].cells[regions[i].cells.length-1].regionID){
						regions[i].frontlineCells.add(regions[i].cells[regions[i].cells.length-1]);
						regions[i].adjacentRegions.push(GameStorage.regions[neighbourCell.regionID]);
					}
				}
				if(regions[i].cells[regions[i].cells.length-1].y > 0){
					neighbourCell = coreGrid[regions[i].cells[regions[i].cells.length-1].y - 1][regions[i].cells[regions[i].cells.length-1].x];
					if(neighbourCell.regionID !== null && neighbourCell.regionID !== regions[i].cells[regions[i].cells.length-1].regionID){
						regions[i].frontlineCells.add(regions[i].cells[regions[i].cells.length-1]);
						regions[i].adjacentRegions.push(GameStorage.regions[neighbourCell.regionID]);
					}
				}
				if(regions[i].cells[regions[i].cells.length-1].x > 0){
					neighbourCell = coreGrid[regions[i].cells[regions[i].cells.length-1].y][regions[i].cells[regions[i].cells.length-1].x - 1];
					if(neighbourCell.regionID !== null && neighbourCell.regionID !== regions[i].cells[regions[i].cells.length-1].regionID){
						regions[i].frontlineCells.add(regions[i].cells[regions[i].cells.length-1]);
						regions[i].adjacentRegions.push(GameStorage.regions[neighbourCell.regionID]);
					}
				}
			}

			//Removing duplicates from Adjacent regions
			const localUnqiueRegions = new Set(regions[i].adjacentRegions);
			regions[i].adjacentRegions.length = 0;
			regions[i].adjacentRegions = [...localUnqiueRegions];

			//Removing Region itself from the list of Adjacents Regions after initialization
			const ownRegion = regions[i];
			const index = regions[i].adjacentRegions.indexOf(ownRegion);
			if(index !== -1){
				regions[i].adjacentRegions.splice(index, 1);
			}

			//Determination of Anchor cells
			regions[i].anchorCell = Region.prepareAnchorCell(regions[i]);
		}
	}

	static prepareAnchorCell(region){
		let totalXCoord = 0;
		let totalYCoord = 0;
		let anchorX = 0;
		let anchorY = 0;

		let anchorCell;
		let minDistance = GameStorage.cellsXaxis;

		for(const FLCell of region.frontlineCells){
			totalXCoord += FLCell.x;
			totalYCoord += FLCell.y;
		}

		anchorX = Math.round(totalXCoord / region.frontlineCells.size);
		anchorY = Math.round(totalYCoord / region.frontlineCells.size);

		for(let i=0;i<region.cells.length;i++){
			if(!region.frontlineCells.has(region.cells[i])){
				let cellDistance = Math.pow(anchorX - region.cells[i].x, 2) + Math.pow(anchorY - region.cells[i].y, 2);
				if(cellDistance < minDistance){
					minDistance = cellDistance;
					anchorCell = region.cells[i];
				}
			}
		}

		//For very small regions which consist of only frontline cells
		if(typeof anchorCell === 'undefined'){
			for(const FLCell of region.frontlineCells){
				let cellDistance = Math.pow(anchorX - FLCell.x, 2) + Math.pow(anchorY - FLCell.y, 2);
				if(cellDistance < minDistance){
					minDistance = cellDistance;
					anchorCell = FLCell;
				}
			}
		}

		//Anchors should not be placed at the edge rows/columns if possible
		if(anchorCell.y === 0){
			if(GameStorage.gameGrid.coreGrid[1][anchorCell.x].regionID === anchorCell.regionID){
				anchorCell = GameStorage.gameGrid.coreGrid[1][anchorCell.x];
			}
		}else if(anchorCell.y === GameStorage.cellsYaxis-1){
			if(GameStorage.gameGrid.coreGrid[GameStorage.cellsYaxis-2][anchorCell.x].regionID === anchorCell.regionID){
				anchorCell = GameStorage.gameGrid.coreGrid[GameStorage.cellsYaxis-2][anchorCell.x];
			}
		}
		if(anchorCell.x === 0){
			if(GameStorage.gameGrid.coreGrid[anchorCell.y][1].regionID === anchorCell.regionID){
				anchorCell = GameStorage.gameGrid.coreGrid[anchorCell.y][1];
			}
		}else if(anchorCell.X === GameStorage.cellsXaxis-1){
			if(GameStorage.gameGrid.coreGrid[anchorCell.y][GameStorage.cellsXaxis-2].regionID === anchorCell.regionID){
				anchorCell = GameStorage.gameGrid.coreGrid[anchorCell.y][GameStorage.cellsXaxis-2];
			}
		}

		//Adding a span for duel results
		const attackResult = document.createElement('span');
		attackResult.classList.add('attack-span');
		anchorCell.spanLink = attackResult;
		anchorCell.divElement.append(attackResult);

		//Adding die image structure in the anchor cell
		region.dieImage = document.createElement('img');
		region.dieImage.classList.add('die-image');
		anchorCell.divElement.classList.add('cell-anchor');
		anchorCell.divElement.appendChild(region.dieImage);

		return anchorCell;
	}

	updateRegionAndBar(animated, delayDuration, incrementDice, incrementStrikes, cardinalReinforcement){
		if(animated){
			FileManager.showDiceImage(this.dieImage, this.diceNumber);

			if(incrementDice){
				GameStorage.statusBars[this.owner.playerID].displayDiceNumber++;
				Painter.updateStatusBarValues(GameStorage.statusBars[this.owner.playerID], GameStorage.statusBars[this.owner.playerID].displayDiceNumber, null);
			}
			if(incrementStrikes){
				GameStorage.statusBars[this.owner.playerID].displayStrikesNumber++;
				Painter.updateStatusBarValues(GameStorage.statusBars[this.owner.playerID], null, GameStorage.statusBars[this.owner.playerID].displayStrikesNumber);
			}

			this.anchorCell.divElement.classList.remove('anchor-cell-reinforcement-slow');
			this.anchorCell.divElement.classList.remove('anchor-cell-reinforcement-medium');
			this.anchorCell.divElement.classList.remove('anchor-cell-reinforcement-swift');

			//Forcing browser to update everything right now
			void this.anchorCell.divElement.offsetWidth;

			if(cardinalReinforcement>0){
				if(cardinalReinforcement<8){
					FileManager.playSound(`reinforcement${cardinalReinforcement}`);
				}else{
					FileManager.playSound('reinforcement8');
				}
			}

			switch(delayDuration){
				case 330:{ 
					this.anchorCell.divElement.classList.add('anchor-cell-reinforcement-medium');
					break;}
				case 250:{ 
					this.anchorCell.divElement.classList.add('anchor-cell-reinforcement-swift');
					break;}
				default:{ 
					this.anchorCell.divElement.classList.add('anchor-cell-reinforcement-slow');
					}
			}
		}else{
			FileManager.showDiceImage(this.dieImage, this.diceNumber);

			if(this.owner !== GameStorage.players[GameStorage.playersNumber]){
				Painter.updateStatusBarValues(GameStorage.statusBars[this.owner.playerID], GameStorage.statusBars[this.owner.playerID].player.diceRevenue, GameStorage.statusBars[this.owner.playerID].player.strikes);
			}
		}
	}

	static refreshRegionDiceImage(region){
		region.anchorCell.divElement.classList.remove('anchor-cell-attack');
   		region.anchorCell.spanLink.textContent = '';

		region.dieImage.classList.add('die-image');
		FileManager.showDiceImage(region.dieImage, region.diceNumber);
	}

	static neutralUpdateAllDiceOnMap(){
		for(let i=0; i<GameStorage.regions.length; i++){
			if(GameStorage.regions[i].owner === GameStorage.players[GameStorage.playersNumber]){
				GameStorage.regions[i].updateRegionAndBar(false, null, null, null, 0);
			}				
		}
	}

	static async delayedUpdateAllDiceOnMap(delayedFlag){
		const playersAssets = [];
		const playersReplinshResources = new Map();
		let repaintingNeeded = false;
		let reinforcementRoundNumber = 1;

		//Dynamic delay duration
		let revenueMaximum = 1;
		let delayDuration = 500;

		for(let i=0; i<GameStorage.playersNumber; i++){
			if(GameStorage.players[i].regions.length > 0){
				let nonMaxRegions = [];
				for(let j=0; j<GameStorage.players[i].regions.length; j++){
					if(GameStorage.players[i].regions[j].diceNumber < GameStorage.regionDiceLimit){
						let pair = [GameStorage.players[i].regions[j], GameStorage.regionDiceLimit-GameStorage.players[i].regions[j].diceNumber];
						nonMaxRegions.push(pair);
					}
				}
				let playerInfo = [GameStorage.players[i], GameStorage.players[i].diceRevenue, null, nonMaxRegions];
				playersAssets.push(playerInfo);

				if(GameStorage.players[i].diceRevenue > revenueMaximum){
					revenueMaximum = GameStorage.players[i].diceRevenue;
				}

				if(delayedFlag === 'DELAYED'){
					playersReplinshResources.set(GameStorage.players[i], [GameStorage.players[i].diceRevenue, GameStorage.players[i].strikes]);
				}
			}
		}

		if(revenueMaximum > 6){
			delayDuration = 330;
			if(revenueMaximum > 10){
				delayDuration = 250;
			}
		}

		do{
			repaintingNeeded = false;
			for(let i=0; i<playersAssets.length; i++){
				if(playersAssets[i][1] !== 0 && playersAssets[i][3].length !== 0){
					let randomRegionID = Math.floor(Math.random() * playersAssets[i][3].length);
					playersAssets[i][2] = playersAssets[i][3][randomRegionID][0];
					playersAssets[i][3][randomRegionID][1]--;
					
					playersAssets[i][1]--;
					repaintingNeeded = true;
					
					if(playersAssets[i][3][randomRegionID][1] === 0){
						playersAssets[i][3].splice(randomRegionID, 1);
					}
				}
			}

			if(repaintingNeeded){
				if(delayedFlag === 'DELAYED'){
					let localPromise = new Promise(function(resolveFunction){
						window.setTimeout(()=>{
							for(let i=0; i<playersAssets.length; i++){
								if(playersAssets[i][2] !== null){
									playersAssets[i][2].diceNumber++;

									let revenueIncrement = (playersReplinshResources.get(playersAssets[i][0])[0] > 0 ? true : false);
									if(revenueIncrement){
										playersReplinshResources.get(playersAssets[i][0])[0]--;
									}

									let strikesIncrement = (playersReplinshResources.get(playersAssets[i][0])[1] > 0 ? true : false);
									if(strikesIncrement){
										playersReplinshResources.get(playersAssets[i][0])[1]--;
									}

									playersAssets[i][2].updateRegionAndBar(true, delayDuration, revenueIncrement, strikesIncrement, reinforcementRoundNumber);
									playersAssets[i][2] = null;
								}
							}
							resolveFunction("PaintCompleted");
						}, delayDuration);
					});
					let result = await localPromise;
				}else{
					for(let i=0; i<playersAssets.length; i++){
						if(playersAssets[i][2] !== null){
							playersAssets[i][2].diceNumber++;

							playersAssets[i][2].updateRegionAndBar(false, null, null, null, 0);
							playersAssets[i][2] = null;
						}
					}
				}
				reinforcementRoundNumber++;
			}
		}while(repaintingNeeded)

		if(delayedFlag === 'DELAYED'){
			for (const [key, value] of playersReplinshResources){
	            if(value[0] > 0 || value[1] > 0){
	            	Painter.updateStatusBarValues(GameStorage.statusBars[key.playerID], key.diceRevenue, key.strikes);
	            }
	        }
		}
	}
}