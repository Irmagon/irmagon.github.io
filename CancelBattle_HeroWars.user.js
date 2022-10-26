// ==UserScript==
// @name			CancelBattle_HeroWars_dev
// @name:en			CancelBattle_HeroWars_dev
// @namespace		CancelBattle_HeroWars_dev
// @version			2.017
// @description		Отмена боев в игре Хроники Хаоса
// @description:en	Cancellation of battles in the game Hero Wars
// @author			ZingerY
// @homepage		http://ilovemycomp.narod.ru/CancelBattle_HeroWars_dev.user.js
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
	/** Стартуем скрипт */
	console.log('Start ' + GM_info.script.name + ', v' + GM_info.script.version);
	/** Если находимся на странице подарков, то собираем и отправляем их на сервер */
	if (['www.solfors.com', 't.me'].includes(location.host)) {
		setTimeout(sendCodes, 2000);
		return;
	}
	/** Загружены ли данные игры */
	let isLoadGame = false;
	/** Заголовки последнего запроса */
	let lastHeaders = {};
	/** Данные о прошедшей атаке на босса */
	let lastBossBattle = {}
	/** Идет бой с боссом */
	let isStartBossBattle = false;
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
			title: 'Пропуск боев в запределье и арене титанов',
			default: false
		},
		skipTower: {
			label: 'Пропуск в башне',
			cbox: null,
			title: 'Автопропуск боев в башне',
			default: false
		},
		skipMisson: {
			label: 'Пропуск в компании',
			cbox: null,
			title: 'Автопропуск боев в кампании',
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
		}
	};
	/** Инпуты */
	let inputs = {
		countTitanit: {
			input: null,
			title: 'Сколько фармим титанита',
			default: 300,
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
		localStorage['giftSendIds'] = localStorage['giftSendIds'] ?? '';
		document.querySelectorAll('a[target="_blank"]').forEach(e => {
			let giftId = (code = /gift_id=(.+)/.exec(e?.href)) ? code[1] : 0;
			if (!giftId || localStorage['giftSendIds'].includes(giftId)) return;
			localStorage['giftSendIds'] += ';' + giftId;
			codes.push(giftId);
			count++;
		});

		if (codes.length) {
			fetch('https://zingery.ru/heroes/gifts.php',{
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

		if (!count) {
			setTimeout(sendCodes, 2000);
		}
	}
	/** Подключение к коду игры */
	const cheats = new hackGame();
	this.BattleCalc = cheats.BattleCalc;
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
					getAutoGifts();
				}
				cheats.activateHacks();
				addControlButtons();
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
		return original.send.call(this, sourceData);
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
				if (call.name == 'adventure_endBattle' ||
					call.name == 'adventureSolo_endBattle' ||
					call.name == 'brawl_endBattle' ||
					call.name == 'towerEndBattle' ||
					call.name == 'clanRaid_endNodeBattle') {
					if (!call.args.result.win) {
						if (await showMsg('Вы потерпели поражение!', 'Хорошо', 'Отменить бой')) {
							fixBattle(call.args.progress[0].attackers.heroes);
							fixBattle(call.args.progress[0].defenders.heroes);
							changeRequest = true;
						}
					}
				}
				/** Отмена боя в Асгарде */
				if (call.name == 'clanRaid_endBossBattle') {
					bossDamage = call.args.progress[0].defenders.heroes[1].extra;
					sumDamage = bossDamage.damageTaken + bossDamage.damageTakenNextLevel;
					let resultPopup = await showMsg(
						'Вы нанесли ' + sumDamage.toLocaleString() + ' урона.',
						'Хорошо',
						'Отменить',
						'Повторить')
					if (resultPopup) {
						fixBattle(call.args.progress[0].attackers.heroes);
						fixBattle(call.args.progress[0].defenders.heroes);
						changeRequest = true;
						if (resultPopup > 1) {
							this.onReadySuccess = bossBattle;
							isStartBossBattle = true;
							// setTimeout(bossBattle, 1000);
						}
					} else {
						isStartBossBattle = false;
					}
				}
				/** Сохраняем пачку для атаки босса Асгарда */
				if (call.name == 'clanRaid_startBossBattle') {
					lastBossBattle = call.args;
				}
				/** Отключить трату карт предсказаний */
				if (call.name == 'dungeonEndBattle') {
					if (isChecked('endlessCards') && call.args.isRaid) {
						delete call.args.isRaid;
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
	function checkChangeResponse(response) {
		try {
			isChange = false;
			let nowTime = Math.round(Date.now() / 1000);
			callsIdent = requestHistory[this.uniqid].calls;
			respond = JSON.parse(response);
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
				}
				/** Начало боя для прерасчета */
				if ((call.ident == callsIdent['clanWarAttack'] ||
					call.ident == callsIdent['crossClanWar_startBattle'] ||
					call.ident == callsIdent['adventure_turnStartBattle']) && 
					isChecked('preCalcBattle')) {
					setProgress('Идет прерасчет боя');
					let battle = call.result.response.battle;
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
					let countBattleCalc = 10;
					for (let i = 0; i < countBattleCalc; i++) {
						actions.push(getBattleInfo(battle, true));
					}
					Promise.all(actions)
						.then(e => {
							let firstBattle = e.shift();
							let countWin = e.reduce((w, s) => w + s);
							setProgress((firstBattle ? 'Победа' : 'Поражение') + ' ' + countWin + '/' + e.length + ' X', false, hideProgress)
						});
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
				return "get_titanClanPvp";
			case "clan_raid": // Босс асгарда
			case "adventure": // Приключения
			case "clan_global_pvp":
			case "clan_pvp":
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
		scriptMenu.init();
		scriptMenu.addHeader(GM_info.script.name);
		scriptMenu.addHeader('v' + GM_info.script.version);

		for (let name in checkboxes) {
			checkboxes[name].cbox = scriptMenu.addCheckbox(checkboxes[name].label, checkboxes[name].title);
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
			inputs[name].input = scriptMenu.addInputText(inputs[name].title);
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
		testTitanArena: {
			name: 'Турнир Стихий',
			title: 'Пройти титан арену',
			func: function () {
				confShow('Запустить скрипт Турнир Стихий?', testTitanArena);
			},
		},
		testDungeon: {
			name: 'Подземелье',
			title: 'Пройти подземелье',
			func: function () {
				confShow('Запустить скрипт Подземелье?', () => {
					let titanit = getInput('countTitanit');
					testDungeon(titanit);
				});
			},
		},
		testTower: {
			name: 'Башня',
			title: 'Пройти башню',
			func: function () {
				confShow('Запустить скрипт Башня?', testTower);
			},
		},
		sendExpedition: {
			name: 'Экспедиции',
			title: 'Отправка и сбор экспедиций',
			func: function () {
				confShow('Запустить скрипт Экспедиции?', checkExpedition);
			},
		},
		newDay: {
			name: 'test Новый день',
			title: 'Частичная синхонизация данных игры без перезагрузки страницы',
			func: function () {
				confShow('Запустить скрипт Новый день?', cheats.refreshGame);
			},
		},
	}
	/** Вывести кнопочки */
	function addControlButtons() {
		for (let name in buttons) {
			button = buttons[name];
			scriptMenu.addButton(button.name, button.func, button.title);
		}
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

			.PopUp_button {
				background-color: #52A81C;
				border-radius: 5px;
				box-shadow: inset 0px -4px 10px, inset 0px 3px 2px #99fe20, 0px 0px 4px, 0px -3px 1px #d7b275, 0px 0px 0px 3px #ce9767;
				cursor: pointer;
				padding: 5px 18px 8px;
				margin: 10px 12px;
			}

			.PopUp_button:hover {
				filter: brightness(1.2);
			}

			.PopUp_text {
				font-size: 22px;
				font-family: sans-serif;
				font-weight: 600;
				font-stretch: condensed;
				letter-spacing: 1px;
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

		this.addButton = (text, func) => {
			let button = document.createElement('div');
			button.classList.add('PopUp_button');
			this.downer.append(button);

			button.addEventListener('click', func);

			let buttonText = document.createElement('div');
			buttonText.classList.add('PopUp_text', 'PopUp_buttonText');
			button.append(buttonText);

			buttonText.innerText = text;
			this.buttons.push(button);
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
					buttOpt = [{msg:'Ок', result: true}];
				}
				for (let butt of buttOpt) {
					this.addButton(butt.msg, () => {
						complete(butt.result);
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

		this.init = function () {
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
			font-size: 18px;
			font-family: sans-serif;
			font-weight: 600;
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
			border: 1px solid white;
			left: 0px;
			z-index: 9999;
			top: 17%;
			background: #190e08e6;
			border: 3px #ce9767 solid;
			border-radius: 0px 10px 10px 0px;
			border-left: none;
			padding: 10px 20px 10px 10px;
			box-sizing: border-box;
			font-size: 18px;
			font-family: sans-serif;
			font-weight: 600;
			font-stretch: condensed;
			letter-spacing: 1px;
			color: #fce1ac;
			text-shadow: 0px 0px 1px;
			transition: 1s;
			display: flex;
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
			margin: 5px;
		}
		.scriptMenu_divInputText {
			margin: 5px;
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
			width: 25px;
			height: 25px;
			border: 1px solid #cf9250;
			border-radius: 9px;
			margin-right: 8px;
		}
		.scriptMenu_checkbox:checked+label::before {
			background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3e%3cpath fill='%2388cb13' d='M6.564.75l-3.59 3.612-1.538-1.55L0 4.26 2.974 7.25 8 2.193z'/%3e%3c/svg%3e");
		}
		.scriptMenu_close {
			width: 40px;
			height: 40px;
			position: absolute;
			right: -18px;
			top: -18px;
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
			padding: 5px 14px 8px;
			margin: 5px;
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
			font-size: 15px;
		}
		.scriptMenu_InputText {
			width: 130px;
			height: 27px;
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
	`;
			document.head.appendChild(style);
		}

		const addBlocks = () => {
			main = document.createElement('div');
			document.body.appendChild(main);

			this.status = document.createElement('div');
			this.status.classList.add('scriptMenu_status');
			this.setStatus('');
			main.appendChild(this.status);

			let label = document.createElement('label');
			label.classList.add('scriptMenu_label');
			label.setAttribute('for', 'checkbox_showMenu');
			main.appendChild(label);

			let arrowLabel = document.createElement('div');
			arrowLabel.classList.add('scriptMenu_arrowLabel');
			label.appendChild(arrowLabel);

			let checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.id = 'checkbox_showMenu';
			checkbox.classList.add('scriptMenu_showMenu');
			main.appendChild(checkbox);

			this.mainMenu = document.createElement('div');
			this.mainMenu.classList.add('scriptMenu_main');
			main.appendChild(this.mainMenu);

			let closeButton = document.createElement('label');
			closeButton.classList.add('scriptMenu_close');
			closeButton.setAttribute('for', 'checkbox_showMenu');
			this.mainMenu.appendChild(closeButton);

			let crossClose = document.createElement('div');
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

		this.addHeader = (text, func) => {
			header = document.createElement('div');
			header.classList.add('scriptMenu_header');
			header.innerText = text;
			if (typeof func == 'function') {
				header.addEventListener('click', func);
			}
			this.mainMenu.appendChild(header);
		}

		this.addButton = (text, func, title) => {
			button = document.createElement('div');
			button.classList.add('scriptMenu_button');
			button.title = title;
			button.addEventListener('click', func);
			this.mainMenu.appendChild(button);

			buttonText = document.createElement('div');
			buttonText.classList.add('scriptMenu_buttonText');
			buttonText.innerText = text;
			button.appendChild(buttonText);
			this.buttons.push(button);
		}

		this.addCheckbox = (label, title) => {
			divCheckbox = document.createElement('div');
			divCheckbox.classList.add('scriptMenu_divInput');
			divCheckbox.title = title;
			this.mainMenu.appendChild(divCheckbox);

			newCheckbox = document.createElement('input');
			newCheckbox.type = 'checkbox';
			newCheckbox.id = 'newCheckbox' + this.checkboxes.length;
			newCheckbox.classList.add('scriptMenu_checkbox');
			divCheckbox.appendChild(newCheckbox)

			newCheckboxLabel = document.createElement('label');
			newCheckboxLabel.innerText = label;
			newCheckboxLabel.setAttribute('for', newCheckbox.id);
			divCheckbox.appendChild(newCheckboxLabel);

			this.checkboxes.push(newCheckbox);
			return newCheckbox;
		}

		this.addInputText = (title) => {
			divInputText = document.createElement('div');
			divInputText.classList.add('scriptMenu_divInputText');
			divInputText.title = title;
			this.mainMenu.appendChild(divInputText);

			newInputText = document.createElement('input');
			newInputText.type = 'text';
			newInputText.classList.add('scriptMenu_InputText');
			divInputText.appendChild(newInputText)
			return newInputText;
		}
	});
	/** Хранилище данных (только для числовых и булевых значений) */
	const storage = {
		name: GM_info.script.name,
		get: function (key, def) {
			let value = localStorage[this.name + ':' + key];
			if (typeof value != 'undefined') {
				return JSON.parse(value)
			}
			return def;
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
	// Отправка запроса доступная через консоль
	this.SendRequest = send;


	function testDungeon(titanit) {
		return new Promise((resolve, reject) => {
			popup.showBack();
			dung = new executeDungeon(resolve, reject);
			dung.start(titanit);
		});
	}

	/** Прохождение подземелья */
	function executeDungeon(resolve, reject) {
		dungeonActivity = 0;
		maxDungeonActivity = 150;

		titanGetAll = [];

		teams = {
			heroes: [],
			earth: [],
			fire: [],
			neutral: [],
			water: [],
		}

		titanStats = [];

		titansStates = {};

		callsExecuteDungeon = {
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
			}, {
				name: "titanGetAll",
				args: {},
				ident: "titanGetAll"
			}]
		}

		this.start = function(titanit) {
			maxDungeonActivity = titanit || 75;
			send(JSON.stringify(callsExecuteDungeon), startDungeon);
		}

		/** Получаем данные по подземелью */
		function startDungeon(e) { 
			res = e.results;
			dungeonGetInfo = res[0].result.response;
			if (!dungeonGetInfo) {
				endDungeon('noDungeon', res);
				return;
			}
			teamGetAll = res[1].result.response;
			teamGetFavor = res[2].result.response;
			dungeonActivity = res[3].result.response.stat.todayDungeonActivity;
			titanGetAll = Object.values(res[4].result.response);

			teams.hero = {
				favor: teamGetFavor.dungeon_hero,
				heroes: teamGetAll.dungeon_hero.filter(id => id < 6000),
				teamNum: 0,
			}
			heroPet = teamGetAll.dungeon_hero.filter(id => id >= 6000).pop();
			if (heroPet) {
				teams.hero.pet = heroPet;
			}

			teams.neutral = {
				favor: {},
				heroes: getTitanTeam(titanGetAll, 'neutral'),
				teamNum: 0,
			};
			teams.water = {
				favor: {},
				heroes: getTitanTeam(titanGetAll, 'water'),
				teamNum: 0,
			};
			teams.fire = {
				favor: {},
				heroes: getTitanTeam(titanGetAll, 'fire'),
				teamNum: 0,
			};
			teams.earth = {
				favor: {},
				heroes: getTitanTeam(titanGetAll, 'earth'),
				teamNum: 0,
			};


			checkFloor(dungeonGetInfo);
		}

		function getTitanTeam(titans, type) {
			switch (type) {
				case 'neutral':
					return titans.sort((a, b) => b.power - a.power).slice(0, 5).map(e => e.id);
				case 'water':
					return titans.filter(e => e.id.toString().slice(2, 3) == '0').map(e => e.id);
				case 'fire':
					return titans.filter(e => e.id.toString().slice(2, 3) == '1').map(e => e.id);
				case 'earth':
					return titans.filter(e => e.id.toString().slice(2, 3) == '2').map(e => e.id);
			}
		}

		function fixTitanTeam(titans) {
			titans.heroes = titans.heroes.filter(e => !titansStates[e]?.isDead);
			return titans;
		}

		/** Проверяем этаж */
		function checkFloor(dungeonInfo) {
			if (!('floor' in dungeonInfo) || dungeonInfo.floor?.state == 2) {
				saveProgress();
				return;
			}
			// console.log(dungeonInfo, dungeonActivity);
			setProgress('Dungeon: Титанит ' + dungeonActivity + '/' + maxDungeonActivity);
			if (dungeonActivity >= maxDungeonActivity) {
				endDungeon('endDungeon');
				return;
			}
			titansStates = dungeonInfo.states.titans;
			titanStats = titanObjToArray(titansStates);
			floorСhoices = dungeonInfo.floor.userData
			floorType = dungeonInfo.floorType;
			primeElement = dungeonInfo.elements.prime;
			if (floorType == "battle") {
				promises = [];
				for (let teamNum in floorСhoices) {
					attackerType = floorСhoices[teamNum].attackerType;
					promises.push(startBattle(teamNum, attackerType));
				}
				Promise.all(promises)
					.then(processingPromises);
			}
		}

		function processingPromises(results) {
			selectInfo = results[0];
			if (results.length < 2) {
				// console.log(selectInfo);
				endBattle(selectInfo);
				return;
			}

			selectInfo = false;
			minRes = 1e10;
			for (let info of results) {
				diffXP = diffTitanXP(info.progress[0].attackers.heroes);
				diffRes = diffXP;
				if (info.attackerType == 'neutral') {
					diffRes /= 2;
					diffRes -= 4;
				}
				if (info.attackerType == primeElement) {
					diffRes /= 2;
					diffRes -= 5;
				}
				info.diffXP = diffXP
				info.diffRes = diffRes
				if (!info.result.win) {
					continue;
				}
				if (diffRes < minRes) {
					selectInfo = info;
					minRes = diffRes;
				}
			}
			// console.log(selectInfo.teamNum, results);
			if (!selectInfo) {
				endDungeon('dungeonEndBattle\n', results);
				return;
			}

			startBattle(selectInfo.teamNum, selectInfo.attackerType)
				.then(endBattle);
		}
		
		/** Начинаем бой */
		function startBattle(teamNum, attackerType) {
			return new Promise(function (resolve, reject) {
				args = fixTitanTeam(teams[attackerType]);
				args.teamNum = teamNum;
				startBattleCall = {
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
		/** Возращает резульат боя в промис */
		function resultBattle(resultBattles, args) {
			battleData = resultBattles.results[0].result.response;
			battleType = "get_tower";
			if (battleData.type == "dungeon_titan") {
				battleType = "get_titan";
			}
			BattleCalc(battleData, battleType, function (result) {
				result.teamNum = args.teamNum;
				result.attackerType = args.attackerType;
				args.resolve(result);
			});
		}
		/** Заканчиваем бой */
		function endBattle(battleInfo) {
			if (battleInfo.result.win) {
				endBattleCall = {
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
			} else {
				endDungeon('dungeonEndBattle win: false\n', battleInfo);
			}
		}
			
		/** Получаем и обрабатываем результаты боя */
		function resultEndBattle(e) {
			battleResult = e.results[0].result.response;
			if ('error' in battleResult) {
				endDungeon('errorBattleResult', battleResult);
				return;
			}
			dungeonGetInfo = battleResult.dungeon ?? battleResult;
			dungeonActivity += battleResult.reward.dungeonActivity ?? 0;
			checkFloor(dungeonGetInfo);
		}

		/** Возвращает разницу между максимальными ХП титанов и переданными */
		function diffTitanXP(titans) {
			sumCurrentXp = 0;
			for (let i in titans) {
				sumCurrentXp += titans[i].hp
			}
			titanIds = Object.getOwnPropertyNames(titans);
			maxHP = titanStats.reduce((n, e) =>
				titanIds.includes(e.id.toString()) ? n + e.hp : n
			, 0);
			return maxHP < sumCurrentXp ? 0 : maxHP - sumCurrentXp;
		}

		/** Преобразует объект с идетификаторами в массив с идетификаторами*/
		function titanObjToArray(obj) {
			let titans = [];
			for (let id in obj) {
				obj[id].id = id;
				titans.push(obj[id]);
			}
			return titans;
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

		function endDungeon(reason, info) {
			console.log(reason, info);
			setProgress('Dungeon completed!', true);
			resolve();
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
		titan_arena = [];

		callsExecuteTitanArena = {
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
			send(JSON.stringify(callsExecuteTitanArena), startTitanArena);
		}

		function startTitanArena(data) {
			res = data.results;
			titanArena = res[0].result.response;
			if (titanArena.status == 'disabled') {
				endTitanArena('disabled', titanArena);
				return;
			}

			teamGetAll = res[1].result.response;
			titan_arena = teamGetAll.titan_arena;

			checkTier(titanArena)
		}

		function checkTier(titanArena) {
			if (titanArena.status == "peace_time") {
				endTitanArena('Peace_time', titanArena);
				return;
			}
			setProgress('TitanArena: Уровень ' + titanArena.tier);

			if (titanArena.status == "completed_tier") {
				titanArenaCompleteTier();
				return;
			}

			if (titanArena.canRaid) {
				titanArenaStartRaid();
			} else {
				endTitanArena('Done or not canRaid', titanArena);
				// checkRivals(titanArena.rivals);
			}

			
		}

		function checkResultInfo(data) {
			titanArena = data.results[0].result.response;
			checkTier(titanArena);
		}

		function titanArenaCompleteTier() {
			titanArenaCompleteTierCall = {
				calls: [{
					name: "titanArenaCompleteTier",
					args: {},
					ident: "body"
				}]
			}
			send(JSON.stringify(titanArenaCompleteTierCall), checkResultInfo);
		}

		/** TODO: Допилить добитие точек */
		function checkRivals(rivals) {
			listBattle = [];
			for (let n in rivals) {
				if (rivals[n].attackScore < 250) {
					listBattle.push(n);
				}
			}
		}

		/** Запрос битвы арены TODO: Допилить добитие точек */
		function titanArenaStartBattle(rivalId) {
			titanArenaStartBattleCall = {
				calls: [{
					name: "titanArenaStartBattle",
					args: {
						rivalId: rivalId,
						titans: titan_arena
					},
					ident: "body"
				}]
			}
			send(JSON.stringify(titanArenaStartBattleCall), calcResult);
		}
		/** TODO: Допилить добитие точек */
		function calcResult(data) {
			let battlesInfo = data.results[0].result.response.battle;
			calcBattleResult(battlesInfo)
				.then(info => {
					titanArenaEndBattle({
						progress: info.progress,
						result: info.result,
						rivalId: battlesInfo.typeId
					})
				})
		}
		/** TODO: Допилить добитие точек */
		function titanArenaEndBattle(args) {
			titanArenaEndBattleCall = {
				calls: [{
					name: "titanArenaEndBattle",
					args,
					ident: "body"
				}]
			}
			send(JSON.stringify(titanArenaEndBattleCall), ()=>{});
		}

		/** Запрос рейда арены */
		function titanArenaStartRaid() {
			titanArenaStartRaidCall = {
				calls: [{
					name: "titanArenaStartRaid",
					args: {
						titans: titan_arena
					},
					ident: "body"
				}]
			}
			send(JSON.stringify(titanArenaStartRaidCall), calcResults);
		}

		function calcResults(data) {
			let battlesInfo = data.results[0].result.response;
			let {attackers, rivals} = battlesInfo;
			
			promises = [];
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
				endTitanArena('No sucsesRaid', results);
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
			hideProgress(3000);
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
		 * @returns 
		 */
		function getF(classF, nameF) {
			let prop = Object.entries(classF.prototype.__properties__)
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
					if (isChecked('skipMisson')) {
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
					if (isChecked('skipTower')) {
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

		connectGame();
	}

	/** Повтор атаки босса Асгарда */
	function bossBattle() {
		scriptMenu.setStatus('Бой с боссом идет!');
		startBossBattle();

		function startBossBattle() {
			let startBossBattleCall = {
				calls: [{
					name: "clanRaid_startBossBattle",
					args: lastBossBattle,
					ident: "body"
				}]
			}
			send(JSON.stringify(startBossBattleCall), calcResultBattle);
		}

		function calcResultBattle(e) {
			// console.log(e);
			BattleCalc(e.results[0].result.response.battle, "get_tower", endBossBattle);
		}

		function endBossBattle(battleResult) {
			let endBossBattleCall = {
				calls: [{
					name: "clanRaid_endBossBattle",
					args: {
						result: battleResult.result,
						progress: battleResult.progress
					},
					ident: "body"
				}]
			}
			scriptMenu.setStatus('Бой с боссом завершен!');
			setTimeout(() => {
				scriptMenu.setStatus('');
			}, 3000)
			send(JSON.stringify(endBossBattleCall), e => {
				console.log(e);
			});
		}
	}
	/** Автосбор подарков */
	function getAutoGifts() {
		let valName = 'giftSendIds_' + userInfo.id;
		localStorage[valName] = localStorage[valName] ?? '';
		let url = 'https://zingery.ru/heroes/gifts.php';
		if (localStorage[valName].length > 0) {
			url = 'https://zingery.ru/heroes/gifts.php?count=10';
		}
		/** Отправка запроса для получения кодов подарков */
		fetch(url).then(
			response => response.json()
		).then(
			data => {
				let freebieCheckCalls = {
					calls: []
				}
				data.forEach( (giftId, n) => {
					if (localStorage[valName].includes(giftId)) return;
					localStorage[valName] += ';' + giftId;
					freebieCheckCalls.calls.push({
						name: "freebieCheck",
						args: {
							giftId
						},
						ident: "freebieCheck_" + n
					});
				});

				if (!freebieCheckCalls.calls.length) {
					return;
				}

				send(JSON.stringify(freebieCheckCalls), e => {
					let countGetGifts = 0;
					for(check of e.results) {
						if (check.result.response != null) {
							countGetGifts++;
						}
					}
					console.log('Подарки: ' + countGetGifts);
				});
			}
		)
	}
})();
