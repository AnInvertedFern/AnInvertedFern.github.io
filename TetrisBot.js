/* 
* All points are stored in the format (x, y)
* (0, 0) is the upper left corner
* This uses Tensorflow.Javascript to run the neural network
*/ 

//Piece Information
let piecesGD = [ [], //Blank Square
	[[-1,0], [0,0], [1,0], [2,0]], //I
	[[-2,0], [-1,0], [0,0], [0,1]], //J
	[[0,1], [0,0], [1,0], [2,0]], //L
	[[0,0], [1,0], [0,1], [1,1]], //O
	[[-1,1], [0,1], [0,0], [1,0]], //S
	[[-1,0], [0,0], [0,1], [1,0]], //T
	[[-1,0], [0,0], [0,1], [1,1]] //Z
];
let piecesNamesGD = ["", "I", "J", "L", "O", "S", "T", "Z"]
let pieceColorsGD = ["lavender", "darkorchid", "maroon", "silver", "purple", "navy", "darkgreen", "brown", "teal"];
let rotationMatriciesGD = [ [[1,0],[0,1]], [[0,-1],[1,0]], [[-1,0],[0,-1]], [[0,1],[-1,0]] ];

//Amount of tetris blocks played per frame
let movesPerFrameGD = 1;

//Score and place trackers
let roundCounter = 0;
let scoreTotal = 0;
let trainingWindow = 10;  //How long (in games) until the NN is trained
let dreamTiming = 10;  //How long until a game with higher explore chance happens (every "dreamTiming" number of games is) 

//Controls if the AI is toggled on
let mode = false;  //False is AI on, true is human control
let key_move = false;  //Input registered
let key_vector = [false, false, false, false];  //Which key registered

//Main holder of the tetris game and neural network
let gameHolder = new Holder();

//Main loop
async function mainLoopGD() {
	//To prevent double toggling, only flipped back in main loop
	hasSwitched = true;
	
	//Holds the information for display
	let nnStatus;
	//Play Blocks
	for (let i = 0; i < movesPerFrameGD; i++) {
		//Play one block in a game
		nnStatus = gameHolder.makeAMove();
		
		//If the game has finished
		if (nnStatus["gameDone"]) { 
			//Add score to total score for this training window
			scoreTotal += nnStatus["Score"];
			//If the training window had finished, train
			//Game reset in the training functions
			if (roundCounter%trainingWindow == 0){
				nnStatus["scoreTotal"] = scoreTotal;
				nnStatus["training"] = true;
				roundCounter += 1; 
				drawCanvasGD(nnStatus);
				//Save the averge score for window to console for record keeping, since javascript
				let aveOver = trainingWindow;
				if (roundCounter <= 1 ) {aveOver = 1;}	
				console.log("Average Score for window #" + Math.floor(roundCounter/trainingWindow) +": "+ Math.floor(nnStatus.scoreTotal/aveOver));
				//Replace networks with bad inital weights
				if (Math.floor(roundCounter/trainingWindow) < 8 && nnStatus.scoreTotal/aveOver < 30)
				{ console.log('replacing network');gameHolder.replaceNetwork();}
				await gameHolder.trainQueue();
				scoreTotal = 0;
			//Otherwise just start a new game
			} else { 
				nnStatus["scoreTotal"] = scoreTotal;
				nnStatus["training"] = false;
				roundCounter += 1;
				drawCanvasGD(nnStatus);
				gameHolder.resetGame(); 
			}
			break;
		}
		//If the game has not yet ended
		nnStatus["scoreTotal"] = scoreTotal;
		nnStatus["training"] = false;
		drawCanvasGD(nnStatus);
	}
	//Recur with a slow down (to prevent too much computation)
	if (mode === true) {setTimeout(mainLoopGD,100);}
	else {setTimeout(mainLoopGD, 75);}
}

