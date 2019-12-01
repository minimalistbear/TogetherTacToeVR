#include <emscripten/emscripten.h>
#include <iostream>
#include <algorithm>
#include <random>
#include <chrono>
#include <array>

using namespace std;

/*
 ********************************************************************************************************
 *  AI for the TogetherTacToeVR game                                                                    *
 *  To compile with emscripten for WebAssembly usage: emcc TicTacToe.cpp -s WASM=1 -O3 -o TicTacToe.js  *
 ********************************************************************************************************
 */ 

/*
 ************************************
 * -Common code for all algorithms- *
 ************************************
 */

#ifdef __cplusplus
    extern "C" {
        #endif
        int EMSCRIPTEN_KEEPALIVE isGameOver(); 
        #ifdef __cplusplus
    }
#endif

#define GAME_NOT_OVER 0
#define EMPTY 0
#define HUMAN 1
#define BOT 2
#define DRAW 3

/*
 *  Board used for all algorithms. Initialized as empty, aka. no moves have been done yet.
 *  For later reference: 0 is empty, 1 is human, 2 is bot
 */
int mainBoard[9] = { EMPTY, EMPTY, EMPTY, 
                     EMPTY, EMPTY, EMPTY, 
                     EMPTY, EMPTY, EMPTY }; 

bool isPlayerWinning(int player, int *board) {
    if ((board[0] == player && board[1] == player && board[2] == player) ||
        (board[3] == player && board[4] == player && board[5] == player) ||
        (board[6] == player && board[7] == player && board[8] == player) ||
        (board[0] == player && board[3] == player && board[6] == player) ||
        (board[1] == player && board[4] == player && board[7] == player) ||
        (board[2] == player && board[5] == player && board[8] == player) ||
        (board[0] == player && board[4] == player && board[8] == player) ||
        (board[2] == player && board[4] == player && board[6] == player)) {
        return true;
    } else {
        return false;
    }
}

bool isDraw(int *board) {
    if (board[0] != EMPTY && board[1] != EMPTY && board[2] != EMPTY &&
        board[3] != EMPTY && board[4] != EMPTY && board[5] != EMPTY &&
        board[6] != EMPTY && board[7] != EMPTY && board[8] != EMPTY) {
        return true;
    } else {
        return false;
    }
}

int getResult(int *board) {
    if (isPlayerWinning(HUMAN, board)) { //return 1 - human won
        return HUMAN;
    } else if (isPlayerWinning(BOT, board)) { //return 2 - bot won
        return BOT;
    } else if (isDraw(board)){ //return 3 - draw
        return DRAW;
    } else { //return 0 - game is not over
        return GAME_NOT_OVER;
    }
}

/*
 *********************************************************************************************************
 *                        -Code for the "easy" mode - aka. the MinMax algorithm-                         *
 *********************************************************************************************************
 */
int maxSearch(int m_board[9]);
int minSearch(int m_board[9]);

/*
 * Get the move using MinMax algorithm.
 * Returns the field the move has been made to.
 */
int getMoveMinMax() {
    int bestMoveScore = 100, bestMove;
    for (int i = 0; i < 9; i++) {
        if (mainBoard[i] == EMPTY) {
            mainBoard[i] = BOT;
            int tempMoveScore = maxSearch(mainBoard);
            if (tempMoveScore <= bestMoveScore) {
                bestMoveScore = tempMoveScore;
                bestMove = i;
            }
            mainBoard[i] = EMPTY;
        }
    }
    return bestMove;
}
/*
 * MinMax score calculation. Returns the score.
 */
int score() {
    if (isPlayerWinning(HUMAN, mainBoard)) return 10;
    if (isPlayerWinning(BOT, mainBoard)) return -10;
    return 0;
}

/*
 * Max function of the MinMax algorithm.
 * Works in accord with the Min function.
 * 
 * int m_board[9] - the temporary playing board for a specified possible move
 */
int maxSearch(int m_board[9]) {
    if (isGameOver()) return score();
    int bestMoveScore = -1000, bestMove;
    for (int i = 0; i < 9; i++) {
        if (m_board[i] == EMPTY) {
            m_board[i] = HUMAN;
            int tempMoveScore = minSearch(m_board);
            if (tempMoveScore >= bestMoveScore) {
                bestMoveScore = tempMoveScore;
                bestMove = i;
            }
            m_board[i] = EMPTY;
        }
    }
    return bestMoveScore;
}

/*
 * Min function of the MinMax algorithm.
 * Works in accord with the Max function.
 * 
 * int m_board[9] - the temporary playing board for a specified possible move
 */
int minSearch(int m_board[9]) {
    if (isGameOver()) return score();
    int bestMoveScore = -1000, bestMove;
    for (int i = 0; i < 9; i++) {
        if (m_board[i] == EMPTY) {
            m_board[i] = BOT;
            int tempMoveScore = maxSearch(mainBoard);
            if (tempMoveScore <= bestMoveScore) {
                bestMoveScore = tempMoveScore;
                bestMove = i;
            }
            m_board[i] = EMPTY;
        }
    }
    return bestMoveScore;
}

/*
 *********************************************************************************************************
 *                 -Code for the "hard" mode - aka. the algorithm inspired by Ben Carp-                  *
 *  Source of inspiration:
 *  https://medium.freecodecamp.org/building-an-ai-algorithm-for-the-tic-tac-toe-challenge-29d4d5adee07  *
 *********************************************************************************************************
 */

