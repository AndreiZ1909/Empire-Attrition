import { GameStorage } from './GameStorage.js';
import { InputHandler } from './InputHandler_class.js';
import { TurnSystem } from './TurnSystem_class.js';
import { Painter } from './Painter_class.js';

export class Statusbar{
	static XAxisBasePositions = new Map();
	static barWidth = 0;

	constructor(player){
		this.player = player;						//Instance
		this.visible = true;
		this.initialXCoordinate = null;				//Throughout the whole game

		this.currentTurnOrder = null;				//Current position within a set of alive Players
		this.currentXCoordinate = null;				//X coordinate after defeated player's bar is deleted
		this.previousXCoordinate = null;			//X coordinate before defeated player's bar is deleted

		//L1 DOM hierarchy
		this.divElement = null;

		//L2 DOM hierarchy
		this.divInfoContainerElement = null;
		this.divButtonElement = null;

		//L4 DOM hierarchy
		this.spanPlayerName = null;
		this.divPlayerTooltip = null;
		this.spanDiceCount = null;
		this.spanAttackCount = null;

		//Tooltips information references
		this.empireCoreElement = '';
		this.stableFrontierElement = '';
		this.contactsElement = '';
		this.empireIntegrityElement = '';
		this.openFrontierElement = '';
		this.survivalElement = '';

		//Incrementing counter of resources on the Status Bars
		this.displayDiceNumber = 1;
		this.displayStrikesNumber = 1;
	}

	positionTileOnBar(fullWidthPX, fullHeightPX, playerID, playersNumber){
		const divWidth = Math.floor((0.9*fullWidthPX) / playersNumber);
		const divHeight = Math.floor(0.85 * fullHeightPX);

		this.divElement.style.setProperty('width', `${divWidth}px`);
		this.divElement.style.setProperty('height', `${divHeight}px`);

		//Initial X coordinate is: side_gap + already_added_players*(status_bar_width + gap)
		this.divElement.style.left = `${Math.floor((fullWidthPX-divWidth*playersNumber-7*15)/2 + playerID*(divWidth + 15))}px`;

		//Initial technical order is equal to StatusBars initialization order
		this.currentTurnOrder = playerID;

		this.divElement.classList.add(`player-color-${playerID}`);
		this.divElement.classList.add('status-bar-tile');

		if(Statusbar.barWidth === 0){
			Statusbar.barWidth = divWidth;
		}
	}

	positionInfoOnTile(fullWidthPX, fullHeightPX, playersNumber){
		const divWidth = Math.floor((0.9*fullWidthPX) / playersNumber);
		const divHeight = Math.floor(0.7 * fullHeightPX);

		this.divInfoContainerElement.style.setProperty('width', `${divWidth}px`);
		this.divInfoContainerElement.style.setProperty('height', `${divHeight}px`);

		this.divInfoContainerElement.classList.add('info-container');
	}

	positionButtonOnTile(fullWidthPX, fullHeightPX, playersNumber){
		const divWidth = Math.floor((0.65*fullWidthPX) / playersNumber);
		const divHeight = Math.floor(0.3 * fullHeightPX);

		this.divButtonElement.style.setProperty('width', `${divWidth}px`);
		this.divButtonElement.style.setProperty('height', `${divHeight}px`);

		this.divButtonElement.classList.add('endturn-button-invisible');//Initially all End Turn buttons are not displayed
		this.divButtonElement.classList.add('endturn-button');
		
		this.divButtonElement.addEventListener("click", ()=>{InputHandler.handleEndTurnClick()});
	}