//Updates the display and draws it
//Takes a dictionary of the current status
//Returns nothing
function drawCanvasGD(nnStatus) {
	//The grid is the tetris board
	let grid = nnStatus.grid;
	let colors = pieceColorsGD;
	let upcomingShape = nnStatus.Upcoming_shape;
	let score = nnStatus.Score;
	
	//Puts the general status in the top bar
	let genStatus = document.getElementById("generalStats");
	genStatus.innerHTML = "";
	genStatus.style.display = "flex";
	genStatus.style.alignItems = "center";
	genStatus.style.justifyContent = "center";
	let temp = document.createElement("div");
	let aveOver = (roundCounter-1)%trainingWindow;
	if (aveOver === 0) {aveOver = trainingWindow;}
	if (roundCounter <= 1 && nnStatus["gameDone"]) {aveOver = 1;}
	temp.textContent = "Score Average: "+Math.floor(nnStatus.scoreTotal/(aveOver));
	temp.style.textAlign = "center";
	temp.style.padding = "0 0.5em 0 0.5em";
	temp.style.minWidth = "10em";
	genStatus.appendChild(temp);
	temp = document.createElement("div");
	temp.textContent = "Loss: "+"N/A";
	temp.style.textAlign = "center";
	temp.style.padding = "0 0.5em 0 0.5em";
	temp.style.borderLeft = "1px solid white";
	temp.style.minWidth = "10em";
	temp.id = "Loss";
	genStatus.appendChild(temp);
	temp = document.createElement("div");
	temp.textContent = "Acc: "+"N/A";
	temp.style.textAlign = "center";
	temp.style.padding = "0 0.5em 0 0.5em";
	temp.style.borderLeft = "1px solid white";
	temp.style.minWidth = "10em";
	temp.id = "Acc";
	genStatus.appendChild(temp);
	
	//Draw the grid
	let output = document.getElementById("output");
	output.innerHTML = "";
	for (let i = 0; i < grid.length; i++) {
		let lineDiv = document.createElement("div");
		for (let j = 0; j < grid[0].length; j++){
			let para = document.createElement("div");
			para.textContent = grid[i][j];
			para.style.textAlign = "center";
			para.style.verticalAlign = "middle";
			
			para.style.color = "white";
			para.style.backgroundColor = colors[grid[i][j]];
			
			para.style.display = "inline-block";
			para.style.padding = "0.65em 0.65em 0.65em 0.65em";
			para.style.boxSizing = "border-box";
			para.style.border = "1px solid white";
			para.style.width = "1em";
			para.style.height = "1em";
			lineDiv.appendChild(para);
		}
		lineDiv.style.lineHeight = "0px";
		output.appendChild(lineDiv);
	}
	
	//Draw the left side bar, the score side bar
	let scoreDetails = document.getElementById("score");
	scoreDetails.innerHTML = "";
	let disScore = document.createElement("h2");
	disScore.textContent = "Score: " + Math.floor(score);
	disScore.style.textAlign = "center";
	disScore.style.marginTop = "0";
	scoreDetails.appendChild(disScore);
	
	let disCurrent = document.createElement("h2");
	disCurrent.textContent = "__Current__";
	disCurrent.style.marginBottom = "0px";
	disCurrent.style.textAlign = "center";
	scoreDetails.appendChild(disCurrent);
	scoreDetails.appendChild(document.createElement("br"));
	
	let disCurShape = document.createElement("h2");
	disCurShape.textContent = piecesNamesGD[nnStatus.played_shape.piece];
	disCurShape.style.textAlign = "center";
	disCurShape.style.marginTop = "0px";
	disCurShape.style.marginBottom = "7px";
	disCurShape.style.marginLeft = "auto";
	disCurShape.style.marginRight = "auto";
	disCurShape.style.width = "5em";
	disCurShape.style.color = "white";
	disCurShape.style.backgroundColor = colors[nnStatus.played_shape.piece];
	disCurShape.style.fontFamily = "serif";
	scoreDetails.appendChild(disCurShape);
	
	let disUpcoming = document.createElement("h3");
	disUpcoming.textContent = "__Upcoming__";
	disUpcoming.style.marginTop = "0px";
	disUpcoming.style.marginBottom = "0px";
	disUpcoming.style.textAlign = "center";
	scoreDetails.appendChild(disUpcoming);
	scoreDetails.appendChild(document.createElement("br"));
	let disUpShape = document.createElement("h3");
	disUpShape.textContent = piecesNamesGD[upcomingShape.piece];
	disUpShape.style.textAlign = "center";
	disUpShape.style.marginTop = "0px";
	disUpShape.style.marginLeft = "auto";
	disUpShape.style.marginRight = "auto";
	disUpShape.style.width = "5em";
	disUpShape.style.color = "white";
	disUpShape.style.backgroundColor = colors[upcomingShape.piece];
	disUpShape.style.fontFamily = "serif";
	scoreDetails.appendChild(disUpShape);
	
	temp = document.createElement("div");
	temp.textContent = "Number of Blocks Played: "+nnStatus.movesTaken;
	temp.style.textAlign = "center";
	temp.style.padding = "0.5em 0 0.5em 0";
	temp.style.borderTop = "1px solid white";
	scoreDetails.appendChild(temp);
	temp = document.createElement("div");
	temp.textContent = "Number of Games Played: "+(roundCounter);
	temp.style.textAlign = "center";
	temp.style.padding = "0.5em 0 0.5em 0";
	temp.style.borderTop = "1px solid white";
	scoreDetails.appendChild(temp);
	temp = document.createElement("div");
	temp.textContent = "Training: "+(nnStatus.training || roundCounter%dreamTiming === 0 || roundCounter % 10 === 0 ? "True" : "False");
	temp.style.textAlign = "center";
	temp.style.padding = "0.5em 0 0.5em 0";
	temp.style.borderTop = "1px solid white";
	temp.id = "training";
	scoreDetails.appendChild(temp);
	
	//Puts up the number of each move taken by the AI
	let moveTotalsMiddle =  nnStatus.moves.reduce(function(a,b){return a+b;});
	moveTotalsMiddle =  moveTotalsMiddle/nnStatus.moves.length;
	temp = document.createElement("div");
	temp.textContent = "Number of \"Key\" Presses: ";
	temp.style.textAlign = "center";
	temp.style.padding = "0.5em 0 0 0";
	temp.style.borderTop = "1px solid white";
	scoreDetails.appendChild(temp);
	
	temp = document.createElement("div");
	let arrow = document.createElement("div");
	arrow.textContent = nnStatus.moves[0];
	arrow.style.textAlign = "center";
	arrow.style.verticalAlign = "middle";
	arrow.style.color = "indianred";
	if (nnStatus.moves[0] >= moveTotalsMiddle) {arrow.style.backgroundColor = "cornsilk";} else{arrow.style.backgroundColor = "black";}
	arrow.style.display = "inline-block";
	arrow.style.marginLeft = "auto";
	arrow.style.marginRight = "auto";
	arrow.style.padding = "0.65em 0.65em 0.65em 0.65em";
	arrow.style.margin = "0.4em 0.4em 0.4em 0.4em";
	arrow.style.boxSizing = "border-box";
	arrow.style.border = "1px solid white";
	arrow.style.width = "1em";
	arrow.style.height = "1em";
	temp.appendChild(arrow);
	temp.style.textAlign = "center";
	temp.style.lineHeight = "0px";
	scoreDetails.appendChild(temp);
	
	temp = document.createElement("div");
	arrow = document.createElement("div");
	arrow.textContent = nnStatus.moves[1];
	arrow.style.textAlign = "center";
	arrow.style.verticalAlign = "middle";
	arrow.style.color = "indianred";
	if (nnStatus.moves[1] >= moveTotalsMiddle) {arrow.style.backgroundColor = "cornsilk";} else{arrow.style.backgroundColor = "black";}
	arrow.style.display = "inline-block";
	arrow.style.padding = "0.65em 0.65em 0.65em 0.65em";
	arrow.style.margin = "0.4em 0.6em 0.4em 0.6em";
	arrow.style.boxSizing = "border-box";
	arrow.style.border = "1px solid white";
	arrow.style.width = "1em";
	arrow.style.height = "1em";
	temp.appendChild(arrow);
	
	arrow = document.createElement("div");
	arrow.textContent = nnStatus.moves[3];
	arrow.style.textAlign = "center";
	arrow.style.verticalAlign = "middle";
	arrow.style.color = "indianred";
	if (nnStatus.moves[3] >= moveTotalsMiddle) {arrow.style.backgroundColor = "cornsilk";} else{arrow.style.backgroundColor = "black";}
	arrow.style.backgroundColor = "black";
	arrow.style.display = "inline-block";
	arrow.style.padding = "0.65em 0.65em 0.65em 0.65em";
	arrow.style.margin = "0.4em 0.6em 0.4em 0.6em";
	arrow.style.boxSizing = "border-box";
	arrow.style.border = "1px solid white";
	arrow.style.width = "1em";
	arrow.style.height = "1em";
	temp.appendChild(arrow);
	
	arrow = document.createElement("div");
	arrow.textContent = nnStatus.moves[2];
	arrow.style.textAlign = "center";
	arrow.style.verticalAlign = "middle";
	arrow.style.color = "indianred";
	if (nnStatus.moves[2] >= moveTotalsMiddle) {arrow.style.backgroundColor = "cornsilk";} else{arrow.style.backgroundColor = "black";}
	arrow.style.display = "inline-block";
	arrow.style.padding = "0.65em 0.65em 0.65em 0.65em";
	arrow.style.margin = "0.4em 0.6em 0.4em 0.6em";
	arrow.style.boxSizing = "border-box";
	arrow.style.border = "1px solid white";
	arrow.style.width = "1em";
	arrow.style.height = "1em";
	temp.appendChild(arrow);
	temp.style.textAlign = "center";
	temp.style.lineHeight = "0px";
	scoreDetails.appendChild(temp);
}

