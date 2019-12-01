/*
 * global variables storing the a-entities (etc)
 * in arrays for easy modification from javascript
 */
var boxes = new Object();
var buttons = new Object();
var frames = new Object();

// mongodb guides
  // https://docs.mongodb.com/manual/tutorial/install-mongodb-on-os-x/
  // http://mongodb.github.io/node-mongodb-native/2.2/quick-start/quick-start/

/*
 * the animate function being originally called from render()
 * and then recursively calling itself by requestAnimationFrame()
 * according to device capabilities
 */
function animate() {
    requestAnimationFrame(animate);
    for(var box in boxes) {
        if (boxes[box].getAttribute('class') == "shotByO") {
            boxes[box].object3D.rotation.y += .07;
        } else if (boxes[box].getAttribute('class') == "shotByX") {
            boxes[box].object3D.rotation.x += .07;
        } else {
            boxes[box].object3D.rotation.x += Math.floor((Math.random() * 10) + 1) / 500;
            boxes[box].object3D.rotation.y += Math.floor((Math.random() * 10) + 1) / 500;
            boxes[box].object3D.rotation.z += Math.floor((Math.random() * 10) + 1) / 500;
        }
    }
};

/*
 * replaces a simple crate on the board
 * with a new a-box
 * (also in global arrays)
 */
function replaceBox(boxId, playerShot) {
    var newElement = document.createElement('a-box');
    newElement.setAttribute('cursor-listener', null);
    var shotBy;
    var pictureSelect;
    if (playerShot == 1) {
        shotBy = "shotByX";
        if (playerSymbol == 0) pictureSelect = "src: url(textures/xo.svg)";
        else pictureSelect = "src: url(textures/ox.svg)";
    } else {
        shotBy = "shotByO";
        if (playerSymbol == 0) pictureSelect = "src: url(textures/ox.svg)";
        else pictureSelect = "src: url(textures/xo.svg)";
    } 

    var newPosition = boxes[boxId].getAttribute('position').x + ' ' + boxes[boxId].getAttribute('position').y + ' ' + boxes[boxId].getAttribute('position').z;
    newElement.setAttribute('class', shotBy);
    newElement.setAttribute('id', boxes[boxId].getAttribute('id'));
    newElement.setAttribute('position', newPosition);
    newElement.setAttribute('width', .4);
    newElement.setAttribute('height', .4);
    newElement.setAttribute('depth', .1);
    newElement.setAttribute('material', pictureSelect.toString());

    var parent = boxes[boxId].parentNode;
    parent.removeChild(boxes[boxId]);
    delete boxes[boxId];
    parent.appendChild(newElement);
    boxes[boxId] = newElement;
};

/*
 * helper function for short visibility of field
 * after game over
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/*
 * function is called at time when game is over,
 * either after player or bot move
 */
