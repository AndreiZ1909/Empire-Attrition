/* It is an abstract class in fact, but logically closer to an ABAP interface.
   Multiple inheritance is not required, but on this level all methods are supposed to be left empty */

export class PlayerManager{
	constructor(playerHumanIndicator){
		this.playerHuman = playerHumanIndicator;
	}

	processStartTrun(){
		throw new Error("You are calling abstract class. The method has not been overriden!");
	}

	processAction(){
		throw new Error("You are calling abstract class. The method has not been overriden!");
	}

	processEndTurn(){
		throw new Error("You are calling abstract class. The method has not been overriden!");
	}
}