//Drop off for reward for reinforcement learning over time
//let gamma = 0.98;  //en.wikipedia.org/wiki/Q-learning#Discount_factor
let gamma = 0.995;
//This class holds the neural network, the tetris game, and the created training data
function Holder(){
	this.network = new Network();
	//For replacing a network if intial weights are really bad
	this.replaceNetwork = function() { this.network = new Network(); }
	this.game = new TetGameGD();
	this.xs = [];  //Inputs for training
	this.ys = [[]];  //Targets for training
	this.masks = [];  //Masks for training
	this.anti_forgetting = [];  //Block of previous experiences for retraining
	this.que_min_index = 0;  //Worst experience in that block
	
	//Has the tetris game play a block, and then stores the move for later training
	//Returns a dictionary of the current game status
	this.makeAMove = function() {
		let retval = this.game.makeAMove(this.network);
		this.xs = this.xs.concat(retval.xs);
		//this.ys = this.ys.concat(retval.ys);
		this.ys[this.ys.length-1] = this.ys[this.ys.length-1].concat(retval.ys);
		if (retval.gameStatus.gameDone) {this.ys.push([])};
		this.masks = this.masks.concat(retval.masks);
		return retval.gameStatus;
	}
	//Reset the tetris game
	this.resetGame = function() {
		this.game = new TetGameGD();
	}
	//Train the network on the aquired data, and then wipe the data
	this.trainQueue = async function() {
		let shifted_ys = [];
		let maxScore = 0;
		cumulativeScore = 0;
		this.ys.pop();
		//Calculate the cumlative reward in each game and backwards assign reward
		for (let episode of this.ys.reverse()) {
			cumulativeScore = 0;
			for (let i in episode) {
				let index = episode.length -1 -i;
				cumulativeScore *= gamma;
				cumulativeScore += episode[index];
				shifted_ys.unshift(cumulativeScore);
				if (cumulativeScore > maxScore) { maxScore = cumulativeScore; }
				if (this.anti_forgetting.length < 100 || this.anti_forgetting[this.que_min_index] < cumulativeScore) {
					if (this.anti_forgetting.length >= 100) {
						this.anti_forgetting.splice(this.que_min_index,1);
					}
					this.anti_forgetting.push([ this.xs[shifted_ys.length-1], 
					[shifted_ys[shifted_ys.length-1],shifted_ys[shifted_ys.length-1],shifted_ys[shifted_ys.length-1],shifted_ys[shifted_ys.length-1]], 
					this.masks[shifted_ys.length-1] ])
					
					if (this.anti_forgetting.length > 1) {this.que_min_index = this.anti_forgetting.reduce(function(acc, val, index, arr) {
						if (arr[index][1] < arr[acc][1]) {return index;} else {return acc;}
					}, 0);}
					else {this.que_min_index = 0;}
				}
			}
		}
		shifted_ys = shifted_ys.map(function(y){return [y,y,y,y];})
		for (let i = 1; i < this.anti_forgetting.length; i++) {
			this.xs.push(this.anti_forgetting[i][0]);
			shifted_ys.push(this.anti_forgetting[i][1]);
			this.masks.push(this.anti_forgetting[i][2]);
		}
		let retval = await this.network.train(this.xs, shifted_ys, this.masks);
		
		//Wipe the old data and start a new tetris game
		this.xs = [];
		this.ys = [[]];
		this.masks = [];
		this.game = new TetGameGD();
		//Randomly delete from memory que
		if (this.anti_forgetting.length > 99) {for (let i = 1; i < 5; i++) {
			this.anti_forgetting.splice(Math.floor(Math.random() * this.anti_forgetting.length), 1);
		}}
	}
	
}

