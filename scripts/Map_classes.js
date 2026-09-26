import { Region } from './Region_class.js';

class Cell{
	constructor(cellID, x, y){
		this.cellID = cellID;
		this.x = x;
		this.y = y;
		this.divElement = null;  		//declaring a link to DOM <div> cell
		this.regionID = null;
		this.spanLink = null;
	}
}

export class Grid{
	constructor(lines, columns, html_global_id, regions){
		this.lines = lines;
		this.columns = columns;
		this.html_global_id = html_global_id;
		this.regions = regions;
	}

	coreGrid = [];  //Initializing the main 2D array of cells (DIVs)

	//This method puts a cell's DIV onto the global map DIV and assigns basic .css styles
	positionCellOnGrid(x, y, divLink, cellSize){
		divLink.style.setProperty('width', `${cellSize}px`);
		divLink.style.setProperty('height', `${cellSize}px`);

		divLink.style.setProperty('left', `${x*cellSize}px`);
		divLink.style.setProperty('top', `${y*cellSize}px`);

		divLink.classList.add('cell-basic');
	}

	static cellAndDIVCreation(divGrid, divGridWidth, divGridHeight, gridInstance){
		let divWidth = Math.round(100*divGridWidth / gridInstance.columns)/100;
		let divHeight = Math.round(100*divGridHeight / gridInstance.lines)/100;

		let cellSize = Math.min(divWidth, divHeight);

		for (let i = 0; i < gridInstance.lines; i++){
			const newline = [];
			gridInstance.coreGrid.push( newline );
			for (let j = 0; j < gridInstance.columns; j++){

				//Array of cells for game logic
				const cell = new Cell( i*gridInstance.columns + j + 1, j, i);
				newline.push( cell );

				//Array of html tag cells
				const divCell = document.createElement("div");
				divGrid.appendChild(divCell);

				//Linking
				cell.divElement = divCell;

				//Placing DIVCell on global DIV-Grid
				gridInstance.positionCellOnGrid(j, i, cell.divElement, cellSize);
			}
		}

		//Shifting Grid to center of the screen vertically and horizontally
		let deltaX = (divGridWidth - cellSize*gridInstance.columns)/2;
		let deltaY = (divGridHeight - cellSize*gridInstance.lines)/2;

		document.getElementById(gridInstance.html_global_id).style.transform = `translate(${deltaX}px, ${deltaY}px)`;
	}

	static buildRegions(coreGrid, gridInstance){
		//Assigning a random Cell to each Region
		Region.createSeeds(coreGrid, gridInstance.regions);

		//Regions conquer all cells on the map
		const regionGovernors = [];//temporary array of all (seeded) regions  
		for(let i=0;i<gridInstance.regions.length;i++){
			regionGovernors.push(i);
		}
		for(let i=0;i<(gridInstance.lines*gridInstance.columns)-gridInstance.regions.length;i++){
			if (regionGovernors.length > 0){
					const pointerGovernor = i % (regionGovernors.length);
					if (Region.conquerCell(coreGrid, gridInstance.regions[regionGovernors[pointerGovernor]]) === false){
						//eliminating from array of regions if conquering failed
						regionGovernors.splice(pointerGovernor, 1);
						i--;
					}
				}
			else{
				break;
			}
		}
	}

	initializeGrid(){
		let divGrid = document.getElementById(this.html_global_id);

		//Phase 1: creation of cells and corresponding DIVs
		Grid.cellAndDIVCreation(divGrid, document.getElementById(this.html_global_id).offsetWidth, document.getElementById(this.html_global_id).offsetHeight, this);

		//Phase 2: building regions on top of Grid of cells
		Grid.buildRegions(this.coreGrid, this);
		
		//Phase 3: refinement. Many operation merged into below method within one loop to boost performance
		Region.refineRegionsAndFrontline(this.coreGrid, this.regions);

		return divGrid;
	}
}