	static initialization(statusBars, html_global_id){
        const divBar = document.getElementById(html_global_id);

		for(let i=0; i<statusBars.length; i++){
			const divTile = document.createElement('div');
			divBar.appendChild(divTile);

			statusBars[i].divElement = divTile;
			statusBars[i].positionTileOnBar(divBar.offsetWidth, divBar.offsetHeight, i, statusBars.length);

			/* HTML Structure of the Status Bar
			divTile                              <div>					status-bar-tile.css
			-divInfoContainer                    <div>                  info-container.css
			--playerNameArea                     <div>					info-container.css
			---playerName                         <span>				player-name-info-tile.css   player-name-span-color-${i}.css
			---playerTooltip                     <div>					player-tooltip.css
			--playerResourceArea                 <div>					info-container.css
			---diceCount                          <span>				player-revenue-info-tile.css	
			---attackCount                        <span>				player-strikes-info-tile.css
			-divTileButton                       <div>                  endturn-button[-invisible].css
			---endTurnLabel                       <span>
			*/

			//Data on status bar
			const playerName = document.createElement('span');
			statusBars[i].spanPlayerName = playerName;
			const playerTooltip = document.createElement('div');
			statusBars[i].divPlayerTooltip = playerTooltip;
			const diceCount = document.createElement('span');
			statusBars[i].spanDiceCount = diceCount;
			const attackCount = document.createElement('span');
			statusBars[i].spanAttackCount = attackCount;

			playerName.classList.add('player-name-info-tile');
			playerName.classList.add(`player-name-span-color-${i}`);

			playerTooltip.classList.add('player-tooltip');
			playerTooltip.style.setProperty('background',
			    `linear-gradient(270deg, rgba(${statusBars[i].player.arrayRGB[0]}, ${statusBars[i].player.arrayRGB[1]}, ${statusBars[i].player.arrayRGB[2]}, 1),
			     rgba(${statusBars[i].player.arrayRGB[0]}, ${statusBars[i].player.arrayRGB[1]}, ${statusBars[i].player.arrayRGB[2]}, 0.7))`);

			diceCount.classList.add('player-revenue-info-tile');
			attackCount.classList.add('player-strikes-info-tile');

			//playerNameArea is used only for hover event catching. Data structure is handled in playerTooltip
			const playerNameArea = document.createElement('div');
			const playerResourceArea = document.createElement('div');

			playerNameArea.classList.add('info-container');
			playerResourceArea.classList.add('info-container');
			playerNameArea.classList.add('player-name-area');

			playerNameArea.addEventListener('mouseenter', ()=>{InputHandler.handleTooltipMouseEnter(statusBars[i])});
			playerNameArea.addEventListener('mouseleave', ()=>{InputHandler.handleTooltipMouseLeave(statusBars[i])});

			//Text color is dependent on the main background. Check css related classes
			diceCount.classList.add(`basic-bar-text-color-${i}`);
			attackCount.classList.add(`basic-bar-text-color-${i}`);
			statusBars[i].buildToolTip(`basic-bar-text-color-${i}`);
				
			playerNameArea.append(playerName, playerTooltip); 
			playerResourceArea.append(diceCount, attackCount);

			const divInfoContainer = document.createElement('div');
			divInfoContainer.append(playerNameArea, playerResourceArea);
			divTile.append(divInfoContainer);

			statusBars[i].divInfoContainerElement = divInfoContainer;
			statusBars[i].positionInfoOnTile(divBar.offsetWidth, divBar.offsetHeight, statusBars.length);

			//Adding EndTurn DIV with one span ('End Turn' button)
			const endTurnLabel = document.createElement('span');
			endTurnLabel.textContent = 'End Turn';

			const divTileButton = document.createElement('div');
			divTileButton.append(endTurnLabel);
			divTile.append(divTileButton);
			statusBars[i].divButtonElement = divTileButton;
			statusBars[i].positionButtonOnTile(divBar.offsetWidth, divBar.offsetHeight, statusBars.length);
		}
		Statusbar.collectXAxisCoordinates(statusBars);
	}

	static collectXAxisCoordinates(statusBars){
		for(let i=0; i<statusBars.length; i++){
			if(statusBars[i].visible){
				const XAxisBasePosition = Math.floor(statusBars[i].divElement.getBoundingClientRect().left);
				Statusbar.XAxisBasePositions.set(i, XAxisBasePosition);
				statusBars[i].initialXCoordinate = XAxisBasePosition;
			}
		}
	}

	static setStatusBarNames(statusBars){
		for(let i=0; i<statusBars.length; i++){
			statusBars[i].spanPlayerName.textContent = `${statusBars[i].player.name}`;
		}
	}

    //Highlighting End Turn Button if any of the conditions are met
	static checkEndTurnButtonFocus(player){
		if(player.strikes === 0){
			Painter.focusEndTurnButton(player, 'ON');
			return;
		}
		let attackPossible = false;
		for(let i=0; i<player.regions.length; i++){
			if(player.regions[i].diceNumber !== 1){
				for(let j=0; j<player.regions[i].adjacentRegions.length; j++){
					if(player.regions[i].adjacentRegions[j].owner !== player){
						attackPossible = true;
						break;
					}
				}
			}
		}
		if(!attackPossible){
			Painter.focusEndTurnButton(player, 'ON');
			return;
		}
	}