//The class that holds the neural network
function Network(){
	this.model = null;
	//Creates the model
	this.getModel = function() {
		xs = tf.input({shape: [20, 10, 2]});
		x = tf.layers.flatten({}).apply(xs);
		x = tf.layers.dense({units:190, activation:'relu', kernelInitializer:'randomUniform'}).apply(x);
		//x = tf.layers.dropout({rate: 0.1}).apply(x);
		x = tf.layers.dense({units:150, activation:'relu', kernelInitializer:'randomUniform'}).apply(x);
		//x = tf.layers.dropout({rate: 0.1}).apply(x);
		x = tf.layers.dense({units:100, activation:'relu', kernelInitializer:'randomUniform'}).apply(x);
		//x = tf.layers.dropout({rate: 0.1}).apply(x);
		x = tf.layers.dense({units:80, activation:'relu', kernelInitializer:'randomUniform'}).apply(x);
		//x = tf.layers.dropout({rate: 0.1}).apply(x);
		x = tf.layers.dense({units:60, activation:'relu', kernelInitializer:'randomUniform'}).apply(x);
		//x = tf.layers.dropout({rate: 0.1}).apply(x);
		x = tf.layers.dense({units:40, activation:'relu', kernelInitializer:'randomUniform'}).apply(x);
		//x = tf.layers.dropout({rate: 0.1}).apply(x);
		x = tf.layers.dense({units:20, activation:'relu', kernelInitializer:'randomUniform'}).apply(x);
		//x = tf.layers.dropout({rate: 0.1}).apply(x);
		x = tf.layers.dense({units:10, activation:'relu', kernelInitializer:'randomUniform'}).apply(x);
		//x = tf.layers.dropout({rate: 0.1}).apply(x);
		x = tf.layers.dense({units:4, activation:'softmax'}).apply(x);
		masks = tf.input({shape: [4]});
		predictions = tf.layers.multiply().apply([x,masks]);
		
		model = tf.model({inputs:[xs,masks], outputs:predictions});
		
		return model;
	}
	this.model = this.getModel();
	
	//Runs the training
	//Takes inputs, targets, and masks for training
	this.train = async function(xs, ys, masks){
		
		const optimizer = 'adam';
		
		this.model.compile({
			optimizer,
			loss: 'categoricalCrossentropy',
			metrics: ['accuracy'],
		});
		
		const batchSize = 50;
		
		const trainEpochs = 1;
		
		let trainBatchCount = 0;
		
		const totalNumBatches =
			Math.ceil(xs.length / batchSize) *
			trainEpochs;
		await this.model.fit([tf.tensor(xs), tf.tensor(masks)], tf.tensor(ys), {
			batchSize,
			epochs: trainEpochs,
			shuffle : true,
			callbacks: {
				onBatchEnd: async (batch, logs) => {
					trainBatchCount++;
					let training = document.getElementById("training");
					training.textContent = "Training: "+Math.floor(((trainBatchCount)/totalNumBatches) * 100) + ' %';
					let loss = document.getElementById("Loss");
					loss.textContent = "Loss: "+(logs.loss).toFixed(9);
					let acc = document.getElementById("Acc");
					acc.textContent = "Acc: "+(logs.loss).toFixed(9);
					await tf.nextFrame();
				}
			}
		});
	}
	
	//Run the neural network on the input to get an output
	//Takes an input, an array (a squashed matrix with a vector stuck on the end)
	//	of the tetris grid, and shape position and type, etc.
	//Returns an array of four, with values telling the preference for each possible move
	this.predict = function(input) {
		return tf.tidy(() => {
			let output = this.model.predict([tf.tensor([input]), tf.tensor([[1,1,1,1]]) ]);
			output = Array.from(output.dataSync())
			return output;
		});
	}
}

