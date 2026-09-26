import { GameStorage } from './GameStorage.js';
import { startGame } from './Initialization.js';
import { InputHandler } from './InputHandler_class.js';
import { HumanManager } from './HumanManager_class.js';
import { AIManager } from './AIManager_class.js';

export class StartMenu{
	static showStartMenu(startMenu_title_id, startMenu_buttons_id){
		const menuHeaderDIV = document.getElementById(startMenu_title_id);
		const menuButtonsDIV = document.getElementById(startMenu_buttons_id);

		for(let i=0; i<GameStorage.playersNumber; i++){
			const divButton = document.createElement('div');

			divButton.classList.add(GameStorage.players[i].colorClass);
			divButton.classList.add('color-choice-button');

			//From perfomance perspective it has no sense to remove these EventListeners once Start Menu is hidden
			divButton.addEventListener("click", ()=>{InputHandler.handleStartMenuChoice(GameStorage.players[i])});

			menuButtonsDIV.appendChild(divButton);
		}
		menuHeaderDIV.textContent = 'Claim your color';
		menuHeaderDIV.classList.add('start-menu-title');
	}

	static processStartMenu(chosenPlayer){
		const menuDIV = document.getElementById('StartMenu');
		const statusBarDIV = document.getElementById('GlobalGrid');
		const mapDIV = document.getElementById('StatusBar');

		function randomizeBehavior(vectorCoordinate){
			let option = Math.floor(Math.random() * 3);
			return GameStorage.botBehaviorVectors[vectorCoordinate][option];
		}	

		if(chosenPlayer !== null){
			const HumanManagerInstance = new HumanManager(chosenPlayer);
			chosenPlayer.playerManager = HumanManagerInstance;
			chosenPlayer.name = 'You';

			//Initializing AI Player Manager controllers for the rest players
			for(let i=0; i<GameStorage.playersNumber; i++){
				if(GameStorage.players[i] !== chosenPlayer){
					const AIManagerInstance = new AIManager(GameStorage.players[i]);
						
					for(let j=0; j<6; j++){
						AIManagerInstance.behaviorVector.push(randomizeBehavior(j));
					}

					// Converting player into an aggressive or a wise one
					const specialBehaviour = Math.random();
					if(specialBehaviour<0.07){
						AIManagerInstance.behaviorVector[0] = 1;
						AIManagerInstance.behaviorVector[1] = 2;
						AIManagerInstance.behaviorVector[2] = 1;
						AIManagerInstance.behaviorVector[4] = 0;
					}else if(specialBehaviour>0.85){
						AIManagerInstance.behaviorVector[0] = -1;
						AIManagerInstance.behaviorVector[1] = 0;
						AIManagerInstance.behaviorVector[2] = 0;
						AIManagerInstance.behaviorVector[3] = 1;
						AIManagerInstance.behaviorVector[4] = 1;
					}
					GameStorage.players[i].playerManager = AIManagerInstance;
				}
			}
			startGame();

			menuDIV.classList.add('close-menu');
			statusBarDIV.classList.add('open-div');
			mapDIV.classList.add('open-div');
		}
	}
}