async function gameOver (whatHappened) {
    if (gameStatus !=2) {
        gameStatus = 2;
        if (whatHappened != 4) await sleep(2000);
        var field = document.getElementById('playingField');
        // Make the elements transparent
        for (frame in frames) {
            frames[frame].setAttribute('color', '#4e5160');
        }
        for (box in boxes) {
            boxes[box].setAttribute('material', 'opacity: 0.5');
        }
        var scene = field.parentNode;
        // field.parentNode.removeChild(field);

        var gameOverScreen = document.createElement('a-entity');
        gameOverScreen.setAttribute('position', '0 0 -1.5');
        gameOverScreen.setAttribute('scale', '2 2 2');


        if(whatHappened == 1) {
            console.log("You have won.");
            gameOverScreen.setAttribute('text', "value: You have won!; width: 2; height: 1 align: center; color: green; align: center; font: lib/Roboto-msdf.json; fontImage: lib/Roboto-msdf.png");
        } else if(whatHappened == 2) {
            console.log("The bot has won.");
            gameOverScreen.setAttribute('text', "value: You have lost!; width: 2; height: 1 align: center;  color: red; align: center; font: lib/Roboto-msdf.json; fontImage: lib/Roboto-msdf.png");
        } else if(whatHappened == 3) {
            console.log("Nobody has won.");
            gameOverScreen.setAttribute('text', "value: It's a draw!; width: 2; height: 1 align: center; color: orange; align: center; font: lib/Roboto-msdf.json; fontImage: lib/Roboto-msdf.png");
        } else if (whatHappened == 4) {
            console.log("The other player disconnected.");
            document.getElementById('playingField').setAttribute('visible', 'false');
            gameOverScreen.setAttribute('text', "value: Your opponent\ndisconnected!; width: 2; height: 1 align: center; color: red; align: center; font: lib/Roboto-msdf.json; fontImage: lib/Roboto-msdf.png");
        }

        scene.appendChild(gameOverScreen);

        var resetButton = document.createElement('a-text');
        resetButton.setAttribute("cursor-listener", null);
        resetButton.setAttribute("class", "button");
        resetButton.setAttribute("id", "resetButton");
        resetButton.setAttribute("position", "0 -.38 -1.5");
        resetButton.setAttribute("geometry", "primitive: plane; width: 1; height: .4");
        resetButton.setAttribute("scale", ".5 .5 .5");
        resetButton.setAttribute("align", "center");
        resetButton.setAttribute("material", "color: green");
        resetButton.setAttribute("text", "value: RESET; font: lib/Roboto-msdf.json; fontImage: lib/Roboto-msdf.png");

        scene.appendChild(resetButton);
    }
}

/*
 * global helper variables
 *
 */
var chosenAlgorithm = 0; //The algorithm ought to be used for bot. 0 is MinMax, 1 is BenCarp. (0 easy, 1 hard)
var playerSymbol = 0;    //Symbol used for the player. 0 is X, 1 is O.

var boxInitCounter = 0;
var buttonInitCounter = 0;
var frameInitCounter = 0;
var alternatingPlayers = 1; //1 aka human, 2 aka bot

var gameStatus = 0; //0 = game not started; 1 = game running 2 = game over

var gameType;
var setMoveMulti;

/*
 * takes care of all click event listeners
 * in a series of else-if-statements, depending on clicked element
 */