//Class that contains details about a particular block in the tetris game
function ShapeGD(){
	this.coor = [4, 0]
	this.piece = Math.floor(Math.random() * (piecesGD.length-1))+1;
	this.rotation = 0; // 1 is 90deg, 2 is 180deg, 3 is 240deg
	//Returns each coordinates in the grid/board that the shape takes up 
	//Takes an optional pair for the coordinates, and number for the rotation of the shape
	//  Otherwise it uses the coordinates and rotation of the shape object it was called from
	//Returns an array of pairs, each pair being a coordinate in the grid the shape is in for the given rotation and coordiantes
	this.getAllCoordinates = function(coor, rotation){
		if (coor === undefined) {coor = this.coor;}
		if (rotation === undefined) {rotation = this.rotation;}
		let pieceUnRotatedRelativeCoor = piecesGD[this.piece];
		let RM = rotationMatriciesGD[rotation];
		let pieceRotatedAbsoluteCoor = [];
		for (let block of pieceUnRotatedRelativeCoor) {
			pieceRotatedAbsoluteCoor.push([ RM[0][0]*block[0]+RM[0][1]*block[1] + coor[0], RM[1][0]*block[0]+RM[1][1]*block[1] + coor[1] ]);
		}
		return pieceRotatedAbsoluteCoor;
	}
}

