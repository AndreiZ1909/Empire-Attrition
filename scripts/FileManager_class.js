export class FileManager{
	static imageLinks = [];
	static soundLinks = {
							gameStarted: new Audio('./sources/sounds/gameStarted.ogg'),
							reshuffling: new Audio('./sources/sounds/reshuffling.ogg'),
							aiTurnStart: new Audio('./sources/sounds/aiTurnStart.ogg'),
							humanTurnStart: new Audio('./sources/sounds/humanTurnStart.ogg'),
							regionChosen: new Audio('./sources/sounds/regionChosen.ogg'),
							rollingDice: new Audio('./sources/sounds/rollingDice.ogg'),
							failedAttempt: new Audio('./sources/sounds/failedAttempt.ogg'),
							audaciousAttempt: new Audio('./sources/sounds/audaciousAttempt.ogg'),
							reinforcement1: new Audio('./sources/sounds/reinforcement1.ogg'),
							reinforcement2: new Audio('./sources/sounds/reinforcement2.ogg'),
							reinforcement3: new Audio('./sources/sounds/reinforcement3.ogg'),
							reinforcement4: new Audio('./sources/sounds/reinforcement4.ogg'),
							reinforcement5: new Audio('./sources/sounds/reinforcement5.ogg'),
							reinforcement6: new Audio('./sources/sounds/reinforcement6.ogg'),
							reinforcement7: new Audio('./sources/sounds/reinforcement7.ogg'),
							reinforcement8: new Audio('./sources/sounds/reinforcement8.ogg'),
							defeated: new Audio('./sources/sounds/defeated.ogg'),
							defeatedAI: new Audio('./sources/sounds/defeatedAI.ogg'),
							victory: new Audio('./sources/sounds/victory.ogg'),
						};

	static initializeImageResources(){
		//Caching all dice images
		for (let i=0; i<6; i++){
   			let dieImage = new Image();
    		dieImage.src = `./sources/images/dice-${i+1}.png`;
    		FileManager.imageLinks.push(`./sources/images/dice-${i+1}.png`);
		}
	}

	static showDiceImage(dieImage, diceNumber){
		dieImage.src = FileManager.imageLinks[diceNumber-1];
	}

	static removeDiceImage(dieImage){
		dieImage.src = '';
	}

	static playSound(fileName){
		const sound = FileManager.soundLinks[fileName];
		sound.currentTime = 0;
		sound.play();
	}
}