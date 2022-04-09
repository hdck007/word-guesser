//Server

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;
const {
	userJoin,
	getCurrentUser,
	userLeave,
	getRoomUsers,
} = require('./utils/users');
const { getRandomString } = require('./utils/letter');
const {
	CreateGameState,
	getGameState,
	updateGameState,
} = require('./utils/gameState');

app.use(express.static(__dirname + '/public'));

// Run when the client connects
io.on('connection', (socket) => {
	socket.on('joinRoom', ({ name, code }) => {
		const user = userJoin(socket.id, name, code);
		socket.join(user.room);
		const roomUsers = getRoomUsers(user.room);
		try{
			if (roomUsers.length === 1) {
				let currentState = CreateGameState(roomUsers, user.room);
				socket.emit('turnId', 0);
				socket.emit('host', true);
				io.to(user.room).emit('draw', currentState);
			} else {
				let currentState = getGameState(user.room);
				currentState.users = roomUsers;
				currentState.totalUsers = roomUsers.length;
				currentState.usersAlive = roomUsers.length;
				updateGameState(currentState);
				// console.log('Works', currentState);
				socket.emit('turnId', roomUsers.length - 1);
				io.to(user.room).emit('draw', currentState);
			}
			socket.emit('id', socket.id);
		}catch(err){
			socket.emit('error', err);
		}
	});

	socket.on('startGame', (data) => {
		console.log('Herehere');
		const user = getCurrentUser(socket.id);
		let currentState = getGameState(user.room);
		currentState.playing = true;
		currentState.word = getRandomString(1);
		io.to(user.room).emit('draw', currentState);
		// Update the state as playing and start with the timers
		// Emit the state so that the game starts for the user
	});

	socket.on('myanswer', (answer) => {
		const user = getCurrentUser(socket.id);
		let currentState = getGameState(user.room);
		if (!Boolean(currentState.answers.indexOf(answer) >= 0)) {
			currentState.answers.push(answer);
			let nextTurn = (currentState.turn + 1) % currentState.totalUsers;
			while (currentState.skip.indexOf(nextTurn) >= 0) {
				nextTurn = (nextTurn + 1) % currentState.totalUsers;
			}
			currentState.turn = nextTurn;
			currentState.word = getRandomString(1);
			updateGameState(currentState);
			io.to(user.room).emit('draw', currentState);
			io.to(user.room).emit('answer', {answer, currentusername:user.username});
		}
		// Update the game state accordingly and send it back to users
	});

	socket.on('mychat', (answer) => {
		const user = getCurrentUser(socket.id);
		const currentusername = user.username;
		io.to(user.room).emit('userschat', { answer, currentusername });
	});

	socket.on('globalchat', (data) => {
		io.emit('globalChatR', data);
	});

	socket.on('timeOut', (data) => {
		const user = getCurrentUser(socket.id);
		let currentState = getGameState(user.room);
		let nextTurn = (currentState.turn + 1) % currentState.totalUsers;
		while (currentState.skip.indexOf(nextTurn) >= 0) {
			nextTurn = (nextTurn + 1) % currentState.totalUsers;
		}
		currentState.turn = nextTurn;
		let liveUserList = currentState.users.map((userObj) => {
			if (user.id === userObj.id) {
				userObj.lives = userObj.lives - 1;
				return userObj;
			} else {
				return userObj;
			}
		});
		currentState.users = liveUserList;
		updateGameState(currentState);
		io.to(user.room).emit('draw', currentState);
		// Update the turn and send the state back
	});

	socket.on('dead', (turnId) => {
		// console.log('received');
		const user = getCurrentUser(socket.id);
		let currentState = getGameState(user.room);
		let liveUserList = currentState.users.map((userObj) => {
			if (user.id === userObj.id) {
				userObj.lives = userObj.lives - 1;
				return userObj;
			} else {
				return userObj;
			}
		});
		currentState.users = liveUserList;
		currentState.usersAlive -= 1;
		updateGameState(currentState);
		console.log(currentState.usersAlive);
		if (currentState.usersAlive <= 1) {
			// console.log('It does run');
			const winner = currentState.users.filter((user) => user.lives > 0);
			io.to(user.room).emit('winner', winner[0]);
		} else {
			currentState.skip.push(turnId);
		}
		let nextTurn = (currentState.turn + 1) % currentState.totalUsers;
		while (currentState.skip.indexOf(nextTurn) >= 0) {
			nextTurn = (nextTurn + 1) % currentState.totalUsers;
		}
		currentState.turn = nextTurn;
		io.to(user.room).emit('draw', currentState);
	});

	socket.on('disconnect', () => {
		const user = userLeave(socket.id);
		if (user) {
			const roomUsers = getRoomUsers(user.room);
			let currentState = getGameState(user.room);
			if (currentState) {
				currentState.users = roomUsers;
				currentState.totalUsers = roomUsers.length;
				io.to(user.room).emit('draw', currentState);
			}
		}
	});
});

http.listen(port, () => console.log('listening on port ' + port));
