// ==UserScript==
// @name			HeroWarsHelper
// @name:en			HeroWarsHelper
// @namespace		HeroWarsHelper
// @version			2.035
// @description		Отмена боев в игре Хроники Хаоса
// @description:en	Cancellation of battles in the game Hero Wars
// @author			ZingerY
// @homepage		http://ilovemycomp.narod.ru/HeroWarsHelper.user.js
// @icon			http://ilovemycomp.narod.ru/VaultBoyIco16.ico
// @icon64			http://ilovemycomp.narod.ru/VaultBoyIco64.png
// @encoding		utf-8
// @include			https://*.nextersglobal.com/*
// @include			https://*.hero-wars*.com/*
// @match			https://www.solfors.com/
// @match			https://t.me/s/hw_ru
// @run-at			document-start
// ==/UserScript==

(function() {
	/**Forked from original ZingerY HeroWarsHelper script by ThomasGaud */
    /** Стартуем скрипт */
	console.log('Start ' + GM_info.script.name + ', v' + GM_info.script.version);
	/** Информация о скрипте */
	const scriptInfo = (({name, version, author, homepage, lastModified}, updateUrl, source) =>
		({name, version, author, homepage, lastModified, updateUrl, source}))
		(GM_info.script, GM_info.scriptUpdateURL, arguments.callee.toString());
	/** Если находимся на странице подарков, то собираем и отправляем их на сервер */
	if (['www.solfors.com', 't.me'].includes(location.host)) {
		setTimeout(sendCodes, 2000);
		return;
	}
	/** Загружены ли данные игры */
	let isLoadGame = false;
	/** Заголовки последнего запроса */
	let lastHeaders = {};
	/** Информация об отправленных подарках */
	let freebieCheckInfo = null;
	/** Данные пользователя */
	let userInfo;
	/** Оригинальные методы для работы с AJAX */
	const original = {
		open: XMLHttpRequest.prototype.open,
		send: XMLHttpRequest.prototype.send,
		setRequestHeader: XMLHttpRequest.prototype.setRequestHeader,
	};
	/** Декодер для перобразования байтовых данных в JSON строку */
	let decoder = new TextDecoder("utf-8");
	/** Хранит историю запросов */
	let requestHistory = {};
	/** Была ли взломана подписка */
	let isHackSubscribe = false;
	/** URL для запросов к API */
	let apiUrl = '';
	/** Идетификатор социальной сети */
	let sNetwork = '';
	/** Идетификаторы подписки для соц сетей */
	let socials = {
		vk: 1, // vk.com
		ok: 2, // ok.ru
		mm: 3, // my.mail.ru
		mg: 5, // store.my.games
		fb: 4, // apps.facebook.com
		wb: 6, // hero-wars.com
	}
	/** Чекбоксы */
	let checkboxes = {
		passBattle: {
			label: 'Пропуск боев',
			cbox: null,
			title: 'Пропуск боев в запределье и арене титанов, автопропуск в башне и кампании',
			default: false
		},
		endlessCards: {
			label: 'Бесконечные карты',
			cbox: null,
			title: 'Бесконечные карты предсказаний',
			default: false
		},
		sendExpedition: {
			label: 'Автоэкспедиции',
			cbox: null,
			title: 'Автоотправка экспедиций',
			default: false
		},
		cancelBattle: {
			label: 'Отмена боя',
			cbox: null,
			title: 'Возможность отмены боя на ВГ',
			default: false
		},
		getAutoGifts: {
			label: 'Подарки',
			cbox: null,
			title: 'Собирать подарки автоматически',
			default: true
		},
		preCalcBattle: {
			label: 'Прерасчет боя',
			cbox: null,
			title: 'Предварительный расчет боя',
			default: false
		},
		countControl: {
			label: 'Контроль кол-ва',
			cbox: null,
			title: 'Возможность указывать колличество открываемых "лутбоксов"',
			default: false
		},
		repeatMission: {
			label: 'Повтор в компании',
			cbox: null,
			title: 'Автоповтор боев в кампании',
			default: false
		},
		noOfferDonat: {
			label: 'Отключить донат',
			cbox: null,
			title: 'Убирает все предложения доната',
			default: false
		},
		fastMode: {
			label: 'Быстрый режим',
			cbox: null,
			title: 'Быстрый режим прохождения подземелья',
			default: false
		},
	};
	/** Инпуты */
	let inputs = {
		countTitanit: {
			input: null,
			title: 'Сколько фармим титанита',
			default: 150,
		},
		speedBattle: {
			input: null,
			title: 'Множитель ускорения боя',
			default: 5,
		},
		countTestBattle: {
			input: null,
			title: 'Количество тестовых боев',
			default: 10,
		}
	}
	/** Проверяет чекбокс */
	function isChecked(checkBox) {
		return checkboxes[checkBox].cbox?.checked;
	}
	/** Проверяет чекбокс */
	function getInput(inputName) {
		return inputs[inputName].input.value;
	}
	/** Остановить повтор миссии */
	let isStopSendMission = false;
	/** Идет повтор миссии */
	let isSendsMission = false;
	/** Данные о прошедшей мисии */
	let lastMissionStart = {}

	/** Данные о прошедшей атаке на босса */
	let lastBossBattle = {}
	/** Данные для расчете последнего боя с боссом */
	let lastBossBattleInfo = null;
	/** Возможность отменить бой в Астгарде */
	let isCancalBossBattle = true;
	/** Данные о прошедшей битве */
	let lastBattleArg = {}
	/** Имя функции начала боя */
	let nameFuncStartBattle = '';
	/** Имя функции конца боя */
	let nameFuncEndBattle = '';
	/** Данные для расчете последнего боя */
	let lastBattleInfo = null;
	/** Возможность отменить бой */
	let isCancalBattle = true;

	/** Идетификатор последней открытой матрешки */
	let lastRussianDollId = null;
	/** Отменить обучающее руководство */
	this.isCanceledTutorial = false;

	/**
	 * Копирует тест в буфер обмена
	 * @param {*} text копируемый текст
	 */
	function copyText(text) {
		let copyTextarea = document.createElement("textarea");
		copyTextarea.style.opacity = "0";
		copyTextarea.textContent = text;
		document.body.appendChild(copyTextarea);
		copyTextarea.select();
		document.execCommand("copy");
		document.body.removeChild(copyTextarea);
		delete copyTextarea;
	}
	/** Возвращает историю запросов */
	this.getRequestHistory = function() {
		return requestHistory;
	}
	/** Гененирует случайное целое число от min до max */
	const random = function (min, max) {
		return Math.floor(Math.random() * (max - min + 1) + min);
	}
	/** Очистка истоии запросов */
	setInterval(function () {
		let now = Date.now();
		for (let i in requestHistory) {
			if (now - i > 300000) {
				delete requestHistory[i];
			}
		}
	}, 300000);
	/** Событие загрузки DOM дерева страницы */
	document.addEventListener("DOMContentLoaded", () => {
		createInterface();
	});
	/** Сбор и отправка кодов подарков */
	function sendCodes() {
		let codes = [], count = 0;
		if (!localStorage['giftSendIds']) {
			localStorage['giftSendIds'] = '';
		}
        document.querySelectorAll('a[target="_blank"]').forEach(e => {
			let url = e?.href;
			if (!url) return;
			url = new URL(url);
			let giftId = url.searchParams.get('gift_id');
			if (!giftId || localStorage['giftSendIds'].includes(giftId)) return;
			localStorage['giftSendIds'] += ';' + giftId;
			codes.push(giftId);
			count++;
		});

		if (codes.length) {
			localStorage['giftSendIds'] = localStorage['giftSendIds'].split(';').splice(-50).join(';');
            sendGiftsCodes(codes);
		}

		if (!count) {
			setTimeout(sendCodes, 2000);
		}
	}
	/** Проверка отправленных кодов */
	function checkSendGifts() {
		if (!freebieCheckInfo) {
			return;
		}

		let giftId = freebieCheckInfo.args.giftId;
		let valName = 'giftSendIds_' + userInfo.id;
		localStorage[valName] = localStorage[valName] ?? '';
		if (!localStorage[valName].includes(giftId)) {
			localStorage[valName] += ';' + giftId;
			sendGiftsCodes([giftId]);
		}
	}
	/** Отправка кодов */
	function sendGiftsCodes(codes) {
		fetch('https://zingery.ru/heroes/setGifts.php', {
            method: 'POST',
			body: JSON.stringify(codes)
		}).then(
			response => response.json()
		).then(
			data => {
				if (data.result) {
					console.log('Подарки отправлены!');
				}
			}
		)
	}
	/** Подключение к коду игры */
	this.cheats = new hackGame();
	/** Функция расчета результатов боя */
	this.BattleCalc = cheats.BattleCalc;
	/** Отправка запроса доступная через консоль */
	this.SendRequest = send;
	/** Возвращает объект если переданный парамет строка */
	function getJson(result) {
		if (typeof result == 'string') {
			result = JSON.parse(result);
		}
		if (result?.error) {
			console.warn(result.error);
			return false;
		}
		return result;
	}
	/** Отображает диалоговое окно */
	function confShow(message, yesCallback, noCallback) {
		let buts = [];
		message = message || "Вы действительно хотите это сделать?";
		noCallback = noCallback || (() => {});
		if (yesCallback) {
			buts = [
				{msg: 'Запускай!', result: true},
				{msg: 'Отмена', result: false},
			]
		} else {
			yesCallback = () => {};
			buts = [
				{msg: 'Ок', result: true},
			];
		}
		popup.confirm(message, buts).then((e) => {
			if (e) {
				yesCallback();
			} else {
				noCallback();
			}
		});
	}
	/** Переопределяем/проксируем метод создания Ajax запроса */
	XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
		this.uniqid = Date.now();
		this.errorRequest = false;
		if (method == 'POST' && url.includes('.nextersglobal.com/api/') && /api\/$/.test(url)) {
			if (!apiUrl) {
				apiUrl = url;
				socialInfo = /heroes-(.+?)\./.exec(apiUrl);
				sNetwork = socialInfo ? socialInfo[1] : 'vk';
			}
			requestHistory[this.uniqid] = {
				method,
				url,
				error: [],
				headers: {},
				request: null,
				response: null,
				signature: [],
				calls: {},
			};
		} else if (method == 'POST' && url.includes('error.nextersglobal.com/client/')) {
			this.errorRequest = true;
        }
		return original.open.call(this, method, url, async, user, password);
	};
	/** Переопределяем/проксируем метод установки заголовков для AJAX запроса */
	XMLHttpRequest.prototype.setRequestHeader = function (name, value, check) {
		if (this.uniqid in requestHistory) {
			requestHistory[this.uniqid].headers[name] = value;
		} else {
			check = true;
		}

		if (name == 'X-Auth-Signature') {
			requestHistory[this.uniqid].signature.push(value);
			if (!check) {
				return;
			}
		}

		return original.setRequestHeader.call(this, name, value);
	};
	/** Переопределяем/проксируем метод отправки AJAX запроса */
	XMLHttpRequest.prototype.send = async function (sourceData) {
		if (this.uniqid in requestHistory) {
			let tempData = null;
			if (getClass(sourceData) == "ArrayBuffer") {
				tempData = decoder.decode(sourceData);
			} else {
				tempData = sourceData;
			}
			requestHistory[this.uniqid].request = tempData;
			let headers = requestHistory[this.uniqid].headers;
			lastHeaders = Object.assign({}, headers);
			/** Событие загрузки игры */
			if (headers["X-Request-Id"] > 2 && !isLoadGame) {
				isLoadGame = true;
				if (isChecked('sendExpedition')) {
					checkExpedition();
				}
				if (isChecked('getAutoGifts')) {
					checkSendGifts();
					getAutoGifts();
				}
				cheats.activateHacks();
				addControlButtons();
				addBottomUrls();
			}
			/** Обработка данных исходящего запроса */
			sourceData = await checkChangeSend.call(this, sourceData, tempData);
			/** Обработка данных входящего запроса */
			const oldReady = this.onreadystatechange;
			this.onreadystatechange = function (e) {
				if(this.readyState == 4 && this.status == 200) {
					isTextResponse = this.responseType != "json";
					let response = isTextResponse ? this.responseText : this.response;
					requestHistory[this.uniqid].response = response;
					/** Заменна данных входящего запроса */
					if (isTextResponse) {
						checkChangeResponse.call(this, response);
					}
					/** Функция запускаемая после выполения запроса */
					if (typeof this.onReadySuccess == 'function') {
						setTimeout(this.onReadySuccess, 500);
					}
				}
				if (oldReady) {
					return oldReady.apply(this, arguments);
				}
			}
		}
		if (this.errorRequest) {
			const oldReady = this.onreadystatechange;
			this.onreadystatechange = function () {
				Object.defineProperty(this, 'status', {
					writable: true
				});
				this.status = 200;
				Object.defineProperty(this, 'readyState', {
					writable: true
				});
				this.readyState = 4;
				Object.defineProperty(this, 'responseText', {
					writable: true
				});
				this.responseText = JSON.stringify({
					"result": true
				});
				return oldReady.apply(this, arguments);
			}
			this.onreadystatechange();
		} else {
		return original.send.call(this, sourceData);
        }
	};
	/** Обработка и подмена исходящих данных */
	async function checkChangeSend(sourceData, tempData) {
		try {
			/** Функция заменяющая данные боя на неверные для отмены боя */
			const fixBattle = function (heroes) {
				for (const ids in heroes) {
					hero = heroes[ids];
					hero.energy = random(1, 999);
					if (hero.hp > 0) {
						hero.hp = random(1, hero.hp);
					}
				}
			}
			/** Диалоговое окно */
			const showMsg = async function (msg, ansF, ansS) {
				if (typeof popup == 'object') {
					return await popup.confirm(msg, [
						{msg: ansF, result: false},
						{msg: ansS, result: true},
					]);
				} else {
					return !confirm(msg + "\n" + ansF + " (Ок)\n" + ansS + " (Отмена)");
				}
			}
			/** Диалоговое окно */
			const showMsgs = async function (msg, ansF, ansS, ansT) {
				return await popup.confirm(msg, [
					{msg: ansF, result: 0},
					{msg: ansS, result: 1},
					{msg: ansT, result: 2},
				]);
			}

			let changeRequest = false;
			testData = JSON.parse(tempData);
			for (const call of testData.calls) {
				requestHistory[this.uniqid].calls[call.name] = call.ident;
				/** Отмена боя в приключениях, на ВГ и с прислужниками Асгарда */
				if ((call.name == 'adventure_endBattle' ||
					call.name == 'adventureSolo_endBattle' ||
					call.name == 'brawl_endBattle' ||
					call.name == 'towerEndBattle' ||
					call.name == 'clanRaid_endNodeBattle') &&
					isCancalBattle) {
					nameFuncEndBattle = call.name;
					if (!call.args.result.win) {
						let resultPopup = false;
						if (call.name == 'adventure_endBattle' ||
							call.name == 'adventureSolo_endBattle') {
							resultPopup = await showMsgs('Вы потерпели поражение!', 'Хорошо', 'Отменить', 'Авто');
						} else {
							resultPopup = await showMsg('Вы потерпели поражение!', 'Хорошо', 'Отменить');
						}
						if (resultPopup) {
							fixBattle(call.args.progress[0].attackers.heroes);
							fixBattle(call.args.progress[0].defenders.heroes);
							changeRequest = true;
							if (resultPopup > 1) {
								this.onReadySuccess = testAutoBattle;
								// setTimeout(bossBattle, 1000);
							}
						}
					}
				}
				/** Отмена боя в Асгарде */
				if (call.name == 'clanRaid_endBossBattle' &&
					isCancalBossBattle) {
					bossDamage = call.args.progress[0].defenders.heroes[1].extra;
					sumDamage = bossDamage.damageTaken + bossDamage.damageTakenNextLevel;
					let resultPopup = await showMsgs(
						'Вы нанесли ' + sumDamage.toLocaleString() + ' урона.',
						'Хорошо', 'Отменить', 'Авто')
					if (resultPopup) {
						fixBattle(call.args.progress[0].attackers.heroes);
						fixBattle(call.args.progress[0].defenders.heroes);
						changeRequest = true;
						if (resultPopup > 1) {
							this.onReadySuccess = testBossBattle;
							// setTimeout(bossBattle, 1000);
						}
					}
				}
				/** Сохраняем пачку для атаки босса Асгарда */
				if (call.name == 'clanRaid_startBossBattle') {
					lastBossBattle = call.args;
				}
				/** Сохранение запроса начала последнего боя  */
				if (call.name == 'clanWarAttack' ||
					call.name == 'crossClanWar_startBattle' ||
					call.name == 'adventure_turnStartBattle') {
					nameFuncStartBattle = call.name;
					lastBattleArg = call.args;
				}
				/** Отключить трату карт предсказаний */
				if (call.name == 'dungeonEndBattle') {
					if (isChecked('endlessCards') && call.args.isRaid) {
						delete call.args.isRaid;
						changeRequest = true;
					}
				}
				/** Подарки */
				if (call.name == 'freebieCheck' && isChecked('getAutoGifts')) {
					freebieCheckInfo = call;
				}
				/** Получение данных миссии для автоповтора */
				if (isChecked('repeatMission') &&
					call.name == 'missionEnd') {
					let missionInfo = {
						id: call.args.id,
						result: call.args.result,
						heroes: call.args.progress[0].attackers.heroes,
						count: 0,
					}
					setTimeout(async () => {
						if (!isSendsMission && await popup.confirm('Повторить миссию?', [
								{msg: 'Повторить', result: true},
								{msg: 'Нет', result: false},
							])) {
							isStopSendMission = false;
							isSendsMission = true;
							sendsMission(missionInfo);
						}
					}, 0);
				}
				/** Получение данных миссии */
				if (call.name == 'missionStart') {
					lastMissionStart = call.args;
				}
				/** Указать колличество для сфер титанов и яиц петов */
				if (isChecked('countControl') &&
					(call.name == 'pet_chestOpen' ||
					call.name == 'titanUseSummonCircle') &&
					call.args.amount > 1) {
					const result = await popup.confirm('Указать колличество:', [
							{msg: 'Открыть', isInput: true, default: call.args.amount},
						]);
					if (result) {
						call.args.amount = result;
						changeRequest = true;
					}
				}
				/** Указать колличество для сфер артефактов титанов или артефактных сундуков */
				if (isChecked('countControl') &&
					call.name == 'titanArtifactChestOpen' ||
					call.name == 'artifactChestOpen' &&
					call.args.amount > 1) {
					const result = await popup.confirm('Указать колличество:', [
							{msg: 'Открыть 1', result: 1},
							{msg: 'Открыть 10', result: 10},
						]);
					if (result) {
						call.args.amount = result;
						changeRequest = true;
					}
				}
				if (call.name == 'consumableUseLootBox') {
					lastRussianDollId = call.args.libId;
					/** Указать колличество для золотых шкатулок */
					if (isChecked('countControl') &&
						call.args.libId == 148 &&
						call.args.amount > 1) {
						const result = await popup.confirm('Указать колличество:', [
							{msg: 'Открыть', isInput: true, default: call.args.amount},
						]);
						call.args.amount = result;
						changeRequest = true;
					}
				}
			}

			let headers = requestHistory[this.uniqid].headers;
			if (changeRequest) {
				sourceData = JSON.stringify(testData);
				headers['X-Auth-Signature'] = getSignature(headers, sourceData);
			}

			let signature = headers['X-Auth-Signature'];
			if (signature) {
				this.setRequestHeader('X-Auth-Signature', signature, true);
			}
		} catch (err) {
			console.log("Request(send, " + this.uniqid + "):\n", sourceData, "Error:\n", err);
		}
		return sourceData;
	}
	/** Обработка и подмена входящих данных */
	async function checkChangeResponse(response) {
		try {
			isChange = false;
			let nowTime = Math.round(Date.now() / 1000);
			callsIdent = requestHistory[this.uniqid].calls;
			respond = JSON.parse(response);
			// if (respond.error) {
			// 	isChange = true;
			// 	console.error(respond.error);
			// 	delete respond.error;
			// 	respond.results = [];
			// }
			for (const call of respond.results) {
				if (call.ident == callsIdent['subscriptionGetInfo'] &&
					(call.result.response.subscription?.status != 1 || !call.result.response.subscription)) {
					if (!call.result.response.subscription) {
						call.result.response.subscription = {}
					}
					callRes = call.result.response.subscription;
					/** Устанавливем время окончания подписки на +7 от подписки */
					callRes.endTime = nowTime + 1001 * 24 * 60 * 60;
					/** Статус подписки */
					callRes.status = 1;
					/** Тип (платформа) */
					callRes.type = socials[sNetwork];
					isHackSubscribe = true;
					isChange = true;
				}
				/** Фикс экспедиций */
				if (call.ident == callsIdent['expeditionGet'] && isHackSubscribe) {
					expeditions = call.result.response;
					for (const n in expeditions) {
						exped = expeditions[n];
						if (exped.slotId == 6) {
							exped.status = 3;
							isChange = true;
						}
					}
				}
				/** Бесконечные карты предсказаний */
				if (call.ident == callsIdent['inventoryGet']) {
					consumable = call.result.response.consumable;
					consumable[81] = 999;
					isChange = true;
				}
				/** Потасовка */
				if (call.ident == callsIdent['brawl_getInfo']) {
					brawl = call.result.response;
					if (brawl) {
						brawl.boughtEndlessLivesToday = 1;
						isChange = true;
					}
				}
				/** Скрываем предложения доната */
				if (isChecked('noOfferDonat') && call.ident == callsIdent['billingGetAll']) {
					const billings = call.result.response?.billings;
					const bundle = call.result.response?.bundle;
					if (billings && bundle) {
						call.result.response.billings = [];
						call.result.response.bundle = [];
						isChange = true;
					}
				}
				/** Скрываем предложения доната */
				if (isChecked('noOfferDonat') && call.ident == callsIdent['offerGetAll']) {
					const offers = call.result.response;
					if (offers) {
						call.result.response = offers.filter(e => !['addBilling', 'bundleCarousel'].includes(e.type));
						isChange = true;
					}
				}
				/** Копирует вопрос викторины в буфер обмена */
				if (call.ident == callsIdent['quizGetNewQuestion']) {
					let quest = call.result.response;
					copyText(quest.question);
					console.log(quest.question);
				}
				/** Получить даныне пользователя */
				if (call.ident == callsIdent['userGetInfo']) {
					let user = call.result.response;
					userInfo = Object.assign({}, user);
					delete userInfo.refillable;
				}
				/** Начало боя для прерасчета */
				if ((call.ident == callsIdent['clanWarAttack'] ||
					call.ident == callsIdent['crossClanWar_startBattle'] ||
					call.ident == callsIdent['battleGetReplay'] ||
					call.ident == callsIdent['adventure_turnStartBattle']) &&
					isChecked('preCalcBattle')) {
					setProgress('Идет прерасчет боя');
					let battle = call.result.response.battle || call.result.response.replay;
					lastBattleInfo = battle;
					console.log(battle.type);
					function getBattleInfo(battle, isRandSeed) {
						return new Promise(function (resolve) {
							if (isRandSeed) {
								battle.seed = Math.floor(Date.now() / 1000) + random(0, 1e3);
							}
							BattleCalc(battle, getBattleType(battle.type), e => resolve(e.result.win));
						});
					}
					let actions = [getBattleInfo(battle, false)]
					const countTestBattle = getInput('countTestBattle');
					for (let i = 0; i < countTestBattle; i++) {
						actions.push(getBattleInfo(battle, true));
					}
					Promise.all(actions)
						.then(e => {
							let firstBattle = e.shift();
							let countWin = e.reduce((w, s) => w + s);
							setProgress((firstBattle ? 'Победа' : 'Поражение') + ' ' + countWin + '/' + e.length + ' X', false, hideProgress)
						});
				}
				/** Начало боя с боссом Асгарда */
				if (call.ident == callsIdent['clanRaid_startBossBattle'] && isChecked('preCalcBattle')) {
					lastBossBattleInfo = call.result.response.battle;
				}
				/** Отмена туториала */
				if (isCanceledTutorial && call.ident == callsIdent['tutorialGetInfo']) {
					let chains = call.result.response.chains;
					for (let n in chains) {
						chains[n] = 9999;
					}
					isChange = true;
				}
				/** АвтоПовтор открытия матрешек */
				if (isChecked('countControl') && call.ident == callsIdent['consumableUseLootBox']) {
					let lootBox = call.result.response;
					let newCount = 0;
					for (let n of lootBox) {
						if (n?.consumable && n.consumable[lastRussianDollId]) {
							newCount += n.consumable[lastRussianDollId]
						}
					}
					if (newCount && await popup.confirm('Открыть ' + newCount + ' матрешек рекурсивно?', [
							{msg: 'Повторить', result: true},
							{msg: 'Нет', result: false},
						])) {
						openRussianDoll(lastRussianDollId, newCount);
					}
				}
			}
		} catch(err) {
			console.log("Request(response, " + this.uniqid + "):\n", "Error:\n", response, err);
		}

		if (isChange) {
			Object.defineProperty(this, 'responseText', {
				writable: true
			});
			this.responseText = JSON.stringify(respond);
		}
	}
	/** Возвращает тип боя по типу пресета */
	function getBattleType(strBattleType) {
		switch (strBattleType) {
			case "invasion":
				return "get_invasion";
			case "titan_pvp_manual":
				return "get_titanPvpManual";
			case "titan_pvp":
				return "get_titanPvp";
			case "titan_clan_pvp":
			case "clan_pvp_titan":
			case "clan_global_pvp_titan":
			case "challenge_titan":
				return "get_titanClanPvp";
			case "clan_raid": // Босс асгарда
			case "adventure": // Приключения
			case "clan_global_pvp":
			case "clan_pvp":
			case "challenge":
				return "get_clanPvp";
			case "titan_tower":
				return "get_titan";
			case "tower":
				return "get_tower";
			case "pve":
				return "get_pve";
			case "pvp_manual":
				return "get_pvpManual";
			case "pvp":
				return "get_pvp";
			case "core":
				return "get_core";
			default:
				break;
		}
	}
	/** Возвращает название класса переданного объекта */
	function getClass(obj) {
		return {}.toString.call(obj).slice(8, -1);
	}
	/** Расчитывает сигнатуру запроса */
	this.getSignature = function(headers, data) {
		let signatureStr = [headers["X-Request-Id"], headers["X-Auth-Token"], headers["X-Auth-Session-Id"], data, 'LIBRARY-VERSION=1'].join(':');
		return md5(signatureStr);
	}
	/** Создает интерфейс */
	function createInterface() {
		scriptMenu.init({
			showMenu: true
		});
		scriptMenu.addHeader(GM_info.script.name);
		scriptMenu.addHeader('v' + GM_info.script.version);

		const details = scriptMenu.addDetails('Настройки');
		for (let name in checkboxes) {
			checkboxes[name].cbox = scriptMenu.addCheckbox(checkboxes[name].label, checkboxes[name].title, details);
			/** Получаем состояние чекбоксов из localStorage */
			let val = storage.get(name, null);
			if (val != null) {
				checkboxes[name].cbox.checked = val;
			} else {
				storage.set(name, checkboxes[name].default);
				checkboxes[name].cbox.checked = checkboxes[name].default;
			}
			/** Отсеживание события изменения чекбокса для записи в localStorage */
			checkboxes[name].cbox.dataset['name'] = name;
			checkboxes[name].cbox.addEventListener('change', function () {
				storage.set(this.dataset['name'], this.checked);
			})
		}

		for (let name in inputs) {
			inputs[name].input = scriptMenu.addInputText(inputs[name].title,details);
			/** Получаем состояние inputText из localStorage */
			let val = storage.get(name, null);
			if (val != null) {
				inputs[name].input.value = val;
			} else {
				storage.set(name, inputs[name].default);
				inputs[name].input.value = inputs[name].default;
			}
			/** Отсеживание события изменения поля для записи в localStorage */
			inputs[name].input.dataset['name'] = name;
			inputs[name].input.addEventListener('input', function () {
				storage.set(this.dataset['name'], this.value);
			})
		}
	}
	/** Список кнопочек */
	const buttons = {
		newDay: {
			name: 'Синхронизация',
			title: 'Частичная синхонизация данных игры без перезагрузки сатраницы',
			func: cheats.refreshGame,
		},
		questAllFarm: {
			name: 'Награды',
			title: 'Собрать все награды за задания',
			func: questAllFarm,
		},
		sendExpedition: {
			name: 'Экспедиции',
			title: 'Отправка и сбор экспедиций',
			func: checkExpedition,
		},
		testTitanArena: {
			name: 'Турнир Стихий',
			title: 'Автопрохождение Турнира Стихий',
			func:  testTitanArena,
		},
		testDungeon: {
			name: 'Подземелье',
			title: 'Автопрохождение подземелья',
			func: function () {
				confShow('Запустить скрипт Подземелье?', () => {
					let titanit = getInput('countTitanit');
					testDungeon(titanit);
				});
			},
		},
		testTower: {
			name: 'Башня',
			title: 'Автопрохождение башни',
			func: function () {
				confShow('Запустить скрипт Башня?', testTower);
			},
		},
		mailGetAll: {
			name: 'Почта',
			title: 'Собрать всю почту, кроме писем с энергией и зарядами портала',
			func: mailGetAll
		},
		offerFarmAllReward: {
			name: 'Пасхалки',
			title: 'Собрать все пасхалки или награды',
			func: offerFarmAllReward,
		},
        getOutland: {
			name: 'Запределье',
			title: 'Собрать Запределье',
			func: getOutland,
		},
		// bossRatingEvent: {
		// 	name: 'Горнило душ',
		// 	title: 'Набивает килы и собрает награду',
		// 	func: function () {
		// 		confShow('Запустить скрипт Горнило душ?', bossRatingEvent);
		// 	},
		// },
		testRaidNodes: {
			name: 'Прислужники',
			title: 'Атакует прислужников сохраннеными пачками',
			func: function () {
				confShow('Запустить скрипт Прислужники?', testRaidNodes);
			},
		},
		goToSanctuary: {
			name: 'Святилище',
			title: 'Быстрый переход к Святилищу',
			func: cheats.goSanctuary,
		},
		goToClanWar: {
			name: 'Война гильдий',
			title: 'Быстрый переход к Войне гильдий',
			func: cheats.goClanWar,
		},
	}

	/** Вывести кнопочки */
	function addControlButtons() {
		for (let name in buttons) {
			button = buttons[name];
			scriptMenu.addButton(button.name, button.func, button.title);
		}
	}
	/** Добавляет ссылки */
	function addBottomUrls() {
		scriptMenu.addHeader('<a href="https://t.me/+q6gAGCRpwyFkNTYy" target="_blank">tg</a> <a href="https://vk.com/invite/YNPxKGX" target="_blank">vk</a>');
	}
	/** Расчитывает HASH MD5 из строки */
	function md5(r){for(var a=(r,n,t,e,o,u)=>f(c(f(f(n,r),f(e,u)),o),t),n=(r,n,t,e,o,u,f)=>a(n&t|~n&e,r,n,o,u,f),t=(r,n,t,e,o,u,f)=>a(n&e|t&~e,r,n,o,u,f),e=(r,n,t,e,o,u,f)=>a(n^t^e,r,n,o,u,f),o=(r,n,t,e,o,u,f)=>a(t^(n|~e),r,n,o,u,f),f=function(r,n){var t=(65535&r)+(65535&n);return(r>>16)+(n>>16)+(t>>16)<<16|65535&t},c=(r,n)=>r<<n|r>>>32-n,u=Array(r.length>>2),h=0;h<u.length;h++)u[h]=0;for(h=0;h<8*r.length;h+=8)u[h>>5]|=(255&r.charCodeAt(h/8))<<h%32;len=8*r.length,u[len>>5]|=128<<len%32,u[14+(len+64>>>9<<4)]=len;var l=1732584193,i=-271733879,g=-1732584194,v=271733878;for(h=0;h<u.length;h+=16){var A=l,d=i,C=g,m=v;i=o(i=o(i=o(i=o(i=e(i=e(i=e(i=e(i=t(i=t(i=t(i=t(i=n(i=n(i=n(i=n(i,g=n(g,v=n(v,l=n(l,i,g,v,u[h+0],7,-680876936),i,g,u[h+1],12,-389564586),l,i,u[h+2],17,606105819),v,l,u[h+3],22,-1044525330),g=n(g,v=n(v,l=n(l,i,g,v,u[h+4],7,-176418897),i,g,u[h+5],12,1200080426),l,i,u[h+6],17,-1473231341),v,l,u[h+7],22,-45705983),g=n(g,v=n(v,l=n(l,i,g,v,u[h+8],7,1770035416),i,g,u[h+9],12,-1958414417),l,i,u[h+10],17,-42063),v,l,u[h+11],22,-1990404162),g=n(g,v=n(v,l=n(l,i,g,v,u[h+12],7,1804603682),i,g,u[h+13],12,-40341101),l,i,u[h+14],17,-1502002290),v,l,u[h+15],22,1236535329),g=t(g,v=t(v,l=t(l,i,g,v,u[h+1],5,-165796510),i,g,u[h+6],9,-1069501632),l,i,u[h+11],14,643717713),v,l,u[h+0],20,-373897302),g=t(g,v=t(v,l=t(l,i,g,v,u[h+5],5,-701558691),i,g,u[h+10],9,38016083),l,i,u[h+15],14,-660478335),v,l,u[h+4],20,-405537848),g=t(g,v=t(v,l=t(l,i,g,v,u[h+9],5,568446438),i,g,u[h+14],9,-1019803690),l,i,u[h+3],14,-187363961),v,l,u[h+8],20,1163531501),g=t(g,v=t(v,l=t(l,i,g,v,u[h+13],5,-1444681467),i,g,u[h+2],9,-51403784),l,i,u[h+7],14,1735328473),v,l,u[h+12],20,-1926607734),g=e(g,v=e(v,l=e(l,i,g,v,u[h+5],4,-378558),i,g,u[h+8],11,-2022574463),l,i,u[h+11],16,1839030562),v,l,u[h+14],23,-35309556),g=e(g,v=e(v,l=e(l,i,g,v,u[h+1],4,-1530992060),i,g,u[h+4],11,1272893353),l,i,u[h+7],16,-155497632),v,l,u[h+10],23,-1094730640),g=e(g,v=e(v,l=e(l,i,g,v,u[h+13],4,681279174),i,g,u[h+0],11,-358537222),l,i,u[h+3],16,-722521979),v,l,u[h+6],23,76029189),g=e(g,v=e(v,l=e(l,i,g,v,u[h+9],4,-640364487),i,g,u[h+12],11,-421815835),l,i,u[h+15],16,530742520),v,l,u[h+2],23,-995338651),g=o(g,v=o(v,l=o(l,i,g,v,u[h+0],6,-198630844),i,g,u[h+7],10,1126891415),l,i,u[h+14],15,-1416354905),v,l,u[h+5],21,-57434055),g=o(g,v=o(v,l=o(l,i,g,v,u[h+12],6,1700485571),i,g,u[h+3],10,-1894986606),l,i,u[h+10],15,-1051523),v,l,u[h+1],21,-2054922799),g=o(g,v=o(v,l=o(l,i,g,v,u[h+8],6,1873313359),i,g,u[h+15],10,-30611744),l,i,u[h+6],15,-1560198380),v,l,u[h+13],21,1309151649),g=o(g,v=o(v,l=o(l,i,g,v,u[h+4],6,-145523070),i,g,u[h+11],10,-1120210379),l,i,u[h+2],15,718787259),v,l,u[h+9],21,-343485551),l=f(l,A),i=f(i,d),g=f(g,C),v=f(v,m)}var y=Array(l,i,g,v),b="";for(h=0;h<32*y.length;h+=8)b+=String.fromCharCode(y[h>>5]>>>h%32&255);var S="0123456789abcdef",j="";for(h=0;h<b.length;h++)u=b.charCodeAt(h),j+=S.charAt(u>>>4&15)+S.charAt(15&u);return j}
	/** Скрипт для красивых диалоговых окошек */
	const popup = new(function () {
		this.popUp,
		this.downer,
		this.msgText,
		this.buttons = [];

		function init() {
			addStyle();
			addBlocks();
		}

		const addStyle = () => {
			let style = document.createElement('style');
			style.innerText = `
			.PopUp_ {
				position: absolute;
				min-width: 300px;
				max-width: 500px;
				max-height: 400px;
				background-color: #190e08e6;
				z-index: 10001;
				top: 169px;
				left: 345px;
				border: 3px #ce9767 solid;
				border-radius: 10px;
				display: flex;
				flex-direction: column;
				justify-content: space-around;
				padding: 15px 12px;
			}

			.PopUp_back {
				position: absolute;
				background-color: #00000066;
				width: 100%;
				height: 100%;
				z-index: 10000;
				top: 0;
				left: 0;
			}

			.PopUp_blocks {
				width: 100%;
				height: 50%;
				display: flex;
				justify-content: space-evenly;
				align-items: center;
			}

			.PopUp_blocks:last-child {
				margin-top: 25px;
			}

			.PopUp_buttons {
				display: flex;
				margin: 10px 12px;
				flex-direction: column;
			}

			.PopUp_button {
				background-color: #52A81C;
				border-radius: 5px;
				box-shadow: inset 0px -4px 10px, inset 0px 3px 2px #99fe20, 0px 0px 4px, 0px -3px 1px #d7b275, 0px 0px 0px 3px #ce9767;
				cursor: pointer;
				padding: 5px 18px 8px;
			}

			.PopUp_input {
				width: 150px;
				font-size: 16px;
				height: 20px;
				border: 1px solid #cf9250;
				border-radius: 9px 9px 0px 0px;
				background: transparent;
				color: #fce1ac;
				padding: 1px 10px;
				box-sizing: border-box;
				box-shadow: 0px 0px 4px, 0px 0px 0px 3px #ce9767;
			}

			.PopUp_input::placeholder {
				color: #fce1ac75;
			}

			.PopUp_input:focus {
				outline: 0;
			}

			.PopUp_input + .PopUp_button {
				border-radius: 0px 0px 5px 5px;
				padding: 2px 18px 5px;
			}

			.PopUp_button:hover {
				filter: brightness(1.2);
			}

			.PopUp_text {
				font-family: sans-serif;
				font-stretch: condensed;
				text-align: center;
			}

			.PopUp_buttonText {
				color: #E4FF4C;
				text-shadow: 0px 1px 2px black;
			}

			.PopUp_msgText {
				color: #FDE5B6;
				text-shadow: 0px 0px 2px;
			}
			`;
			document.head.appendChild(style);
		}

		const addBlocks = () => {
			this.back = document.createElement('div');
			this.back.classList.add('PopUp_back');
			this.back.style.display = 'none';
			document.body.append(this.back);

			this.popUp = document.createElement('div');
			this.popUp.classList.add('PopUp_');
			this.back.append(this.popUp);

			let upper = document.createElement('div')
			upper.classList.add('PopUp_blocks');
			this.popUp.append(upper);

			this.downer = document.createElement('div')
			this.downer.classList.add('PopUp_blocks');
			this.popUp.append(this.downer);

			this.msgText = document.createElement('div');
			this.msgText.classList.add('PopUp_text', 'PopUp_msgText');
			upper.append(this.msgText);
		}

		this.showBack = function () {
			this.back.style.display = '';
		}

		this.hideBack = function () {
			this.back.style.display = 'none';
		}

		this.show = function () {
			this.showBack();
			this.popUp.style.display = '';
			this.popUp.style.left = (window.innerWidth - this.popUp.offsetWidth) / 2 + 'px';
			this.popUp.style.top = (window.innerHeight - this.popUp.offsetHeight) / 3 + 'px';
		}

		this.hide = function () {
			this.hideBack();
			this.popUp.style.display = 'none';
		}

		this.addButton = (option, buttonClick) => {
			const contButton = document.createElement('div');
			contButton.classList.add('PopUp_buttons');
			this.downer.append(contButton);

			let inputField = {
				value: option.result || option.default
			}
			if (option.isInput) {
				inputField = document.createElement('input');
				inputField.type = 'text';
				if (option.placeholder) {
					inputField.placeholder = option.placeholder;
				}
				if (option.default) {
					inputField.value = option.default;
				}
				inputField.classList.add('PopUp_input');
				contButton.append(inputField);
			}

			const button = document.createElement('div');
			button.classList.add('PopUp_button');
			contButton.append(button);

			button.addEventListener('click', () => {
				let result = '';
				if (option.isInput) {
					result = inputField.value;
				}
				buttonClick(result);
			});

			const buttonText = document.createElement('div');
			buttonText.classList.add('PopUp_text', 'PopUp_buttonText');
			buttonText.innerText = option.msg;
			button.append(buttonText);

			this.buttons.push(contButton);
		}

		this.clearButtons = () => {
			while (this.buttons.length) {
				this.buttons.pop().remove();
			}
		}

		this.setMsgText = (text) => {
			this.msgText.innerHTML = text;
		}

		this.confirm = async (msg, buttOpt) => {
			this.clearButtons();
			return new Promise((complete, failed) => {
				this.setMsgText(msg);
				if (!buttOpt) {
					buttOpt = [{msg:'Ок', result: true, isInput: false}];
				}
				for (let butt of buttOpt) {
					this.addButton(butt, (result) => {
						result = result || butt.result;
						complete(result);
						popup.hide();
					});
				}
				this.show();
			});
		}

		document.addEventListener('DOMContentLoaded', init);
	});
	/** Панель управления скриптом */
	const scriptMenu = new(function () {

		this.mainMenu,
		this.buttons = [],
		this.checkboxes = [];
		this.option = {
			showMenu: false,
			showDetails: {}
		};

		this.init = function (option = {}) {
			this.option = Object.assign(this.option, option);
			addStyle();
			addBlocks();
		}

		const addStyle = () => {
			style = document.createElement('style');
			style.innerText = `
		.scriptMenu_status {
			position: absolute;
			z-index: 10001;
			/* max-height: 30px; */
			top: -1px;
			left: 30%;
			cursor: pointer;
			border-radius: 0px 0px 10px 10px;
			background: #190e08e6;
			border: 1px #ce9767 solid;
			font-family: sans-serif;
			font-stretch: condensed;
			letter-spacing: 1px;
			color: #fce1ac;
			text-shadow: 0px 0px 1px;
			transition: 0.5s;
			padding: 2px 10px 3px;
		}
		.scriptMenu_statusHide {
			top: -35px;
			height: 30px;
			overflow: hidden;
		}
		.scriptMenu_label {
			position: absolute;
			top: 30%;
			left: -4px;
			z-index: 9999;
			cursor: pointer;
			width: 30px;
			height: 30px;
			background: radial-gradient(circle, #47a41b 0%, #1a2f04 100%);
			border: 1px solid #1a2f04;
			border-radius: 5px;
			box-shadow:
			inset 0px 2px 4px #83ce26,
			inset 0px -4px 6px #1a2f04,
			0px 0px 2px black,
			0px 0px 0px 2px	#ce9767;
		}
		.scriptMenu_label:hover {
		filter: brightness(1.2);
		}
		.scriptMenu_arrowLabel {
			width: 100%;
			height: 100%;
			background-size: 75%;
			background-position: center;
			background-repeat: no-repeat;
			background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='%2388cb13' d='M7.596 7.304a.802.802 0 0 1 0 1.392l-6.363 3.692C.713 12.69 0 12.345 0 11.692V4.308c0-.653.713-.998 1.233-.696l6.363 3.692Z'/%3e%3cpath fill='%2388cb13' d='M15.596 7.304a.802.802 0 0 1 0 1.392l-6.363 3.692C8.713 12.69 8 12.345 8 11.692V4.308c0-.653.713-.998 1.233-.696l6.363 3.692Z'/%3e%3c/svg%3e");
			box-shadow: 0px 1px 2px #000;
			border-radius: 5px;
			filter: drop-shadow(0px 1px 2px #000D);
		}
		.scriptMenu_main {
			position: absolute;
			max-width: 285px;
			z-index: 9999;
			top: 50%;
			transform: translateY(-50%);
			background: #190e08e6;
			border: 1px #ce9767 solid;
			border-radius: 0px 10px 10px 0px;
			border-left: none;
			box-sizing: border-box;
			font-family: sans-serif;
			font-stretch: condensed;
			color: #fce1ac;
			text-shadow: 0px 0px 1px;
			transition: 1s;
			flex-direction: column;
			flex-wrap: nowrap;
		}
		.scriptMenu_showMenu {
			display: none;
		}
		.scriptMenu_showMenu:checked~.scriptMenu_main {
			left: 0px;
		}
		.scriptMenu_showMenu:not(:checked)~.scriptMenu_main {
			left: -300px;
		}
		.scriptMenu_divInput {
			margin: 2px;
		}
		.scriptMenu_divInputText {
			margin: 2px;
			align-self: center;
		}
		.scriptMenu_checkbox {
			position: absolute;
			z-index: -1;
			opacity: 0;
		}
		.scriptMenu_checkbox+label {
			display: inline-flex;
			align-items: center;
			user-select: none;
		}
		.scriptMenu_checkbox+label::before {
			content: '';
			display: inline-block;
			width: 20px;
			height: 20px;
			border: 1px solid #cf9250;
			border-radius: 7px;
			margin-right: 7px;
		}
		.scriptMenu_checkbox:checked+label::before {
			background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3e%3cpath fill='%2388cb13' d='M6.564.75l-3.59 3.612-1.538-1.55L0 4.26 2.974 7.25 8 2.193z'/%3e%3c/svg%3e");
		}
		.scriptMenu_close {
			width: 20px;
			height: 20px;
			position: absolute;
			right: -5px;
			top: -5px;
			border: 3px solid #c18550;
			border-radius: 20px;
			background: radial-gradient(circle, rgba(190,30,35,1) 0%, rgba(0,0,0,1) 100%);
			background-position-y: 3px;
			box-shadow: -1px 1px 3px black;
			cursor: pointer;
			box-sizing: border-box;
		}
		.scriptMenu_close:hover {
			filter: brightness(1.2);
		}
		.scriptMenu_crossClose {
			width: 100%;
			height: 100%;
			background-size: 65%;
			background-position: center;
			background-repeat: no-repeat;
			background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='%23f4cd73' d='M 0.826 12.559 C 0.431 12.963 3.346 15.374 3.74 14.97 C 4.215 15.173 8.167 10.457 7.804 10.302 C 7.893 10.376 11.454 14.64 11.525 14.372 C 12.134 15.042 15.118 12.086 14.638 11.689 C 14.416 11.21 10.263 7.477 10.402 7.832 C 10.358 7.815 11.731 7.101 14.872 3.114 C 14.698 2.145 13.024 1.074 12.093 1.019 C 11.438 0.861 8.014 5.259 8.035 5.531 C 7.86 5.082 3.61 1.186 3.522 1.59 C 2.973 1.027 0.916 4.611 1.17 4.873 C 0.728 4.914 5.088 7.961 5.61 7.995 C 5.225 7.532 0.622 12.315 0.826 12.559 Z'/%3e%3c/svg%3e")
		}
		.scriptMenu_button {
			user-select: none;
			border-radius: 5px;
			cursor: pointer;
			padding: 3px 10px 6px;
			margin: 4px;
			background: radial-gradient(circle, rgba(165,120,56,1) 80%, rgba(0,0,0,1) 110%);
			box-shadow: inset 0px -4px 6px #442901, inset 0px 1px 6px #442901, inset 0px 0px 6px, 0px 0px 4px, 0px 0px 0px 2px #ce9767;
		}
		.scriptMenu_button:hover {
			filter: brightness(1.2);
		}
		.scriptMenu_buttonText {
			color: #fce5b7;
			text-shadow: 0px 1px 2px black;
			text-align: center;
		}
		.scriptMenu_header {
			text-align: center;
			align-self: center;
			font-size: 14px;
		}
		.scriptMenu_header a {
			color: #fce5b7;
			text-decoration: none;
		}
		.scriptMenu_InputText {
			width: 130px;
			height: 20px;
			border: 1px solid #cf9250;
			border-radius: 9px;
			background: transparent;
			color: #fce1ac;
			padding: 0px 10px;
			box-sizing: border-box;
		}
		.scriptMenu_InputText:focus {
			filter: brightness(1.2);
			outline: 0;
		}
		.scriptMenu_InputText::placeholder {
			color: #fce1ac75;
		}
		.scriptMenu_Summary {
			cursor: pointer;
			margin-left: 7px;
		}
	`;
			document.head.appendChild(style);
		}

		const addBlocks = () => {
			const main = document.createElement('div');
			document.body.appendChild(main);

			this.status = document.createElement('div');
			this.status.classList.add('scriptMenu_status');
			this.setStatus('');
			main.appendChild(this.status);

			const label = document.createElement('label');
			label.classList.add('scriptMenu_label');
			label.setAttribute('for', 'checkbox_showMenu');
			main.appendChild(label);

			const arrowLabel = document.createElement('div');
			arrowLabel.classList.add('scriptMenu_arrowLabel');
			label.appendChild(arrowLabel);

			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.id = 'checkbox_showMenu';
			checkbox.checked = this.option.showMenu;
			checkbox.classList.add('scriptMenu_showMenu');
			main.appendChild(checkbox);

			this.mainMenu = document.createElement('div');
			this.mainMenu.classList.add('scriptMenu_main');
			main.appendChild(this.mainMenu);

			const closeButton = document.createElement('label');
			closeButton.classList.add('scriptMenu_close');
			closeButton.setAttribute('for', 'checkbox_showMenu');
			this.mainMenu.appendChild(closeButton);

			const crossClose = document.createElement('div');
			crossClose.classList.add('scriptMenu_crossClose');
			closeButton.appendChild(crossClose);
		}

		this.setStatus = (text, onclick) => {
			if (!text) {
				this.status.classList.add('scriptMenu_statusHide');
			} else {
				this.status.classList.remove('scriptMenu_statusHide');
				this.status.innerHTML = text;
			}

			if (typeof onclick == 'function') {
				this.status.addEventListener("click", onclick, {
					once: true
				});
			}
		}

		/**
		 * Добавление текстового элемента
		 * @param {String} text текст
		 * @param {Function} func функция по клику
		 * @param {HTMLDivElement} main родитель
		 */
		this.addHeader = (text, func, main) => {
			main = main || this.mainMenu;
			const header = document.createElement('div');
			header.classList.add('scriptMenu_header');
			header.innerHTML = text;
			if (typeof func == 'function') {
				header.addEventListener('click', func);
			}
			main.appendChild(header);
		}

		/**
		 * Добавление кнопки
		 * @param {String} text
		 * @param {Function} func
		 * @param {String} title
		 * @param {HTMLDivElement} main родитель
		 */
		this.addButton = (text, func, title, main) => {
			main = main || this.mainMenu;
			const button = document.createElement('div');
			button.classList.add('scriptMenu_button');
			button.title = title;
			button.addEventListener('click', func);
			main.appendChild(button);

			const buttonText = document.createElement('div');
			buttonText.classList.add('scriptMenu_buttonText');
			buttonText.innerText = text;
			button.appendChild(buttonText);
			this.buttons.push(button);
		}

		/**
		 * Добавление чекбокса
		 * @param {String} label
		 * @param {String} title
		 * @param {HTMLDivElement} main родитель
		 * @returns
		 */
		this.addCheckbox = (label, title, main) => {
			main = main || this.mainMenu;
			const divCheckbox = document.createElement('div');
			divCheckbox.classList.add('scriptMenu_divInput');
			divCheckbox.title = title;
			main.appendChild(divCheckbox);

			const newCheckbox = document.createElement('input');
			newCheckbox.type = 'checkbox';
			newCheckbox.id = 'newCheckbox' + this.checkboxes.length;
			newCheckbox.classList.add('scriptMenu_checkbox');
			divCheckbox.appendChild(newCheckbox)

			const newCheckboxLabel = document.createElement('label');
			newCheckboxLabel.innerText = label;
			newCheckboxLabel.setAttribute('for', newCheckbox.id);
			divCheckbox.appendChild(newCheckboxLabel);

			this.checkboxes.push(newCheckbox);
			return newCheckbox;
		}

		/**
		 * Добавление поля ввода
		 * @param {String} title
		 * @param {String} placeholder
		 * @param {HTMLDivElement} main родитель
		 * @returns
		 */
		this.addInputText = (title, placeholder, main) => {
			main = main || this.mainMenu;
			const divInputText = document.createElement('div');
			divInputText.classList.add('scriptMenu_divInputText');
			divInputText.title = title;
			main.appendChild(divInputText);

			const newInputText = document.createElement('input');
			newInputText.type = 'text';
			if (placeholder) {
				newInputText.placeholder = placeholder;
			}
			newInputText.classList.add('scriptMenu_InputText');
			divInputText.appendChild(newInputText)
			return newInputText;
		}

		/**
		 * Добавляет раскрывающийся блок
		 * @param {String} summary
		 * @param {String} name
		 * @returns
		 */
		this.addDetails = (summaryText, name) => {
			const details = document.createElement('details');
			if (this.option.showDetails[name]) {
				details.open = this.option.showDetails[name];
			}
			this.mainMenu.appendChild(details);

			const summary = document.createElement('summary');
			summary.classList.add('scriptMenu_Summary');
			summary.innerText = summaryText;
			details.appendChild(summary);

			return details;
		}
	});
	/** Хранилище данных (только для числовых и булевых значений) */
	const storage = {
		name: GM_info.script.name,
		get: function (key, def) {
			let value = localStorage[this.name + ':' + key];
			try {
				return JSON.parse(value)
			} catch {
				return def;
			}
		},
		set: function (key, value) {
			return localStorage[this.name + ':' + key] = value;
		},
		delete: function (key) {
			return delete localStorage[this.name + ':' + key];
		}
	}
	/** Отправка экспедиций TODO: переписать в класс */
	// Проверка и отправка экспедиций
	function checkExpedition() {
		var heroesInfo = '{"calls":[{"name":"heroGetAll","args":{},"ident":"body"}]}';
		var sendExped = '{"calls":[{"name":"expeditionSendHeroes","args":{"expeditionId":#number#,"heroes":[#heroes#]},"ident":"body"}]}';
		var checkExped = '{"calls":[{"name":"expeditionGet","args":{},"ident":"body"}]}';
		var endExped = '{"calls":[{"name":"expeditionFarm","args":{"expeditionId":#number#},"ident":"body"}]}';

		send(checkExped, function(res) {
			let dataExpedition = getJson(res);
			if (!dataExpedition) return;
			dataExpedition = dataExpedition?.results[0]?.result?.response;
			dataExped = {useHeroes:[], exped:[]};
			for (var n in dataExpedition) {
				var exped = dataExpedition[n];

				// console.log(exped, exped.status, dateNow, exped.endTime);
				var dateNow = (Date.now() / 1000);
				if (exped.status == 2 && exped.endTime != 0 && dateNow > exped.endTime) {
					send(endExped.replace('#number#', exped.id), function(res, exped) {
						// console.log(exped.id,res);
					}, exped);
				} else {
					dataExped.useHeroes = dataExped.useHeroes.concat(exped.heroes);
				}
				if (exped.status == 1) {
					dataExped.exped.push({id: exped.id, power: exped.power});
				}
			}
			dataExped.exped = dataExped.exped.sort((a,b)=>(b.power - a.power));
			send(heroesInfo, function(res, expData) {
				let dataHeroes = getJson(res);
				if (!dataHeroes) return;
				dataHeroes = dataHeroes?.results[0]?.result?.response;
				let heroesArr = [];
				for (let n in dataHeroes) {
					let hero = dataHeroes[n];
					if (hero.xp > 0 && !expData.useHeroes.includes(hero.id)) {
						heroesArr.push({id: hero.id, power: hero.power})
					}
				}
				heroesArr = heroesArr.sort((a,b)=>(a.power - b.power));
				for (let i in expData.exped) {
					let exped = expData.exped[i];
					let heroesIds = selectionHeroes(heroesArr, exped.power);
					if (heroesIds && heroesIds.length > 4) {
						for (let q in heroesArr) {
							if (heroesIds.includes(heroesArr[q].id)) {
								delete heroesArr[q];
							}
						}
						let sendExp = sendExped.replace('#heroes#', heroesIds.join());
						sendExp = sendExp.replace('#number#', exped.id)
						send(sendExp, function(res, exped) {
							// console.log(exped,res);
						}, sendExp);
					}
				}
				setProgress('Done', true);
			}, dataExped)
		}, null);
	}
	// Подбор героев для экспедиций
	function selectionHeroes(heroes, power) {
		let resultHeroers = [];
		let heroesIds = [];
		for (let q = 0; q < 5; q++) {
			for (let i in heroes) {
				let hero = heroes[i];
				let summ = summArray(resultHeroers, 'power');
				if (heroesIds.includes(hero.id)) {
					continue;
				}
				// let dif = (summ + hero.power) - power;
				let need = Math.round((power - summ) / (5 - resultHeroers.length));
				// if (hero.power > need && dif < need) {
				if (hero.power > need) {
					resultHeroers.push(hero);
					heroesIds.push(hero.id);
					break;
				}
			}
		}
		let summ = summArray(resultHeroers, 'power');
		if (summ < power) {
			return false;
		}
		return heroesIds;
	}
	// Суммирует силу героев в пачке
	function summArray(arr, elem) {
		return arr.reduce((e,i)=>e+i[elem],0);
	}
	// Отправка запроса
	function send(json, callback, pr) {
		/** Получаем заголовки предыдущего перехваченого запроса */
		let headers = lastHeaders;
		/** Увеличиваем заголовок идетификатора запроса на 1 */
		headers["X-Request-Id"]++;
		/** Расчитываем заголовок с сигнатурой */
		headers["X-Auth-Signature"] = getSignature(headers, json);
		/** Создаем новый AJAX запрос */
		let xhr = new XMLHttpRequest;
		/** Указываем ранее сохраненный URL для API запросов */
		xhr.open('POST', apiUrl, true);
		/** Добавляем функцию к событию смены статуса запроса */
		xhr.onreadystatechange = function() {
			/** Если результат запроса получен вызываем колбек функцию */
			if(xhr.readyState == 4) {
				let randTimeout = Math.random() * 200 + 200;
				setTimeout(callback, randTimeout, xhr.response, pr);
			}
		};
		/** Указываем тип запроса */
		xhr.responseType = 'json';
		/** Задаем заголовки запроса */
		for(let nameHeader in headers) {
			let head = headers[nameHeader];
			xhr.setRequestHeader(nameHeader, head);
		}
		/** Отправляем запрос */
		xhr.send(json);
	}

	async function testDungeon(titanit) {
		return new Promise((resolve, reject) => {
			popup.showBack();
			let dung = new executeDungeon(resolve, reject);
			dung.start(titanit);
		});
	}

	/** Прохождение подземелья */
	function executeDungeon(resolve, reject) {
		let dungeonActivity = 0;
		let startDungeonActivity = 0;
		let maxDungeonActivity = 150;
		let limitDungeonActivity = 30180;
		let fastMode = isChecked('fastMode');
		let end = false;

        let timeDungeon = new Date().getTime();

		let titansStates = {};
        let bestBattle = {};

		let teams = {
			neutral: [],
			water: [],
			earth: [],
			fire: [],
			hero: []
		}


		let callsExecuteDungeon = {
			calls: [{
				name: "dungeonGetInfo",
				args: {},
				ident: "dungeonGetInfo"
			}, {
				name: "teamGetAll",
				args: {},
				ident: "teamGetAll"
			}, {
				name: "teamGetFavor",
				args: {},
				ident: "teamGetFavor"
			}, {
				name: "clanGetInfo",
				args: {},
				ident: "clanGetInfo"
			}]
		}

		this.start = async function(titanit) {
			maxDungeonActivity = titanit > limitDungeonActivity ? limitDungeonActivity : titanit;
			send(JSON.stringify(callsExecuteDungeon), startDungeon);
		}

		/** Получаем данные по подземелью */
		function startDungeon(e) {
			let res = e.results;
			let dungeonGetInfo = res[0].result.response;
			if (!dungeonGetInfo) {
				endDungeon('noDungeon', res);
				return;
			}
            console.log("Начинаем копать: ", new Date());
			let teamGetAll = res[1].result.response;
			let teamGetFavor = res[2].result.response;
			dungeonActivity = res[3].result.response.stat.todayDungeonActivity;
            startDungeonActivity = res[3].result.response.stat.todayDungeonActivity;
			titansStates = dungeonGetInfo.states.titans;

			teams.hero = {
				favor: teamGetFavor.dungeon_hero,
				heroes: teamGetAll.dungeon_hero.filter(id => id < 6000),
				teamNum: 0,
			}
			let heroPet = teamGetAll.dungeon_hero.filter(id => id >= 6000).pop();
			if (heroPet) {
				teams.hero.pet = heroPet;
			}

			teams.neutral = getTitanTeam('neutral');
			teams.water = {
				favor: {},
				heroes: getTitanTeam('water'),
				teamNum: 0,
			};
			teams.earth = {
				favor: {},
				heroes: getTitanTeam('earth'),
				teamNum: 0,
			};
			teams.fire = {
				favor: {},
				heroes: getTitanTeam('fire'),
				teamNum: 0,
			};

			checkFloor(dungeonGetInfo);
		}

		function getTitanTeam(type) {
			switch (type) {
				case 'neutral':
					return [4023, 4022, 4012, 4021, 4011, 4010, 4020];
				case 'water':
					return [4000, 4001, 4002, 4003]
                        .filter(e => !titansStates[e]?.isDead);
				case 'earth':
					return [4020, 4022, 4021, 4023]
                        .filter(e => !titansStates[e]?.isDead);
				case 'fire':
					return [4010, 4011, 4012, 4013]
                        .filter(e => !titansStates[e]?.isDead);
			}
		}

		/** Создать копию объекта */
		function clone(a) {
            return JSON.parse(JSON.stringify(a));
		}

		/** Находит стихию на этаже */
        function findElement(floor, element) {
            for (let i in floor) {
                if (floor[i].attackerType === element) {
                    return i;
                }
            }
            return undefined;
        }

		/** Проверяем этаж */
		async function checkFloor(dungeonInfo) {
			if (!('floor' in dungeonInfo) || dungeonInfo.floor?.state == 2) {
				saveProgress();
				return;
			}
			setProgress('Dungeon: Титанит ' + dungeonActivity + '/' + maxDungeonActivity);
			if (dungeonActivity >= maxDungeonActivity) {
				endDungeon('endDungeon');
				return;
			}
			titansStates = dungeonInfo.states.titans;
            bestBattle = {};
			let floorChoices = dungeonInfo.floor.userData;
            if (floorChoices.length > 1) {
                for (let element in teams) {
                    let teamNum = findElement(floorChoices, element);
                    if (!!teamNum) {
                        if (element == 'earth') {
                            teamNum = await chooseEarthOrFire(floorChoices);
                            if (teamNum < 0) {
                                endDungeon('Невозможно победить без потери Титана!', dungeonInfo);
                                return;
                            }
                        }
                        chooseElement(floorChoices[teamNum].attackerType, teamNum);
                        return;
                    }
                }
            } else {
                chooseElement(floorChoices[0].attackerType, 0);
            }
        }

		/** Выбираем огнем или землей атаковать */
		async function chooseEarthOrFire(floorChoices) {
            bestBattle.recovery = -11;
            let selectedTeamNum = -1;
            for (let attempt = 0; selectedTeamNum < 0 && attempt < 4; attempt++) {
                for (let teamNum in floorChoices) {
                    let attackerType = floorChoices[teamNum].attackerType;
                    selectedTeamNum = await attemptAttackEarthOrFire(teamNum, attackerType, attempt);
                }
            }
            console.log("Выбор команды огня или земли: ", selectedTeamNum < 0 ? "не сделан" : floorChoices[selectedTeamNum].attackerType);
            return selectedTeamNum;
		}

		/** Попытка атаки землей и огнем */
		async function attemptAttackEarthOrFire(teamNum, attackerType, attempt) {
            let team = clone(teams[attackerType]);
            let startIndex = team.heroes.length + attempt - 4;
            if (startIndex >= 0) {
                team.heroes = team.heroes.slice(startIndex);
                let recovery = await getBestRecovery(teamNum, attackerType, team, fastMode ? 5 : 25);
                if (recovery > bestBattle.recovery) {
                    bestBattle.recovery = recovery;
                    bestBattle.selectedTeamNum = teamNum;
                    bestBattle.team = team;
                }
            }
            if (bestBattle.recovery < -10) {
                return -1;
            }
            return bestBattle.selectedTeamNum;
		}

		/** Выбираем стихию для атаки */
		async function chooseElement(attackerType, teamNum) {
            let result;
            switch (attackerType) {
                case 'hero':
                case 'water':
                    result = await startBattle(teamNum, attackerType, teams[attackerType]);
                    break;
                case 'earth':
                case 'fire':
                    result = await attackEarthOrFire(teamNum, attackerType);
                    break;
                case 'neutral':
                    result = await attackNeutral(teamNum, attackerType);
            }
            if (!!result && attackerType != 'hero') {
                let recovery = (!!!bestBattle.recovery ? 10 * getRecovery(result) : bestBattle.recovery) * 100;
                let titans = result.progress[0].attackers.heroes;
                console.log("Проведен бой: " + attackerType +
                            ", recovery = " + (recovery > 0 ? "+" : "") + recovery + "% \r\n", titans);
            }
            endBattle(result);
        }

		/** Атакуем Землей или Огнем */
		async function attackEarthOrFire(teamNum, attackerType) {
            if (!!!bestBattle.recovery) {
                bestBattle.recovery = -11;
                let selectedTeamNum = -1;
                for (let attempt = 0; selectedTeamNum < 0 && attempt < 4; attempt++) {
                    selectedTeamNum = await attemptAttackEarthOrFire(teamNum, attackerType, attempt);
                }
                if (selectedTeamNum < 0) {
                    endDungeon('Невозможно победить без потери Титана!', attackerType);
                    return;
                }
            }
            return findAttack(teamNum, attackerType, bestBattle.team);
		}

		/** Находим подходящий результат для атаки */
		async function findAttack(teamNum, attackerType, team) {
            let recovery = -1000;
            let iterations = 0;
            let result;
            let correction = fastMode ? 0.01 : 0.001;
            for (let needRecovery = bestBattle.recovery; recovery < needRecovery; needRecovery -= correction, iterations++) {
                result = await startBattle(teamNum, attackerType, team);
                recovery = getRecovery(result);
            }
            bestBattle.recovery = recovery;
            return result;
		}

		/** Атакуем Нейтральной командой */
		async function attackNeutral(teamNum, attackerType) {
            let factors = calcFactor();
            bestBattle.recovery = -0.2;
            await findBestBattleNeutral(teamNum, attackerType, factors, true)
            if (fastMode && (bestBattle.recovery < 0 || (bestBattle.recovery < 0.2 && factors[0].value < 0.5))) {
                let recovery = (100 * bestBattle.recovery);
                console.log("Не удалось найти удачный бой в быстром режиме: " + attackerType +
                            ", recovery = " + (recovery > 0 ? "+" : "") + recovery + "% \r\n", bestBattle.attackers);
                await findBestBattleNeutral(teamNum, attackerType, factors, false)
            }
            if (!!bestBattle.attackers) {
                let team = getTeam(bestBattle.attackers);
                return findAttack(teamNum, attackerType, team);
            }
            endDungeon('Не удалось найти удачный бой!', attackerType);
            return undefined;
        }

		/** Находит лучшую нейтральную команду */
		async function findBestBattleNeutral(teamNum, attackerType, factors, mode) {
            let countFactors = factors.length < 4 ? factors.length : 4;
            let aradgi = !titansStates['4013']?.isDead;
            let edem = !titansStates['4023']?.isDead;
            let mor = !titansStates['4032']?.isDead;
            let iyry = !titansStates['4042']?.isDead;
            let actions = [];
            if (fastMode && mode) {
                for (let i = 0; i < countFactors; i++) {
                    actions.push(startBattle(teamNum, attackerType, getNeutralTeam(factors[i].id)));
                }
                if (countFactors > 1) {
                    let firstId = factors[0].id;
                    let secondId = factors[1].id;
                    actions.push(startBattle(teamNum, attackerType, getNeutralTeam(firstId, 4001, secondId)));
                    actions.push(startBattle(teamNum, attackerType, getNeutralTeam(firstId, 4002, secondId)));
                    actions.push(startBattle(teamNum, attackerType, getNeutralTeam(firstId, 4003, secondId)));
                }
                if (aradgi) {
                    actions.push(startBattle(teamNum, attackerType, getNeutralTeam(4013)));
                    if (countFactors > 0) {
                        let firstId = factors[0].id;
                        actions.push(startBattle(teamNum, attackerType, getNeutralTeam(firstId, 4000, 4013)));
                        actions.push(startBattle(teamNum, attackerType, getNeutralTeam(firstId, 4001, 4013)));
                        actions.push(startBattle(teamNum, attackerType, getNeutralTeam(firstId, 4002, 4013)));
                        actions.push(startBattle(teamNum, attackerType, getNeutralTeam(firstId, 4003, 4013)));
                    }
                    if (edem) {
                        actions.push(startBattle(teamNum, attackerType, getNeutralTeam(4023, 4000, 4013)));
                    }
                }
            } else {
                if (mode) {
                    for (let i = 0; i < factors.length; i++) {
                        actions.push(startBattle(teamNum, attackerType, getNeutralTeam(factors[i].id)));
                    }
                } else {
                    countFactors = factors.length < 2 ? factors.length : 2;
                }
                for (let i = 0; i < countFactors; i++) {
                    let mainId = factors[i].id;
                    if (aradgi && (mode || i > 0)) {
                        actions.push(startBattle(teamNum, attackerType, getNeutralTeam(mainId, 4000, 4013)));
                        actions.push(startBattle(teamNum, attackerType, getNeutralTeam(mainId, 4001, 4013)));
                        actions.push(startBattle(teamNum, attackerType, getNeutralTeam(mainId, 4002, 4013)));
                        actions.push(startBattle(teamNum, attackerType, getNeutralTeam(mainId, 4003, 4013)));
                    }
                    if (mor) {
                        actions.push(startBattle(teamNum, attackerType, getNeutralTeam(mainId, 4000, 4032)));
                        actions.push(startBattle(teamNum, attackerType, getNeutralTeam(mainId, 4001, 4032)));
                        actions.push(startBattle(teamNum, attackerType, getNeutralTeam(mainId, 4002, 4032)));
                        actions.push(startBattle(teamNum, attackerType, getNeutralTeam(mainId, 4003, 4032)));
                    }
                    if (iyry) {
                        actions.push(startBattle(teamNum, attackerType, getNeutralTeam(mainId, 4000, 4042)));
                        actions.push(startBattle(teamNum, attackerType, getNeutralTeam(mainId, 4001, 4042)));
                        actions.push(startBattle(teamNum, attackerType, getNeutralTeam(mainId, 4002, 4042)));
                        actions.push(startBattle(teamNum, attackerType, getNeutralTeam(mainId, 4003, 4042)));
                    }
                    let isFull = mode || i > 0;
                    for (let j = isFull ? i + 1 : 2; j < factors.length; j++) {
                        let extraId = factors[j].id;
                        actions.push(startBattle(teamNum, attackerType, getNeutralTeam(mainId, 4000, extraId)));
                        actions.push(startBattle(teamNum, attackerType, getNeutralTeam(mainId, 4001, extraId)));
                        actions.push(startBattle(teamNum, attackerType, getNeutralTeam(mainId, 4002, extraId)));
                        actions.push(startBattle(teamNum, attackerType, getNeutralTeam(mainId, 4003, extraId)));
                    }
                }
                if (aradgi) {
                    if (mode) {
                        actions.push(startBattle(teamNum, attackerType, getNeutralTeam(4013)));
                    }
                    if (mor) {
                        actions.push(startBattle(teamNum, attackerType, getNeutralTeam(4032, 4000, 4013)));
                        actions.push(startBattle(teamNum, attackerType, getNeutralTeam(4032, 4001, 4013)));
                        actions.push(startBattle(teamNum, attackerType, getNeutralTeam(4032, 4002, 4013)));
                        actions.push(startBattle(teamNum, attackerType, getNeutralTeam(4032, 4003, 4013)));
                    }
                    if (iyry) {
                        actions.push(startBattle(teamNum, attackerType, getNeutralTeam(4042, 4000, 4013)));
                        actions.push(startBattle(teamNum, attackerType, getNeutralTeam(4042, 4001, 4013)));
                        actions.push(startBattle(teamNum, attackerType, getNeutralTeam(4042, 4002, 4013)));
                        actions.push(startBattle(teamNum, attackerType, getNeutralTeam(4042, 4003, 4013)));
                    }
                }
                if (mor) {
                    actions.push(startBattle(teamNum, attackerType, getNeutralTeam(4032)));
                }
                if (iyry) {
                    actions.push(startBattle(teamNum, attackerType, getNeutralTeam(4042)));
                }
            }
            for (let result of await Promise.all(actions)) {
                let recovery = getRecovery(result);
                if (recovery > bestBattle.recovery) {
                    bestBattle.recovery = recovery;
                    bestBattle.attackers = result.progress[0].attackers.heroes;
                }
            }
        }

		/** Получаем нейтральную команду */
        function getNeutralTeam(id, swapId, addId) {
            let neutralTeam = clone(teams.water);
            let neutral = neutralTeam.heroes;
            if (neutral.length == 4) {
                if (!!swapId) {
                    for (let i in neutral) {
                        if (neutral[i] == swapId) {
                            neutral[i] = addId;
                        }
                    }
                }
            } else if (!!addId) {
                neutral.push(addId);
            }
            neutral.push(id);
            return neutralTeam;
		}

		/** Получить команду титанов */
        function getTeam(titans) {
            return {
                favor: {},
                heroes: Object.keys(titans).map(id => parseInt(id)),
                teamNum: 0,
            };
        }

		/** Вычисляем фактор боеготовности титанов */
		function calcFactor() {
            let neutral = teams.neutral;
            let factors = [];
            for (let i in neutral) {
                let titanId = neutral[i];
                let titan = titansStates[titanId];
                let factor = !!titan ? titan.hp / titan.maxHp + titan.energy / 10000.0 : 1;
                if (factor > 0) {
                    factors.push({id: titanId, value: factor});
                }
            }
            factors.sort(function(a, b) {
                return a.value - b.value;
            });
            return factors;
		}

		/** Возвращает наилучший результат из нескольких боев */
		async function getBestRecovery(teamNum, attackerType, team, countBattle) {
            let bestRecovery = -1000;
            let actions = [];
            for (let i = 0; i < countBattle; i++) {
                actions.push(startBattle(teamNum, attackerType, team));
            }
            for (let result of await Promise.all(actions)) {
                let recovery = getRecovery(result);
                if (recovery > bestRecovery) {
                    bestRecovery = recovery;
                }
            }
            return bestRecovery;
        }

        /** Возвращает разницу в здоровье атакующей команды после и до битвы и проверяет здоровье титанов на необходимый минимум*/
        function getRecovery(result) {
            if (result.result.stars < 3) {
                return -100;
            }
            let beforeSumFactor = 0;
            let afterSumFactor = 0;
            let beforeTitans = result.battleData.attackers;
            let afterTitans = result.progress[0].attackers.heroes;
            for (let i in afterTitans) {
                let titan = afterTitans[i];
                let percentHP = titan.hp / beforeTitans[i].hp;
                let energy = titan.energy;
                let factor = checkTitan(i, energy, percentHP) ? getFactor(i, energy, percentHP) : -100;
                afterSumFactor += factor;
            }
            for (let i in beforeTitans) {
                let titan = beforeTitans[i];
                let state = titan.state;
                beforeSumFactor += !!state ? getFactor(i, state.energy, state.hp / titan.hp) : 1;
            }
            return afterSumFactor - beforeSumFactor;
        }

        /** Возвращает состояние титана*/
        function getFactor(id, energy, percentHP) {
            let elemantId = id.slice(2, 3);
            let isEarthOrFire = elemantId == '1' || elemantId == '2';
            let energyBonus = id == '4020' && energy == 1000 ? 0.1 : energy / 20000.0;
            let factor = percentHP + energyBonus;
            return isEarthOrFire ? factor : factor / 10;
        }

        /** Проверяет состояние титана*/
        function checkTitan(id, energy, percentHP) {
            switch (id) {
                case '4020':
                    return percentHP > 0.25 || (energy == 1000 && percentHP > 0.05);
                    break;
                case '4010':
                    return percentHP + energy / 2000.0 > 0.63;
                    break;
                case '4000':
                    return percentHP > 0.62 || (energy < 1000 && (
                        (percentHP > 0.45 && energy >= 400) ||
                        (percentHP > 0.3 && energy >= 670)));
            }
            return true;
        }


		/** Начинаем бой */
		function startBattle(teamNum, attackerType, args) {
			return new Promise(function (resolve, reject) {
				args.teamNum = teamNum;
				let startBattleCall = {
					calls: [{
						name: "dungeonStartBattle",
						args,
						ident: "body"
					}]
				}
				send(JSON.stringify(startBattleCall), resultBattle, {
					resolve,
					teamNum,
					attackerType
				});
			});
		}

		/** Возращает результат боя в промис */
		function resultBattle(resultBattles, args) {
            if (!!resultBattles && !!resultBattles.results) {
                let battleData = resultBattles.results[0].result.response;
                let battleType = "get_tower";
                if (battleData.type == "dungeon_titan") {
                    battleType = "get_titan";
                }
                BattleCalc(battleData, battleType, function (result) {
                    result.teamNum = args.teamNum;
                    result.attackerType = args.attackerType;
                    args.resolve(result);
                });
            } else {
                endDungeon('Потеряна связь с сервером игры!', 'break');
            }
        }

		/** Заканчиваем бой */
		function endBattle(battleInfo) {
            if (!!battleInfo) {
                if (battleInfo.result.stars < 3) {
                    endDungeon('Герой или Титан мог погибнуть в бою!', battleInfo);
                    return;
                }
                let endBattleCall = {
                    calls: [{
                        name: "dungeonEndBattle",
                        args: {
                            result: battleInfo.result,
                            progress: battleInfo.progress,
                        },
                        ident: "body"
                    }]
                }
                send(JSON.stringify(endBattleCall), resultEndBattle);
            }
        }

		/** Получаем и обрабатываем результаты боя */
		function resultEndBattle(e) {
            if (!!e && !!e.results) {
                let battleResult = e.results[0].result.response;
                if ('error' in battleResult) {
                    endDungeon('errorBattleResult', battleResult);
                    return;
                }
                let dungeonGetInfo = battleResult.dungeon ?? battleResult;
                dungeonActivity += battleResult.reward.dungeonActivity ?? 0;
                checkFloor(dungeonGetInfo);
            } else {
                endDungeon('Потеряна связь с сервером игры!', 'break');
            }
        }

		function saveProgress() {
			let saveProgressCall = {
				calls: [{
					name: "dungeonSaveProgress",
					args: {},
					ident: "body"
				}]
			}
			send(JSON.stringify(saveProgressCall), resultEndBattle);
		}


		/** Выводит статистику прохождения подземелья */
		function showStats() {
            let activity = dungeonActivity - startDungeonActivity;
            let workTime = ((new Date().getTime() - timeDungeon) / 1000);
            console.log(titansStates);
            console.log("Собрано титанита: ", activity);
            console.log("Скорость сбора: " + (3600 * activity / workTime) + " титанита/час");
            console.log("Время раскопок: " + workTime + " сек.");
		}

		/** Заканчиваем копать подземелье */
		function endDungeon(reason, info) {
            if (!end) {
                end = true;
                console.log(reason, info);
                showStats();
                if (info == 'break') {
                    setProgress('Dungeon stoped: Титанит ' + dungeonActivity + '/' + maxDungeonActivity +
                                "\r\nПотеряна связь с сервером игры!", false, hideProgress);
                } else {
                    setProgress('Dungeon completed: Титанит ' + dungeonActivity + '/' + maxDungeonActivity, false, hideProgress);
                }
                setTimeout(cheats.refreshGame, 1000);
                resolve();
            }
		}

	}


	function testTower() {
		return new Promise((resolve, reject) => {
			popup.showBack();
			tower = new executeTower(resolve, reject);
			tower.start();
		});
	}

	/** Прохождение башни */
	function executeTower(resolve, reject) {
		lastTowerInfo = {};

		scullCoin = 0;

		heroGetAll = [];

		heroesStates = {};

		argsBattle = {
			heroes: [],
			favor: {},
		};

		callsExecuteTower = {
			calls: [{
				name: "towerGetInfo",
				args: {},
				ident: "towerGetInfo"
			}, {
				name: "teamGetAll",
				args: {},
				ident: "teamGetAll"
			}, {
				name: "teamGetFavor",
				args: {},
				ident: "teamGetFavor"
			}, {
				name: "inventoryGet",
				args: {},
				ident: "inventoryGet"
			}, {
				name: "heroGetAll",
				args: {},
				ident: "heroGetAll"
			}]
		}

		buffIds = [
			{id: 0, cost: 0, isBuy: false}, // заглушка
			{id: 1, cost: 1, isBuy: true}, // 3% атака
			{id: 2, cost: 6, isBuy: true}, // 2% атака
			{id: 3, cost: 16, isBuy: true}, // 4% атака
			{id: 4, cost: 40, isBuy: true}, // 8% атака
			{id: 5, cost: 1, isBuy: true}, // 10% броня
			{id: 6, cost: 6, isBuy: true}, // 5% броня
			{id: 7, cost: 16, isBuy: true}, // 10% броня
			{id: 8, cost: 40, isBuy: true}, // 20% броня
			{id: 9, cost: 1, isBuy: true}, // 10% защита от магии
			{id: 10, cost: 6, isBuy: true}, // 5% защита от магии
			{id: 11, cost: 16, isBuy: true}, // 10% защита от магии
			{id: 12, cost: 40, isBuy: true}, // 20% защита от магии
			{id: 13, cost: 1, isBuy: false}, // 40% здоровья герою
			{id: 14, cost: 6, isBuy: false}, // 40% здоровья герою
			{id: 15, cost: 16, isBuy: false}, // 80% здоровья герою
			{id: 16, cost: 40, isBuy: false}, // 40% здоровья всем героям
			{id: 17, cost: 1, isBuy: false}, // 40% энергии герою
			{id: 18, cost: 3, isBuy: false}, // 40% энергии герою
			{id: 19, cost: 8, isBuy: false}, // 80% энергии герою
			{id: 20, cost: 20, isBuy: false}, // 40% энергии всем героям
			{id: 21, cost: 40, isBuy: false}, // Воскрешение героя
		]

		this.start = function() {
			send(JSON.stringify(callsExecuteTower), startTower);
		}

		/** Получаем данные по подземелью */
		function startTower(e) {
			res = e.results;
			towerGetInfo = res[0].result.response;
			if (!towerGetInfo) {
				endTower('noTower', res);
				return;
			}
			teamGetAll = res[1].result.response;
			teamGetFavor = res[2].result.response;
			inventoryGet = res[3].result.response;
			heroGetAll = Object.values(res[4].result.response);

			scullCoin = inventoryGet.coin[7] ?? 0;

			argsBattle.favor = teamGetFavor.tower;
			argsBattle.heroes = heroGetAll.sort((a, b) => b.power - a.power).slice(0, 5).map(e => e.id);;
			pet = teamGetAll.tower.filter(id => id >= 6000).pop();
			if (pet) {
				argsBattle.pet = pet;
			}

			checkFloor(towerGetInfo);
		}

		function fixHeroesTeam(argsBattle) {
			let fixHeroes = argsBattle.heroes.filter(e => !heroesStates[e]?.isDead);
			if (fixHeroes.length < 5) {
				heroGetAll = heroGetAll.filter(e => !heroesStates[e.id]?.isDead);
				fixHeroes = heroGetAll.sort((a, b) => b.power - a.power).slice(0,5).map(e => e.id);
				Object.keys(argsBattle.favor).forEach(e => {
					if (!fixHeroes.includes(+e)) {
						delete argsBattle.favor[e];
					}
				})
			}
			argsBattle.heroes = fixHeroes;
			return argsBattle;
		}

		/** Проверяем этаж */
		function checkFloor(towerInfo) {
			lastTowerInfo = towerInfo;
			maySkipFloor = +towerInfo.maySkipFloor;
			floorNumber = +towerInfo.floorNumber;
			heroesStates = towerInfo.states.heroes;

			//

			isOpenChest = false;
			if (towerInfo.floorType == "chest") {
				isOpenChest = towerInfo.floor.chests.reduce((n, e) => n + e.opened, 0);
			}

			setProgress('Tower: Этаж ' + floorNumber);
			if (floorNumber > 49) {
				if (isOpenChest) {
					endTower('alreadyOpenChest 50 floor', floorNumber);
					return;
				}
			}
			// towerInfo.chestSkip ???
			if (towerInfo.mayFullSkip && +towerInfo.teamLevel == 130) {
				nextOpenChest(floorNumber);
				return;
			}

			// console.log(towerInfo, scullCoin);
			switch (towerInfo.floorType) {
				case "battle":
					if (floorNumber <= maySkipFloor) {
						skipFloor();
						return;
					}
					startBattle().then(endBattle);
					return;
				case "buff":
					checkBuff(towerInfo);
					return;
				case "chest":
					openChest(floorNumber);
					return;
				default:
					console.log('!', towerInfo.floorType, towerInfo);
					break;
			}
		}

		/** Начинаем бой */
		function startBattle() {
			return new Promise(function (resolve, reject) {
				towerStartBattle = {
					calls: [{
						name: "towerStartBattle",
						args: fixHeroesTeam(argsBattle),
						ident: "body"
					}]
				}
				send(JSON.stringify(towerStartBattle), resultBattle, resolve);
			});
		}
		/** Возращает резульат боя в промис */
		function resultBattle(resultBattles, resolve) {
			battleData = resultBattles.results[0].result.response;
			battleType = "get_tower";
			BattleCalc(battleData, battleType, function (result) {
				resolve(result);
			});
		}
		/** Заканчиваем бой */
		function endBattle(battleInfo) {
			if (battleInfo.result.win) {
				endBattleCall = {
					calls: [{
						name: "towerEndBattle",
						args: {
							result: battleInfo.result,
							progress: battleInfo.progress,
						},
						ident: "body"
					}]
				}
				send(JSON.stringify(endBattleCall), resultEndBattle);
			} else {
				endTower('towerEndBattle win: false\n', battleInfo);
			}
		}

		/** Получаем и обрабатываем результаты боя */
		function resultEndBattle(e) {
			battleResult = e.results[0].result.response;
			if ('error' in battleResult) {
				endTower('errorBattleResult', battleResult);
				return;
			}
			if ('reward' in battleResult) {
				scullCoin += battleResult.reward?.coin[7] ?? 0;
			}
			nextFloor();
		}

		function nextFloor() {
			nextFloorCall = {
				calls: [{
					name: "towerNextFloor",
					args: {},
					ident: "body"
				}]
			}
			send(JSON.stringify(nextFloorCall), checkDataFloor);
		}

		function openChest(floorNumber) {
			floorNumber = floorNumber || 0;
			openChestCall = {
				calls: [{
					name: "towerOpenChest",
					args: {
						num: 2
					},
					ident: "body"
				}]
			}
			send(JSON.stringify(openChestCall), floorNumber < 50 ? nextFloor : lastChest);
		}

		function lastChest() {
			endTower('openChest 50 floor', floorNumber);
		}

		function skipFloor() {
			skipFloorCall = {
				calls: [{
					name: "towerSkipFloor",
					args: {},
					ident: "body"
				}]
			}
			send(JSON.stringify(skipFloorCall), checkDataFloor);
		}

		function checkBuff(towerInfo) {
			buffArr = towerInfo.floor;
			promises = [];
			for (let buff of buffArr) {
				buffInfo = buffIds[buff.id];
				if (buffInfo.isBuy && buffInfo.cost <= scullCoin) {
					scullCoin -= buffInfo.cost;
					promises.push(buyBuff(buff.id));
				}
			}
			Promise.all(promises).then(nextFloor);
		}

		function buyBuff(buffId) {
			return new Promise(function(resolve, reject) {
				buyBuffCall = {
					calls: [{
						name: "towerBuyBuff",
						args: {
							buffId
						},
						ident: "body"
					}]
				}
				send(JSON.stringify(buyBuffCall), resolve);
			});
		}

		function checkDataFloor(result) {
			towerInfo = result.results[0].result.response;
			if ('reward' in towerInfo && towerInfo.reward?.coin) {
				scullCoin += towerInfo.reward?.coin[7] ?? 0;
			}
			if ('tower' in towerInfo) {
				towerInfo = towerInfo.tower;
			}
			if ('skullReward' in towerInfo) {
				scullCoin += towerInfo.skullReward?.coin[7] ?? 0;
			}
			checkFloor(towerInfo);
		}
		/** Получаем награды башни */
		function farmPointRewards() {
			let {pointRewards,points} = lastTowerInfo;
			pointsAll = Object.getOwnPropertyNames(pointRewards);
			farmPoints = pointsAll.filter(e => +e <= +points && !pointRewards[e]);
			if (!farmPoints.length) {
				return;
			}
			farmPointRewardsCall = {
				calls: [{
					name: "tower_farmPointRewards",
					args: {
						points: farmPoints
					},
					ident: "body"
				}]
			}
			send(JSON.stringify(farmPointRewardsCall), ()=>{});
		}
		/** Меняем черепа на монетки */
		function farmSkullReward() {
			farmSkullRewardCall = {
				calls: [{
					name: "tower_farmSkullReward",
					args: {},
					ident: "body"
				}]
			}
			send(JSON.stringify(farmSkullRewardCall), () => {});
		}

		function nextOpenChest(floorNumber) {
			if (floorNumber > 49) {
				endTower('openChest 50 floor', floorNumber);
				return;
			}
			nextOpenChestCall = {
				calls: [{
					name: "towerNextChest",
					args: {},
					ident: "towerNextChest"
				}, {
					name: "towerOpenChest",
					args: {
						num: 2
					},
					ident: "towerOpenChest"
				}]
			}
			send(JSON.stringify(nextOpenChestCall), checkDataFloor);
		}

		function endTower(reason, info) {
			console.log(reason, info);
			if (reason != 'noTower') {
				farmPointRewards();
				if (scullCoin > 0 && reason == 'openChest 50 floor') {
					farmSkullReward();
				}
			}
			setProgress('Tower completed!', true);
			resolve();
		}

	}

	function testTitanArena() {
		return new Promise((resolve, reject) => {
			popup.showBack();
			titAren = new executeTitanArena(resolve, reject);
			titAren.start();
		});
	}

	/** Прохождение арены титанов */
	function executeTitanArena(resolve, reject) {
		let titan_arena = [];
		let finishListBattle = [];
		/** Идетификатор текущей пачки */
		let currentRival = 0;
		/** Колличество попыток добития пачки */
		let attempts = 0;
		/** Была ли попытка добития текущего тира */
		let isCheckCurrentTier = false;
		/** Текущий тир */
		let currTier = 0;
		/** Количество битв на текущем тире */
		let countRivalsTier = 0;

		let callsStart = {
			calls: [{
				name: "titanArenaGetStatus",
				args: {},
				ident: "titanArenaGetStatus"
			}, {
				name: "teamGetAll",
				args: {},
				ident: "teamGetAll"
			}]
		}

		this.start = function () {
			send(JSON.stringify(callsStart), startTitanArena);
		}

		function startTitanArena(data) {
			let titanArena = data.results[0].result.response;
			if (titanArena.status == 'disabled') {
				endTitanArena('disabled', titanArena);
				return;
			}

			let teamGetAll = data.results[1].result.response;
			titan_arena = teamGetAll.titan_arena;

			checkTier(titanArena)
		}

		function checkTier(titanArena) {
			if (titanArena.status == "peace_time") {
				endTitanArena('Peace_time', titanArena);
				return;
			}
			currTier = titanArena.tier;
			if (currTier) {
				setProgress('Турнир Стихий: Уровень ' + currTier);
			}

			if (titanArena.status == "completed_tier") {
				titanArenaCompleteTier();
				return;
			}
			/** Проверка на возможность рейда */
			if (titanArena.canRaid) {
				titanArenaStartRaid();
				return;
			}
			/** Проверка была ли попытка добития текущего тира */
			if (!isCheckCurrentTier) {
				checkRivals(titanArena.rivals);
				return;
			}

			endTitanArena('Done or not canRaid', titanArena);
		}
		/** Отправка информации о тире на проверку */
		function checkResultInfo(data) {
			let titanArena = data.results[0].result.response;
			checkTier(titanArena);
		}
		/** Завершить текущий тир */
		function titanArenaCompleteTier() {
			isCheckCurrentTier = false;
			let calls = [{
				name: "titanArenaCompleteTier",
				args: {},
				ident: "body"
			}];
			send(JSON.stringify({calls}), checkResultInfo);
		}
		/** Собираем точки которые нужно добить */
		function checkRivals(rivals) {
			finishListBattle = [];
			for (let n in rivals) {
				if (rivals[n].attackScore < 250) {
					finishListBattle.push(n);
				}
			}
			console.log('checkRivals', finishListBattle);
			countRivalsTier = finishListBattle.length;
			roundRivals();
		}
		/** Выбор следующей точки для добития */
		function roundRivals() {
			let countRivals = finishListBattle.length;
			if (!countRivals) {
				// Весь тир проверен
				isCheckCurrentTier = true;
				titanArenaGetStatus();
				return;
			}
			// setProgress('TitanArena: Уровень ' + currTier + ' Бои: ' + (countRivalsTier - countRivals + 1) + '/' + countRivalsTier);
			currentRival = finishListBattle.pop();
			attempts = +currentRival;
			// console.log('roundRivals', currentRival);
			titanArenaStartBattle(currentRival);
		}
		/** Начало одиночной битвы */
		function titanArenaStartBattle(rivalId) {
			let calls = [{
				name: "titanArenaStartBattle",
				args: {
					rivalId: rivalId,
					titans: titan_arena
				},
				ident: "body"
			}];
			send(JSON.stringify({calls}), calcResult);
		}
		/** Расчет результатов боя */
		function calcResult(data) {
			let battlesInfo = data.results[0].result.response.battle;
			/** Если попытки равны номеру текущего боя делаем прерасчет */
			if (attempts == currentRival) {
				preCalcBattle(battlesInfo);
				return;
			}
			/** Если попытки еще есть делаем расчет нового боя*/
			if (attempts > 0) {
				attempts--;
				calcBattleResult(battlesInfo)
					.then(resultCalcBattle);
				return;
			}
			/** Иначе переходим к следующему сопернику */
			roundRivals();
		}
		/** Обработка результатов расчета битвы */
		function resultCalcBattle(resultBattle) {
			// console.log('resultCalcBattle', currentRival, attempts, resultBattle.result.win);
			/** Если текущий расчет победа или шансов нет или попытки кончились завершаем бой */
			if (resultBattle.result.win || !attempts) {
				titanArenaEndBattle({
					progress: resultBattle.progress,
					result: resultBattle.result,
					rivalId: resultBattle.battleData.typeId
				});
				return;
			}
			/** Если не победа и есть попытки начинаем новый бой */
			titanArenaStartBattle(resultBattle.battleData.typeId);
		}
		/** Возращает промис расчета результатов битвы */
		function getBattleInfo(battle, isRandSeed) {
			return new Promise(function (resolve) {
				if (isRandSeed) {
					battle.seed = Math.floor(Date.now() / 1000) + random(0, 1e3);
				}
				// console.log(battle.seed);
				BattleCalc(battle, "get_titanClanPvp", e => resolve(e));
			});
		}
		/** Прерасчтет битвы */
		function preCalcBattle(battle) {
			let actions = [getBattleInfo(battle, false)];
			const countTestBattle = getInput('countTestBattle');
			for (let i = 0; i < countTestBattle; i++) {
				actions.push(getBattleInfo(battle, true));
			}
			Promise.all(actions)
				.then(resultPreCalcBattle);
		}
		/** Обработка результатов прерасчета битвы */
		function resultPreCalcBattle(e) {
			let wins = e.map(n => n.result.win);
			let firstBattle = e.shift();
			let countWin = wins.reduce((w, s) => w + s);
			let numReval = countRivalsTier - finishListBattle.length;
			// setProgress('TitanArena: Уровень ' + currTier + ' Бои: ' + numReval + '/' + countRivalsTier + ' - ' + countWin + '/11');
			console.log('resultPreCalcBattle', countWin + '/11' )
			if (countWin > 0) {
				attempts = 10;
			} else {
				attempts = 0;
			}
			resultCalcBattle(firstBattle);
		}

		/** Завершить битву на арене */
		function titanArenaEndBattle(args) {
			let calls = [{
				name: "titanArenaEndBattle",
				args,
				ident: "body"
			}];
			send(JSON.stringify({calls}), resultTitanArenaEndBattle);
		}

		function resultTitanArenaEndBattle(e) {
			let attackScore = e.results[0].result.response.attackScore;
			let numReval = countRivalsTier - finishListBattle.length;
			setProgress('Турнир Стихий: Уровень ' + currTier + '</br>Бои: ' + numReval + '/' + countRivalsTier + ' - ' + attackScore);
			/** TODO: Возможно стоит сделать улучшение результатов */
			// console.log('resultTitanArenaEndBattle', e)
			console.log('resultTitanArenaEndBattle', numReval + '/' + countRivalsTier, attempts)
			roundRivals();
		}
		/** Состояние арены */
		function titanArenaGetStatus() {
			let calls = [{
				name: "titanArenaGetStatus",
				args: {},
				ident: "body"
			}];
			send(JSON.stringify({calls}), checkResultInfo);
		}
		/** Запрос рейда арены */
		function titanArenaStartRaid() {
			let calls = [{
				name: "titanArenaStartRaid",
				args: {
					titans: titan_arena
				},
				ident: "body"
			}];
			send(JSON.stringify({calls}), calcResults);
		}

		function calcResults(data) {
			let battlesInfo = data.results[0].result.response;
			let {attackers, rivals} = battlesInfo;

			let promises = [];
			for (let n in rivals) {
				rival = rivals[n];
				promises.push(calcBattleResult({
					attackers: attackers,
					defenders: [rival.team],
					seed: rival.seed,
					typeId: n,
				}));
			}

			Promise.all(promises)
				.then(results => {
					const endResults = {};
					for (let info of results) {
						let id = info.battleData.typeId;
						endResults[id] = {
							progress: info.progress,
							result: info.result,
						}
					}
					titanArenaEndRaid(endResults);
				});
		}

		function calcBattleResult(battleData) {
			return new Promise(function (resolve, reject) {
				BattleCalc(battleData, "get_titanClanPvp", resolve);
			});
		}

		/** Отправка результатов рейда */
		function titanArenaEndRaid(results) {
			titanArenaEndRaidCall = {
				calls: [{
					name: "titanArenaEndRaid",
					args: {
						results
					},
					ident: "body"
				}]
			}
			send(JSON.stringify(titanArenaEndRaidCall), checkRaidResults);
		}

		function checkRaidResults(data) {
			results = data.results[0].result.response.results;
			isSucsesRaid = true;
			for (let i in results) {
				isSucsesRaid &&= (results[i].attackScore >= 250);
			}

			if (isSucsesRaid) {
				titanArenaCompleteTier();
			} else {
				titanArenaGetStatus();
			}
		}

		function titanArenaFarmDailyReward() {
			titanArenaFarmDailyRewardCall = {
				calls: [{
					name: "titanArenaFarmDailyReward",
					args: {},
					ident: "body"
				}]
			}
			send(JSON.stringify(titanArenaFarmDailyRewardCall), () => {console.log('Done farm daily reward')});
		}

		function endTitanArena(reason, info) {
			if (!['Peace_time', 'disabled'].includes(reason)) {
				titanArenaFarmDailyReward();
			}
			console.log(reason, info);
			setProgress('TitanArena completed!', true);
			resolve();
		}
	}
	/** Скрыть прогресс */
	function hideProgress(timeout) {
		timeout = timeout || 0;
		setTimeout(function () {
			scriptMenu.setStatus('');
			popup.hideBack();
		}, timeout);
	}
	/** Отображение прогресса */
	function setProgress(text, hide, onclick) {
		scriptMenu.setStatus(text, onclick);
		hide = hide || false;
		if (hide) {
			hideProgress(800);
		}
	}
	function hackGame() {
		selfGame = null;
		bindId = 1e9;
		/** Список соответствия используемых классов их названиям */
		ObjectsList = [
			{name:"BattlePresets", prop:"game.battle.controller.thread.BattlePresets"},
			{name:"DataStorage", prop:"game.data.storage.DataStorage"},
			{name:"BattleConfigStorage", prop:"game.data.storage.battle.BattleConfigStorage"},
			{name:"BattleInstantPlay", prop:"game.battle.controller.instant.BattleInstantPlay"},
			{name:"MultiBattleResult", prop:"game.battle.controller.MultiBattleResult"},

			{name:"PlayerMissionData", prop:"game.model.user.mission.PlayerMissionData"},
			{name:"PlayerMissionBattle", prop:"game.model.user.mission.PlayerMissionBattle"},
			{name:"GameModel", prop:"game.model.GameModel"},
			{name:"CommandManager", prop:"game.command.CommandManager"},
			{name:"MissionCommandList", prop:"game.command.rpc.mission.MissionCommandList"},
			{name:"RPCCommandBase", prop:"game.command.rpc.RPCCommandBase"},
			{name:"PlayerTowerData", prop:"game.model.user.tower.PlayerTowerData"},
			{name:"TowerCommandList", prop:"game.command.tower.TowerCommandList"},
			{name:"PlayerHeroTeamResolver", prop:"game.model.user.hero.PlayerHeroTeamResolver"},
			{name:"BattlePausePopup", prop:"game.view.popup.battle.BattlePausePopup"},
			{name:"BattlePopup", prop:"game.view.popup.battle.BattlePopup"},
			{name:"DisplayObjectContainer", prop:"starling.display.DisplayObjectContainer"},
			{name:"GuiClipContainer", prop:"engine.core.clipgui.GuiClipContainer"},
			{name:"BattlePausePopupClip", prop:"game.view.popup.battle.BattlePausePopupClip"},
			{name:"ClipLabel", prop:"game.view.gui.components.ClipLabel"},
			{name:"Translate", prop:"com.progrestar.common.lang.Translate"},
			{name:"ClipButtonLabeledCentered", prop:"game.view.gui.components.ClipButtonLabeledCentered"},
			{name:"BattlePausePopupMediator", prop:"game.mediator.gui.popup.battle.BattlePausePopupMediator"},
			{name:"SettingToggleButton", prop:"game.view.popup.settings.SettingToggleButton"},
			{name:"PlayerDungeonData", prop:"game.mechanics.dungeon.model.PlayerDungeonData"},
			{name:"NextDayUpdatedManager", prop:"game.model.user.NextDayUpdatedManager"},
			{name:"BattleController", prop:"game.battle.controller.BattleController"},
			{name:"BattleSettingsModel", prop:"game.battle.controller.BattleSettingsModel"},
			{name:"BooleanProperty", prop:"engine.core.utils.property.BooleanProperty"},
			{name:"RuleStorage", prop:"game.data.storage.rule.RuleStorage"},
			{name:"BattleConfig", prop:"battle.BattleConfig"},
		];
		/** Содержит классы игры необходимые для написания и подмены методов игры */
		Game = {
			/** Функция 'e' */
			bindFunc: function (a, b) {
				if (null == b)
					return null;
				null == b.__id__ && (b.__id__ = bindId++);
				var c;
				null == a.hx__closures__ ? a.hx__closures__ = {} :
					c = a.hx__closures__[b.__id__];
				null == c && (c = b.bind(a), a.hx__closures__[b.__id__] = c);
				return c
			},
		};
		/** Подключается к объектам игры через событие создания объекта */
		function connectGame() {
			for (let obj of ObjectsList) {
				/**
				 * https: //stackoverflow.com/questions/42611719/how-to-intercept-and-modify-a-specific-property-for-any-object
				 */
				Object.defineProperty(Object.prototype, obj.prop, {
					set: function (value) {
						if (!selfGame) {
							selfGame = this;
						}
						if (!Game[obj.name]) {
							Game[obj.name] = value;
						}
						// console.log('set ' + obj.prop, this, value);
						this[obj.prop + '_'] = value;
					},
					get: function () {
						// console.log('get ' + obj.prop, this);
						return this[obj.prop + '_'];
					}
				});
			}
		}
		/**
		 * Game.BattlePresets
		 * @param {bool} a isReplay
		 * @param {bool} b autoToggleable
		 * @param {bool} c auto On Start
		 * @param {object} d config
		 * @param {bool} f showBothTeams
		 */
		/**
		 * Возвращает в функцию callback результаты боя
		 * @param {*} battleData данные боя
		 * @param {*} battleConfig тип конфигурации боя варианты:
		 * "get_invasion", "get_titanPvpManual", "get_titanPvp",
		 * "get_titanClanPvp","get_clanPvp","get_titan","get_boss",
		 * "get_tower","get_pve","get_pvpManual","get_pvp","get_core"
		 * Можно уточнить в классе game.assets.storage.BattleAssetStorage функция xYc
		 * @param {*} callback функция в которую вернуться результаты боя
		 */
		this.BattleCalc = function (battleData, battleConfig, callback) {
			if (!Game.BattlePresets) throw Error('Use connectGame');
			battlePresets = new Game.BattlePresets(!1, !1, !0, Game.DataStorage[getFn(Game.DataStorage, 22)][getF(Game.BattleConfigStorage, battleConfig)](), !1);
			battleInstantPlay = new Game.BattleInstantPlay(battleData, battlePresets);
			battleInstantPlay[getProtoFn(Game.BattleInstantPlay, 8)].add((battleInstant) => {
				battleResult = battleInstant[getF(Game.BattleInstantPlay, 'get_result')]();
				battleData = battleInstant[getF(Game.BattleInstantPlay, 'get_rawBattleInfo')]();
				callback({
					battleData,
					progress: battleResult[getF(Game.MultiBattleResult, 'get_progress')](),
					result: battleResult[getF(Game.MultiBattleResult, 'get_result')]()
				})
			});
			battleInstantPlay.start();
		}
		/**
		 * Возвращает из класса функцию с указанным именем
		 * @param {Object} classF класс
		 * @param {String} nameF имя функции
		 * @param {String} pos порядок имени и псевдонима
		 * @returns
		 */
		function getF(classF, nameF, pos) {
			pos = pos || false;
 			let prop = Object.entries(classF.prototype.__properties__)
			if (!pos) {
 			return prop.filter((e) => e[1] == nameF).pop()[0];
			} else {
				return prop.filter((e) => e[0] == nameF).pop()[1];
			}
 		}

		/**
		 * Возвращает из класса функцию с указанным именем
		 * @param {Object} classF класс
		 * @param {String} nameF имя функции
		 * @returns
		 */
		function getFnP(classF, nameF) {
			let prop = Object.entries(classF.__properties__)
			return prop.filter((e) => e[1] == nameF).pop()[0];
		}

		/**
		 * Возвращает имя функции с указаным порядковым номером из класса
		 * @param {Object} classF класс
		 * @param {Number} nF порядковый номер функции
		 * @returns
		 */
		function getFn(classF, nF) {
			// let prop = Object.getOwnPropertyNames(classF);
			let prop = Object.keys(classF);
			// let nan = Object.keys(classF).indexOf(prop[nF]);
			// if (nan != nF) {
			// 	console.log(nan, prop[nF], nF);
			// }
			return prop[nF];
		}

		/**
		 * Возвращает имя функции с указаным порядковым номером из прототипа класса
		 * @param {Object} classF класс
		 * @param {Number} nF порядковый номер функции
		 * @returns
		 */
		function getProtoFn(classF, nF) {
			// let prop = Object.getOwnPropertyNames(classF.prototype);
			let prop = Object.keys(classF.prototype);
			// let nan = Object.keys(classF.prototype).indexOf(prop[nF]);
			// if (nan != nF) {
			// 	console.log(nan, prop[nF], nF);
			// }
			return prop[nF];
		}
		/** Описание подменяемых функций */
		replaceFunction = {
			company: function() {
				let PMD_12 = getProtoFn(Game.PlayerMissionData, 12);
				let oldSkipMisson = Game.PlayerMissionData.prototype[PMD_12];
				Game.PlayerMissionData.prototype[PMD_12] = function (a, b, c) {
					if (isChecked('passBattle')) {
						this[getProtoFn(Game.PlayerMissionData, 9)] = new Game.PlayerMissionBattle(a, b, c);

						var a = new Game.BattlePresets(!1, !1, !0, Game.DataStorage[getFn(Game.DataStorage, 22)][getProtoFn(Game.BattleConfigStorage, 17)](), !1);
						a = new Game.BattleInstantPlay(c, a);
						a[getProtoFn(Game.BattleInstantPlay, 8)].add(Game.bindFunc(this, this.P$h));
						a.start()
					} else {
						oldSkipMisson.call(this, a, b, c);
					}
				}

				Game.PlayerMissionData.prototype.P$h = function (a) {
					let GM_2 = getFn(Game.GameModel, 2);
					let GM_P2 = getProtoFn(Game.GameModel, 2);
					let CM_20 = getProtoFn(Game.CommandManager, 20);
					let MCL_2 = getProtoFn(Game.MissionCommandList, 2);
					let MBR_15 = getProtoFn(Game.MultiBattleResult, 15);
					let RPCCB_15 = getProtoFn(Game.RPCCommandBase, 15);
					let PMD_32 = getProtoFn(Game.PlayerMissionData, 32);
					Game.GameModel[GM_2]()[GM_P2][CM_20][MCL_2](a[MBR_15]())[RPCCB_15](Game.bindFunc(this, this[PMD_32]))
				}
			},
			tower: function() {
				let PTD_67 = getProtoFn(Game.PlayerTowerData, 67);
				let oldSkipTower = Game.PlayerTowerData.prototype[PTD_67];
				Game.PlayerTowerData.prototype[PTD_67] = function (a) {
					if (isChecked('passBattle')) {
						var p = new Game.BattlePresets(!1, !1, !0, Game.DataStorage[getFn(Game.DataStorage, 22)][getProtoFn(Game.BattleConfigStorage,17)](), !1);
						a = new Game.BattleInstantPlay(a, p);
						a[getProtoFn(Game.BattleInstantPlay,8)].add(Game.bindFunc(this, this.P$h));
						a.start()
					} else {
						oldSkipTower.call(this, a);;
					}
				}

				Game.PlayerTowerData.prototype.P$h = function (a) {
					let GM_2 = getFn(Game.GameModel, 2);
					let GM_P2 = getProtoFn(Game.GameModel, 2);
					let CM_29 = getProtoFn(Game.CommandManager, 29);
					let TCL_5 = getProtoFn(Game.TowerCommandList, 5);
					let MBR_15 = getProtoFn(Game.MultiBattleResult, 15);
					let RPCCB_15 = getProtoFn(Game.RPCCommandBase, 15);
					let PTD_78 = getProtoFn(Game.PlayerTowerData, 78);
					Game.GameModel[GM_2]()[GM_P2][CM_29][TCL_5](a[MBR_15]())[RPCCB_15](Game.bindFunc(this, this[PTD_78]))
				}
			},
			// skipSelectHero: function() {
			// 	if (!HOST) throw Error('Use connectGame');
			// 	Game.PlayerHeroTeamResolver.prototype[getProtoFn(Game.PlayerHeroTeamResolver, 3)] = () => false;
			// },
			passBattle: function() {
				let BPP_4 = getProtoFn(Game.BattlePausePopup, 4);
				let oldPassBattle = Game.BattlePausePopup.prototype[BPP_4];
				Game.BattlePausePopup.prototype[BPP_4] = function (a) {
					if (isChecked('passBattle')) {
						Game.BattlePopup.prototype[getProtoFn(Game.BattlePausePopup, 4)].call(this, a);
						this[getProtoFn(Game.BattlePausePopup, 3)]();
						this[getProtoFn(Game.DisplayObjectContainer, 3)](this.clip[getProtoFn(Game.GuiClipContainer, 1)]());
						this.clip[getProtoFn(Game.BattlePausePopupClip, 1)][getProtoFn(Game.ClipLabel, 9)](Game.Translate.translate("UI_POPUP_BATTLE_PAUSE"));

						this.clip[getProtoFn(Game.BattlePausePopupClip, 2)][getProtoFn(Game.ClipButtonLabeledCentered, 2)](Game.Translate.translate("UI_POPUP_BATTLE_RETREAT"), (q = this[getProtoFn(Game.BattlePausePopup, 1)], Game.bindFunc(q, q[getProtoFn(Game.BattlePausePopupMediator, 15)]))); /** 14 > 15 */
						this.clip[getProtoFn(Game.BattlePausePopupClip, 5)][getProtoFn(Game.ClipButtonLabeledCentered, 2)](
							this[getProtoFn(Game.BattlePausePopup, 1)][getProtoFn(Game.BattlePausePopupMediator, 12)](),
							this[getProtoFn(Game.BattlePausePopup, 1)][getProtoFn(Game.BattlePausePopupMediator, 11)]() ?
							(q = this[getProtoFn(Game.BattlePausePopup, 1)], Game.bindFunc(q, q[getProtoFn(Game.BattlePausePopupMediator, 16)])) :
							(q = this[getProtoFn(Game.BattlePausePopup, 1)], Game.bindFunc(q, q[getProtoFn(Game.BattlePausePopupMediator, 16)])) /** 15 > 16 */
						);

						this.clip[getProtoFn(Game.BattlePausePopupClip, 5)][getProtoFn(Game.ClipButtonLabeledCentered, 0)][getProtoFn(Game.ClipLabel, 23)]();
						this.clip[getProtoFn(Game.BattlePausePopupClip, 3)][getProtoFn(Game.SettingToggleButton, 3)](this[getProtoFn(Game.BattlePausePopup, 1)][getProtoFn(Game.BattlePausePopupMediator, 8)]());
						this.clip[getProtoFn(Game.BattlePausePopupClip, 4)][getProtoFn(Game.SettingToggleButton, 3)](this[getProtoFn(Game.BattlePausePopup, 1)][getProtoFn(Game.BattlePausePopupMediator, 9)]());
					} else {
						oldPassBattle.call(this, a);
					}
				}

				let retreatButtonLabel = getF(Game.BattlePausePopupMediator, "get_retreatButtonLabel");
				let oldFunc = Game.BattlePausePopupMediator.prototype[retreatButtonLabel];
				Game.BattlePausePopupMediator.prototype[retreatButtonLabel] = function () {
					if (isChecked('passBattle')) {
						return 'ПРОПУСК';
					} else {
						return oldFunc.call(this);
					}
				}
			},
			endlessCards: function() {
				let PDD_15 = getProtoFn(Game.PlayerDungeonData, 15);
				let oldEndlessCards = Game.PlayerDungeonData.prototype[PDD_15];
				Game.PlayerDungeonData.prototype[PDD_15] = function () {
					if (isChecked('endlessCards')) {
						return true;
					} else {
						return oldEndlessCards.call(this);
					}
				}
			},
			speedBattle: function () {
				const get_timeScale = getF(Game.BattleController, "get_timeScale");
				const oldSpeedBattle = Game.BattleController.prototype[get_timeScale];
				Game.BattleController.prototype[get_timeScale] = function () {
					const speedBattle = Number.parseFloat(getInput('speedBattle'));
					if (speedBattle) {
						const BC_11 = getProtoFn(Game.BattleController, 11);
						const BSM_11 = getProtoFn(Game.BattleSettingsModel, 11);
						const BP_get_value = getF(Game.BooleanProperty, "get_value");
						if (this[BC_11][BSM_11][BP_get_value]()) {
							return 0;
						}
						const BSM_2 = getProtoFn(Game.BattleSettingsModel, 2);
						const BC_44 = getProtoFn(Game.BattleController, 44);
						const BSM_1 = getProtoFn(Game.BattleSettingsModel, 1);
						const BC_13 = getProtoFn(Game.BattleController, 13);
						const BC_3 = getFn(Game.BattleController, 3);
						if (this[BC_11][BSM_2][BP_get_value]()) {
							var a = speedBattle * this[BC_44]();
						} else {
							a = this[BC_11][BSM_1][BP_get_value]();
							const multiple = a == 1 ? speedBattle : this[BC_13][a];
							a = multiple * Game.BattleController[BC_3][BP_get_value]() * this[BC_44]();
						}
						const BSM_22 = getProtoFn(Game.BattleSettingsModel, 22);
						a > this[BC_11][BSM_22][BP_get_value]() && (a = this[BC_11][BSM_22][BP_get_value]());
						const DS_21 = getFn(Game.DataStorage, 21);
						const get_battleSpeedMultiplier = getF(Game.RuleStorage, "get_battleSpeedMultiplier", true);
						// const RS_167 = getProtoFn(Game.RuleStorage, 167); // get_battleSpeedMultiplier
						var b = Game.DataStorage[DS_21][get_battleSpeedMultiplier]();
						const R_1 = getFn(selfGame.Reflect, 1);
						const BC_1 = getFn(Game.BattleController, 1);
						const get_config = getF(Game.BattlePresets, "get_config");
						// const BC_0 = getProtoFn(Game.BattleConfig, 0); // .ident
						null != b && (a = selfGame.Reflect[R_1](b, this[BC_1][get_config]().ident) ? a * selfGame.Reflect[R_1](b, this[BC_1][get_config]().ident) : a * selfGame.Reflect[R_1](b, "default"));
						return a
					} else {
						return oldSpeedBattle.call(this);
					}
				}
			}
		}
		/** Запускает замену записанных функций */
		this.activateHacks = function () {
			if (!selfGame) throw Error('Use connectGame');
			for (let func in replaceFunction) {
				replaceFunction[func]();
			}
		}
		/** Возвращает объект игры */
		this.getSelfGame = function () {
			return selfGame;
		}
		/** Обновляет данные игры */
		this.refreshGame = function () {
			(new Game.NextDayUpdatedManager)[getProtoFn(Game.NextDayUpdatedManager, 5)]();
		}

		/**
		 * Сменить экран игры на windowName
		 * Возможные варианты:
		 * MISSION, ARENA, GRAND, CHEST, SKILLS, SOCIAL_GIFT, CLAN, ENCHANT, TOWER, RATING, CHALLENGE, BOSS, CHAT, CLAN_DUNGEON, CLAN_CHEST, TITAN_GIFT, CLAN_RAID, ASGARD, HERO_ASCENSION, ROLE_ASCENSION, ASCENSION_CHEST, TITAN_MISSION, TITAN_ARENA, TITAN_ARTIFACT, TITAN_ARTIFACT_CHEST, TITAN_VALLEY, TITAN_SPIRITS, TITAN_ARTIFACT_MERCHANT, TITAN_ARENA_HALL_OF_FAME, CLAN_PVP, CLAN_PVP_MERCHANT, CLAN_GLOBAL_PVP, CLAN_GLOBAL_PVP_TITAN, ARTIFACT, ZEPPELIN, ARTIFACT_CHEST, ARTIFACT_MERCHANT, EXPEDITIONS, SUBSCRIPTION, NY2018_GIFTS, NY2018_TREE, NY2018_WELCOME, ADVENTURE, ADVENTURESOLO, SANCTUARY, PET_MERCHANT, PET_LIST, PET_SUMMON, BOSS_RATING_EVENT, BRAWL
		 */
		this.goNavigtor = function (windowName) {
			let mechanicStorage = selfGame["game.data.storage.mechanic.MechanicStorage"];
			let window = mechanicStorage[windowName];
			let event = selfGame["game.mediator.gui.popup.PopupStashEventParams"]('');
			let Game = selfGame['Game'];
			let navigator = getF(Game, "get_navigator")
			let navigate = getProtoFn(selfGame["game.screen.navigator.GameNavigator"], 15)
			let instance = getFnP(Game, 'get_instance');
			Game[instance]()[navigator]()[navigate](window, event);
		}
		/** Переместиться в святилище cheats.goSanctuary() */
		this.goSanctuary = () => {
			this.goNavigtor("SANCTUARY");
		}
		/** Перейти к Войне Гильдий */
		this.goClanWar = function() {
			let instance = getFnP(selfGame["game.model.GameModel"], 'get_instance')
			let player = selfGame["game.model.GameModel"][instance]().A;
			let clanWarSelect = selfGame["game.mechanics.cross_clan_war.popup.selectMode.CrossClanWarSelectModeMediator"];
			new clanWarSelect(player).open();
		}

		connectGame();
	}
	/** Автосбор подарков */
	function getAutoGifts() {
		let valName = 'giftSendIds_' + userInfo.id;
		if (!localStorage['clearGift' + userInfo.id]) {
			localStorage[valName] = '';
			localStorage['clearGift' + userInfo.id] = '+';
		}

		if (!localStorage[valName]) {
			localStorage[valName] = '';
    }
		/** Отправка запроса для получения кодов подарков */
		fetch('https://zingery.ru/heroes/getGifts.php', {
				method: 'POST',
				body: JSON.stringify({scriptInfo, userInfo})
		}).then(
			response => response.json()
		).then(
			data => {
				let freebieCheckCalls = {
					calls: []
				}
				data.forEach( (giftId, n) => {
					if (localStorage[valName].includes(giftId)) return;
					//localStorage[valName] += ';' + giftId;
					freebieCheckCalls.calls.push({
						name: "freebieCheck",
						args: {
							giftId
						},
						ident: giftId
					});
				});

				if (!freebieCheckCalls.calls.length) {
					return;
				}

				send(JSON.stringify(freebieCheckCalls), e => {
					let countGetGifts = 0;
					const gifts = [];
					for(check of e.results) {
                        gifts.push(check.ident);
						if (check.result.response != null) {
							countGetGifts++;
						}
					}
					const saveGifts = localStorage[valName].split(';');
					localStorage[valName] = [...saveGifts, ...gifts].slice(-50).join(';');
					setProgress('Подарки: ' + countGetGifts, true);
					console.log('Подарки: ' + countGetGifts);
				});
			}
		)
	}
	/** Набить килов в горниле душк */
	function bossRatingEvent() {
		let heroGetAllCall = '{"calls":[{"name":"heroGetAll","args":{},"ident":"teamGetAll"},{"name":"offerGetAll","args":{},"ident":"offerGetAll"}]}';
		send(heroGetAllCall, function (data) {
			let bossEventInfo = data.results[1].result.response.find(e => e.id == 633);
			if (!bossEventInfo) {
				setProgress('Эвент завершен', true);
				return;
			}
			let heroGetAllList = data.results[0].result.response;
			let usedHeroes = bossEventInfo.progress.usedHeroes;
			let heroList = [];

			for (let heroId in heroGetAllList) {
				let hero = heroGetAllList[heroId];
				if (usedHeroes.includes(hero.id)) {
					continue;
				}
				heroList.push(hero.id);
				if (heroList.length > 6) {
					break;
				}
			}

			if (!heroList.length) {
				setProgress('Нет героев', true);
				return;
			}

			let calls = heroList
				.map(e => '{"name":"bossRatingEvent_startBattle","args":{"heroes":[' + e + ']},"ident":"body_' + e + '"}')
				.join(',');

			send('{"calls":[' + calls + ']}', e => {
				console.log(e);
				setProgress('Использовано ' + e?.results?.length + ' героев', true);
				rewardBossRatingEvent();
			});
		});
	}
	/** Сбор награды из Горнила Душ */
	function rewardBossRatingEvent() {
		let rewardBossRatingCall = '{"calls":[{"name":"offerGetAll","args":{},"ident":"offerGetAll"}]}';
		send(rewardBossRatingCall, function (data) {
			let bossEventInfo = data.results[0].result.response.find(e => e.id == 633);
			if (!bossEventInfo) {
				setProgress('Эвент завершен', true);
				return;
			}

			let farmedChests = bossEventInfo.progress.farmedChests;
			let score = bossEventInfo.progress.score;
			setProgress('Количество убитых врагов: ' + score);
			let revard = bossEventInfo.reward;

			let getRewardCall = {
				calls: []
			}

			let count = 0;
			for (let i = 1; i < 10; i++) {
				if (farmedChests.includes(i)) {
					continue;
				}
				if (score < revard[i].score) {
					break;
				}
				getRewardCall.calls.push({
					name: "bossRatingEvent_getReward",
					args: {
						rewardId: i
					},
					ident: "body_" + i
				});
				count++;
			}
			if (!count) {
				setProgress('Нечего собирать', true);
				return;
			}

			send(JSON.stringify(getRewardCall), e => {
				console.log(e);
				setProgress('Собрано ' + e?.results?.length + ' наград', true);
			});
		});
	}
	/** Собрать пасхалки и награды событий */
	function offerFarmAllReward() {
		let offerGetAllCall = '{"calls":[{"name":"offerGetAll","args":{},"ident":"offerGetAll"}]}';
		send(offerGetAllCall, function (data) {
			let offerGetAll = data.results[0].result.response.filter(e => e.type == "reward" && !e?.freeRewardObtained && e.reward);
			if (!offerGetAll.length) {
				setProgress('Нечего собирать', true);
				return;
			}

			let rewardListCall = {
				calls: []
			};
			for (let n in offerGetAll) {
				let reward = offerGetAll[n];
				rewardListCall.calls.push({
					name: "offerFarmReward",
					args: {
						offerId: reward.id
					},
					ident: "offerFarmReward_" + reward.id
				});
			}

			send(JSON.stringify(rewardListCall), e => {
				console.log(e);
				setProgress('Собрано ' + e?.results?.length + ' наград', true);
			});
		});
	}
	/** Собрать запределье */
	function getOutland() {
		return new Promise(function (resolve, reject) {
			send('{"calls":[{"name":"bossGetAll","args":{},"ident":"bossGetAll"}]}', e => {
				let bosses = e.results[0].result.response;

				let bossRaidOpenChestCall = {
					calls: []
				};

				for (let boss of bosses) {
					if (boss.mayRaid) {
						bossRaidOpenChestCall.calls.push({
							name: "bossRaid",
							args: {
								bossId: boss.id
							},
							ident: "bossRaid_" + boss.id
						});
						bossRaidOpenChestCall.calls.push({
							name: "bossOpenChest",
							args: {
								bossId: boss.id,
								amount: 1,
								starmoney: 0
							},
							ident: "bossOpenChest_" + boss.id
						});
					} else if (boss.chestId == 1) {
						bossRaidOpenChestCall.calls.push({
							name: "bossOpenChest",
							args: {
								bossId: boss.id,
								amount: 1,
								starmoney: 0
							},
							ident: "bossOpenChest_" + boss.id
						});
					}
				}

				if (!bossRaidOpenChestCall.calls.length) {
					setProgress('Запределье уже было собрано', true);
					resolve();
					return;
				}

				send(JSON.stringify(bossRaidOpenChestCall), e => {
					setProgress('Запределье собрано', true);
					resolve();
				});
			});
		});
	}
	/** Собрать все награды */
	function questAllFarm() {
		return new Promise(function (resolve, reject) {
			let questGetAllCall = {
				calls: [{
					name: "questGetAll",
					args: {},
					ident: "body"
				}]
			}
			send(JSON.stringify(questGetAllCall), function (data) {
				let questGetAll = data.results[0].result.response;
				const questAllFarmCall = {
					calls: []
				}
				let number = 0;
				for (let quest of questGetAll) {
					if (quest.id < 1e6 && quest.state == 2) {
						questAllFarmCall.calls.push({
							name: "questFarm",
							args: {
								questId: quest.id
							},
							ident: `group_${number}_body`
						});
						number++;
					}
				}

				if (!questAllFarmCall.calls.length) {
					setProgress('Собрано наград: ' + number, true);
					resolve();
					return;
				}

				send(JSON.stringify(questAllFarmCall), function (res) {
					console.log(res);
					setProgress('Собрано наград: ' + number, true);
					resolve();
				});
			});
		})
	}

	/**
	 * Атака прислужников Асгарда
	 * @returns
	 */
	function testRaidNodes() {
		return new Promise((resolve, reject) => {
			const tower = new executeRaidNodes(resolve, reject);
			tower.start();
		});
	}

	/** Атака прислужников Асгарда */
	function executeRaidNodes(resolve, reject) {
		let raidData = {
			teams: [],
			favor: {},
			nodes: [],
			attempts: 0,
			countExecuteBattles: 0,
			cancelBattle: 0,
		}

		callsExecuteRaidNodes = {
			calls: [{
				name: "clanRaid_getInfo",
				args: {},
				ident: "clanRaid_getInfo"
			}, {
				name: "teamGetAll",
				args: {},
				ident: "teamGetAll"
			}, {
				name: "teamGetFavor",
				args: {},
				ident: "teamGetFavor"
			}]
		}

		this.start = function () {
			send(JSON.stringify(callsExecuteRaidNodes), startRaidNodes);
		}

		function startRaidNodes(data) {
			res = data.results;
			clanRaidInfo = res[0].result.response;
			teamGetAll = res[1].result.response;
			teamGetFavor = res[2].result.response;

			let index = 0;
			for (let team of teamGetAll.clanRaid_nodes) {
				raidData.teams.push({
					data: {},
					heroes: team.filter(id => id < 6000),
					pet: team.filter(id => id >= 6000).pop(),
					battleIndex: index++
				});
			}
			raidData.favor = teamGetFavor.clanRaid_nodes;

			raidData.nodes = clanRaidInfo.nodes;
			raidData.attempts = clanRaidInfo.attempts;
			isCancalBattle = false;

			checkNodes();
		}

		function getAttackNode() {
			for (let nodeId in raidData.nodes) {
				let node = raidData.nodes[nodeId];
				let points = 0
				for (team of node.teams) {
					points += team.points;
				}
				let now = Date.now() / 1000;
				if (!points && now > node.timestamps.start && now < node.timestamps.end) {
					let countTeam = node.teams.length;
					delete raidData.nodes[nodeId];
					return {
						nodeId,
						countTeam
					};
				}
			}
			return null;
		}

		function checkNodes() {
			setProgress('Осталось попыток: ' + raidData.attempts);
			let nodeInfo = getAttackNode();
			if (nodeInfo && raidData.attempts) {
				startNodeBattles(nodeInfo);
				return;
			}

			endRaidNodes('EndRaidNodes');
		}

		function startNodeBattles(nodeInfo) {
			let {nodeId, countTeam} = nodeInfo;
			let teams = raidData.teams.slice(0, countTeam);
			let heroes = raidData.teams.map(e => e.heroes).flat();
			let favor = {...raidData.favor};
			for (let heroId in favor) {
				if (!heroes.includes(+heroId)) {
					delete favor[heroId];
				}
			}

			let calls = [{
				name: "clanRaid_startNodeBattles",
				args: {
					nodeId,
					teams,
					favor
				},
				ident: "body"
			}];

			send(JSON.stringify({calls}), resultNodeBattles);
		}

		function resultNodeBattles(e) {
			if (e['error']) {
				endRaidNodes('nodeBattlesError', e['error']);
				return;
			}

			console.log(e);
			let battles = e.results[0].result.response.battles;
			let promises = [];
			let battleIndex = 0;
			for (let battle of battles) {
				battle.battleIndex = battleIndex++;
				promises.push(calcBattleResult(battle));
			}

			Promise.all(promises)
				.then(results => {
					const endResults = {};
					let isAllWin = true;
					for (let r of results) {
						isAllWin &&= r.result.win;
					}
					if (!isAllWin) {
						cancelEndNodeBattle(results[0]);
						return;
					}
					raidData.countExecuteBattles = results.length;
					let timeout = 500;
					for (let r of results) {
						setTimeout(endNodeBattle, timeout, r);
						timeout += 500;
					}
				});
		}
		/** Возвращает промис расчета боя */
		function calcBattleResult(battleData) {
			return new Promise(function (resolve, reject) {
				BattleCalc(battleData, "get_clanPvp", resolve);
			});
		}
		/** Отменяет бой */
		function cancelEndNodeBattle(r) {
			const fixBattle = function (heroes) {
				for (const ids in heroes) {
					hero = heroes[ids];
					hero.energy = random(1, 999);
					if (hero.hp > 0) {
						hero.hp = random(1, hero.hp);
					}
				}
			}
			fixBattle(r.progress[0].attackers.heroes);
			fixBattle(r.progress[0].defenders.heroes);
			endNodeBattle(r);
		}
		/** Завершает бой */
		function endNodeBattle(r) {
			let nodeId = r.battleData.result.nodeId;
			let battleIndex = r.battleData.battleIndex;
			let calls = [{
				name: "clanRaid_endNodeBattle",
				args: {
					nodeId,
					battleIndex,
					result: r.result,
					progress: r.progress
				},
				ident: "body"
			}]

			SendRequest(JSON.stringify({calls}), battleResult);
		}
		/** Обработка результатов боя */
		function battleResult(e) {
			if (e['error']) {
				endRaidNodes('missionEndError', e['error']);
				return;
			}
			r = e.results[0].result.response;
			if (r['error']) {
				if (r.reason == "invalidBattle") {
					raidData.cancelBattle++;
					checkNodes();
				} else {
					endRaidNodes('missionEndError', e['error']);
				}
				return;
			}

			if (!(--raidData.countExecuteBattles)) {
				raidData.attempts--;
				checkNodes();
			}
		}
		/** Завершение задачи */
		function endRaidNodes(reason, info) {
			isCancalBattle = true;
			let textCancel = raidData.cancelBattle ? ' Битв отменено: ' + raidData.cancelBattle : '';
			setProgress('Рейд прислужников завершен!' + textCancel, true);
			console.log(reason, info);
			resolve();
		}
	}
	/**
	 * Автоповтор миссии
	 * isStopSendMission = false;
	 * isSendsMission = true;
	 **/
	this.sendsMission = async function (param) {
		if (isStopSendMission) {
			isSendsMission = false;
			console.log('Остановлено');
			setProgress('');
			await popup.confirm('Остановлено<br>Повторений: ' + param.count, [{
				msg: 'Ok',
				result: true
			}, ])
			return;
		}

		let missionStartCall = {
			"calls": [{
				"name": "missionStart",
				"args": lastMissionStart,
				"ident": "body"
			}]
		}
		// Запрос на выполнение мисии
		SendRequest(JSON.stringify(missionStartCall), async e => {
			if (e['error']) {
				isSendsMission = false;
				console.log(e['error']);
				setProgress('');
				let msg = e['error'].name + ' ' + e['error'].description + '<br>Повторений: ' + param.count;
				await popup.confirm(msg, [
					{msg: 'Ok', result: true},
				])
				return;
			}
			// Расчет данных мисии
			BattleCalc(e.results[0].result.response, 'get_tower', async r => {

				let missionEndCall = {
					"calls": [{
						"name": "missionEnd",
						"args": {
							"id": param.id,
							"result": r.result,
							"progress": r.progress
						},
						"ident": "body"
					}]
				}
				// Запрос на завершение миссии
				SendRequest(JSON.stringify(missionEndCall), async (e) => {
					if (e['error']) {
						isSendsMission = false;
						console.log(e['error']);
						setProgress('');
						let msg = e['error'].name + ' ' + e['error'].description + '<br>Повторений: ' + param.count;
						await popup.confirm(msg, [
							{msg: 'Ok', result: true},
						])
						return;
					}
					r = e.results[0].result.response;
					if (r['error']) {
						isSendsMission = false;
						console.log(r['error']);
						setProgress('');
						await popup.confirm('Повторений: ' + param.count + ' 3 ' + r['error'], [
							{msg: 'Ok', result: true},
						])
						return;
					}

					param.count++;
					setProgress('Миссий пройдено: ' + param.count + ' (остановить)', false, () => {
						isStopSendMission = true;
					});
					setTimeout(sendsMission, 1, param);
				});
			})
		});
	}
	/** Рекурсивное открытие матрешек */
	function openRussianDoll(id, count, sum) {
		sum = sum || 0;
		sum += count;
		send('{"calls":[{"name":"consumableUseLootBox","args":{"libId":'+id+',"amount":'+count+'},"ident":"body"}]}', e => {
			setProgress('Открыто ' + count, true);
			let result = e.results[0].result.response;
			let newCount = 0;
			for(let n of result) {
				if (n?.consumable && n.consumable[id]) {
					newCount += n.consumable[id]
				}
			}
			if (newCount) {
				openRussianDoll(id, newCount, sum);
			} else {
				popup.confirm('Всего открыто ' + sum);
			}
		})
	}

	function testBossBattle() {
		return new Promise((resolve, reject) => {
			const bossBattle = new executeBossBattle(resolve, reject);
			bossBattle.start(lastBossBattle, lastBossBattleInfo);
		});
	}

	/** Повтор атаки босса Асгарда */
	function executeBossBattle(resolve, reject) {
		let lastBossBattleArgs = {};
		let reachDamage = 0;
		let countBattle = 0;
		let countMaxBattle = 10;
		let lastDamage = 0;

		this.start = function (battleArg, battleInfo) {
			lastBossBattleArgs = battleArg;
			preCalcBattle(battleInfo);
		}

		function getBattleInfo(battle) {
			return new Promise(function (resolve) {
				battle.seed = Math.floor(Date.now() / 1000) + random(0, 1e3);
				BattleCalc(battle, getBattleType(battle.type), e => {
					let extra = e.progress[0].defenders.heroes[1].extra;
					resolve(extra.damageTaken + extra.damageTakenNextLevel);
				});
			});
		}

		function preCalcBattle(battle) {
			let actions = [];
			const countTestBattle = getInput('countTestBattle');
			for (let i = 0; i < countTestBattle; i++) {
				actions.push(getBattleInfo(battle, true));
			}
			Promise.all(actions)
				.then(resultPreCalcBattle);
		}

		function fixDamage(damage) {
			for (let i = 1e6; i > 1; i /= 10) {
				if (damage > i) {
					let n = i / 10;
					damage = Math.ceil(damage / n) * n;
					break;
				}
			}
			return damage;
		}

		async function resultPreCalcBattle(damages) {
			let maxDamage = 0;
			let minDamage = 1e10;
			let avgDamage = 0;
			for (let damage of damages) {
				avgDamage += damage
				if (damage > maxDamage) {
					maxDamage = damage;
				}
				if (damage < minDamage) {
					minDamage = damage;
				}
			}
			avgDamage /= damages.length;
			console.log(damages.map(e => e.toLocaleString()).join('\n'), avgDamage, maxDamage);

			reachDamage = fixDamage(avgDamage);
			const result = await popup.confirm(
				'Статистика урона:' +
				'<br>Минимальный: ' + minDamage.toLocaleString() +
				'<br>Максимальный: ' + maxDamage.toLocaleString() +
				'<br>Средний: ' + avgDamage.toLocaleString() +
				'<br>Поиск урона больше чем ' + reachDamage.toLocaleString(), [
				{msg: 'Отмена', result: 0},
				{msg: 'Погнали', isInput: true, default: reachDamage},
			])
			if (result) {
				reachDamage = result;
				isCancalBossBattle = false;
				startBossBattle();
				return;
			}
			endBossBattle('Отмена');
		}

		function startBossBattle() {
			countBattle++;
			if (countBattle > countMaxBattle) {
				endBossBattle('>100')
				return;
			}
			let calls = [{
				name: "clanRaid_startBossBattle",
				args: lastBossBattleArgs,
				ident: "body"
			}];
			send(JSON.stringify({calls}), calcResultBattle);
		}

		function calcResultBattle(e) {
			BattleCalc(e.results[0].result.response.battle, "get_clanPvp", resultBattle);
		}

		async function resultBattle(e) {
			let extra = e.progress[0].defenders.heroes[1].extra
			resultDamage = extra.damageTaken + extra.damageTakenNextLevel
			console.log(resultDamage);
			scriptMenu.setStatus(countBattle + ') ' + resultDamage.toLocaleString());
			lastDamage = resultDamage;
			if (resultDamage > reachDamage && await popup.confirm(countBattle + ') Урон ' + resultDamage.toLocaleString(), [
				{msg: 'Ок', result: true},
				{msg: 'Не пойдет', result: false},
			]))  {
				endBattle(e, false);
				return;
			}
			cancelEndBattle(e);
		}

		function cancelEndBattle (r) {
			const fixBattle = function (heroes) {
				for (const ids in heroes) {
					hero = heroes[ids];
					hero.energy = random(1, 999);
					if (hero.hp > 0) {
						hero.hp = random(1, hero.hp);
					}
				}
			}
			fixBattle(r.progress[0].attackers.heroes);
			fixBattle(r.progress[0].defenders.heroes);
			endBattle(r, true);
		}

		function endBattle(battleResult, isCancal) {
			let calls = [{
				name: "clanRaid_endBossBattle",
				args: {
					result: battleResult.result,
					progress: battleResult.progress
				},
				ident: "body"
			}];

			send(JSON.stringify({calls}), e => {
				console.log(e);
				if (isCancal) {
					startBossBattle();
					return;
				}
				scriptMenu.setStatus('Босс пробит нанесен урон: ' + lastDamage);
				setTimeout(() => {
					scriptMenu.setStatus('');
				}, 5000);
				endBossBattle('Узпех!');
			});
		}

		/** Завершение задачи */
		function endBossBattle(reason, info) {
			isCancalBossBattle = true;
			console.log(reason, info);
			resolve();
		}
	}

	function testAutoBattle() {
		return new Promise((resolve, reject) => {
			const bossBattle = new executeAutoBattle(resolve, reject);
			bossBattle.start(lastBattleArg, lastBattleInfo);
		});
	}

	/** Автоповтор атаки */
	function executeAutoBattle(resolve, reject) {
		let battleArg = {};
		let countBattle = 0;
		let countMaxBattle = 10;

		this.start = function (battleArgs, battleInfo) {
			battleArg = battleArgs;
			preCalcBattle(battleInfo);
		}
		/** Возвращает промис для прерасчета боя */
		function getBattleInfo(battle) {
			return new Promise(function (resolve) {
				battle.seed = Math.floor(Date.now() / 1000) + random(0, 1e3);
				BattleCalc(battle, getBattleType(battle.type), e => resolve(e.result.win));
			});
		}
		/** Прерасчет боя */
		function preCalcBattle(battle) {
			const countTestBattle = getInput('countTestBattle');
			for (let i = 0; i < countTestBattle; i++) {
				actions.push(getBattleInfo(battle));
			}
			Promise.all(actions)
				.then(resultPreCalcBattle);
		}
		/** Обработка результатов прерасчета боя */
		function resultPreCalcBattle(results) {
			let countWin = results.reduce((w, s) => w + s);
			if (countWin > 0) {
				isCancalBattle = false;
				startBattle();
				return;
			}
			setProgress('Не судьба, шансы 0', true);
			endAutoBattle('Не в этот раз');
		}
		/** Начало боя */
		function startBattle() {
			countBattle++;
			setProgress(countBattle  + '/' + countMaxBattle);
			if (countBattle > countMaxBattle) {
				setProgress('Превышен лимит попыток: ' + countMaxBattle, true);
				endAutoBattle('Превышен лимит попыток: ' + countMaxBattle)
				return;
			}
			let calls = [{
				name: nameFuncStartBattle,
				args: battleArg,
				ident: "body"
			}];
			send(JSON.stringify({
				calls
			}), calcResultBattle);
		}
		/** Расчет боя */
		function calcResultBattle(e) {
			let battle = e.results[0].result.response.battle
			BattleCalc(battle, getBattleType(battle.type), resultBattle);
		}
		/** Обработка результатов боя */
		function resultBattle(e) {
			let isWin = e.result.win;
			console.log(isWin);
			if (isWin) {
				endBattle(e, false);
				return;
			}
			cancelEndBattle(e);
		}
		/** Отмена боя */
		function cancelEndBattle(r) {
			const fixBattle = function (heroes) {
				for (const ids in heroes) {
					hero = heroes[ids];
					hero.energy = random(1, 999);
					if (hero.hp > 0) {
						hero.hp = random(1, hero.hp);
					}
				}
			}
			fixBattle(r.progress[0].attackers.heroes);
			fixBattle(r.progress[0].defenders.heroes);
			endBattle(r, true);
		}
		/** Завершение боя */
		function endBattle(battleResult, isCancal) {
			let calls = [{
				name: nameFuncEndBattle,
				args: {
					result: battleResult.result,
					progress: battleResult.progress
				},
				ident: "body"
			}];

			send(JSON.stringify({
				calls
			}), e => {
				console.log(e);
				if (isCancal) {
					startBattle();
					return;
				}
				scriptMenu.setStatus('Победа!');
				setTimeout(() => {
					scriptMenu.setStatus('');
				}, 5000)
				endAutoBattle('Успех!')
			});
		}
		/** Завершение задачи */
		function endAutoBattle(reason, info) {
			isCancalBattle = true;
			console.log(reason, info);
			resolve();
		}
	}
	/** Собрать всю почту, кроме писем с энергией и зарядами портала */
	function mailGetAll() {
		let getMailInfo = '{"calls":[{"name":"mailGetAll","args":{},"ident":"body"}]}';
		let getLetters = '{"calls":[{"name":"mailFarm","args":{"letterIds":[#letterIds#]},"ident":"body"}]}';

		send(getMailInfo, function(res) {
			let dataMail = getJson(res);
			if (!dataMail) return;
			let letters = dataMail?.results[0]?.result?.response?.letters;
			lettersIds = [];
			for (let l in letters) {
				letter = letters[l];
				const reward = letter.reward;
				const isFarmLetter = !((reward?.refillable ? reward.refillable[45] : false) || (reward?.stamina ? reward.stamina : false));
				if (isFarmLetter) {
					lettersIds.push(~~letter.id);
				}
			}
			if (lettersIds.length) {
				sendGetLetters = getLetters.replace('#letterIds#', lettersIds.join())
				send(sendGetLetters, function(res) {
					lettersIds = res?.results[0]?.result?.response;
					if (lettersIds) {
						countLetters = Object.keys(lettersIds).length;
						setProgress('Получено ' + countLetters + ' писем', true);
						console.log('mailGetAll', lettersIds);
					}
				});
			} else {
				setProgress('Нечего собирать', true);
			}
		});
	}
})();

/**
 * TODO:
 * Добивание на арене титанов
 */