import { GameStorage } from './GameStorage.js';
import { TurnSystem } from './TurnSystem_class.js';
import { FileManager } from './FileManager_class.js';

export class StatsTable{
	static finalTable = [];

	static prepareFinalStatsTable(){
		StatsTable.finalTable = [];

		for(let i=0; i<GameStorage.players.length-1;i++){ 
			let line = {
  				name: GameStorage.players[i].name,
  				avgRoll: (GameStorage.players[i].attackPointsTotal / GameStorage.players[i].diceThrownTotal).toFixed(3),
  				lastRound: GameStorage.players[i].lastRound,
  				peakRegions: GameStorage.players[i].maxNumberOfRegions,
  				colorClassText: GameStorage.players[i].colorClassText
			}
			StatsTable.finalTable.push(line);
		}

		//Sorting without Neutral Player
		StatsTable.finalTable.sort((a,b)=>
			(b.lastRound - a.lastRound) ||
			(b.peakRegions - a.peakRegions)
		);

		//Adding Neutral Player at the very bottom always
		let lineNeutral = {
			name: GameStorage.players[GameStorage.playersNumber].name,
			avgRoll: (GameStorage.players[GameStorage.playersNumber].attackPointsTotal / GameStorage.players[GameStorage.playersNumber].diceThrownTotal).toFixed(3),
			lastRound: GameStorage.players[GameStorage.playersNumber].lastRound,
			peakRegions: 0,
			colorClassText: GameStorage.players[GameStorage.playersNumber].colorClassText
		}
		StatsTable.finalTable.push(lineNeutral);
	}

	static showFinalStatsTable(html_global_id, html_tableBody_id, html_tableSummary_id){
		const tableDiv = document.getElementById(html_global_id);
		const tableHeader = document.getElementById(html_tableSummary_id);
		const tableBody = document.getElementById(html_tableBody_id);

		if(TurnSystem.humanIsAlive){
			FileManager.playSound('victory');
			tableHeader.textContent = `Victory! Your Empire has conquered them all!`;
		}else{
			FileManager.playSound('defeated');
			tableHeader.textContent = `You have been defeated in round ${TurnSystem.roundNumber}...`;
		}

		for(let i=0; i<StatsTable.finalTable.length; i++){
			const tr = document.createElement('tr');
			tableBody.appendChild(tr);

			const td1 = document.createElement('td');
			td1.textContent = StatsTable.finalTable[i].name;
			td1.classList.add(StatsTable.finalTable[i].colorClassText);
			td1.classList.add('player-name-font');
			td1.classList.add('stats-table-td');
			tr.appendChild(td1);

			const td2 = document.createElement('td');
			if(!isNaN(StatsTable.finalTable[i].avgRoll)){
				td2.textContent = StatsTable.finalTable[i].avgRoll;
			}else{
				td2.textContent = '-';
			}
			td2.classList.add('stats-table-td');
			tr.appendChild(td2);

			const td3 = document.createElement('td');
			if(StatsTable.finalTable[i].peakRegions !== 0){ //Neutral's Empire doesn't contain regions
				td3.textContent = StatsTable.finalTable[i].peakRegions;
			}
			td3.classList.add('stats-table-td');
			tr.appendChild(td3);

			const td4 = document.createElement('td');
			if(i !== 0){
				//Only Neutral Player may have lastRound=1 if not eliminated during the game
				if(StatsTable.finalTable[i].lastRound !== 1){
					//Winner(s) is/are already at the top of the table. They have not been eliminated - no last round for them
					if(StatsTable.finalTable[i].lastRound !== (TurnSystem.roundNumber + 1)){
						td4.textContent = StatsTable.finalTable[i].lastRound;
					}
				}
			}
			td4.classList.add('stats-table-td');
			tr.appendChild(td4);
		}

		tableDiv.classList.add('open-table');
	}
}