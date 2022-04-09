let GAME_STATE = []

function CreateGameState(users, room){
  let gameStateObj = {
    users,
    room,
    turn: 0,
    totalUsers: users.length,
    index: GAME_STATE.length,
    playing: false,
    answers:[],
    currentWord: null,
    usersAlive: users.length,
    skip:[]
  }

  GAME_STATE.push(gameStateObj);
  return gameStateObj
}

function updateGameState(payload){
  GAME_STATE[payload.index] = payload;
}

function getGameState(room){
  objArr = GAME_STATE.map(item => {
    if(item.room === room) return item
  });
  return objArr[0]
}

module.exports={
  CreateGameState,
  getGameState,
  updateGameState
}