	static updateStatusBarInfoInitialization(playersSequence){
		for(let i=0;i<GameStorage.statusBars.length;i++){
			if(GameStorage.statusBars[i].visible === true){
				let index = playersSequence.indexOf(GameStorage.statusBars[i].player);
				if(index === -1){
					GameStorage.statusBars[i].visible = false;
				}else{
					GameStorage.statusBars[i].currentTurnOrder = index;
				}
				Painter.updateStatusBarValues(GameStorage.statusBars[i], GameStorage.statusBars[i].player.diceRevenue, GameStorage.statusBars[i].player.strikes);
			}
		}

		//No delayed animation needed at the initialization phase
		for(let i=0; i<GameStorage.statusBars.length; i++){
			if(GameStorage.statusBars[i].visible){
				const delta = Statusbar.XAxisBasePositions.get(GameStorage.statusBars[i].currentTurnOrder) - GameStorage.statusBars[i].initialXCoordinate;
				GameStorage.statusBars[i].divElement.style.setProperty('transform', `translateX(${delta}px)`);
			}
		}
		document.body.offsetWidth;
		for(let i=0; i<GameStorage.statusBars.length; i++){
			GameStorage.statusBars[i].divElement.classList.add('status-bar-tile-transition');
		}
	}

	static updateStatusBarInfoEndRound(playersSequence){
		for(let i=0;i<GameStorage.statusBars.length;i++){
			if(GameStorage.statusBars[i].visible === true){
				let index = playersSequence.indexOf(GameStorage.statusBars[i].player);
				if(index === -1){
					GameStorage.statusBars[i].visible = false;
				}else{
					GameStorage.statusBars[i].currentTurnOrder = index;
				}
				GameStorage.statusBars[i].spanDiceCount.textContent = 'Revenue: 0 dice';
				GameStorage.statusBars[i].spanAttackCount.textContent = '0 strike left';
				GameStorage.statusBars[i].displayDiceNumber = 0;
				GameStorage.statusBars[i].displayStrikesNumber = 0;
			}
		}
		window.requestAnimationFrame(() => {
			for(let i=0; i<GameStorage.statusBars.length; i++){
				if(GameStorage.statusBars[i].visible){
					//Standard CSS property: transform:translateX(N px);
					const delta = Statusbar.XAxisBasePositions.get(GameStorage.statusBars[i].currentTurnOrder) - GameStorage.statusBars[i].initialXCoordinate;
					GameStorage.statusBars[i].divElement.style.setProperty('transform', `translateX(${delta}px)`);
				}
			}
		});
	}