//Class that defines the tetris games and the functionailty to play them
function TetGameGD(){
	this.currentShape = new ShapeGD();
	this.nextShape = new ShapeGD();
	this.grid = [];
	for (let i = 0; i<20; i++){
		let tempRow = [];
		for (let i = 0; i<10; i++){ tempRow.push(0); }
		this.grid.push(tempRow);
	}
	this.score = 0;
	this.movesTaken = 0;
	this.moveTotals = [];  //Total number of times each move has been taken
	this.xs = [];  //Inputs done in this game
	this.ys = [];  //Outputs done in this game
	this.masks = [];  //Masks used in this game
	for(let i = 0; i<4;i++){this.moveTotals.push(0);}
	
	//Gets all moves to play from the neural network
	//With random chance added in for exploration in the RL
	//Takes the input for the network, and a reference to the network to use
	//Outputs an array where the move to do is true, and the rest false
	//The array stores the moves in order of [up, left, down, right]
	this.moveEval = function(input, network){
		//If the human is in control, use their inputed value instead
		if (key_move || mode === true) {
			let moves = key_vector;
			this.moveTotals[key_vector.indexOf(true)]+=1;
			key_move = false;
			key_vector = [false, false, false, false];
			return moves;
		}
		
		//Otherwise
		//Assign the change for exploration (chance to pick a random value)
		let exploreChance = 0.10;
		//if (roundCounter < 3) { exploreChance = 0.90; }
		if (roundCounter % 10 === 0) { exploreChance = 0.90; }
		if (roundCounter%dreamTiming == 0) { exploreChance = 0.70; }
		//Get the move evaluations from the network
		let moves = network.predict(input);
		//Get the prefered move
		let maxMove = moves.indexOf(Math.max.apply(null, moves));
		moves = [false, false, false, false];
		//If it does not explore, then it does the move
		let tooHigh = false;
		if (maxMove === 3 && this.currentShape.coor[1] > 2) {tooHigh = true;} 
		if (Math.random() < 1-exploreChance && !tooHigh) { moves[maxMove] = true; }
		else { moves[Math.floor(Math.random()*(this.currentShape.coor[1] > 2? 3 : 3.1))] = true; }
		//Record the move done
		this.moveTotals[moves.indexOf(true)]+=1;
		return moves;
	}
	
	//Checks if a position is valid
	//Takes a shape, with optional coordiantes and rotation
	//Default coordiantes and rotation are the input shape's
	//Returns a boolean
	this.checkValidMove = function(shape, coor, rotation){
		pieceCoor = shape.getAllCoordinates(coor,rotation);
		validMove = true;
		for (let coor of pieceCoor) {
			if (coor[0] < 0 || coor[0] >= 10) {validMove = false; break;}
			if (coor[1] < 0 || coor[1] >= 20) {validMove = false; break;} //coor[1] < 0 || 
			if (this.grid[coor[1]][coor[0]] !== 0) {validMove = false; break;} //}     if (coor[1] > 0) { 
		}
		return validMove;
	}
	
	this.clearedARow = false;
	//Plays a single block onto the grid/board
	//Takes the network to use for move selection
	//Outputs a dictionary of the game status
	this.makeAMove = function(network){
		let gameStatus = {};
		this.moveTotals = [];
		this.xs = [];
		this.ys = [];
		this.masks = [];
		this.move_i = 0;
		this.move_finished = false;
		for(let i = 0; i<4;i++){this.moveTotals.push(0);}

		//Check the game is not over
		if ( !(this.checkValidMove(this.currentShape)) ) {
			gameStatus["grid"] = this.grid;
			gameStatus["played_shape"] = this.currentShape;
			gameStatus["Upcoming_shape"] = this.nextShape;
			gameStatus["Score"] = this.score;
			gameStatus["movesTaken"] = this.movesTaken;
			gameStatus["gameDone"] = true;
			gameStatus["moves"] = this.moveTotals;
			this.move_i = 0;
			return {gameStatus: gameStatus, xs: this.xs, ys: this.ys, masks: this.masks};
		}
		
		let input = [];
		let moves;
		//Make moves: if AI controlled, until block hits the ground; if human controlled, just one move
		for ( this.move_i = mode ? this.move_i : 0; this.move_i < 80; this.move_i++) {
			this.movesTaken += 1;
			
			//Create the inputs for the neural network
			input = [];
			//Add grid info
			let temprow = [];
			let tempsq = [];
			for (let row of this.grid) {
				temprow = [];
				for (let square of row) {
					tempsq = [0 ,0];
					tempsq[0] = (square === 0) ? 0 : 1;
					temprow.push(tempsq);
				}
				input.push(temprow);
			}
			//Add current shape info
			let currentPoints = this.currentShape.getAllCoordinates();
			for (let point of currentPoints){
				input[point[1]][point[0]][1] = 1;
			}
			
			//Get the moves to play from the neural network (or person)
			moves = this.moveEval(input, network); //[up, left, down, right]
			
			//Implement the move if valid
			let newRotation;
			let newCoor;
			//Rotate shape
			if (moves[0]) {
				newRotation = (this.currentShape.rotation === 3)?0:this.currentShape.rotation+1;
				if (this.checkValidMove(this.currentShape, this.currentShape.coor, newRotation)) {
					this.currentShape.rotation = newRotation;
				}
			}
			//Move left
			if (moves[1]) {
				newCoor = [this.currentShape.coor[0]-1, this.currentShape.coor[1]];
				if (this.checkValidMove(this.currentShape, newCoor)) {
					this.currentShape.coor = newCoor;
				}
			}
			//Move right
			if (moves[2]) {
				newCoor = [this.currentShape.coor[0]+1, this.currentShape.coor[1]];
				if (this.checkValidMove(this.currentShape, newCoor)) {
					this.currentShape.coor = newCoor;
				}
			}
			//Drop the shape one row
			newCoor = [this.currentShape.coor[0], this.currentShape.coor[1]+1];
			if (this.movesTaken%4 === 0 && this.checkValidMove(this.currentShape, newCoor)) {
				this.currentShape.coor = newCoor;
			}
			//Move the shape all the way down
			if (moves[3]) {
				for ( let i = 0; i < 10; i++) {
					let newCoor = [this.currentShape.coor[0], this.currentShape.coor[1]+1];
					if (this.checkValidMove(this.currentShape, newCoor)) {
						this.currentShape.coor = newCoor;
					} else { break; }
				}
			}
			//Check if the shape has hit the bottom
			if (this.movesTaken%4 === 0 && !(this.checkValidMove(this.currentShape, [this.currentShape.coor[0], this.currentShape.coor[1]+1]))) { this.move_finished = true; break; }
			else {
				//Append Training data
				this.xs.push(input);
				this.ys.push(0);
				this.masks.push(moves.map(function(y){
						return (y ? 1 : 0);
					}));
			}
			if (mode) {break;}
		}
		
		//If the block has hit the ground, score the changes, and clear rows
		if (this.move_finished === true) {		
			let newPoints = this.currentShape.getAllCoordinates();
			let tempScore = 0;
			let roundScore = 0;
			//Give score for the more blocks in a row
			for (let point of newPoints) {
				this.grid[point[1]][point[0]] = this.currentShape.piece;
				tempScore = 0;
				let cNumber = 0;
				let connected = 0;
				for (let i = 0; i < 10; i++) {
					if (this.grid[point[1]][i] !== 0) { 
						tempScore += 1; 
						cNumber += connected;
						connected += 1;
					} else { connected = 0; }
					
				}
				//this.score += ((cNumber**2* point[1]**2*tempScore**2)/100);
				//roundScore += ((cNumber**2* point[1]**2*tempScore**2)/100);
				this.score += ((cNumber* point[1]*tempScore)/100);
				roundScore += ((cNumber* point[1]*tempScore)/100);
				/*if (point[1] > 17) {
				this.score += cNumber**2* ( Math.ceil(point[1]/5)**2*tempScore**2);
				roundScore += cNumber**2* ( Math.ceil(point[1]/5)**2*tempScore**2); }
				else {
					this.score += cNumber*2;
					roundScore += cNumber*2;
				}*/
			}
			tempScore = 0;
			//Clear filled rows and give points for it
			for (let i = 0; i < 20; i++) {
				rowFull = true;
				for (let block of this.grid[i]) {
					if (block === 0) { rowFull = false; }
				}
				if (rowFull) {
					tempScore += i;
					this.grid.splice(i,1);
					this.grid.unshift([0,0,0,0,0,0,0,0,0,0]);
					if (!(this.clearedARow)) console.log("Row Cleared, Game: "+roundCounter+";");
					this.clearedARow = true;
					console.log("Moves_Taken: "+this.movesTaken+";");
				}
			}
			//this.score += ((10*tempScore**2)/100);
			//roundScore += ((10*tempScore**2)/100);
			this.score += ((10*tempScore));
			roundScore += ((10*tempScore));
			
			this.currentShape = this.nextShape;
			this.nextShape = new ShapeGD();
			
			//Append Training data
			this.xs.push(input);
			this.ys.push(roundScore);
			this.masks.push(moves.map(function(y){
					return (y ? 1 : 0);
				}));
			
			this.move_i = 0; 
			this.move_finished = false;
		}
		
		//Update the game status info
		gameStatus["moves"] = this.moveTotals;
		
		gameStatus["grid"] = [];
		for (let row = 0; row < this.grid.length; row++) {
			temprow = [];
			for (let square = 0; square < this.grid[row].length; square++) {
				temprow.push(this.grid[row][square]);
			}
			gameStatus["grid"].push(temprow);
		}
		gameStatus["played_shape"] = this.currentShape;
		gameStatus["Upcoming_shape"] = this.nextShape;
		gameStatus["Score"] = this.score;
		gameStatus["movesTaken"] = this.movesTaken;
		gameStatus["gameDone"] = false;
		
		//Don't overlap pieces (when the game ends when a piece is in the spawn area for shapes
		if ( this.checkValidMove(this.currentShape) ) {
			for (let point of this.currentShape.getAllCoordinates()) {
				gameStatus["grid"][point[1]][point[0]] = this.currentShape.piece;
			}
		}
		return {gameStatus: gameStatus, xs: this.xs, ys: this.ys, masks: this.masks};
	}
}

