/*
 * A struct for saving the possible moves together with their scores.
 * 
 * int field - the fild on which the move would be executed
 * int score - the score associated with such a move
 */
struct moveScore {
    int field;
    int score;
} ;

/*
 * Randomization function taken from http://www.cplusplus.com/reference/algorithm/random_shuffle/.
 */
int myrandom (int i) { 
    return std::rand()%i;
}

/*
 * A function that returns an opponent to the given player
 * 
 * int player - a player for which the opponent has to be specified
 */
int getOtherPlayer (int player) {
    if (player == HUMAN) {
        return BOT;
    } else {
        return HUMAN;
    }
}

/*
 * Count and return the number of possibilities for making a move on a specified board.
 * 
 * int *board - the playing board
 */
int countPossibleMoves(int *board) {
    int numPossMoves = 0;
    for (int i = 0; i<9; i++) {
        if (board[i] == EMPTY) numPossMoves++;
    }
    return numPossMoves;
}

/*
 * A function that returns a prepared array of possible moves with their arbitrary initial scores
 * 
 * int *board - the playing board
 * int numPossMoves - number of possible moves on the specified board
 */
std::vector<moveScore> findPossibleMoves(int *board, int numPossMoves) {
    std::vector<moveScore> possibleMoves(numPossMoves);
    int j = 0;
    for (int i = 0; i<9; i++) {
        if (board[i] == EMPTY) {
            possibleMoves[j].field = i;
            possibleMoves[j].score = -100;
            j++;
        }
    }
    return possibleMoves;
}

/*
 * A function that specifies how to sort an array of moveScores.
 * 
 * moveScore left - first moveScore element to compare
 * moveScore right - second moveScore element to compare
 */
bool sortingFunction (moveScore left, moveScore right) {
    return left.score > right.score;
}

/*
 * A function that returns the next move as specified in the Ben Carp article
 * 
 * int *board - the playing board
 * int player - the player that makes the current move
 */
moveScore getMoveBenCarp(int *board, int player) {
    int numPossMoves = countPossibleMoves(board);
    std::vector<moveScore> possibleMoves(numPossMoves);
    possibleMoves = findPossibleMoves(board, numPossMoves);
    moveScore toReturn;
    for (int i = 0; i<numPossMoves; i++) {
        int j = possibleMoves[i].field;
        int tempBoard[9];
        std::copy (board, board + 9, tempBoard);
        tempBoard[j] = player;
        int result = getResult(tempBoard);
        int score;
        if (result == DRAW) {
            score = 0;
        } else if (result == player) {
            score = 1;
        } else {
            moveScore nextMove = getMoveBenCarp(tempBoard, getOtherPlayer(player));
            score = -nextMove.score;
        }
        if (score == 1) {
            toReturn.field = j;
            toReturn.score = score;
            board[j] = player;
            return toReturn;
        }
        possibleMoves[i].score = score;
    }
    std::random_shuffle(possibleMoves.begin(), possibleMoves.end(), myrandom);

    std::sort(possibleMoves.begin(), possibleMoves.end(), sortingFunction);
    toReturn = possibleMoves[0];
    board[toReturn.field] = player;
    return toReturn;
}

/*
 ***************************************************************
 *              -Common code for all algorithms-               *
 * -Functions exposed to the JS code used for both algorithms- *
 ***************************************************************
 */

#ifdef __cplusplus
    extern "C" {
        #endif

        /*
         * Function used to reset the board to initial state
         */
        void EMSCRIPTEN_KEEPALIVE resetBoard() {
            for (int i = 0; i < 9; i++) {
                mainBoard[i] = EMPTY;
            }
            cout << "Board has been reset" << endl;
        }

        /*
         * Function used to set the move.
         * 
         * int field - field position on the board
         * int player - the player that sets the move
         */
        void EMSCRIPTEN_KEEPALIVE SetMove(int field, int player) {
            mainBoard[field] = player;
            if (player == HUMAN) cout << "Human has played at position " << field << endl;
            if (player == BOT) cout << "Bot has played at postion " << field << endl;
        }

        /*
         * Function used to get a move for the AI.
         * 
         * int algorithm - a value specifying which algorithm to use
         */
        int EMSCRIPTEN_KEEPALIVE GetMove(int algorithm) {
            int bestMove = 0;
            if (algorithm == 0) {
                bestMove = getMoveMinMax();
            } else if (algorithm == 1) {
                bestMove = getMoveBenCarp(mainBoard, BOT).field;
            } else {
                bestMove = getMoveMinMax();
                cout << "Wrong algorithm code: " << algorithm << ". Returning a move to field: " << bestMove << " using MinMax algorithm!" << endl;
            }
            return bestMove;
        }

        /*
         * Function used to check if someone won already.
         * Returns 1 if the human player won, 2 if the AI won, 3 if it was a draw and 0 if the game is not over yet.
         */
        int EMSCRIPTEN_KEEPALIVE isGameOver() { //return integer from here
            return getResult(mainBoard);
        }
        #ifdef __cplusplus
    }
#endif

/*
 *  Main function.
 */
int main() {
    cout << "WebAssembly Module loaded" << endl;

    return 0;
}