	static async updateStatusBarInfoUponAttack(statusBarInvader, defenderPlayer, playersSequence){
		Painter.updateStatusBarValues(statusBarInvader, null, statusBarInvader.player.strikes);

		//Eliminating Status Bar during attack (besides Neutral)
		if(defenderPlayer.regions.length === 0 && defenderPlayer !== GameStorage.players[GameStorage.playersNumber]){
			
			//I: Disabling defeated player's bar and all CSS transformation properties on logical level
			GameStorage.statusBars[defenderPlayer.playerID].visible = false;
			Statusbar.XAxisBasePositions.clear();//Prerequisite for phase VIII

			for(let i=0; i<GameStorage.statusBars.length; i++){
				if(GameStorage.statusBars[i].visible){
					//II: All bars will be replaced to their initial positions - collecing old x-coordinates firstly
					GameStorage.statusBars[i].previousXCoordinate = Math.floor(GameStorage.statusBars[i].divElement.getBoundingClientRect().left);	
					GameStorage.statusBars[i].divElement.classList.remove('status-bar-tile-transition');
					GameStorage.statusBars[i].divElement.style.transform = 'translateX(0)';//Clearing out translateX property value
				}
			}

			//III: Transforming bars to their pre-elimination previous positions without animation
			for(let i=0; i<GameStorage.statusBars.length; i++){
				if(GameStorage.statusBars[i].visible){
					GameStorage.statusBars[i].currentXCoordinate = Math.floor(GameStorage.statusBars[i].divElement.getBoundingClientRect().left);
					const delta = GameStorage.statusBars[i].previousXCoordinate - GameStorage.statusBars[i].currentXCoordinate;
					GameStorage.statusBars[i].divElement.style.setProperty('transform', `translateX(${delta}px)`);
				}
			}
			void document.body.offsetWidth;
			
			//IV: Fading out defeated player's bar
			let paintInvisiblePromise = new Promise(function(resolveFunction){
		    	window.setTimeout(()=>{
			    		resolveFunction("BarInvisible");
					}, 500);
				});
			GameStorage.statusBars[defenderPlayer.playerID].divElement.style.removeProperty('transition');
			GameStorage.statusBars[defenderPlayer.playerID].divElement.classList.add('status-bar-tile-invisible');
			GameStorage.statusBars[defenderPlayer.playerID].divElement.offsetWidth;
			let result = await paintInvisiblePromise;

			//V: Browser recomputes bars' layout according to initial set-up
			GameStorage.statusBars[defenderPlayer.playerID].divElement.classList.add('status-bar-tile-disabled');

			//VI: Collecting new ordering and initial ordering (until the next elimination) from players.Sequence
			const defeatedPlayerOrder = GameStorage.statusBars[defenderPlayer.playerID].currentTurnOrder;
			GameStorage.statusBars[defenderPlayer.playerID].currentTurnOrder = null;
			for(let i=0; i<TurnSystem.playersSequence.length; i++){
				GameStorage.statusBars[TurnSystem.playersSequence[i].playerID].currentTurnOrder = i;
			}

			//VII: Animating shift of active status bars
			window.requestAnimationFrame(() => {
				for(let i=0; i<GameStorage.statusBars.length; i++){
					if(GameStorage.statusBars[i].visible){
						const delta = GameStorage.statusBars[i].previousXCoordinate - (GameStorage.statusBars[i].currentXCoordinate - ((Statusbar.barWidth + 15)/2)*(defeatedPlayerOrder > GameStorage.statusBars[i].currentTurnOrder ? 1 : -1));
						GameStorage.statusBars[i].divElement.style.setProperty('transform', `translateX(${delta}px)`);
						GameStorage.statusBars[i].divElement.classList.add('status-bar-tile-transition');

						//VIII: Collecting new base positions (referring current) after a player has been evicted from playersSequence
						Statusbar.XAxisBasePositions.set( GameStorage.statusBars[i].currentTurnOrder, GameStorage.statusBars[i].previousXCoordinate + ((Statusbar.barWidth + 15)/2)*(defeatedPlayerOrder > GameStorage.statusBars[i].currentTurnOrder ? 1 : -1) );
						GameStorage.statusBars[i].currentXCoordinate = null;
						GameStorage.statusBars[i].previousXCoordinate = null;
					}
				}
			});
		}
	}

	buildToolTip(textColor){
		const tableLabels = [['Revenue', 'Empire integrity'], 
							 ['Revenue', 'Empire core'], 
							 ['Revenue', 'Stable frontier'], 
							 ['Revenue', 'Contacts'], 
							 ['Strikes', 'Open frontier'], 
							 ['Strikes', 'Survival']];

		const table = document.createElement('table');

		const colgroup = document.createElement('colgroup');
		const col1 = document.createElement('col');
		col1.style.width = '28%';
		const col2 = document.createElement('col');
		col2.style.width = '47%';
		const col3 = document.createElement('col');
		col3.style.width = '25%';

		colgroup.append(col1, col2, col3);
		table.appendChild(colgroup);

		for(let i=0; i<6; i++){
			const tr = document.createElement('tr');
			tr.classList.add(`${textColor}`);
			table.appendChild(tr);

			if(i === 0 || i===4){
				const td1 = document.createElement('td');
				td1.classList.add('tooltip-td');
				td1.textContent = tableLabels[i][0];

				td1.rowSpan = 4;
				tr.appendChild(td1);
			}

			const td2 = document.createElement('td');
			td2.classList.add('tooltip-td');
			td2.textContent = tableLabels[i][1];
			tr.appendChild(td2);

			const td3 = document.createElement('td');
			td3.classList.add('tooltip-td');

			switch (i){
				case 0:{ this.empireIntegrityElement = td3; break; }
				case 1:{ this.empireCoreElement = td3; break; }
				case 2:{ this.stableFrontierElement = td3; break; }
				case 3:{ this.contactsElement = td3; break; }
				case 4:{ this.openFrontierElement = td3; break; }
				case 5:{ this.survivalElement = td3; break; }
				default:{ break; }
			}
			tr.appendChild(td3);

			//Adding a uline between revenue and strikes
			if(i === 3){
				tr.style.setProperty('border-bottom', `2px solid`);

				if(typeof td1 !== 'undefined'){
					td1.style.setProperty('padding-bottom', '7px');
				}
				td2.style.setProperty('padding-bottom', '7px');
				td3.style.setProperty('padding-bottom', '7px');
			}
			if(i === 4){
				if(typeof td1 !== 'undefined'){
					td1.style.setProperty('padding-top', '5px');
				}
				td2.style.setProperty('padding-top', '5px');
				td3.style.setProperty('padding-top', '5px');
			}
		}
		this.divPlayerTooltip.appendChild(table);
		table.classList.add('tooltip-table');

		this.divPlayerTooltip.classList.add(`${this.player.colorClass}`);
	}