AFRAME.registerComponent('cursor-listener', {
    init: function () {
    this.el.addEventListener('click', function (evt) {
        if (this.getAttribute('class') == "shootable" && _isGameOver() == 0 && gameStatus == 1) {
            if (alternatingPlayers == 1){
                if(document.getElementById('shootInstruction') != undefined) {
                    var instr = document.getElementById('shootInstruction');
                    instr.parentNode.removeChild(instr);
                }
                if (gameType == "sp") {
                    replaceBox(this.getAttribute('id'), alternatingPlayers);
                    _SetMove(parseInt(this.getAttribute('id').substring(3, 4)), alternatingPlayers);
                    alternatingPlayers = 2;
                    if (_isGameOver() == 0) {
                        var moveAI = _GetMove(chosenAlgorithm);
                        _SetMove(moveAI, alternatingPlayers);
                        replaceBox("box" + moveAI, alternatingPlayers);
                    } 
                    if (_isGameOver() != 0) {
                        gameOver(_isGameOver());
                    }
                    alternatingPlayers = 1;
                } else if (gameType == "mp") {
                    alternatingPlayers = 2;
                    setMoveMulti(parseInt(this.getAttribute('id').substring(3, 4)));
                }        
            }
        } else if (this.getAttribute('class') == "button" && this.getAttribute('id') == "startGameSingle" && gameStatus == 0) { //start singleplayer game with the randomized first player
            gameStatus = 1;
            gameType = "sp";
            var field = document.getElementById('startScreenButtons');
            field.parentNode.removeChild(field);
            document.getElementById('playingField').setAttribute('visible', 'true');
            document.getElementById("shootInstruction").setAttribute('visible', 'true');
            document.getElementById('shootInstruction').setAttribute('text', 'value: Tap to shoot!; align: center; color: black; font: lib/Roboto-msdf.json; fontImage: lib/Roboto-msdf.png');
            if (playerSymbol == 1) {
                alternatingPlayers = 2;
                var moveAI = _GetMove(1);
                _SetMove(moveAI, alternatingPlayers);
                replaceBox("box" + moveAI, alternatingPlayers);
                alternatingPlayers = 1;
            }
        } else if (this.getAttribute('class') == "button" && this.getAttribute('id') == "startGameMulti" && gameStatus == 0) { //start multiplayer game
            gameStatus = 1;
            gameType = "mp";
            var field = document.getElementById('startScreenButtons');
            field.parentNode.removeChild(field);
            document.getElementById("shootInstruction").setAttribute('visible', 'true');
            document.getElementById('shootInstruction').setAttribute('text', 'value: Waiting for opponent.; align: center; color: black; font: lib/Roboto-msdf.json; fontImage: lib/Roboto-msdf.png');
            multiplayerFunctions();
        } else if (this.getAttribute('class') == "button" && this.getAttribute('id') == "chooseDifficulty" && gameStatus == 0) { //choose the difficulty before the game starts
            document.getElementById("shootInstruction").setAttribute('visible', 'false');
            if (chosenAlgorithm == 0) {
                this.setAttribute("material", "color: orange");
                this.setAttribute("value", "DIFFICULTY: HARD");
                chosenAlgorithm = 1;
            } else if (chosenAlgorithm == 1) {
                this.setAttribute("material", "color: green");
                this.setAttribute("value", "DIFFICULTY: EASY");
                chosenAlgorithm = 0;
            }
        } else if (this.getAttribute('class') == "button" && this.getAttribute('id') == "chooseSymbol" && gameStatus == 0) { //choose the symbol
            document.getElementById("shootInstruction").setAttribute('visible', 'false');
            if (playerSymbol == 0) {
                this.setAttribute("value", "SYMBOL: O");
                playerSymbol = 1;
            } else if (playerSymbol == 1) {
                this.setAttribute("value", "SYMBOL: X");
                playerSymbol = 0;
            }
            } else if (this.getAttribute('class') == "button" && this.getAttribute("id") == "resetButton") { //reloads entire window
                window.location.reload();
            }
        });
        if (this.el.getAttribute('class').includes('shootable') == true && boxInitCounter < 9) {
            boxes["box" + boxInitCounter] = this.el;
            if(boxInitCounter == 8) {
            animate();
            }
            boxInitCounter++;
        } else if (this.el.getAttribute('class').includes('button') == true) {
            buttons[String(this.el.getAttribute("id"))] = this.el;
            buttonInitCounter++;
        } 
    }
});

/*
 * packages field frames (blue beams)
 * into global array
 */
AFRAME.registerComponent('frame', {
    init: function () {
    frames[String(this.el.getAttribute("id"))] = this.el;
    frameInitCounter++;
    }
});

/*
 * functions for the socket communication
 * in multiplayer mode
 */
var multiplayerFunctions = function() {
    var socket = io.connect();

    socket.on('showBoard', function(playerT) {
        document.getElementById('playingField').setAttribute('visible', 'true');
        document.getElementById('shootInstruction').setAttribute('text', 'value: Tap to shoot!; align: center; color: black; font: lib/Roboto-msdf.json; fontImage: lib/Roboto-msdf.png');
        playerSymbol = playerT;
        alternatingPlayers = playerT + 1;   // If we are X, then we start, so 0 + 1 = 1, we can play as "human". Otherwise we have to wait for the "bot" aka other human to play
    });

    socket.on('hideBoard', function() {
        document.getElementById("shootInstruction").setAttribute('visible', 'false');
        gameOver(4);
    });

    setMoveMulti = function (fieldID) {
        var move = {field: fieldID, player: playerSymbol};
        console.log(move);
        socket.emit('setMove', move);
    }

    socket.on('setMove', function(move) {
        console.log(move);
        if (move.player != playerSymbol) {
            _SetMove(move.field, 2); //we set the move as 2, cause the other played
            var opponentSymbol;
            replaceBox("box" + move.field, 2);
            alternatingPlayers = 1;
        } else {
            _SetMove(move.field, 1); //we set the move as 1, cause we played
            replaceBox("box" + move.field, 1);
            alternatingPlayers = 2;
        }
        if (_isGameOver() != 0) {
            gameOver(_isGameOver());
        }
    });
}
