// ==UserScript==
// @name			HeroWars_TC
// @name:en			HeroWars_TC
// @namespace		HeroWars_TC
// @version			2.1
// @description		Упрощает и автоматизирует многие аспекты игры Хроники Хаоса
// @description:en	Simplifies and automates many aspects in the game Hero Wars
// @author			ZingerY & Goodwin
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
	/** Данные о прошедшей атаке на босса */
	let lastBossBattle = {}
	/** Информация об отправленных подарках */
	let freebieCheckInfo = null;
	/** Идет бой с боссом */
	let isStartBossBattle = false;
	/** Повтор битвы с боссом */
    let repeatBattle = false;
	/** Пачки для тестов в чате*/
    let repleyBattle = {
        defenders: {},
        attackers: {},
        effects: {},
        state: {},
        seed: undefined
    }
	/** Структура нанесенного боссу урона */
    let damage = {
        sum: 0,
        min: 1e10,
        max: 0,
        count: 0,
        count100: 0,
        count150: 0,
        count200: 0,
        count250: 0,
        count300: 0,
        count310: 0,
        count320: 0,
        count330: 0,
        count340: 0,
        count350: 0,
        time: 0,
        lastTime: 0,
        maxTime: 0,
        startTime: 0
    };
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
		sendExpedition: {
			label: 'Автоэкспедиции',
			cbox: null,
			title: 'Автоотправка экспедиций',
			default: true
		},
		getAutoGifts: {
			label: 'Подарки',
			cbox: null,
			title: 'Собирать подарки автоматически',
			default: true
		},
		endlessCards: {
			label: 'Бесконечные карты',
			cbox: null,
			title: 'Бесконечные карты предсказаний',
			default: false
		},
		fastMode: {
			label: 'Быстрый режим',
			cbox: null,
			title: 'Быстрый режим прохождения подземелья',
			default: false
		},
		countControl: {
			label: 'Контроль кол-ва',
			cbox: null,
			title: 'Возможность указывать колличество открываемых "лутбоксов"',
			default: false
		},
		noOfferDonat: {
			label: 'Отключить донат',
			cbox: null,
			title: 'Убирает все предложения доната',
			default: false
		},
		cancelBattle: {
			label: 'Отмена боя',
			cbox: null,
			title: 'Возможность отмены боя на ВГ',
			default: false
		},
		preCalcBattle: {
			label: 'Прерасчет боя',
			cbox: null,
			title: 'Предварительный расчет боя',
			default: false
		},
        passBattle: {
			label: 'Пропуск боев',
			cbox: null,
			title: 'Пропуск боев в запределье и арене титанов',
			default: false
		}
	};
	/** Инпуты */
	let inputs = {
		countBattle: {
			input: null,
			title: 'Сколько проводить тестовых боев',
			default: 10,
		},
		needResource: {
			input: null,
			title: 'Мощ противника мин.(тыс.)/урона(млн.)',
			default: 300,
		},
		needResource2: {
			input: null,
			title: 'Мощь противника макс./тип бафа',
			default: 1500,
		},
		needTitanite: {
			input: null,
			title: 'Сколько фармим титанита',
			default: 300,
		}
	}
    Number.prototype.round = function(places) {
        return +(Math.round(this + "e+" + places) + "e-" + places);
    }
    String.prototype.fixed = function(length) {
        return this.length < length ? this + ' '.repeat(2 * (length - this.length)): this ;
    }
	/** Проверяет чекбокс */
	function isChecked(checkBox) {
		return checkboxes[checkBox].cbox?.checked;
	}
	/** Получает инпут */
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
		popup.confirm(message, buts, 0).then((e) => {
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
					let hero = heroes[ids];
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
					], 0);
				} else {
					return !confirm(msg + "\n" + ansF + " (Ок)\n" + ansS + " (Отмена)");
				}
			}
			/** Диалоговое окно */
			const showMsgs = async function (msg, ansF, ansS, ansC, timeout) {
				return await popup.confirm(msg, [
					{msg: ansF, result: 0},
					{msg: ansS, result: 1},
					{msg: ansC, result: 2},
				], timeout);
			}
			/** Вызов окна с автобоем */
            const showMsgsRepeat = async function (damage, timeout) {
                return showMsgs(
                    'Вы нанесли ' + damage + ' урона.',
                    'Хорошо',
                    'Отменить',
                    'Автобой',
                    timeout);
            }

			let changeRequest = false;
			let testData = JSON.parse(tempData);
			for (const call of testData.calls) {
				requestHistory[this.uniqid].calls[call.name] = call.ident;
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
				/** Подарки */
				if (call.name == 'freebieCheck' && isChecked('getAutoGifts')) {
					freebieCheckInfo = call;
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
				/** Отмена боя в приключениях, на ВГ и с прислужниками Асгарда */
				if (isChecked('cancelBattle') && (
                    call.name == 'adventure_endBattle' ||
					call.name == 'adventureSolo_endBattle' ||
					call.name == 'clanWarEndBattle'  ||
					call.name == 'crossClanWar_endBattle' ||
					call.name == 'brawl_endBattle' ||
					call.name == 'towerEndBattle' ||
					call.name == 'clanRaid_endNodeBattle')) {
					if (!call.args.result.win) {
						if (await showMsg('Вы потерпели поражение!', 'Хорошо', 'Отменить бой')) {
							fixBattle(call.args.progress[0].attackers.heroes);
							fixBattle(call.args.progress[0].defenders.heroes);
							changeRequest = true;
						}
					}
				}
				/** Отмена боя в Асгарде */
				if (call.name == 'clanRaid_endBossBattle' && isChecked('cancelBattle')) {
                    let bossDamage = call.args.progress[0].defenders.heroes[1].extra;
                    let sumDamage = bossDamage.damageTaken + bossDamage.damageTakenNextLevel;
                    let resultPopup = 2;
                    if(!repeatBattle) {
                        resultPopup = await showMsgsRepeat(sumDamage.toLocaleString(), 0);
                        if (resultPopup > 1) {
                            repeatBattle = true;
                            damage.startTime = Math.round(new Date().getTime()) / 1e3;
                        } else if (resultPopup) {
                            fixBattle(call.args.progress[0].attackers.heroes);
                            fixBattle(call.args.progress[0].defenders.heroes);
                            changeRequest = true;
                        }
                    }
                    if(repeatBattle) {
                        let maxTime = getInput('needResource2');
                        let needDamage = getInput('needResource') * 1e6;
                        let countBattle = getInput('countBattle');
                        console.log('Damage = ' + sumDamage);
                        updateDamageStats(sumDamage)
                        showDamageStats();
                        if (damage.count % 20 == 0) {
                            resultPopup = await showMsgsRepeat(sumDamage.toLocaleString(), 2000);
                        }
                        if (sumDamage >= needDamage) {
                            resultPopup = 0;
                        } else if (damage.count >= countBattle || damage.maxTime > maxTime) {
                            resultPopup = 1;
                        }
                        if (resultPopup == 0) {
                            repeatBattle = false;
                            damage = getEmptyDamage();
                            this.onReadySuccess = null;
                        } else {
                            fixBattle(call.args.progress[0].attackers.heroes);
                            fixBattle(call.args.progress[0].defenders.heroes);
                            changeRequest = true;
                            if (resultPopup == 2) {
                                this.onReadySuccess = bossBattle;
                            } else {
                                repeatBattle = false;
                                damage = getEmptyDamage();
                                this.onReadySuccess = null;
                            }
                        }
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

     /** Формирует сообщение со статистикой нанесенного урона*/
    function showDamageStats() {
        let min = Math.round(damage.min) / 1e6;
        let avr = Math.round(damage.sum / damage.count) / 1e6;
        let max = Math.round(damage.max) / 1e6;
        let lastTime = damage.lastTime;
        let maxTime = damage.maxTime;
        let allTime = Math.round(new Date().getTime()) / 1e3 - damage.startTime;
        let message =
            'Проведено боев: ' + damage.count + '\r\n' +
            '100+ млн. урона: ' + damage.count100 + '\r\n' +
            '150+ млн. урона: ' + damage.count150 + '\r\n' +
            '200+ млн. урона: ' + damage.count200 + '\r\n' +
            '250+ млн. урона: ' + damage.count250 + '\r\n' +
            '300+ млн. урона: ' + damage.count300 + '\r\n' +
            '310+ млн. урона: ' + damage.count310 + '\r\n' +
            '320+ млн. урона: ' + damage.count320 + '\r\n' +
            '330+ млн. урона: ' + damage.count330 + '\r\n' +
            '340+ млн. урона: ' + damage.count340 + '\r\n' +
            '350+ млн. урона: ' + damage.count350 + '\r\n' +
            'Миним. урон: ' + min.round(3) + '\r\n' +
            'Средн. урон: ' + avr.round(3) + '\r\n' +
            'Макс.   урон: ' + max.round(3) + '\r\n' +
            'Длительность боя: ' + lastTime.round(3) + ' сек.\r\n' +
            'Макс.  длит.  боя:   ' + maxTime.round(3) + ' сек.\r\n' +
            'Общее время боев: ' + allTime.round(3) + ' сек.';
        setProgress(message, false, hideProgress);
    }

     /** Обновляет статистику нанесенного урона*/
    function updateDamageStats(dmg) {
        let time = Math.round(new Date().getTime()) / 1e3;
        damage.lastTime = damage.time > 0 ? time - damage.time : 0;
        damage.time = time;
        damage.count++;
        damage.sum += dmg;
        if (damage.lastTime > damage.maxTime && damage.count > 2) {
            damage.maxTime = damage.lastTime;
        }
        if (dmg < damage.min) {
            damage.min = dmg;
        }
        if (dmg > damage.max) {
            damage.max = dmg;
        }
        switch (Math.floor(dmg / 1e7)) {
            case 35: case 36: case 37: case 38: case 39: case 40: case 41: case 42: case 43: case 44: case 45: case 46: case 47: case 48: case 49: case 50:
                damage.count350++;
            case 34:
                damage.count340++;
            case 33:
                damage.count330++;
            case 32:
                damage.count320++;
            case 31:
                damage.count310++;
            case 30:
                damage.count300++;
            case 25: case 26: case 27: case 28: case 29:
                damage.count250++;
            case 20: case 21: case 22: case 23: case 24:
                damage.count200++; break;
            case 15: case 16: case 17: case 18: case 19:
                damage.count150++; break;
            case 10: case 11: case 12: case 13: case 14:
                damage.count100++; break;
        }
    }

     /** Возвращает пустую структуру урона*/
    function getEmptyDamage(dmg) {
        return {
            sum: 0,
            min: 1e10,
            max: 0,
            count: 0,
            count100: 0,
            count150: 0,
            count200: 0,
            count250: 0,
            count300: 0,
            count310: 0,
            count320: 0,
            count330: 0,
            count340: 0,
            count350: 0,
            time: 0,
            lastTime: 0,
            maxTime: 0,
            startTime: 0
        };
    }

	/** Обработка и подмена входящих данных */
	function checkChangeResponse(response) {
		try {
			isChange = false;
			nowTime = Math.round(Date.now() / 1000);
			callsIdent = requestHistory[this.uniqid].calls;
			respond = JSON.parse(response);
			for (const call of respond.results) {
				/** Бесконечные карты предсказаний */
				if (call.ident == callsIdent['inventoryGet']) {
					let consumable = call.result.response.consumable;
					consumable[81] = 999;
					isChange = true;
				}
				/** Потасовка */
				if (call.ident == callsIdent['brawl_getInfo']) {
					let brawl = call.result.response;
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
					let battle = call.result.response.battle || call.result.response.replay;
                    addBuff(battle);
					console.log(battle.type);
					function getBattleInfo(battle, isRandSeed) {
						return new Promise(function (resolve) {
							if (isRandSeed) {
								battle.seed = Math.floor(Date.now() / 1000) + random(0, 1e9);
							}
							BattleCalc(battle, getBattleType(battle.type), e => resolve(e.result.win));
						});
					}
					let actions = [getBattleInfo(battle, false)]
					let countBattleCalc = getInput('countBattle');
					for (let i = 0; i < countBattleCalc; i++) {
						actions.push(getBattleInfo(battle, true));
					}
					Promise.all(actions)
						.then(e => {
							let firstBattle = e.shift();
							let countWin = e.reduce((w, s) => w + s);
							setProgress((firstBattle ? 'Победа' : 'Поражение') + ' ' + countWin + '/' + e.length, false, hideProgress)
						});
				}
				/** Запоминаем команды в реплее*/
                if (call.ident == callsIdent['battleGetReplay']) {
                    let battle = call.result.response.replay;
                    repleyBattle.attackers = battle.attackers;
                    repleyBattle.defenders = battle.defenders[0];
                    repleyBattle.effects = battle.effects.defenders;
                    repleyBattle.state = battle.progress[0].defenders.heroes;
                    repleyBattle.seed = battle.seed;
                }
				/** Нападение в турнире*/
				if (call.ident == callsIdent['titanArenaStartBattle']) {
                    let bestBattle = getInput('countBattle');
                    let unrandom = getInput('needResource');
                    let maxPower = getInput('needResource2');
                    if (bestBattle * unrandom * maxPower == 0) {
                        let battle = call.result.response.battle;
                        if (bestBattle == 0) {
                            battle.progress = bestLordBattle[battle.typeId]?.progress;
                        }
                        if (unrandom == 0 && !!repleyBattle.seed) {
                            battle.seed = repleyBattle.seed;
                        }
                        if (maxPower == 0) {
                            battle.attackers = getTitansPack(Object.keys(battle.attackers));
                        }
                        isChange = true;
                    }
                }
                /** Тест боев с усилениями команд защиты*/
                if (call.ident == callsIdent['chatAcceptChallenge']) {
                    let battle = call.result.response.battle;
                    addBuff(battle);
                    let testType = getInput('countBattle');
                    if (testType.slice(0, 1) == "-") {
                        testType = parseInt(testType.slice(1), 10);
                        switch (testType) {
                            case 1:
                                battle.defenders[0] = repleyBattle.defenders;
                                break;
                            case 2:
                                battle.defenders[0] = repleyBattle.attackers;
                                break;
                            case 3:
                                battle.attackers = repleyBattle.attackers;
                                break;
                            case 4:
                                battle.attackers = repleyBattle.defenders;
                                break;
                            case 5:
                                battle.attackers = repleyBattle.attackers;
                                battle.defenders[0] = repleyBattle.defenders;
                                break;
                            case 6:
                                battle.attackers = repleyBattle.defenders;
                                battle.defenders[0] = repleyBattle.attackers;
                                break;
                        }
                    }
                    isChange = true;
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

    /** Добавляет в бой эффекты усиления*/
    function addBuff(battle) {
        let effects = battle.effects;
        let buffType = getInput('needResource2');
        if (-1 < buffType && buffType < 7) {
            let percentBuff = getInput('needResource');
            effects.defenders = {};
            effects.defenders[buffs[buffType]] = percentBuff;
        } else if (buffType.slice(0, 1) == "-") {
            buffType = parseInt(buffType.slice(1), 10);
            effects.defenders = repleyBattle.effects;
            battle.defenders[0] = repleyBattle.defenders;
            let def = battle.defenders[0];
            if (buffType == 1) {
                for (let i in def) {
                    let state = def[i].state;
                    state.hp = state.maxHp;
                    state.energy = 0;
                    state.isDead = false;
                }
            } else if (buffType == 2) {
                for (let i in def) {
                    let state = def[i].state;
                    let rState = repleyBattle.state[i];
                    if (!!rState) {
                        state.hp = rState.hp;
                        state.energy = rState.energy;
                        state.isDead = rState.isDead;
                    } else {
                        state.hp = 0;
                        state.energy = 0;
                        state.isDead = true;
                    }
                }
            }
        }
    }

    const buffs = ['percentBuffAll_energyIncrease', 'percentBuffHp', 'percentIncomeDamageReduce_any', 'percentBuffAll_healing', 'percentBuffAll_armor', 'percentBuffAll_magicResist', 'percentBuffAll_castSpeed']

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
				return "get_titanClanPvp";
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
		newDay: {
			name: 'Синхронизировать',
			title: 'Частичная синхонизация данных игры без перезагрузки',
			func: cheats.refreshGame
		},
		questAllFarm: {
			name: 'Награды',
			title: 'Собрать все награды за задания',
			func: questAllFarm
		},
        testDungeon: {
			name: 'Подземелье',
            title: 'Пройти подземелье',
            func: function () {
                confShow('Запустить скрипт Подземелье?', () => {
                    let titanit = getInput('needTitanite');
                    testDungeon(titanit);
                });
			},
		},
		testTitanArena: {
			name: 'Защита в ТС',
			title: 'Проверить защиту в Турнире Стихий',
			func: function () {
				confShow('Проверить защиту в ТС?', testTitanArena);
			},
		},
		testTitanLord: {
			name: 'Атака Повелителей',
			title: 'Автоматически атакует Повелителей наилучшим известным способом',
			func: function () {
				confShow('Атаковать Повелителей Стихий?', testTitanLord);
			},
		},
		testRaidNodes: {
			name: 'Прислужники',
			title: 'Атакует прислужников сохраннеными пачками',
			func: function () {
				confShow('Запустить скрипт Прислужники?', testRaidNodes);
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
				max-width: 800px;
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

		this.confirm = async (msg, buttOpt, timeout) => {
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
                if(timeout > 0) {
                    setTimeout(() => {complete(2); popup.hide();}, timeout);
                }
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
			white-space: pre-wrap;
			top: -1px;
			left: 240px;
			cursor: pointer;
			border-radius: 0px 0px 10px 10px;
			background: #190e08e6;
			border: 1px #ce9767 solid;
			font-size: 15px;
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
			border: 1px solid white;
			left: 0px;
			z-index: 9999;
			top: 1%;
			background: #190e08e6;
			border: 3px #ce9767 solid;
			border-radius: 0px 5px 5px 0px;
			border-left: none;
			box-sizing: border-box;
			font-family: sans-serif;
			font-stretch: condensed;
			color: #fce1ac;
			transition: 0.5s;
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
			width: 18px;
			height: 18px;
			border: 1px solid #cf9250;
			border-radius: 9px;
			margin-right: 8px;
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
			font-size: 15px;
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
			header.innerHTML = text;
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

    async function testTitanArena() {
        let defendersPacks = newTitansPack;
        return new Promise((resolve, reject) => {
            let titAren = new executeTitanArena(resolve, reject, defendersPacks);
            titAren.start();
        });
    }

    /** Прохождение арены титанов */
    function executeTitanArena(resolve, reject, defendersPacks) {
        let countBattle = getInput('countBattle');
        let minPower = getInput('needResource');
        let maxPower = getInput('needResource2');
        let defPacks = defendersPacks;
        let rivals;
        let firstPack;
        let lastPack;
        let countPack = 0;
        let allStats = '';
        let countRivals = 0;
        let countLords = 0;
        let allCountBattle = 0;
        let allMinPoints = 0
        let allMaxPoints = 0;
        let allAveragePoints = 0;
        let lowestMinPoints = 1e10;
        let lowestMaxPoints = 1e10;
        let lowestAveragePoints = 1e10;
        let badWinRate = 1e10;
        let avrWinRate = 0;
        let allWinRate = 1;

        let callsExecuteTitanArena = {
            calls: [{
                name: "titanArenaGetStatus",
                args: {},
                ident: "titanArenaGetStatus"
            }]
        }

        this.start = async function () {
            send(JSON.stringify(callsExecuteTitanArena), startTitanArena);
        }

        async function startTitanArena(data) {
            let res = data.results;
            let titanArena = res[0].result.response;
            let classic = true;
            if (minPower.slice(0, 1) == "-" && maxPower.slice(0, 1) == "-") {
                firstPack = parseInt(minPower.slice(1, minPower.length), 10);
                lastPack = parseInt(maxPower.slice(1, maxPower.length), 10);
                minPower = 1e3;
                maxPower = 2e3;
                classic = false;
            }
            rivals = getRivals(titanArena.rivals);
            countRivals = rivals[0]?.length;
            countLords = rivals[1]?.length;
            if (classic) {
                await calcAllDef(titanArena.defenders, rivals);
                showDefStats();
            } else {
                lastPack = lastPack < defPacks.length ? lastPack : defPacks.length;
                testPack(firstPack > 0 ? firstPack : 0);
            }
            resolve();
        }

        /** Получаем список противников*/
        function getRivals(rivals) {
            let rivalsTitans = [];
            rivalsTitans.push([]);
            rivalsTitans.push([]);
            minPower *= 1e3;
            maxPower *= 1e3;
            for (let n in rivals) {
                let rival = rivals[n];
                let power = parseInt(rival.power, 10);
                if (minPower <= power && power <= maxPower) {
                    let titans = rival.titans;
                    for (let t in titans) {
                        titans[t].state = undefined;
                    }
                    rivalsTitans[power > 1e6 ? 1 : 0].push(titans);
                }
            }
            return rivalsTitans;
        }

        /** Запускает рассчет тестовых боев со всеми противниками*/
        async function calcAllDef(defenders, rivals) {
            for (let k = 0; k < rivals.length; k++) {
                for (let i = 0; i < rivals[k].length; i++) {
                    let battle = createBattle(rivals[k][i], defenders);
                    let defs = await calcDef(battle);
                    calcDefStats(defs, k);
                }
            }
        }

        /** Запускает рассчет тестовых боев с заданным противником*/
        async function calcDef(battle) {
            let count = getCountBattle(battle);
            count = count > countBattle ? countBattle : count;
            let actions = [];
            for (let i = 0; i < count; i++) {
                actions.push(getDefPoints(battle));
            }
            return Promise.all(actions);
        }

        /** Рассчитывает статистику защиты*/
        function calcDefStats(defs, isLord) {
            let countWin = 0;
            let minPoints = 50
            let maxPoints = 0;
            let sumPoints = 0;
            let countDef = defs.length;
            allCountBattle += countDef;
            for (let i in defs) {
                let def = defs[i];
                sumPoints += def;
                if (def == 50) {
                    countWin++;
                }
                if (def < minPoints) {
                    minPoints = def;
                }
                if (def > maxPoints) {
                    maxPoints = def;
                }
            }
            let averagePoints = sumPoints / countDef;
            if (averagePoints < lowestAveragePoints) {
                lowestAveragePoints = averagePoints;
            }
            if (minPoints < lowestMinPoints) {
                lowestMinPoints = minPoints;
            }
            if (maxPoints < lowestMaxPoints) {
                lowestMaxPoints = maxPoints;
            }
            allAveragePoints += averagePoints;
            allMinPoints += minPoints;
            allMaxPoints += maxPoints;
            if (!isLord) {
                let winRate = countWin / countDef;
                avrWinRate += winRate / countRivals;
                if (winRate < badWinRate) {
                    badWinRate = winRate;
                }
                allWinRate *= winRate;
            }
        }

        /** Выводит общую статистику защиты*/
        function showDefStats() {
            let avrPercentWin = 0;
            let badPercentWin = 0;
            let allPercentWin = 0;
            if (badWinRate < 1e9) {
                avrPercentWin = 100.0 * avrWinRate;
                badPercentWin = 100.0 * badWinRate;
                allPercentWin = 100.0 * allWinRate;
            }
            let maxDef = '/' + (50 * (countRivals + countLords)) + ', ';
            let message =
                'min:  ' + allMinPoints + maxDef +
                'bad - ' + lowestMinPoints + '\r\n' +
                'avr:   ' + allAveragePoints.round(1) + maxDef +
                'bad - ' + lowestAveragePoints.round(1) + '\r\n' +
                'max: ' + allMaxPoints + maxDef +
                'bad - ' + lowestMaxPoints + '\r\n' +
                'win: ' + avrPercentWin.round(1) + '%, ' +
                'bad - ' + badPercentWin.round(1) + '%, ' +
                'all - ' + allPercentWin.round(1)+ '%';
            setProgress(message, false, hideProgress);
        }

        async function testPack(i) {
            return new Promise((resolve, reject) => {
                let tp = new executeTestPack(resolve, reject);
                tp.start(i);
            });
        }

        /** Протестировать команду защиты */
        function executeTestPack(resolve, reject) {

            this.start = async function (i) {
                if (i <= lastPack) {
                    let defPackId = defPacks[i];
                    let pack = titansPack[defPackId];
                    if (!!pack) {
                        await calcAllDef(getTitansPack(pack), rivals);
                        allStats += getDefStats(i);
                        setProgress(allStats, false, hideProgress);
                        resetDefStats();
                    }
                    setTimeout(testPack, 0, i + 1);
                }
                resolve();
            }

            /** Возвращает статистику боев*/
            function getDefStats(packId) {
                countPack++;
                let stat = defPacks[packId] + ': ' + allMinPoints + ', ' + allAveragePoints.toFixed(1) + ', ' + allMaxPoints + '; ';
                return countPack % 5 == 0 ? stat.fixed(20) + '\r\n' : stat.fixed(20);
            }

            /** Сбрасывает статистику боев*/
            function resetDefStats() {
                allCountBattle = 0;
                allMinPoints = 0
                allMaxPoints = 0;
                allAveragePoints = 0;
                lowestMinPoints = 1e10;
                lowestMaxPoints = 1e10;
                lowestAveragePoints = 1e10;
                badWinRate = 1e10;
                avrWinRate = 0;
                allWinRate = 1;
            }
        }
    }

    /** Протестировать защиту титанами*/
    function testDef() {
        let defendersPacks = newTitansPack;
        let attackersPacks = [1100, 1120, 1000, 2100, 2120, 2000, 3100, 3120, 3000, 3020];
        //let defendersPacks = [6050, 6052, 6102, 6350, 6352, 6402, 6600, 6601, 6650, 6651];
        //let attackersPacks = [1100, 1101, 1102, 1120, 1121, 1122, 2100, 2101, 2102, 2120, 2121, 2122, 3100, 3101, 3102, 3120, 3121, 3122];
        return new Promise((resolve, reject) => {
            let def = new executeDef(resolve, reject, defendersPacks, attackersPacks);
            def.start();
        });
    }

    /** Защита титанами */
    function executeDef(resolve, reject, defendersPacks, attackersPacks) {
        let needCountBattle = getInput('countBattle');
        let firstPack = getInput('needResource');
        let lastPack = getInput('needResource2');
        let defPacks = defendersPacks;
        let attPacks = attackersPacks;
        let defenders;
        let allStats = [];
        let countRow = 4 * attPacks.length;
        let countColumn = 5;

        this.start = async function () {
            lastPack = lastPack < defPacks.length ? lastPack : defPacks.length;
            testPack(firstPack > 0 ? firstPack - 1 : -1, attPacks.length);
            resolve();
        }

        async function testPack(i, j) {
            return new Promise((resolve, reject) => {
                let tp = new executeTestPack(resolve, reject);
                tp.start(i, j);
            });
        }

        /** Протестировать команду защиты */
        function executeTestPack(resolve, reject) {

            this.start = async function (i, j) {
                if (j < attPacks.length) {
                    let attackPackId = attPacks[j];
                    let attackPack = titansPack[attackPackId];
                    if (!!attackPack) {
                        let attackers = getTitansPack(attackPack);
                        let defs = await calcDef(attackers, defenders);
                        allStats.push(getDefStats(defs, attackPackId, defPacks[i]));
                        allStats = showDefStats(allStats, countColumn, countRow, attPacks.length);
                    }
                    setTimeout(testPack, 0, i, j + 1);
                } else if (i < lastPack) {
                    let defPackId = defPacks[++i];
                    let defPack = titansPack[defPackId];
                    if (!!defPack) {
                        defenders = getTitansPack(defPack);
                        setTimeout(testPack, 0, i, 0);
                    } else {
                        setTimeout(testPack, 0, i + 1, attPacks.length);
                    }
                }
                resolve();
            }

            /** Запускает рассчет тестовых боев с заданным противником*/
            async function calcDef(attackers, defenders) {
                let battle = createBattle(attackers, defenders);

                //let effects = battle.effects;
                //effects.defenders = {};
                //effects.defenders[buffs[1]] = 56;

                let countBattle = getCountBattle(battle);
                countBattle = countBattle > needCountBattle ? needCountBattle : countBattle;
                let actions = [];
                for (let i = 0; i < countBattle; i++) {
                    actions.push(getDefPoints(battle));
                }
                return Promise.all(actions);
            }

            /** Возвращает статистику боев*/
            function getDefStats(defs, attackPackId, defPackId) {
                let minPoints = 50;
                let maxPoints = 0;
                let countBattle = defs.length;
                let countWin = 0;
                let sumPoints = 0;
                for (let i in defs) {
                    let def = defs[i];
                    sumPoints += def;
                    if (def == 50) {
                        countWin++;
                    }
                    if (def < minPoints) {
                        minPoints = def;
                    }
                    if (def > maxPoints) {
                        maxPoints = def;
                    }
                }
                let averagePoints = sumPoints / countBattle;
                let winRate = countWin / countBattle;
                let min = (minPoints + ', ').fixed(4);
                let avr = (averagePoints.toFixed(1) + ', ').fixed(6).replace('.0,', ',   ');
                let max = (maxPoints + ', ').fixed(4);
                let win = ((100 * winRate).toFixed(1) + '%; ').fixed(8).replace('.0%;', '%;');
                return defPackId + 'x' + attackPackId + ': ' + min + avr + max + win;
            }
        }
    }


    /** Протестировать атаку титанами*/
    function testAttack() {
        //let defendersPacks = [103, 107, 203, 207, 200, 303, 307, 300];
        //let attackersPacks = Object.keys(titansPack);
        //let defendersPacks = [1100, 1120, 2100, 2120, 2000, 3100, 3120, 3000];
        //let attackersPacks = newTitansPack;
        let defendersPacks = [3120];
        let attackersPacks = [2100, 2120, 6400, 7300];
        return new Promise((resolve, reject) => {
            let att = new executeAttack(resolve, reject, defendersPacks, attackersPacks);
            att.start();
        });
    }

    /** Атака титанами */
    function executeAttack(resolve, reject, defendersPacks, attackersPacks) {
        let needCountBattle = getInput('countBattle');
        let firstPack = getInput('needResource');
        let lastPack = getInput('needResource2');
        let defPacks = defendersPacks;
        let attPacks = attackersPacks;
        let attackers;
        let allStats = [];
        let countRow = 40// * defendersPacks.length;
        let countColumn = 8;

        this.start = async function () {
            firstPack = firstPack > 0 ? firstPack : 0;
            lastPack = lastPack < attPacks.length ? lastPack : attPacks.length;
            testPack(firstPack - 1, defPacks.length);
            resolve();
        }

        async function testPack(i, j) {
            return new Promise((resolve, reject) => {
                let tp = new executeTestPack(resolve, reject);
                tp.start(i, j);
            });
        }

        /** Протестировать команду атаки */
        function executeTestPack(resolve, reject) {

            this.start = async function (i, j) {
                if (j < defPacks.length) {
                    let defPackId = defPacks[j];
                    let defPack = titansPack[defPackId];
                    if (!!defPack) {
                        let defenders = getTitansPack(defPack);
                        let defs = await calcDef(attackers, defenders);
                        allStats.push(getDefStats(defs, attPacks[i], defPackId));
                        allStats = showDefStats(allStats, countColumn, countRow, defPacks.length);
                    }
                    setTimeout(testPack, 0, i, j + 1);
                } else if (i < lastPack) {
                    let attPackId = attPacks[++i];
                    let attackPack = titansPack[attPackId];
                    if (!!attackPack) {
                        attackers = getTitansPack(attackPack);
                        setTimeout(testPack, 0, i, 0);
                    } else {
                        setTimeout(testPack, 0, i + 1, defPacks.length);
                    }
                }
                resolve();
            }

            /** Запускает рассчет тестовых боев с заданным противником*/
            async function calcDef(attackers, defenders) {
                let battle = createBattle(attackers, defenders);

                let effects = battle.effects;
                effects.defenders = {};
                effects.defenders[buffs[2]] = 32;

                let countBattle = getCountBattle(battle);
                countBattle = countBattle > needCountBattle ? needCountBattle : countBattle;
                let actions = [];
                for (let i = 0; i < countBattle; i++) {
                    actions.push(getDefPoints(battle));
                }
                return Promise.all(actions);
            }

            /** Возвращает статистику боев*/
            function getDefStats(defs, attackPackId, defPackId) {
                let minPoints = 50;
                let maxPoints = 0;
                let countBattle = defs.length;
                let countWin = 0;
                let sumPoints = 0;
                for (let i in defs) {
                    let loss = 50 - defs[i];
                    sumPoints += loss;
                    if (loss > 0) {
                        countWin++;
                    }
                    if (loss < minPoints) {
                        minPoints = loss;
                    }
                    if (loss > maxPoints) {
                        maxPoints = loss;
                    }
                }
                let averagePoints = sumPoints / countBattle;
                let winRate = countWin / countBattle;
                let min = (minPoints + ', ').fixed(4);
                let avr = (averagePoints.toFixed(1) + ', ').fixed(6).replace('.0,', ',   ');
                let max = (maxPoints + ', ').fixed(4);
                let win = ((100 * winRate).toFixed(1) + '%; ').fixed(8).replace('.0%;', '%; ');
                return attackPackId + 'x' + defPackId + ': ' +
                    //min + avr + max +
                    win;
            }
        }
    }

    /** Возвращает статистику боев*/
    function showDefStats(allStats, countColumn, countRow, countPacks) {
        if (allStats.length > countColumn * countRow) {
            allStats = allStats.slice(countRow);
        }
        let strings = [];
        for (let i in allStats) {
            let stat = allStats[i];
            if (i < countRow) {
                strings.push(stat);
            } else {
                strings[i % countRow] += stat;
            }
        }
        let message = '';
        let lastAttPack = countPacks - 1;
        for (let i in strings) {
            let str = strings[i];
            message += str + '\r\n';
            if (i % countPacks == lastAttPack) {
                message += '\r\n';
            }
        }
        setProgress(message, false, hideProgress);
        return allStats;
    }

    /** Получаем команду защиты*/
    function getTitansPack(defPack) {
        let defens = {};
        for (let i of defPack) {
            defens[i] = fullTitans[i];
        }
        return defens;
    }

    /** Создает бой с заданными параметрами*/
    function createBattle(attackers, defenders) {
		let battle = {
			attackers: attackers,
			defenders: [defenders],
			effects: [],
			reward: [],
			seed: 123456789,
            startTime: Math.floor(new Date().getTime() / 1000),
            type: 'titan_arena',
            typeId: '1234567',
            userId: '7654321'
		}
        return battle;
    }

    /** Все титаны с максимальной прокачкой*/
    const fullTitans = {
        4000: {id: 4000, xp: 686760, level: 120, star: 6, skills: {4001: 120}, power: 185964, skins: {10001: 60, 10013: 60}, currentSkin: 0, artifacts: [{level: 120, star: 6}, {level: 120, star: 6}, {level: 120, star: 6}], scale: 0.8, type: "titan", perks: null, anticrit: 1, antidodge: 1, hp: 11752763.21, physicalAttack: 778462.47, elementArmor: 139047, elementAttack: 422565, elementSpiritPower: 525000, element: "water", elementSpiritLevel: 120, elementSpiritStar: 6, skin: 0},
        4001: {id: 4001, xp: 686760, level: 120, star: 6, skills: {4003: 120}, power: 170314, skins: {10002: 60}, currentSkin: 0, artifacts: [{level: 120, star: 6}, {level: 120, star: 6}, {level: 120, star: 6}], scale: 0.8, type: "titan", perks: null, anticrit: 1, antidodge: 1, hp: 6858164.15, physicalAttack: 1145574.02, elementAttack: 422565, elementArmor: 89982, elementSpiritPower: 525000, element: "water", elementSpiritLevel: 120, elementSpiritStar: 6, skin: 0},
        4002: {id: 4002, xp: 686760, level: 120, star: 6, skills: {4005: 120}, power: 170313, skins: {10003: 60}, currentSkin: 0, artifacts: [{level: 120, star: 6}, {level: 120, star: 6}, {level: 120, star: 6}], scale: 0.8, type: "titan", perks: null, anticrit: 1, antidodge: 1, hp: 9816958.55, physicalAttack: 923647.74, elementAttack: 422565, elementArmor: 89982, elementSpiritPower: 525000, element: "water", elementSpiritLevel: 120, elementSpiritStar: 6, skin: 0},
        4003: {id: 4003, xp: 686760, level: 120, star: 6, skills: {4007: 120, 4008: 120}, power: 170314, skins: {10004: 60}, currentSkin: 0, artifacts: [{level: 120, star: 6}, {level: 120, star: 6}, {level: 120, star: 6}], scale: 0.8, type: "titan", perks: null, anticrit: 1, antidodge: 1, hp: 10466148.379999999, physicalAttack: 874974.48, elementAttack: 422565, elementArmor: 89982, elementSpiritPower: 525000, element: "water", elementSpiritLevel: 120, elementSpiritStar: 6, skin: 0},
        4010: {id: 4010, xp: 686760, level: 120, star: 6, skills: {4010: 120}, power: 186000, skins: {10005: 60, 10014: 60}, currentSkin: 0, artifacts: [{level: 120, star: 6}, {level: 120, star: 6}, {level: 120, star: 6}], scale: 0.8, type: "titan", perks: null, anticrit: 1, antidodge: 1, hp: 10687696.620000001, physicalAttack: 858868.05, elementArmor: 139047, elementAttack: 422565, elementSpiritPower: 1462500, element: "fire", elementSpiritLevel: 120, elementSpiritStar: 6, skin: 0},
        4011: {id: 4011, xp: 686760, level: 120, star: 6, skills: {4012: 120}, power: 170296, skins: {10006: 60}, currentSkin: 0, artifacts: [{level: 120, star: 6}, {level: 120, star: 6}, {level: 120, star: 6}], scale: 0.8, type: "titan", perks: null, anticrit: 1, antidodge: 1, hp: 5835277.66, physicalAttack: 1222027, elementAttack: 422565, elementArmor: 89982, elementSpiritPower: 1462500, element: "fire", elementSpiritLevel: 120, elementSpiritStar: 6, skin: 0},
        4012: {id: 4012, xp: 686760, level: 120, star: 6, skills: {4014: 120}, power: 170313, skins: {10007: 60}, currentSkin: 0, artifacts: [{level: 120, star: 6}, {level: 120, star: 6}, {level: 120, star: 6}], scale: 0.8, type: "titan", perks: null, anticrit: 1, antidodge: 1, hp: 8762437.24, physicalAttack: 1002736.79, elementAttack: 422565, elementArmor: 89982, elementSpiritPower: 1462500, element: "fire", elementSpiritLevel: 120, elementSpiritStar: 6, skin: 0},
        4013: {id: 4013, xp: 686760, level: 120, star: 6, skills: {4016: 120, 4017: 120}, power: 170274, skins: {10008: 60}, currentSkin: 0, artifacts: [{level: 120, star: 6}, {level: 120, star: 6}, {level: 120, star: 6}], scale: 0.8, type: "titan", perks: null, anticrit: 1, antidodge: 1, hp: 6586625.11, physicalAttack: 1165347.03, elementAttack: 422565, elementArmor: 89982, elementSpiritPower: 1462500, element: "fire", elementSpiritLevel: 120, elementSpiritStar: 6, skin: 0},
        4020: {id: 4020, xp: 686760, level: 120, star: 6, skills: {4019: 120}, power: 185996, skins: {10009: 60, 10015: 60}, currentSkin: 0, artifacts: [{level: 120, star: 6}, {level: 120, star: 6}, {level: 120, star: 6}], scale: 0.8, type: "titan", perks: null, anticrit: 1, antidodge: 1, hp: 16772882.059999999, physicalAttack: 402414.82, elementArmor: 139047, elementAttack: 422565, elementSpiritPower: 6750000, element: "earth", elementSpiritLevel: 120, elementSpiritStar: 6, skin: 0},
        4021: {id: 4021, xp: 686760, level: 120, star: 6, skills: {4021: 120}, power: 170278, skins: {10010: 60}, currentSkin: 0, artifacts: [{level: 120, star: 6}, {level: 120, star: 6}, {level: 120, star: 6}], scale: 0.8, type: "titan", perks: null, anticrit: 1, antidodge: 1, hp: 11444600.73, physicalAttack: 801066.1799999999, elementAttack: 422565, elementArmor: 89982, elementSpiritPower: 6750000, element: "earth", elementSpiritLevel: 120, elementSpiritStar: 6, skin: 0},
        4022: {id: 4022, xp: 686760, level: 120, star: 6, skills: {4023: 120}, power: 170313, skins: {10011: 60}, currentSkin: 0, artifacts: [{level: 120, star: 6}, {level: 120, star: 6}, {level: 120, star: 6}], scale: 0.8, type: "titan", perks: null, anticrit: 1, antidodge: 1, hp: 14392848.86, physicalAttack: 580457.44, elementAttack: 422565, elementArmor: 89982, elementSpiritPower: 6750000, element: "earth", elementSpiritLevel: 120, elementSpiritStar: 6, skin: 0},
        4023: {id: 4023, xp: 686760, level: 120, star: 6, skills: {4025: 120, 4026: 120}, power: 170336, skins: {10012: 60}, currentSkin: 0, artifacts: [{level: 120, star: 6}, {level: 120, star: 6}, {level: 120, star: 6}], scale: 0.8, type: "titan", perks: null, anticrit: 1, antidodge: 1, hp: 13620313.35, physicalAttack: 638741.97, elementAttack: 422565, elementArmor: 89982, elementSpiritPower: 6750000, element: "earth", elementSpiritLevel: 120, elementSpiritStar: 6, skin: 0},
        4030: {id: 4030, xp: 686760, level: 120, star: 6, skills: {4028: 120}, power: 195983, skins: {10016: 60}, currentSkin: 0, artifacts: [{level: 120, star: 6}, {level: 120, star: 6}, {level: 120, star: 6}], scale: 0.8, type: "titan", perks: null, anticrit: 1, antidodge: 1, hp: 15347954.120000001, physicalAttack: 548632.1, elementAttack: 422565, elementArmor: 161967, elementSpiritPower: 2340000, element: "dark", elementSpiritLevel: 120, elementSpiritStar: 6, skin: 0},
        4031: {id: 4031, xp: 686760, level: 120, star: 6, skills: {4030: 120}, power: 195957, skins: {10017: 60}, currentSkin: 0, artifacts: [{level: 120, star: 6}, {level: 120, star: 6}, {level: 120, star: 6}], scale: 0.8, type: "titan", perks: null, anticrit: 1, antidodge: 1, hp: 10289902.83, physicalAttack: 927608.46, elementAttack: 422565, elementArmor: 161967, elementSpiritPower: 2340000, element: "dark", lementSpiritLevel: 120, elementSpiritStar: 6, skin: 0},
        4032: {id: 4032, xp: 686760, level: 120, star: 6, skills: {4032: 120}, power: 195967, skins: {10018: 60}, currentSkin: 0, artifacts: [{level: 120, star: 6}, {level: 120, star: 6}, {level: 120, star: 6}], scale: 0.8, type: "titan", perks: null, anticrit: 1, antidodge: 1, hp: 13268469.24, physicalAttack: 704363.65, elementAttack: 422565, elementArmor: 161967, elementSpiritPower: 2340000, element: "dark", lementSpiritLevel: 120, elementSpiritStar: 6, skin: 0},
        4040: {id: 4040, xp: 686760, level: 120, star: 6, skills: {4037: 120}, power: 196001, skins: {10020: 60}, currentSkin: 0, artifacts: [{level: 120, star: 6}, {level: 120, star: 6}, {level: 120, star: 6}], scale: 0.8, type: "titan", perks: null, anticrit: 1, antidodge: 1, hp: 12585837.780000001, physicalAttack: 756052.39, elementAttack: 422565, elementArmor: 161967, elementSpiritPower: 5400000, element: "light", elementSpiritLevel: 120, elementSpiritStar: 6, skin: 0},
        4041: {id: 4041, xp: 686760, level: 120, star: 6, skills: {4039: 120}, power: 195950, skins: {10021: 60}, currentSkin: 0, artifacts: [{level: 120, star: 6}, {level: 120, star: 6}, {level: 120, star: 6}], scale: 0.8, type: "titan", perks: null, anticrit: 1, antidodge: 1, hp: 7083572.48, physicalAttack: 1167983.1, elementAttack: 422565, elementArmor: 161967, elementSpiritPower: 5400000, element: "light", elementSpiritLevel: 120, elementSpiritStar: 6, skin: 0},
        4042: {id: 4042, xp: 686760, level: 120, star: 6, skills: {4041: 120}, power: 195965, skins: {10022: 60}, currentSkin: 0, artifacts: [{level: 120, star: 6}, {level: 120, star: 6}, {level: 120, star: 6}], scale: 0.8, type: "titan", perks: null, anticrit: 1, antidodge: 1, hp: 10080591.379999999, physicalAttack: 943420.75, elementAttack: 422565, elementArmor: 161967, elementSpiritPower: 5400000, element: "light", elementSpiritLevel: 120, elementSpiritStar: 6, skin: 0}
    }

    /** Новые команды титанов*/
    const newTitansPack = [1141, 1206, 1226, 1306, 1326, 1406, 1426, 1624, 2141, 2206, 2226, 2306, 2326, 2406, 2426, 3141, 3206, 3226, 3306, 3326, 3406, 3426, 4001, 4002, 4020, 4021, 4022, 6050, 6051, 6052, 6053, 6100, 6101, 6102, 6103, 6350, 6351, 6352, 6353, 6400, 6401, 6402, 6403, 6650, 6651, 6652, 6653, 6700, 6701, 6702, 6703, 8000,
                           1161, 1209, 1229, 1309, 1329, 1409, 1429, 2161, 2209, 2229, 2309, 2329, 2409, 2429, 3161, 3209, 3229, 3309, 3329, 3409, 3429, 5001, 5002, 5020, 5021, 5022, 7050, 7051, 7052, 7053, 7100, 7101, 7102, 7103, 7350, 7351, 7352, 7353, 7400, 7401, 7402, 7403, 7650, 7651, 7652, 7653, 7700, 7701, 7702, 7703, 8001, 8002, 8200, 8201, 8202];

    /** Основные команды титанов*/
    const baseTitansPack = [1000, 1100, 1101, 1102, 1103, 1120, 1121, 1122, 1123, 1142, 1143, 1161, 1162, 1163, 2000, 2100, 2101, 2102, 2103, 2120, 2121, 2122, 2123, 2142, 2143, 2161, 2162, 2163, 3000, 3020, 3100, 3101, 3102, 3103, 3120, 3121, 3122, 3123, 3142, 3143, 3161, 3162, 3163];

    /** Все полезные команды титанов*/
    const titansPack = {
        1000: [4000, 4001, 4003, 4013, 4023],
        1020: [4000, 4002, 4003, 4013, 4023],
        1040: [4001, 4002, 4003, 4013, 4023],
        1060: [4000, 4001, 4002, 4013, 4023],
        1100: [4000, 4001, 4002, 4003, 4013],
        1101: [4000, 4001, 4002, 4003, 4010],
        1102: [4000, 4001, 4002, 4003, 4012],
        1103: [4000, 4001, 4002, 4003, 4011],
        1120: [4000, 4001, 4002, 4003, 4023],
        1121: [4000, 4001, 4002, 4003, 4020],
        1122: [4000, 4001, 4002, 4003, 4021],
        1123: [4000, 4001, 4002, 4003, 4022],
        1141: [4000, 4001, 4002, 4003, 4030],
        1142: [4000, 4001, 4002, 4003, 4031],
        1143: [4000, 4001, 4002, 4003, 4032],
        1161: [4000, 4001, 4002, 4003, 4040],
        1162: [4000, 4001, 4002, 4003, 4041],
        1163: [4000, 4001, 4002, 4003, 4042],
        1200: [4000, 4001, 4003, 4013, 4010],
        1201: [4000, 4001, 4003, 4013, 4012],
        1202: [4000, 4001, 4003, 4013, 4011],
        1203: [4000, 4001, 4003, 4013, 4020],
        1204: [4000, 4001, 4003, 4013, 4021],
        1205: [4000, 4001, 4003, 4013, 4022],
        1206: [4000, 4001, 4003, 4013, 4030],
        1207: [4000, 4001, 4003, 4013, 4031],
        1208: [4000, 4001, 4003, 4013, 4032],
        1209: [4000, 4001, 4003, 4013, 4040],
        1210: [4000, 4001, 4003, 4013, 4041],
        1211: [4000, 4001, 4003, 4013, 4042],
        1220: [4000, 4001, 4003, 4023, 4010],
        1221: [4000, 4001, 4003, 4023, 4012],
        1222: [4000, 4001, 4003, 4023, 4011],
        1223: [4000, 4001, 4003, 4023, 4020],
        1224: [4000, 4001, 4003, 4023, 4021],
        1225: [4000, 4001, 4003, 4023, 4022],
        1226: [4000, 4001, 4003, 4023, 4030],
        1227: [4000, 4001, 4003, 4023, 4031],
        1228: [4000, 4001, 4003, 4023, 4032],
        1229: [4000, 4001, 4003, 4023, 4040],
        1230: [4000, 4001, 4003, 4023, 4041],
        1231: [4000, 4001, 4003, 4023, 4042],
        1300: [4000, 4002, 4003, 4013, 4010],
        1301: [4000, 4002, 4003, 4013, 4012],
        1302: [4000, 4002, 4003, 4013, 4011],
        1303: [4000, 4002, 4003, 4013, 4020],
        1304: [4000, 4002, 4003, 4013, 4021],
        1305: [4000, 4002, 4003, 4013, 4022],
        1306: [4000, 4002, 4003, 4013, 4030],
        1307: [4000, 4002, 4003, 4013, 4031],
        1308: [4000, 4002, 4003, 4013, 4032],
        1309: [4000, 4002, 4003, 4013, 4040],
        1310: [4000, 4002, 4003, 4013, 4041],
        1311: [4000, 4002, 4003, 4013, 4042],
        1320: [4000, 4002, 4003, 4023, 4010],
        1321: [4000, 4002, 4003, 4023, 4012],
        1322: [4000, 4002, 4003, 4023, 4011],
        1323: [4000, 4002, 4003, 4023, 4020],
        1324: [4000, 4002, 4003, 4023, 4021],
        1325: [4000, 4002, 4003, 4023, 4022],
        1326: [4000, 4002, 4003, 4023, 4030],
        1327: [4000, 4002, 4003, 4023, 4031],
        1328: [4000, 4002, 4003, 4023, 4032],
        1329: [4000, 4002, 4003, 4023, 4040],
        1330: [4000, 4002, 4003, 4023, 4041],
        1331: [4000, 4002, 4003, 4023, 4042],
        1400: [4001, 4002, 4003, 4013, 4010],
        1401: [4001, 4002, 4003, 4013, 4012],
        1402: [4001, 4002, 4003, 4013, 4011],
        1403: [4001, 4002, 4003, 4013, 4020],
        1404: [4001, 4002, 4003, 4013, 4021],
        1405: [4001, 4002, 4003, 4013, 4022],
        1406: [4001, 4002, 4003, 4013, 4030],
        1407: [4001, 4002, 4003, 4013, 4031],
        1408: [4001, 4002, 4003, 4013, 4032],
        1409: [4001, 4002, 4003, 4013, 4040],
        1410: [4001, 4002, 4003, 4013, 4041],
        1411: [4001, 4002, 4003, 4013, 4042],
        1420: [4001, 4002, 4003, 4023, 4010],
        1421: [4001, 4002, 4003, 4023, 4012],
        1422: [4001, 4002, 4003, 4023, 4011],
        1423: [4001, 4002, 4003, 4023, 4020],
        1424: [4001, 4002, 4003, 4023, 4021],
        1425: [4001, 4002, 4003, 4023, 4022],
        1426: [4001, 4002, 4003, 4023, 4030],
        1427: [4001, 4002, 4003, 4023, 4031],
        1428: [4001, 4002, 4003, 4023, 4032],
        1429: [4001, 4002, 4003, 4023, 4040],
        1430: [4001, 4002, 4003, 4023, 4041],
        1431: [4001, 4002, 4003, 4023, 4042],
        1600: [4000, 4001, 4003, 4032, 4042],
        1601: [4000, 4002, 4003, 4032, 4042],
        1602: [4001, 4002, 4003, 4032, 4042],
        1603: [4000, 4001, 4003, 4032, 4012],
        1604: [4000, 4002, 4003, 4032, 4012],
        1605: [4001, 4002, 4003, 4032, 4012],
        1606: [4000, 4001, 4003, 4042, 4012],
        1607: [4000, 4002, 4003, 4042, 4012],
        1608: [4001, 4002, 4003, 4042, 4012],
        1609: [4000, 4001, 4003, 4032, 4021],
        1610: [4000, 4002, 4003, 4032, 4021],
        1611: [4001, 4002, 4003, 4032, 4021],
        1612: [4000, 4001, 4003, 4042, 4021],
        1613: [4000, 4002, 4003, 4042, 4021],
        1614: [4001, 4002, 4003, 4042, 4021],
        1615: [4000, 4001, 4003, 4032, 4020],
        1616: [4000, 4002, 4003, 4032, 4020],
        1617: [4001, 4002, 4003, 4032, 4020],
        1618: [4000, 4001, 4003, 4042, 4020],
        1619: [4000, 4002, 4003, 4042, 4020],
        1620: [4001, 4002, 4003, 4042, 4020],
        1621: [4001, 4002, 4003, 4012, 4020],
        1622: [4001, 4002, 4003, 4020, 4021],
        1623: [4001, 4002, 4003, 4012, 4021],
        1624: [4000, 4002, 4003, 4032, 4010],
        2000: [4010, 4012, 4003, 4013, 4023],
        2020: [4010, 4011, 4003, 4013, 4023],
        2040: [4011, 4012, 4003, 4013, 4023],
        2060: [4010, 4011, 4012, 4003, 4023],
        2100: [4010, 4011, 4012, 4013, 4003],
        2101: [4010, 4011, 4012, 4013, 4000],
        2102: [4010, 4011, 4012, 4013, 4001],
        2103: [4010, 4011, 4012, 4013, 4002],
        2120: [4010, 4011, 4012, 4013, 4023],
        2121: [4010, 4011, 4012, 4013, 4020],
        2122: [4010, 4011, 4012, 4013, 4021],
        2123: [4010, 4011, 4012, 4013, 4022],
        2141: [4010, 4011, 4012, 4013, 4030],
        2142: [4010, 4011, 4012, 4013, 4031],
        2143: [4010, 4011, 4012, 4013, 4032],
        2161: [4010, 4011, 4012, 4013, 4040],
        2162: [4010, 4011, 4012, 4013, 4041],
        2163: [4010, 4011, 4012, 4013, 4042],
        2200: [4010, 4012, 4013, 4003, 4000],
        2201: [4010, 4012, 4013, 4003, 4001],
        2202: [4010, 4012, 4013, 4003, 4002],
        2203: [4010, 4012, 4013, 4003, 4020],
        2204: [4010, 4012, 4013, 4003, 4021],
        2205: [4010, 4012, 4013, 4003, 4022],
        2206: [4010, 4012, 4013, 4003, 4030],
        2207: [4010, 4012, 4013, 4003, 4031],
        2208: [4010, 4012, 4013, 4003, 4032],
        2209: [4010, 4012, 4013, 4003, 4040],
        2210: [4010, 4012, 4013, 4003, 4041],
        2211: [4010, 4012, 4013, 4003, 4042],
        2220: [4010, 4012, 4013, 4023, 4000],
        2221: [4010, 4012, 4013, 4023, 4001],
        2222: [4010, 4012, 4013, 4023, 4002],
        2223: [4010, 4012, 4013, 4023, 4020],
        2224: [4010, 4012, 4013, 4023, 4021],
        2225: [4010, 4012, 4013, 4023, 4022],
        2226: [4010, 4012, 4013, 4023, 4030],
        2227: [4010, 4012, 4013, 4023, 4031],
        2228: [4010, 4012, 4013, 4023, 4032],
        2229: [4010, 4012, 4013, 4023, 4040],
        2230: [4010, 4012, 4013, 4023, 4041],
        2231: [4010, 4012, 4013, 4023, 4042],
        2300: [4010, 4011, 4013, 4003, 4000],
        2301: [4010, 4011, 4013, 4003, 4001],
        2302: [4010, 4011, 4013, 4003, 4002],
        2303: [4010, 4011, 4013, 4003, 4020],
        2304: [4010, 4011, 4013, 4003, 4021],
        2305: [4010, 4011, 4013, 4003, 4022],
        2306: [4010, 4011, 4013, 4003, 4030],
        2307: [4010, 4011, 4013, 4003, 4031],
        2308: [4010, 4011, 4013, 4003, 4032],
        2309: [4010, 4011, 4013, 4003, 4040],
        2310: [4010, 4011, 4013, 4003, 4041],
        2311: [4010, 4011, 4013, 4003, 4042],
        2320: [4010, 4011, 4013, 4023, 4000],
        2321: [4010, 4011, 4013, 4023, 4001],
        2322: [4010, 4011, 4013, 4023, 4002],
        2323: [4010, 4011, 4013, 4023, 4020],
        2324: [4010, 4011, 4013, 4023, 4021],
        2325: [4010, 4011, 4013, 4023, 4022],
        2326: [4010, 4011, 4013, 4023, 4030],
        2327: [4010, 4011, 4013, 4023, 4031],
        2328: [4010, 4011, 4013, 4023, 4032],
        2329: [4010, 4011, 4013, 4023, 4040],
        2330: [4010, 4011, 4013, 4023, 4041],
        2331: [4010, 4011, 4013, 4023, 4042],
        2400: [4011, 4012, 4013, 4003, 4000],
        2401: [4011, 4012, 4013, 4003, 4001],
        2402: [4011, 4012, 4013, 4003, 4002],
        2403: [4011, 4012, 4013, 4003, 4020],
        2404: [4011, 4012, 4013, 4003, 4021],
        2405: [4011, 4012, 4013, 4003, 4022],
        2406: [4011, 4012, 4013, 4003, 4030],
        2407: [4011, 4012, 4013, 4003, 4031],
        2408: [4011, 4012, 4013, 4003, 4032],
        2409: [4011, 4012, 4013, 4003, 4040],
        2410: [4011, 4012, 4013, 4003, 4041],
        2411: [4011, 4012, 4013, 4003, 4042],
        2420: [4011, 4012, 4013, 4023, 4000],
        2421: [4011, 4012, 4013, 4023, 4001],
        2422: [4011, 4012, 4013, 4023, 4002],
        2423: [4011, 4012, 4013, 4023, 4020],
        2424: [4011, 4012, 4013, 4023, 4021],
        2425: [4011, 4012, 4013, 4023, 4022],
        2426: [4011, 4012, 4013, 4023, 4030],
        2427: [4011, 4012, 4013, 4023, 4031],
        2428: [4011, 4012, 4013, 4023, 4032],
        2429: [4011, 4012, 4013, 4023, 4040],
        2430: [4011, 4012, 4013, 4023, 4041],
        2431: [4011, 4012, 4013, 4023, 4042],
        2600: [4010, 4012, 4013, 4032, 4042],
        2601: [4010, 4011, 4013, 4032, 4042],
        2602: [4011, 4012, 4013, 4032, 4042],
        2603: [4010, 4012, 4013, 4032, 4000],
        2604: [4010, 4011, 4013, 4032, 4000],
        2605: [4011, 4012, 4013, 4032, 4000],
        2606: [4010, 4012, 4013, 4042, 4000],
        2607: [4010, 4011, 4013, 4042, 4000],
        2608: [4011, 4012, 4013, 4042, 4000],
        2609: [4010, 4012, 4013, 4032, 4001],
        2610: [4010, 4011, 4013, 4032, 4001],
        2611: [4011, 4012, 4013, 4032, 4001],
        2612: [4010, 4012, 4013, 4042, 4001],
        2613: [4010, 4011, 4013, 4042, 4001],
        2614: [4011, 4012, 4013, 4042, 4001],
        2615: [4010, 4012, 4013, 4032, 4020],
        2616: [4010, 4011, 4013, 4032, 4020],
        2617: [4011, 4012, 4013, 4032, 4020],
        2618: [4010, 4012, 4013, 4042, 4020],
        2619: [4010, 4011, 4013, 4042, 4020],
        2620: [4011, 4012, 4013, 4042, 4020],
        2621: [4011, 4012, 4013, 4000, 4020],
        2622: [4011, 4012, 4013, 4001, 4020],
        2623: [4011, 4012, 4013, 4020, 4021],
        3000: [4020, 4021, 4003, 4013, 4023],
        3020: [4020, 4022, 4003, 4013, 4023],
        3040: [4021, 4022, 4003, 4013, 4023],
        3060: [4020, 4021, 4022, 4003, 4013],
        3100: [4020, 4021, 4022, 4023, 4003],
        3101: [4020, 4021, 4022, 4023, 4000],
        3102: [4020, 4021, 4022, 4023, 4001],
        3103: [4020, 4021, 4022, 4023, 4002],
        3120: [4020, 4021, 4022, 4023, 4013],
        3121: [4020, 4021, 4022, 4023, 4010],
        3122: [4020, 4021, 4022, 4023, 4012],
        3123: [4020, 4021, 4022, 4023, 4011],
        3141: [4020, 4021, 4022, 4023, 4030],
        3142: [4020, 4021, 4022, 4023, 4031],
        3143: [4020, 4021, 4022, 4023, 4032],
        3161: [4020, 4021, 4022, 4023, 4040],
        3162: [4020, 4021, 4022, 4023, 4041],
        3163: [4020, 4021, 4022, 4023, 4042],
        3200: [4020, 4021, 4023, 4003, 4000],
        3201: [4020, 4021, 4023, 4003, 4001],
        3202: [4020, 4021, 4023, 4003, 4002],
        3203: [4020, 4021, 4023, 4003, 4010],
        3204: [4020, 4021, 4023, 4003, 4012],
        3205: [4020, 4021, 4023, 4003, 4011],
        3206: [4020, 4021, 4023, 4003, 4030],
        3207: [4020, 4021, 4023, 4003, 4031],
        3208: [4020, 4021, 4023, 4003, 4032],
        3209: [4020, 4021, 4023, 4003, 4040],
        3210: [4020, 4021, 4023, 4003, 4041],
        3211: [4020, 4021, 4023, 4003, 4042],
        3220: [4020, 4021, 4023, 4013, 4000],
        3221: [4020, 4021, 4023, 4013, 4001],
        3222: [4020, 4021, 4023, 4013, 4002],
        3223: [4020, 4021, 4023, 4013, 4010],
        3224: [4020, 4021, 4023, 4013, 4012],
        3225: [4020, 4021, 4023, 4013, 4011],
        3226: [4020, 4021, 4023, 4013, 4030],
        3227: [4020, 4021, 4023, 4013, 4031],
        3228: [4020, 4021, 4023, 4013, 4032],
        3229: [4020, 4021, 4023, 4013, 4040],
        3230: [4020, 4021, 4023, 4013, 4041],
        3231: [4020, 4021, 4023, 4013, 4042],
        3300: [4020, 4022, 4023, 4003, 4000],
        3301: [4020, 4022, 4023, 4003, 4001],
        3302: [4020, 4022, 4023, 4003, 4002],
        3303: [4020, 4022, 4023, 4003, 4010],
        3304: [4020, 4022, 4023, 4003, 4012],
        3305: [4020, 4022, 4023, 4003, 4011],
        3306: [4020, 4022, 4023, 4003, 4030],
        3307: [4020, 4022, 4023, 4003, 4031],
        3308: [4020, 4022, 4023, 4003, 4032],
        3309: [4020, 4022, 4023, 4003, 4040],
        3310: [4020, 4022, 4023, 4003, 4041],
        3311: [4020, 4022, 4023, 4003, 4042],
        3320: [4020, 4022, 4023, 4013, 4000],
        3321: [4020, 4022, 4023, 4013, 4001],
        3322: [4020, 4022, 4023, 4013, 4002],
        3323: [4020, 4022, 4023, 4013, 4010],
        3324: [4020, 4022, 4023, 4013, 4012],
        3325: [4020, 4022, 4023, 4013, 4011],
        3326: [4020, 4022, 4023, 4013, 4030],
        3327: [4020, 4022, 4023, 4013, 4031],
        3328: [4020, 4022, 4023, 4013, 4032],
        3329: [4020, 4022, 4023, 4013, 4040],
        3330: [4020, 4022, 4023, 4013, 4041],
        3331: [4020, 4022, 4023, 4013, 4042],
        3400: [4021, 4022, 4023, 4003, 4000],
        3401: [4021, 4022, 4023, 4003, 4001],
        3402: [4021, 4022, 4023, 4003, 4002],
        3403: [4021, 4022, 4023, 4003, 4010],
        3404: [4021, 4022, 4023, 4003, 4012],
        3405: [4021, 4022, 4023, 4003, 4011],
        3406: [4021, 4022, 4023, 4003, 4030],
        3407: [4021, 4022, 4023, 4003, 4031],
        3408: [4021, 4022, 4023, 4003, 4032],
        3409: [4021, 4022, 4023, 4003, 4040],
        3410: [4021, 4022, 4023, 4003, 4041],
        3411: [4021, 4022, 4023, 4003, 4042],
        3420: [4021, 4022, 4023, 4013, 4000],
        3421: [4021, 4022, 4023, 4013, 4001],
        3422: [4021, 4022, 4023, 4013, 4002],
        3423: [4021, 4022, 4023, 4013, 4010],
        3424: [4021, 4022, 4023, 4013, 4012],
        3425: [4021, 4022, 4023, 4013, 4011],
        3426: [4021, 4022, 4023, 4013, 4030],
        3427: [4021, 4022, 4023, 4013, 4031],
        3428: [4021, 4022, 4023, 4013, 4032],
        3429: [4021, 4022, 4023, 4013, 4040],
        3430: [4021, 4022, 4023, 4013, 4041],
        3431: [4021, 4022, 4023, 4013, 4042],
        3600: [4020, 4021, 4023, 4032, 4042],
        3601: [4020, 4022, 4023, 4032, 4042],
        3602: [4021, 4022, 4023, 4032, 4042],
        3603: [4020, 4021, 4023, 4032, 4000],
        3604: [4020, 4022, 4023, 4032, 4000],
        3605: [4021, 4022, 4023, 4032, 4000],
        3606: [4020, 4021, 4023, 4042, 4000],
        3607: [4020, 4022, 4023, 4042, 4000],
        3608: [4021, 4022, 4023, 4042, 4000],
        3609: [4020, 4021, 4023, 4032, 4001],
        3610: [4020, 4022, 4023, 4032, 4001],
        3611: [4021, 4022, 4023, 4032, 4001],
        3612: [4020, 4021, 4023, 4042, 4001],
        3613: [4020, 4022, 4023, 4042, 4001],
        3614: [4021, 4022, 4023, 4042, 4001],
        3615: [4020, 4021, 4023, 4032, 4012],
        3616: [4020, 4022, 4023, 4032, 4012],
        3617: [4021, 4022, 4023, 4032, 4012],
        3618: [4020, 4021, 4023, 4042, 4012],
        3619: [4020, 4022, 4023, 4042, 4012],
        3620: [4021, 4022, 4023, 4042, 4012],
        3621: [4020, 4021, 4023, 4000, 4012],
        3622: [4021, 4022, 4023, 4000, 4012],
        3623: [4020, 4021, 4023, 4001, 4012],
        4000: [4031, 4032, 4003, 4013, 4023],
        4001: [4030, 4031, 4003, 4013, 4023],
        4002: [4030, 4032, 4003, 4013, 4023],
        4020: [4030, 4031, 4032, 4003, 4013],
        4021: [4030, 4031, 4032, 4003, 4023],
        4022: [4030, 4031, 4032, 4013, 4023],
        5000: [4041, 4042, 4003, 4013, 4023],
        5001: [4040, 4041, 4003, 4013, 4023],
        5002: [4040, 4042, 4003, 4013, 4023],
        5020: [4040, 4041, 4042, 4003, 4013],
        5021: [4040, 4041, 4042, 4003, 4023],
        5022: [4040, 4041, 4042, 4013, 4023],
        6000: [4031, 4032, 4000, 4001, 4003],
        6001: [4031, 4032, 4000, 4002, 4003],
        6002: [4031, 4032, 4001, 4002, 4003],
        6003: [4031, 4032, 4000, 4001, 4002],
        6050: [4030, 4031, 4000, 4001, 4003],
        6051: [4030, 4031, 4000, 4002, 4003],
        6052: [4030, 4031, 4001, 4002, 4003],
        6053: [4030, 4031, 4000, 4001, 4002],
        6100: [4030, 4032, 4000, 4001, 4003],
        6101: [4030, 4032, 4000, 4002, 4003],
        6102: [4030, 4032, 4001, 4002, 4003],
        6103: [4030, 4032, 4000, 4001, 4002],
        6300: [4031, 4032, 4010, 4012, 4013],
        6301: [4031, 4032, 4010, 4011, 4013],
        6302: [4031, 4032, 4011, 4012, 4013],
        6303: [4031, 4032, 4010, 4011, 4012],
        6350: [4030, 4031, 4010, 4012, 4013],
        6351: [4030, 4031, 4010, 4011, 4013],
        6352: [4030, 4031, 4011, 4012, 4013],
        6353: [4030, 4031, 4010, 4011, 4012],
        6400: [4030, 4032, 4010, 4012, 4013],
        6401: [4030, 4032, 4010, 4011, 4013],
        6402: [4030, 4032, 4011, 4012, 4013],
        6403: [4030, 4032, 4010, 4011, 4012],
        6600: [4031, 4032, 4020, 4021, 4023],
        6601: [4031, 4032, 4020, 4022, 4023],
        6602: [4031, 4032, 4021, 4022, 4023],
        6603: [4031, 4032, 4020, 4021, 4022],
        6650: [4030, 4031, 4020, 4021, 4023],
        6651: [4030, 4031, 4020, 4022, 4023],
        6652: [4030, 4031, 4021, 4022, 4023],
        6653: [4030, 4031, 4020, 4021, 4022],
        6700: [4030, 4032, 4020, 4021, 4023],
        6701: [4030, 4032, 4020, 4022, 4023],
        6702: [4030, 4032, 4021, 4022, 4023],
        6703: [4030, 4032, 4020, 4021, 4022],
        7000: [4041, 4042, 4000, 4001, 4003],
        7001: [4041, 4042, 4000, 4002, 4003],
        7002: [4041, 4042, 4001, 4002, 4003],
        7003: [4041, 4042, 4000, 4001, 4002],
        7050: [4040, 4041, 4000, 4001, 4003],
        7051: [4040, 4041, 4000, 4002, 4003],
        7052: [4040, 4041, 4001, 4002, 4003],
        7053: [4040, 4041, 4000, 4001, 4002],
        7100: [4040, 4042, 4000, 4001, 4003],
        7101: [4040, 4042, 4000, 4002, 4003],
        7102: [4040, 4042, 4001, 4002, 4003],
        7103: [4040, 4042, 4000, 4001, 4002],
        7300: [4041, 4042, 4010, 4012, 4013],
        7301: [4041, 4042, 4010, 4011, 4013],
        7302: [4041, 4042, 4011, 4012, 4013],
        7303: [4041, 4042, 4010, 4011, 4012],
        7350: [4040, 4041, 4010, 4012, 4013],
        7351: [4040, 4041, 4010, 4011, 4013],
        7352: [4040, 4041, 4011, 4012, 4013],
        7353: [4040, 4041, 4010, 4011, 4012],
        7400: [4040, 4042, 4010, 4012, 4013],
        7401: [4040, 4042, 4010, 4011, 4013],
        7402: [4040, 4042, 4011, 4012, 4013],
        7403: [4040, 4042, 4010, 4011, 4012],
        7600: [4041, 4042, 4020, 4021, 4023],
        7601: [4041, 4042, 4020, 4022, 4023],
        7602: [4041, 4042, 4021, 4022, 4023],
        7603: [4041, 4042, 4020, 4021, 4022],
        7650: [4040, 4041, 4020, 4021, 4023],
        7651: [4040, 4041, 4020, 4022, 4023],
        7652: [4040, 4041, 4021, 4022, 4023],
        7653: [4040, 4041, 4020, 4021, 4022],
        7700: [4040, 4042, 4020, 4021, 4023],
        7701: [4040, 4042, 4020, 4022, 4023],
        7702: [4040, 4042, 4021, 4022, 4023],
        7703: [4040, 4042, 4020, 4021, 4022],
        8000: [4030, 4031, 4032, 4041, 4042],
        8001: [4030, 4031, 4032, 4040, 4041],
        8002: [4030, 4031, 4032, 4040, 4042],
        8200: [4040, 4041, 4042, 4031, 4032],
        8201: [4040, 4041, 4042, 4030, 4031],
        8202: [4040, 4041, 4042, 4030, 4032],
        8400: [4031, 4032, 4041, 4042, 4003],
        8401: [4031, 4032, 4041, 4042, 4000],
        8402: [4031, 4032, 4041, 4042, 4001],
        8403: [4031, 4032, 4041, 4042, 4002],
        8404: [4031, 4032, 4041, 4042, 4013],
        8405: [4031, 4032, 4041, 4042, 4010],
        8406: [4031, 4032, 4041, 4042, 4012],
        8407: [4031, 4032, 4041, 4042, 4011],
        8408: [4031, 4032, 4041, 4042, 4023],
        8409: [4031, 4032, 4041, 4042, 4020],
        8410: [4031, 4032, 4041, 4042, 4021],
        8411: [4031, 4032, 4041, 4042, 4022],
    }

    /** Лучшие бои с повелителями*/
    const bestLordBattle = {
        "-400701": {pack: 1000, score: 250, progress: [{attackers: {input: ["auto", 294, 14, "cast", 354, 16.945, 4001, "cast", 354, 16.945, 4013, "cast", 386, 18.09, 4023, "cast", 401, 18.94, 4003, "cast", 448, 22.425, 4001, "cast", 556, 27.5, 4013, "cast", 658, 34.42, 4003, "auto", 680, 36.142, "auto", 714, 38.084, "auto", 831, 45.4]}}]},
        "-400801": {pack: 1100, score: 250, progress: [{attackers: {input: ["auto", 418, 17.6, "auto", 463, 18.7]}}]},
        "-400901": {pack: 2101, score: 250, progress: [{attackers: {input: ["auto", 0, 0, "cast", 318, 17.324555561277045, 4011, "teamCustom", 328, 17.5605556223122, 1, "cast", 328, 17.5605556223122, 4013, "auto", 328, 17.5605556223122]}}]},
        "-400702": {pack: 1100, score: 250, progress: [{attackers: {input: ["auto", 452, 20.5, "cast", 635, 28.4, 4001, "cast", 651, 28.8, 4013, "auto", 691, 30.4]}}]},
        "-400802": {pack: 1101, score: 250, progress: [{attackers: {input: ["auto", 0, 0, "cast", 272, 13.5, 4010, "cast", 292, 15.29, 4001, "auto", 299, 15.3, "auto", 352, 17.6, "cast", 488, 24.9, 4002, "cast", 488, 24.9, 4003, "auto", 492, 25]}}]},
		"-400902": {pack: 1400, score: 250, progress: [{attackers: {input: [ "auto", 0, 0, "auto", 31, 2.580000162124634, "auto", 201, 10.569743589744, "cast", 292, 15.857743696555524, 4013, "cast", 324, 17.70774383960667, 4002, "cast", 332, 17.80774374423924, 4001, "cast", 346, 17.97474379955235, 4003, "auto", 346, 17.97474379955235, "auto", 691, 31.792666773479, "auto", 772, 35.42566667048217 ]}}]},
//		"-400902": {pack: 2120, score: 245, progress: [{attackers: {input: ["auto", 0, 0, "cast", 222, 11.785000562667847, 4010, "cast", 262, 14.302000761032104, 4013, "cast", 297, 16.25200057029724, 4011, "cast", 353, 18.952000617980957, 4012, "cast", 353, 18.952000617980957, 4023, "teamCustom", 361, 19.320000886917114, 1, "auto", 361, 19.320000886917114]}}]},
        "-400703": {pack: 3120, score: 250, progress: [{attackers: {input: ["auto", 0, 0, "auto", 43, 2.745000123977661, "auto", 250, 12.879487179487, "cast", 311, 15.243487261502992, 4013, "cast", 373, 17.591487072675477, 4022, "cast", 383, 17.958486937253724, 4023, "auto", 383, 17.958486937253724]}}]},
        "-400803": {pack: 2000, score: 223, progress: [{attackers: {input: ["auto", 0, 0, "auto", 19, 1.9660000801086426, "auto", 209, 10.015897435898, "cast", 265, 13.101897639984303, 4013, "cast", 333, 16.572991309938853, 4023, "teamCustom", 333, 16.572991309938853, 1, "cast", 338, 17.00599115925831, 4003, "auto", 338, 17.00599115925831]}}]},
        "-400903": {pack: 1400, score: 250, progress: [{attackers: {input: ["auto", 0, 0, "auto", 11, 0.419999361038208, "auto", 211, 10.722307692308, "cast", 302, 14.987308274049333, 4002, "cast", 321, 15.504308472413591, 4013, "cast", 372, 17.970308552522233, 4003, "teamCustom", 376, 18.08730865551906, 2, "auto", 387, 18.35, "auto", 506, 23.108307636994887, "cast", 530, 25.236307657975722, 4013, "cast", 594, 28.436307705659438, 4001, "auto", 603, 28.803307808656264]}}]},
        "-400704": {pack: 1100, score: 250, progress: [{attackers: {input: ["auto", 0, 0, "cast", 207, 11.2, 4000, "cast", 299, 15.5, 4013, "cast", 354, 17.7, 4002, "cast", 361, 18, 4003, "cast", 462, 21.24, 4001, "cast", 588, 27.6, 4002, "cast", 664, 30.7, 4003, "cast", 682, 31.2, 4013, "auto", 705, 32.6]}}]},
        "-400804": {pack: 1120, score: 250, progress: [{attackers: {input: ["auto", 0, 0, "auto", 268, 14.266999959945679, "auto", 268, 14.266999959945679, "cast", 312, 16.46440161403357, 4002, "cast", 362, 18.496401678883423, 4003, "auto", 372, 19.063401591145386, "auto", 446, 22.740666666666, "cast", 506, 28.231666603723497, 4001, "cast", 549, 31.761666575113267, 4003, "auto", 549, 31.761666575113267]}}]},
        "-400904": {pack: 1101, score: 250, progress: [{attackers: {input: ["auto", 0, 0, "cast", 311, 15.733999252319336, 4001, "teamCustom", 314, 15.799999237060547, 2, "cast", 374, 19.466999053955533, 4002, "cast", 393, 20.23299908638046, 4003, "auto", 393, 20.23299908638046, "auto", 595, 30.262149378511, "cast", 607, 30.562149569245864, 4003, "auto", 607, 30.562149569245864]}}]},
        "-400705": {pack: 1100, score: 250, progress: [{attackers: {input: ["auto", 0, 0, "cast", 205, 11.2, 4000, "cast", 338, 17.96, 4003, "cast", 338, 17.96, 4002, "teamCustom", 338, 17.96, 2, "auto", 385, 19.5]}}]},
        "-400805": {pack: 1100, score: 250, progress: [{attackers: {input: ["auto", 0, 0, "cast", 222, 11.2, 4000, "cast", 368, 16.6, 4001, "cast", 390, 17.7, 4002, "cast", 401, 18, 4003, "cast", 535, 25, 4002, "auto", 548, 25.1]}}]},
        "-400905": {pack: 3120, score: 250, progress: [{attackers: {input: ["auto", 0, 0, "cast", 249, 12.88, 4020, "cast", 283, 14.281, 4013, "cast", 316, 15.5, 4022, "auto", 358, 17.23, "auto", 543, 24.685, "cast", 555, 26.258, 4013, "cast", 555, 26.258, 4022, "cast", 653, 32.024, 4023, "cast", 686, 34.374, 4021, "auto", 695, 34.476, "auto", 731, 35.72822, "auto", 830, 41.74435]}}]},
        "-400706": {pack: 1000, score: 250, progress: [{attackers: {input: ["auto", 0, 0, "auto", 0, 0, "auto", 215, 10.923076923077, "cast", 297, 14.301076467220676, 4013, "cast", 359, 16.607692260008285, 4001, "cast", 381, 17.71069218562169, 4023, "cast", 387, 17.96169211314244, 4003, "cast", 530, 23.99169208453221, 4001, "cast", 590, 27.161691922407577, 4013, "cast", 599, 28.160691756468246, 4003, "cast", 688, 32.794532495235, 4023, "auto", 688, 32.794532495235]}}]},
        "-400806": {pack: 1428, score: 237, progress: [{attackers: {input: ["auto", 252, 12.7, "cast", 301, 15.4, 4023, "cast", 313, 16.3, 4003, "cast", 318, 16.5, 4002, "teamCustom", 366, 18.4, 2, "cast", 448, 23.4, 4023, "auto", 514, 26.4]}}]},
        "-400906": {pack: 3120, score: 250, progress: [{attackers: {input: ["auto", 0, 0, "auto", 0, 0, "auto", 241, 12.872179487179, "cast", 276, 14.256179550121505, 4013, "cast", 305, 15.489179590175826, 4022, "auto", 325, 16.089179733226974, "auto", 353, 17.663333333333, "cast", 476, 22.268333333333, 4021, "cast", 592, 27.128333228428826, 4013, "auto", 592, 27.128333228428826, "auto", 707, 32.995079468296, "cast", 825, 41.916888696245785, 4023, "auto", 827, 42.066888791613216]}}]},
        "-400707": {pack: 1100, score: 250, progress: [{attackers: {input: ["auto", 0, 0, "cast", 217, 11.2, 4000, "auto", 256, 12.6, "auto", 424, 18.4, "cast", 515, 21.96, 4000, "auto", 522, 22.1, "auto", 708, 28.6, "cast", 747, 30, 4003, "cast", 782, 30.9, 4002, "auto", 789, 31]}}]},
        "-400807": {pack: 1100, score: 250, progress: [{attackers: {input: ["auto", 602, 27.92, "cast", 662, 30.96, 4003, "cast", 694, 32.6, 4002, "auto", 696, 32.7]}}]},
        "-400907": {pack: 2120, score: 250, progress: [{attackers: {input: ["auto", 0, 0, "cast", 234, 11.9, 4010, "auto", 250, 12.55]}}]},
        "-400708": {pack: 1100, score: 250, progress: [{attackers: {input: ["auto", 0, 0, "cast", 214, 11.2, 4000, "auto", 254, 12.7, "auto", 593, 25.6, "auto", 617, 27.5, "auto", 878, 41.4, "cast", 908, 43.2, 4002, "auto", 914, 43.3]}}]},
        "-400808": {pack: 1101, score: 232, progress: [{attackers: {input: ["auto", 411, 22, "cast", 423, 22.7, 4001, "cast", 489, 27.5, 4002, "auto", 536, 29.7]}}]},
        "-400908": {pack: 1101, score: 250, progress: [{attackers: {input: ["auto", 0, 0, "cast", 288, 16.4, 4001, "cast", 359, 21.2, 4002, "cast", 359, 21.2, 4003, "auto", 419, 23.4]}}]},
        "-400709": {pack: 1423, score: 250, progress: [{attackers: {input: ["auto", 222, 11.4, "cast", 378, 18.73, 4001, "cast", 412, 20.1, 4003, "cast", 412, 20.1, 4023, "cast", 418, 20.31, 4002, "cast", 532, 26, 4002, "cast", 607, 28.3, 4003, "auto", 687, 32.4]}}]},
        "-400809": {pack: 1624, score: 250, progress: [{attackers: {input: ["auto", 0, 0, "cast", 338, 16.5, 4003, "cast", 338, 16.5, 4032, "cast", 363, 17.4, 4002, "auto", 427, 19.4, "auto", 471, 21.2, "auto", 564, 28.7]}}]},
        "-400909": {pack: 2120, score: 250, progress: [{attackers: {input: ["auto", 194, 10.5, "cast", 264, 14.3, 4013, "cast", 320, 18, 4023, "cast", 329, 18.17, 4011, "cast", 357, 19.16, 4012, "cast", 498, 27.18, 4013, "cast", 515, 28.65, 4023, "cast", 571, 31.9, 4012, "auto", 595, 34.15]}}]},
        "-400710": {pack: 1423, score: 250, progress: [{attackers: {input: ["auto", 254, 14, "cast", 356, 18.9, 4023, "cast", 368, 19.5, 4002, "cast", 378, 19.7, 4003, "cast", 378, 19.7, 4001, "cast", 553, 29.5, 4002, "cast", 584, 30.5, 4003, "cast", 622, 33.4, 4023, "auto", 734, 42.4]}}]},
        "-400810": {pack: 1000, score: 250, progress: [{attackers: {input: ["auto", 568, 24.4, "cast", 597, 25.3, 4003, "cast", 603, 25.5, 4023, "auto", 633, 28]}}]},
        "-400910": {pack: 1101, score: 250, progress: [{attackers: {input: ["auto", 0, 0, "cast", 298, 16, 4001, "teamCustom", 303, 16.02, 2, "cast", 375, 18.8, 4003, "cast", 375, 18.8, 4002, "auto", 452, 21.9]}}]},
        "-400711": {pack: 1423, score: 250, progress: [{attackers: {input: ["auto", 0, 0, "cast", 236, 13.3, 4020, "cast", 373, 19.7, 4003, "cast", 373, 19.7, 4023, "cast", 373, 19.7, 4002, "cast", 373, 19.7, 4001, "cast", 563, 29.2, 4002, "cast", 585, 29.9, 4003, "cast", 676, 36.2, 4023, "teamCustom", 676, 36.2, 2, "auto", 810, 43.4]}}]},
        "-400811": {pack: 1102, score: 250, progress: [{attackers: {input: ["auto", 0, 0, "auto", 99, 5.920000076293945, "auto", 270, 14.125307684678605, "teamCustom", 278, 15.358307486314347, 2, "cast", 309, 17.257307415742446, 4002, "cast", 309, 17.257307415742446, 4003, "cast", 425, 22.839307194490004, 4001, "cast", 464, 25.280805404445672, 4003, "auto", 467, 25.347805316707635]}}]},
        "-400911": {pack: 1200, score: 250, progress: [{attackers: {input: ["auto", 0, 0, "auto", 0, 0, "auto", 322, 15.207692307692, "auto", 335, 15.877692383985945, "auto", 335, 15.877692383985945, "cast", 358, 18.4886924450211, 4003, "auto", 358, 18.4886924450211, "auto", 366, 18.751674556213, "cast", 463, 25.641493021040286, 4001, "auto", 480, 26.467492996244754, "auto", 587, 32.67893052104, "cast", 661, 38.42093086245541, 4001, "cast", 694, 41.64393091204647, 4013, "auto", 694, 41.64393091204647, "auto", 748, 44.92456212024166, "cast", 761, 45.820562028688926, 4001, "cast", 827, 50.47856178264095, 4003, "teamCustom", 886, 56.99884532388827, 2, "cast", 895, 58.15084551271578, 4013, "auto", 916, 59.20684550699374 ]}}]},
        "-400712": {pack: 1423, score: 250, progress: [{attackers: {input: ["auto", 0, 0, "auto", 0, 0, "auto", 258, 14.793333333333, "cast", 372, 19.711666742960944, 4003, "cast", 372, 19.711666742960944, 4023, "cast", 372, 19.711666742960944, 4001, "cast", 446, 23.807666699091925, 4002, "cast", 586, 30.571888785892174, 4003, "cast", 616, 32.40188918643538, 4002, "auto", 720, 38.04088912540023, "auto", 802, 42.293841044224, "auto", 893, 47.949840943134525]}}]},
        "-400812": {pack: 1400, score: 250, progress: [{attackers: {input: ["auto", 0, 0, "auto", 11, 0.2349996566772461, "auto", 214, 10.569743589744, "cast", 324, 17.638744549140362, 4002, "cast", 339, 17.871744589194684, 4003, "cast", 345, 17.98874469219151, 4001, "auto", 361, 18.271744589195, "cast", 572, 28.425165117522, 4002 ]}}]},
        "-400912": {pack: 3324, score: 250, progress: [{attackers: {input: [ "auto", 0, 0, "auto", 0, 0, "auto", 252, 12.879487179487, "cast", 283, 14.279487036435853, 4013, "cast", 342, 16.159486674039613, 4022, "auto", 358, 17.17548670646454, "auto", 613, 26.1744875, "cast", 640, 27.740487484741212, 4013, "cast", 653, 28.123487620162965, 4012, "cast", 653, 28.123487620162965, 4023, "teamCustom", 674, 28.723487524795534, 3, "auto", 674, 28.723487524795534, "auto", 996, 52.38224326129525, "cast", 999, 53.41524325366586, 4023, "auto", 1004, 54.248243198352746 ]}}]},
        "-400713": {pack: 1423, score: 250, progress: [{attackers: {input: ["auto", 0, 0, "auto", 13, 1.25, "auto", 336, 17.916666666667, "cast", 362, 19.032666842143072, 4002, "cast", 362, 19.032666842143072, 4023, "cast", 372, 19.297666947047247, 4003, "auto", 421, 21.69766632715894, "auto", 508, 25.652006564880622, "cast", 600, 30.702006517196907, 4001, "auto", 600, 30.702006517196907]}}]},
        "-400813": {pack: 1142, score: 250, progress: [{attackers: {input: [ "auto", 0, 0, "cast", 253, 13.06999945640564, 4030, "cast", 322, 15.973085367088174, 4001, "cast", 354, 16.67308541477189, 4003, "cast", 383, 18.789085351829385, 4002, "auto", 401, 20.054086171989297, "auto", 411, 20.68708606899247, "cast", 439, 23.820086204413926, 4003, "auto", 439, 23.820086204413926]}}]},
        "-400913": {pack: 1101, score: 250, progress: [{attackers: {input: ["auto", 0, 0, "cast", 281, 16.37066668192579, 4001, "cast", 344, 20.070666729609506, 4003, "teamCustom", 344, 20.070666729609506, 2, "cast", 367, 20.552667080561655, 4002, "cast", 458, 24.640666901270883, 4010, "auto", 458, 24.640666901270883 ]}}]},
        "-400714": {pack: 1423, score: 250, progress: [{attackers: {input: [ "auto", 0, 0, "auto", 0, 0, "auto", 364, 18.35, "cast", 385, 19.399999952316286, 4023, "cast", 389, 19.482999897003175, 4002, "cast", 397, 19.732999897003175, 4003, "auto", 400, 19.799999809265138, "auto", 561, 26.438888888889, "cast", 654, 29.870888810687706, 4003, "cast", 665, 30.052888732486412, 4002, "auto", 674, 30.338888888889, "auto", 754, 34.93490703408838, "cast", 855, 41.150906875778446, 4003, "auto", 909, 46.881906822372684, "auto", 909, 46.881906822372684, "cast", 961, 57.3949065953982, 4003, "auto", 961, 57.3949065953982 ]}}]},
        "-400814": {pack: 1120, score: 250, progress: [{attackers: {input: [ "auto", 0, 0, "auto", 308, 16.338222229851397, "auto", 327, 16.799793650793, "auto", 367, 18.13279359547989 ]}}]},
        "-400914": {pack: 2300, score: 250, progress: [{attackers: {input: [ "auto", 0, 0, "auto", 22, 1.9099998474121094, "auto", 217, 11.296000480651855, "cast", 324, 17.442777453528734, 4011, "auto", 333, 17.908777533637377 ]}}]},
        "-400715": {pack: 1000, score: 250, progress: [{attackers: {input: ["auto", 270, 12.9, "cast", 316, 14.3, 4013, "cast", 359, 16.3, 4001, "auto", 386, 17.64]}}]},
        "-400815": {pack: 1020, score: 250, progress: [{attackers: {input: ["auto", 297, 14.3, "cast", 353, 16.5, 4002, "cast", 394, 17.7, 4023, "cast", 407, 18.2, 4003, "auto", 463, 21.2]}}]},
        "-400915": {pack: 1400, score: 250, progress: [{attackers: {input: ["auto", 0, 0, "auto", 0, 0, "auto", 306, 14.357692307693, "cast", 360, 18.205692357284065, 4003, "cast", 365, 18.449692315322395, 4002, "cast", 424, 20.468692368728156, 4001, "cast", 509, 25.473692483169074, 4002, "auto", 511, 25.49569255755567, "auto", 511, 25.49569255755567, "cast", 628, 30.51373553507932, 4013, "cast", 687, 32.9537353538812, 4003, "teamCustom", 752, 36.296735527449925, 2, "cast", 776, 38.41873550646909, 4001, "auto", 800, 40.29973531001218, "auto", 830, 42.843068643345, "auto", 863, 44.85606865478909]}}]}
    }

    /** Проверяет есть ли рандом в бою*/
    function getCountBattle(battle) {
        return Math.max(getCountBattleByTeam(battle.attackers),
                        getCountBattleByTeam(battle.defenders[0]));
    }

    /** Проверяет рандомная ли команда титанов*/
    function getCountBattleByTeam(team) {
        let countBattle = 0;
        for (let i in team) {
            let count = getCountBattleByTitan(i);
            if (count > countBattle) {
                countBattle = count;
            }
        }
        return countBattle;
    }

    /** Проверяет рандомный ли титан*/
    function getCountBattleByTitan(id) {
        return id == '4023' ? 1000 : id == '4021' ? 100 : id == '4041' ? 10 : 1;
    }

    /** Рассчитывает бой со случайным семенем*/
    function getDefPoints(battle) {
        return new Promise(function (resolve) {
            battle.seed = Math.floor(Date.now() / 1000) - random(0, 1e9);
            BattleCalc(battle, "get_titanClanPvp", e => resolve(defPoints(e.progress, battle)));
        });
    }

    /** Возвращает количество очков защиты за бой*/
    function defPoints(progress, battle) {
        let points = 50;
        let currentTitans = progress[0].attackers.heroes;
        let fullTitans = battle.attackers;
        for (let i in currentTitans) {
            points -= Math.ceil(10 * currentTitans[i].hp / fullTitans[i].hp);
        }
        return points;
    }

    /** Возвращает количество очков защиты за бой*/
    function attPoints(progress, battle) {
        let points = 250;
        let currentTitans = progress[0].defenders.heroes;
        let fullTitans = battle.defenders[0];
        for (let i in currentTitans) {
            points -= Math.ceil(50 * currentTitans[i].hp / fullTitans[i].hp);
        }
        return points;
    }

    function testTitanLord() {
        return new Promise((resolve, reject) => {
            popup.showBack();
            let titLord = new executeTitanLord(resolve, reject);
            titLord.start();
        });
    }

    /** Прохождение арены титанов */
    function executeTitanLord(resolve, reject) {
        let lords = [];
        let currentLord;
        let progress;
        let end = false;
        let elements = {
            7: {text: 'Вода  ', info: ''},
            8: {text: 'Огонь', info: ''},
            9: {text: 'Земля', info: ''}
        };

        let callsStart = {
            calls: [{
                name: "titanArenaGetStatus",
                args: {},
                ident: "titanArenaGetStatus"
            }]
        }

        this.start = function () {
            send(JSON.stringify(callsStart), startTitanArena);
        }

        function startTitanArena(data) {
            let titanArena = data.results[0].result.response;
            if (!titanArena.canUpdateDefenders) {
                console.log("Запущена автоатака Повелителей Стихий!");
                lords = getLords(titanArena.rivals);
                if (lords.length > 0) {
                    currentLord = lords.shift();
                    progress = [];
                    for (let i = 0; i < 1; i++) {
                        titanArenaStartBattle();
                    }
                } else {
                    showProgress();
                }
                return;
            }
            setProgress("Перед запуском обязательно закончите бои в защите!" , false, hideProgress);
            resolve();
        }

        /** Получаем список противников*/
        function getLords(rivals) {
            let lords = [];
            for (let n in rivals) {
                let rival = rivals[n];
                let power = parseInt(rival.power, 10);
                if (power > 1e6) {
                    let lordId = rival.userId;
                    let bestLord = bestLordBattle[lordId];
                    if (!!bestLord) {
                        let bestScore = rival.attackScore;
                        let lordElement = lordId.toString().slice(4, 5);
                        let lord = {
                            id: lordId,
                            pack: titansPack[bestLord.pack],
                            progress: bestLord.progress,
                            element: lordElement,
                            score: bestLord.score,
                            bestScore: bestScore,
                            countBattle: 0};
                        elements[lordElement].info = getLordInfo(lord);
                        if (bestScore < bestLord.score) {
                            lords.push(lord);
                        }
                    }
                }
            }
            return lords;
        }

        /** Выбор следующего повелителя для атаки */
        function attackNextLord() {

            if (currentLord.countBattle > 100) {
                return;
            }

            elements[currentLord.element].info = getLordInfo(currentLord);
            showProgress();
            if (lords.length > 0) {
                currentLord = lords.shift();
                progress = currentLord.progress;
                titanArenaStartBattle();
                return;
            }
            resolve();
        }

        /** Начало одиночной битвы */
        function titanArenaStartBattle() {
            let calls = [{
                name: "titanArenaStartBattle",
                args: {
                    rivalId: currentLord.id,
                    titans: currentLord.pack
                },
                ident: "body"
            }];
            send(JSON.stringify({calls}), calcResult);
        }

        /** Добавить повелителя обратно и перейти к следующему */
        function nextLord() {
            lords.push(currentLord);
            attackNextLord();
        }

        /** Расчет результатов боя */
        function calcResult(data) {
            //if (end) {
            //    return;
            //}
            let battle = data.results[0].result.response.battle;
            battle.progress = progress;
            currentLord.countBattle++;
            calcBattleResult(battle).then(resultCalcBattle, nextLord);
        }

        /** Обработка результатов расчета битвы */
        function resultCalcBattle(resultBattle) {
            let progr = resultBattle.progress;
            let battleData = resultBattle.battleData;
            let result = resultBattle.result;
            let attScore = attPoints(progr, battleData);

            //if (attScore == 250) {
            //    end = true;
            //    currentLord.bestScore = attScore;
            //    showLog('Побежден повелитель: ');
            //    elements[currentLord.element].info = getLordInfo(currentLord);
            //    showProgress();
            //    return;
            //}

            if (attScore > currentLord.bestScore) {
                titanArenaEndBattle({
                    progress: progr,
                    result: result,
                    rivalId: battleData.typeId
                });
                return;
            }
            nextLord();
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
            currentLord.bestScore = attackScore;
            if (attackScore < currentLord.score) {
                lords.push(currentLord);
                showLog('Проведен бой: ');
            } else {
                showLog('Побежден повелитель: ');
            }
            attackNextLord();
        }

        function showProgress() {
            let message = 'Прогресс боев с Повелителями: \r\n' +
                'Стихия      Очки      Бои \r\n';
            for (let i in elements) {
                message += elements[i].info + '\r\n';
            }
            setProgress(message, false, hideProgress);
        }

        function showLog(message) {
            console.log(message + getLordInfo(currentLord));
        }

        function getLordInfo(lord) {
            return ' ' + elements[lord.element].text + '  -  ' + (lord.bestScore + '/' + lord.score).fixed(7) + ',   ' + lord.countBattle.toString();
        }

        function calcBattleResult(battleData) {
            return new Promise(function (resolve, reject) {
                try {
                    BattleCalc(battleData, "get_titanClanPvp", resolve);
                } catch (error) {
                    reject();
                }
            });
        }
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
		let limitDungeonActivity = 150000;
        let countShowStats = 1;
		let fastMode = isChecked('fastMode');
		let end = false;

        let countTeam = [];
        let timeDungeon = {
			all: new Date().getTime(),
			findAttack: 0,
			attackNeutral: 0,
			attackEarthOrFire: 0
		}

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
            let activity = dungeonActivity - startDungeonActivity;
			titansStates = dungeonInfo.states.titans;
            if (activity / 1000 > countShowStats) {
                countShowStats++;
                showStats();
            }
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
            let start = new Date();
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
            let workTime = new Date().getTime() - start.getTime();
            timeDungeon.attackEarthOrFire += workTime;
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
                            ", recovery = " + (recovery > 0 ? "+" : "") + recovery.round(0) + "% \r\n", titans);
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
            let start = new Date();
            let recovery = -1000;
            let iterations = 0;
            let result;
            let correction = fastMode ? 0.01 : 0.001;
            for (let needRecovery = bestBattle.recovery; recovery < needRecovery; needRecovery -= correction, iterations++) {
                result = await startBattle(teamNum, attackerType, team);
                recovery = getRecovery(result);
            }
            bestBattle.recovery = recovery;
            let workTime = new Date().getTime() - start.getTime();
            timeDungeon.findAttack += workTime;
            return result;
		}

		/** Атакуем Нейтральной командой */
		async function attackNeutral(teamNum, attackerType) {
            let start = new Date();
            let factors = calcFactor();
            bestBattle.recovery = -0.2;
            await findBestBattleNeutral(teamNum, attackerType, factors, true)
            if (fastMode && (bestBattle.recovery < 0 || (bestBattle.recovery < 0.2 && factors[0].value < 0.5))) {
                let recovery = (100 * bestBattle.recovery).round(0);
                console.log("Не удалось найти удачный бой в быстром режиме: " + attackerType +
                            ", recovery = " + (recovery > 0 ? "+" : "") + recovery + "% \r\n", bestBattle.attackers);
                await findBestBattleNeutral(teamNum, attackerType, factors, false)
            }
            let workTime = new Date().getTime() - start.getTime();
            timeDungeon.attackNeutral += workTime;
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
                let team = getTeam(battleInfo.battleData.attackers).heroes;
                addTeam(team);
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

		/** Добавить команду титанов в общий список команд */
        function addTeam(team) {
            for (let i in countTeam) {
                if (equalsTeam(countTeam[i].team, team)) {
                    countTeam[i].count++;
                    return;
                }
            }
            countTeam.push({team: team, count: 1});
        }

		/** Сравнить команды на равенство */
        function equalsTeam(team1, team2) {
            if (team1.length == team2.length) {
                for (let i in team1) {
                    if (team1[i] != team2[i]) {
                        return false;
                    }
                }
                return true;
            }
            return false;
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
            let workTime = clone(timeDungeon);
            workTime.all = new Date().getTime() - workTime.all;
            for (let i in workTime) {
                workTime[i] = (workTime[i] / 1000).round(0);
            }
            countTeam.sort(function(a, b) {
                return b.count - a.count;
            });
            console.log(titansStates);
            console.log("Собрано титанита: ", activity);
            console.log("Скорость сбора: " + (3600 * activity / workTime.all).round(0) + " титанита/час");
            console.log("Время раскопок: ");
            for (let i in workTime) {
                console.log(i + ": ", workTime[i]+ " сек.");
            }
            console.log("Частота использования команд: ");
            for (let i in countTeam) {
                let teams = countTeam[i];
                console.log(teams.team + ": ", teams.count);
            }
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
			let tower = new executeTower(resolve, reject);
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
			battlePresets = new Game.BattlePresets(!!battleData.progress, !1, !0, Game.DataStorage[getFn(Game.DataStorage, 22)][getF(Game.BattleConfigStorage, battleConfig)](), !1);
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
			passBattle: function() {
				let BPP_4 = getProtoFn(Game.BattlePausePopup, 4);
				let oldPassBattle = Game.BattlePausePopup.prototype[BPP_4];
				Game.BattlePausePopup.prototype[BPP_4] = function (a) {
					if (isChecked('passBattle')) {
						Game.BattlePopup.prototype[getProtoFn(Game.BattlePausePopup, 4)].call(this, a);
						this[getProtoFn(Game.BattlePausePopup, 3)]();
						this[getProtoFn(Game.DisplayObjectContainer, 3)](this.clip[getProtoFn(Game.GuiClipContainer, 2)]());
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
			send(JSON.stringify(endBossBattleCall), e => {console.log(e);});
		}
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
				data.forEach((giftId, n) => {
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
					for (check of e.results) {
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
	/** Набить килов в горниле душ */
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
			let offerGetAll = data.results[0].result.response.filter(e => e.type == "reward" && !e?.freeRewardObtained);
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
					if (!isAllWin && isChecked('cancelBattle')) {
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
			let textCancel = raidData.cancelBattle ? ' Битв отменено: ' + raidData.cancelBattle : '';
			setProgress('Рейд прислужников завершен!' + textCancel, true);
			console.log(reason, info);
			resolve();
		}
	}
})();