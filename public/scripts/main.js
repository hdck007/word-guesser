'use strict';

(function () {
	const { name, code } = Qs.parse(location.search, {
		ignoreQueryPrefix: true,
	});

	let turnId = -1;
	let currentGameStateClient;
	let myId;
	let avatarArray = [
		'../assets/images/koala.png',
		'../assets/images/owl.png',
		'../assets/images/gaj.png',
		'../assets/images/fox.png',
		'../assets/images/cow.png',
		'../assets/images/goat.jpg',
	];
	var socket = io();

	// Intial joining of the room
	socket.emit('joinRoom', { name, code });

	// ---------------------------DOM Access---------------------------------
	const root = document.querySelector('.root');
	const answerForm = document.querySelector('#answerForm');
	const messageForm = document.querySelector('#messageForm');
	const gameScreen = document.querySelector('.game');
	const circualarPresent = document.querySelector('.circlegraph');
	const passBtn = document.querySelector('.pass-btn');
	// -----------------------------Event Listeners----------------------------

	// Submitting the answer
	answerForm.addEventListener('submit', (e) => {
		e.preventDefault();
		let answer = e.target.elements.answer.value.toLowerCase();
		if (
			turnId === currentGameStateClient.turn &&
			answer.includes(currentGameStateClient.word.toLowerCase())
		) {
			try {
				fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${answer}`)
					.then((response) => response.json())
					.then((data) => {
						if (data.title === 'No Definitions Found') {
							console.log('Wrong');
						} else {
							socket.emit('myanswer', answer);
						}
					});
			} catch (error) {
				console.log(error);
			}
		}
		// socket.emit("myanswer", answer);
		e.target.elements.answer.value = '';
	});

	passBtn.addEventListener('click', (e) => {
		if (currentGameStateClient.playing === true) {
			if (turnId === currentGameStateClient.turn) {
				let me = currentGameStateClient.users.filter(
					(user) => user.id === myId
				);
				// console.log(me[0], 'I ran');
				if (me[0].lives > 1) {
					socket.emit('timeOut', true);
				} else {
					socket.emit('dead', turnId);
				}
			}
		}
	});

	// The Chat
	messageForm.addEventListener('submit', (e) => {
		e.preventDefault();
		let chat = e.target.elements.chat.value;
		socket.emit('mychat', chat);
		e.target.elements.chat.value = '';
	});

	// Prevent reload
	window.addEventListener('beforeunload', function (e) {
		e.preventDefault();
		e.returnValue = '';
		console.log(e);
	});

	// ------------------------Callbacks-------------------------------------

	// Receiving the chats
	function displayMessage(itemObj) {
		const answerDiv = document.querySelector('.messages');
		let answerMessage = document.createElement('p');
		answerMessage.classList.add('chatMessage');
		answerMessage.innerHTML = `<b><i>${itemObj.currentusername}</i></b>: ${itemObj.answer}`;
		answerDiv.appendChild(answerMessage);
	}

	function displayAnswer(itemObj) {
		const answerDiv = document.querySelector('.messages');
		let answerMessage = document.createElement('p');
		answerMessage.classList.add('chatMessage');
		answerMessage.innerHTML = `<b><i>${itemObj.currentusername}</i></b>: <span style="color: green;">${itemObj.answer}</span>`;
		answerDiv.appendChild(answerMessage);
	}

	function drawGame(currentState) {
		currentGameStateClient = currentState;
		let avatar = document.querySelectorAll('.circle');
		if (currentState.playing === false) {
			avatar.forEach((avtr, index) => {
				let info = currentState.users[index]
					? currentState.users[index].username
					: '';
				if (currentState.users[index]) {
					info = info + '<br />';
					for (let i = 0; i < currentState.users[index].lives; i++) {
						info += '❤️';
					}
				}
				avtr.innerHTML = info;
				if (info !== '') {
					avtr.style.background = `url(${avatarArray[index]})`;
					avtr.style.backgroundSize = `100px`;
					avtr.style.backgroundPosition = `center`;
					avtr.style.backgroundRepeat = `no-repeat`;
				}
			});
		}
		if (currentState.playing === true) {
			avatar.forEach((avtr, index) => {
				let info = currentState.users[index]
					? currentState.users[index].username
					: '';
				if (currentState.users[index]) {
					info = info + '<br />';
					for (let i = 0; i < currentState.users[index].lives; i++) {
						info += '❤️';
					}
				}
				avtr.innerHTML = `${info}`;
				if (info !== '') {
					avtr.style.background = `url(${avatarArray[index]})`;
					avtr.style.backgroundSize = `100px`;
					avtr.style.backgroundPosition = `center`;
					avtr.style.backgroundRepeat = `no-repeat`;
				}
			});
			const word = document.createElement('span');
			word.classList.add('word');
			word.innerHTML = `Current Word: ${currentState.word} and Turn: ${
				currentState.users[currentState.turn].username
			}`;
			root.appendChild(word);
		}
	}

	// Having the start button
	function createStart(data) {
		const startBtn = document.createElement('button');
		startBtn.classList.add('startBtn');
		startBtn.innerHTML = 'Start';
		startBtn.addEventListener('click', (e) => {
			if (currentGameStateClient.users.length < 2) {
				alert(
					`Only ${currentGameStateClient.users.length} players have joined you need atleast 2 players to start`
				);
			} else {
				startBtn.style.display = 'none';
				socket.emit('startGame', true);
			}
		});
		root.appendChild(startBtn);
	}

	function announce(user) {
		alert(`The winner is: ${user.username}`);
	}

	document.querySelectorAll('.ciclegraph').forEach((ciclegraph) => {
		let circles = ciclegraph.querySelectorAll('.circle');
		let angle = 360 - 90,
			dangle = 360 / circles.length;
		for (let i = 0; i < circles.length; ++i) {
			let circle = circles[i];
			angle += dangle;
			circle.style.transform = `rotate(${angle}deg) translate(${
				ciclegraph.clientWidth / 2
			}px) rotate(-${angle}deg)`;
		}
	});

	//---------------------------Socket Requests-----------------------------

	socket.on('turnId', (turnID) => (turnId = turnID));
	socket.on('id', (socketId) => (myId = socketId));
	socket.on('host', createStart);
	socket.on('wronganswer', (message) => alert(message));
	socket.on('userschat', displayMessage);
	socket.on('answer', displayAnswer);
	socket.on('draw', drawGame);
	socket.on('winner', announce);
	socket.on('error', () => {
		alert('Some error occured, try creating a new game');
		window.location.href = '/';
	});
})();