	updateTooltipInformation(){
		const actualResourceValues = this.player.computePlayerResources();
		const alivePlayersNumber = TurnSystem.playersSequence.length;

		//Bars estimation for each of the indicators for default set-up: map of 40 regions and 8 players
		//Empire integrity
		let integrityLevel = 1;
		if(actualResourceValues.isolation){
			integrityLevel--;
		}
		this.empireIntegrityElement.textContent = Statusbar.renderEmpireDevelopmentBars(integrityLevel, 1);
		
		//Empire core
		let ecoreLevel = Statusbar.calculateBarLevel(actualResourceValues.castledNonFrontierRegions, [1, Math.max(TurnSystem.playersSequence.length, 5), 11+TurnSystem.playersSequence.length]);
		this.empireCoreElement.textContent = Statusbar.renderEmpireDevelopmentBars(ecoreLevel, 3);
		
		//Stable frontier
		let sfrontLevel;
		if(TurnSystem.playersSequence.length > 2){
			sfrontLevel = Statusbar.calculateBarLevel(actualResourceValues.castledFrontierRegions, [1, 4, 6]);
		}else{
			sfrontLevel = Statusbar.calculateBarLevel(actualResourceValues.castledFrontierRegions, [1, 5, 8]);
		}
		this.stableFrontierElement.textContent = Statusbar.renderEmpireDevelopmentBars(sfrontLevel, 3);
		
		//Contacts
		let contactLevel;
		contactLevel = Statusbar.calculateBarLevel(actualResourceValues.enemyNeighbours, [1, 3, 4]);
		this.contactsElement.textContent = Statusbar.renderEmpireDevelopmentBars(contactLevel, 3);
		
		//Open frontier
		let ofrontLevel;
		if(TurnSystem.playersSequence.length > 2){
			ofrontLevel = Statusbar.calculateBarLevel(actualResourceValues.nonCastledRegionsNumber, [1, 4, 6]);
		}else{
			ofrontLevel = Statusbar.calculateBarLevel(actualResourceValues.nonCastledRegionsNumber, [1, 3, 5]);
		}
		this.openFrontierElement.textContent = Statusbar.renderEmpireDevelopmentBars(ofrontLevel, 3);
		
		//Survival - in fact we calculate eliminated ones due to method's comparison
		let survivalLevel = Statusbar.calculateBarLevel(GameStorage.playersNumber - alivePlayersNumber, [1, 3, 5]);
		this.survivalElement.textContent = Statusbar.renderEmpireDevelopmentBars(survivalLevel, 3);
	}

	static calculateBarLevel(actualValue, range){
		let result = 0;
		for(const rangePeak of range){
			if(rangePeak <= actualValue){
				result++;
			}
		}
		return result;
	}

	showResourcesTooltip(){
		this.updateTooltipInformation();

		this.adjustEdgeTooltipPosition();
		this.divElement.classList.add('status-bar-to-front');
		this.divElement.classList.add('status-bar-tile-highlighted');

		this.divPlayerTooltip.classList.add('player-tooltip-visible');
	}

	hideResourcesTooltip(){
		this.divElement.classList.remove('status-bar-to-front');
		if(this.player !== TurnSystem.operativePlayer){
			this.divElement.classList.remove('status-bar-tile-highlighted');
		}
		this.divPlayerTooltip.classList.remove('player-tooltip-visible');

		// Here not checking if it has been assigned in fact
		this.divPlayerTooltip.classList.remove('tooltip-left-align');
		this.divPlayerTooltip.classList.remove('tooltip-right-align');
	}

	adjustEdgeTooltipPosition(){
		if(TurnSystem.playersSequence.length === GameStorage.playersNumber){
			if(this.currentTurnOrder === 0){
				this.divPlayerTooltip.classList.add('tooltip-left-align');
			}
			if(this.currentTurnOrder === GameStorage.playersNumber - 1){
				this.divPlayerTooltip.classList.add('tooltip-right-align');
			}
		}
	}

	static renderEmpireDevelopmentBars(number, maximum){
		let result = '▰'.repeat(number) + '▱'.repeat(maximum - number);
		return result;
	}
}