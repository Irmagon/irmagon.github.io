// ==UserScript==
// @name			HWH
// @name:en			HWH
// @name:ru			HWH
// @namespace		HWH
// @version			2.084
// @description		Automation of actions for the game Hero Wars
// @description:en	Automation of actions for the game Hero Wars
// @description:ru	Автоматизация действий для игры Хроники Хаоса
// @author			ZingerY (forked by ThomasGaud)
// @license 		Copyright ZingerY
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
	/**
	 * Start script
	 *
	 * Стартуем скрипт
	 */
	console.log('Start ' + GM_info.script.name + ', v' + GM_info.script.version);
	/**
	 * Script info
	 *
	 * Информация о скрипте
	 */
	const scriptInfo = (({name, version, author, homepage, lastModified}, updateUrl, source) =>
		({name, version, author, homepage, lastModified, updateUrl, source}))
		(GM_info.script, GM_info.scriptUpdateURL, arguments.callee.toString());
	/**
	 * If we are on the gifts page, then we collect and send them to the server
	 *
	 * Если находимся на странице подарков, то собираем и отправляем их на сервер
	 */
	if (['www.solfors.com', 't.me'].includes(location.host)) {
		setTimeout(sendCodes, 2000);
		return;
	}
	/**
	 * Information for completing daily quests
	 *
	 * Информация для выполнения ежендевных квестов
	 */
	const questsInfo = {};
	/**
	 * Is the game data loaded
	 *
	 * Загружены ли данные игры
	 */
	let isLoadGame = false;
	/**
	 * Headers of the last request
	 *
	 * Заголовки последнего запроса
	 */
	let lastHeaders = {};
	/**
	 * Information about sent gifts
	 *
	 * Информация об отправленных подарках
	 */
	let freebieCheckInfo = null;
	/**
	 * User data
	 *
	 * Данные пользователя
	 */
	let userInfo;
	/**
	 * Original methods for working with AJAX
	 *
	 * Оригинальные методы для работы с AJAX
	 */
	const original = {
		open: XMLHttpRequest.prototype.open,
		send: XMLHttpRequest.prototype.send,
		setRequestHeader: XMLHttpRequest.prototype.setRequestHeader,
	};
	/**
	 * Decoder for converting byte data to JSON string
	 *
	 * Декодер для перобразования байтовых данных в JSON строку
	 */
	const decoder = new TextDecoder("utf-8");
	/**
	 * Stores a history of requests
	 *
	 * Хранит историю запросов
	 */
	let requestHistory = {};
	/**
	 * URL for API requests
	 *
	 * URL для запросов к API
	 */
	let apiUrl = '';

	/**
	 * Connecting to the game code
	 *
	 * Подключение к коду игры
	 */
	this.cheats = new hackGame();
	/**
	 * The function of calculating the results of the battle
	 *
	 * Функция расчета результатов боя
	 */
	this.BattleCalc = cheats.BattleCalc;
	/**
	 * Sending a request available through the console
	 *
	 * Отправка запроса доступная через консоль
	 */
	this.SendRequest = send;
	/**
	 * Simple combat calculation available through the console
	 *
	 * Простой расчет боя доступный через консоль
	 */
	this.Calc = function (data) {
		const type = getBattleType(data?.type);
		return new Promise((resolve, reject) => {
			try {
				BattleCalc(data, type, resolve);
			} catch (e) {
				reject(e);
			}
		})
	}
	/**
	 * Short asynchronous request
	 * Usage example (returns information about a character):
	 * const userInfo = await Send('{"calls":[{"name":"userGetInfo","args":{},"ident":"body"}]}')
	 *
	 * Короткий асинхронный запрос
	 * Пример использования (возвращает информацию о персонаже):
	 * const userInfo = await Send('{"calls":[{"name":"userGetInfo","args":{},"ident":"body"}]}')
	*/
	this.Send = function (json, pr) {
		return new Promise((resolve, reject) => {
			try {
				send(json, resolve, pr);
			} catch (e) {
				reject(e);
			}
		})
	}

	const i18nLangData = {
		/* English translation by BaBa */
		en: {
			/* Checkboxes */
			SKIP_FIGHTS: 'Skip battle',
			SKIP_FIGHTS_TITLE: 'Skip battle in Outland and the arena of the titans, auto-pass in the tower and campaign',
			ENDLESS_CARDS: 'Endless cards',
			ENDLESS_CARDS_TITLE: 'Endless Prediction Cards',
			AUTO_EXPEDITION: 'Auto Expedition',
			AUTO_EXPEDITION_TITLE: 'Auto-sending expeditions',
			CANCEL_FIGHT: 'Cancel battle',
			CANCEL_FIGHT_TITLE: 'The possibility of canceling the battle on VG',
			GIFTS: 'Gifts',
			GIFTS_TITLE: 'Collect gifts automatically',
			BATTLE_RECALCULATION: 'Battle recalculation',
			BATTLE_RECALCULATION_TITLE: 'Preliminary calculation of the battle',
			QUANTITY_CONTROL: 'Quantity control',
			QUANTITY_CONTROL_TITLE: 'Ability to specify the number of opened "lootboxes"',
			REPEAT_CAMPAIGN: 'Repeat missions',
			REPEAT_CAMPAIGN_TITLE: 'Auto-repeat battles in the campaign',
			DISABLE_DONAT: 'Disable donation',
			DISABLE_DONAT_TITLE: 'Removes all donation offers',
			DAILY_QUESTS: 'Daily quests',
			DAILY_QUESTS_TITLE: 'Complete daily quests',
			AUTO_QUIZ: 'AutoQuiz',
			AUTO_QUIZ_TITLE: 'Automatically receive correct answers to quiz questions',
			/* Input fields */
			HOW_MUCH_TITANITE: 'How much titanite to farm',
			COMBAT_SPEED: 'Combat Speed Multiplier',
			NUMBER_OF_TEST: 'Number of test fights',
			NUMBER_OF_AUTO_BATTLE: 'Number of auto-battle attempts',
			/* Buttons */
			RUN_SCRIPT: 'Run the',
			TO_DO_EVERYTHING: 'Do All',
			TO_DO_EVERYTHING_TITLE: 'Perform multiple actions of your choice',
			OUTLAND: 'Outland',
			OUTLAND_TITLE: 'Collect Outland',
			TITAN_ARENA: 'ToE',
			TITAN_ARENA_TITLE: 'Complete the titan arena',
			DUNGEON: 'Dungeon',
			DUNGEON_TITLE: 'Go through the dungeon',
			TOWER: 'Tower',
			TOWER_TITLE: 'Pass the tower',
			EXPEDITIONS: 'Expeditions',
			EXPEDITIONS_TITLE: 'Sending and collecting expeditions',
			SYNC: 'Sync',
			SYNC_TITLE: 'Partial synchronization of game data without reloading the page',
			ARCHDEMON: 'Archdemon',
			ARCHDEMON_TITLE: 'Hitting kills and collecting rewards',
			ESTER_EGGS: 'Easter eggs',
			ESTER_EGGS_TITLE: 'Collect all Easter eggs or rewards',
			REWARDS: 'Rewards',
			REWARDS_TITLE: 'Collect all quest rewards',
			MAIL: 'Mail',
			MAIL_TITLE: 'Collect all mail, except letters with energy and charges of the portal',
			MINIONS: 'Minions',
			MINIONS_TITLE: 'Attack minions with saved packs',
			ADVENTURE: 'Adventure',
			ADVENTURE_TITLE: 'Passes the adventure along the specified route',
			STORM: 'Storm',
			STORM_TITLE: 'Passes the Storm along the specified route',
			SANCTUARY: 'Sanctuary',
			SANCTUARY_TITLE: 'Fast travel to Sanctuary',
			GUILD_WAR: 'Guild War',
			GUILD_WAR_TITLE: 'Fast travel to Guild War',
			/* Misc */
			BOTTOM_URLS: '<a href="https://t.me/+0oMwICyV1aQ1MDAy" target="_blank">tg</a>',
			GIFTS_SENT: 'Gifts sent!',
			DO_YOU_WANT: "Do you really want to do this?",
			BTN_RUN: 'Run',
			BTN_CANCEL: 'Cancel',
			BTN_OK: 'OK',
			MSG_HAVE_BEEN_DEFEATED: 'You have been defeated!',
			BTN_AUTO: 'Auto',
			MSG_YOU_APPLIED: 'You applied',
			MSG_DAMAGE: 'damage',
			MSG_CANCEL_AND_STAT: 'Cancel and show statistic',
			MSG_REPEAT_MISSION: 'Repeat the mission?',
			BTN_REPEAT: 'Repeat',
			BTN_NO: 'No',
			MSG_SPECIFY_QUANT: 'Specify Quantity:',
			BTN_OPEN: 'Open',
			QUESTION_COPY: 'Question copied to clipboard',
			ANSWER_KNOWN: 'The answer is known',
			ANSWER_NOT_KNOWN: 'ATTENTION THE ANSWER IS NOT KNOWN',
			BEING_RECALC: 'The battle is being recalculated',
			THIS_TIME: 'This time',
			VICTORY: 'VICTORY',
			DEFEAT: 'DEFEAT',
			CHANCE_TO_WIN: "Chance to win",
			OPEN_DOLLS: 'nesting dolls recursively',
			SENT_QUESTION: 'Question sent',
			SETTINGS: 'Settings',
			MSG_BAN_ATTENTION: '<p style="color:red;">Using this feature may result in a ban.</p> Continue?',
			BTN_YES_I_AGREE: 'Yes, I understand the risks!',
			BTN_NO_I_AM_AGAINST: 'No, I refuse it!',
			VALUES: 'Values',
			EXPEDITIONS_SENT: 'Expeditions sent',
			TITANIT: 'Titanit',
			COMPLETED: 'completed',
			FLOOR: 'Floor',
			LEVEL: 'Уровень',
			BATTLES: 'battles',
			EVENT: 'Event',
			NOT_AVAILABLE: 'not available',
			NO_HEROES: 'No heroes',
			DAMAGE_AMOUNT: 'Damage amount',
			NOTHING_TO_COLLECT: 'Nothing to collect',
			COLLECTED: 'Collected',
			REWARD: 'rewards',
			REMAINING_ATTEMPTS: 'Remaining attempts',
			BATTLES_CANCELED: 'Battles canceled',
			MINION_RAID: 'Minion Raid',
			STOPPED: 'Stopped',
			REPETITIONS: 'Repetitions',
			MISSIONS_PASSED: 'Missions passed',
			STOP: 'stop',
			TOTAL_OPEN: 'Total open',
			OPEN: 'Open',
			ROUND_STAT: 'Damage statistics for ',
			BATTLE: 'battles',
			MINIMUM: 'Minimum',
			MAXIMUM: 'Maximum',
			AVERAGE: 'Average',
			NOT_THIS_TIME: 'Not this time',
			RETRY_LIMIT_EXCEEDED: 'Retry limit exceeded',
			SUCCESS: 'Success',
			RECEIVED: 'Received',
			LETTERS: 'letters',
			PORTALS: 'portals',
			ATTEMPTS: 'attempts',
			/* Quests */
			QUEST_10001: 'Upgrade the skills of heroes 3 times',
			QUEST_10002: 'Complete 10 missions',
			QUEST_10003: 'Complete 3 heroic missions',
			QUEST_10004: 'Fight 3 times in the Arena or Grand Arena',
			QUEST_10006: 'Use the exchange of emeralds 1 time',
			QUEST_10007: 'Open 1 chest',
			QUEST_10016: 'Send gifts to guildmates',
			QUEST_10018: 'Use an experience potion',
			QUEST_10019: 'Open 1 chest in the Tower',
			QUEST_10020: 'Open 3 chests in Outland',
			QUEST_10021: 'Collect 75 Titanite in the Guild Dungeon',
			QUEST_10021: 'Collect 150 Titanite in the Guild Dungeon',
			QUEST_10023: 'Upgrade Gift of the Elements by 1 level',
			QUEST_10024: 'Level up any artifact once',
			QUEST_10025: 'Start Expedition 1',
			QUEST_10026: 'Start 4 Expeditions',
			QUEST_10027: 'Win 1 battle of the Tournament of Elements',
			QUEST_10028: 'Level up any titan artifact',
			QUEST_10029: 'Unlock the Orb of Titan Artifacts',
			QUEST_10030: 'Upgrade any Skin of any hero 1 time',
			QUEST_10031: 'Win 6 battles of the Tournament of Elements',
			QUEST_10043: 'Start or Join an Adventure',
			QUEST_10044: 'Use Summon Pets 1 time',
			QUEST_10046: 'Open 3 chests in Adventure',
			QUEST_10047: 'Get 150 Guild Activity Points',
			NOTHING_TO_DO: 'Nothing to do',
			YOU_CAN_COMPLETE: 'You can complete quests',
			BTN_DO_IT: 'Do it',
			NOT_QUEST_COMPLETED: 'Not a single quest completed',
			COMPLETED_QUESTS: 'Completed quests',
			/* everything button */
			ASSEMBLE_OUTLAND: 'Assemble Outland',
			PASS_THE_TOWER: 'Pass the tower',
			CHECK_EXPEDITIONS: 'Check Expeditions',
			COMPLETE_TOE: 'Complete ToE',
			COMPLETE_DUNGEON: 'Complete the dungeon',
			COLLECT_MAIL: 'Collect mail',
			COLLECT_MISC: 'Collect Easter Eggs, Skin Gems, Arena Keys and Coins',
			COLLECT_QUEST_REWARDS: 'Collect quest rewards',
			MAKE_A_SYNC: 'Make a sync',

			RUN_FUNCTION: 'Run the following functions?',
			BTN_GO: 'Go!',
			PERFORMED: 'Performed',
			DONE: 'Done',
			ERRORS_OCCURRES: 'Errors occurred while executing',
			COPY_ERROR: 'Copy error information to clipboard',
			BTN_YES: 'Yes',
			ALL_TASK_COMPLETED: 'All tasks completed',

			UNKNOWN: 'unknown',
			ENTER_THE_PATH: 'Enter the path of adventure using commas or dashes',
			START_ADVENTURE: 'Start your adventure along this path!',
			BTN_CANCELED: 'Canceled',
			MUST_TWO_POINTS: 'The path must contain at least 2 points.',
			MUST_ONLY_NUMBERS: 'The path must contain only numbers and commas',
			NOT_ON_AN_ADVENTURE: 'You are not on an adventure',
			YOU_IN_NOT_ON_THE_WAY: 'Your location is not on the way',
			ATTEMPTS_NOT_ENOUGH: 'Your attempts are not enough to complete the path, continue?',
			YES_CONTINUE: 'Yes, continue!',
			NOT_ENOUGH_AP: 'Not enough action points',
			ATTEMPTS_ARE_OVER: 'The attempts are over',
			MOVES: 'Moves',
			BUFF_GET_ERROR: 'Buff getting error',
			BATTLE_END_ERROR: 'Battle end error',
			AUTOBOT: 'Autobot',
			FAILED_TO_WIN_AUTO: 'Failed to win the auto battle',
			ERROR_OF_THE_BATTLE_COPY: 'An error occurred during the passage of the battle<br>Copy the error to the clipboard?',
			ERROR_DURING_THE_BATTLE: 'Error during the battle',
			NO_CHANCE_WIN: 'No chance of winning this fight: 0/',
			LOST_HEROES: 'You have won, but you have lost one or several heroes',
			VICTORY_IMPOSSIBLE: 'Is victory impossible, should we focus on the result?',
			FIND_COEFF: 'Find the coefficient greater than',
			BTN_PASS: 'PASS',
			BRAWLS: 'Brawls',
			BRAWLS_TITLE: 'Activates the ability to auto-brawl',
			START_AUTO_BRAWLS: 'Start Auto Brawls?',
			LOSSES: 'Losses',
			WINS: 'Wins',
			FIGHTS: 'Fights',
			STAGE: 'Stage',
			DONT_HAVE_LIVES: 'You don\'t have lives',
		},
		ru: {
			/* Чекбоксы */
			SKIP_FIGHTS: 'Пропуск боев',
			SKIP_FIGHTS_TITLE: 'Пропуск боев в запределье и арене титанов, автопропуск в башне и кампании',
			ENDLESS_CARDS: 'Бесконечные карты',
			ENDLESS_CARDS_TITLE: 'Бесконечные карты предсказаний',
			AUTO_EXPEDITION: 'АвтоЭкспедиции',
			AUTO_EXPEDITION_TITLE: 'Автоотправка экспедиций',
			CANCEL_FIGHT: 'Отмена боя',
			CANCEL_FIGHT_TITLE: 'Возможность отмены боя на ВГ, СМ и в Асгарде',
			GIFTS: 'Подарки',
			GIFTS_TITLE: 'Собирать подарки автоматически',
			BATTLE_RECALCULATION: 'Прерасчет боя',
			BATTLE_RECALCULATION_TITLE: 'Предварительный расчет боя',
			QUANTITY_CONTROL: 'Контроль кол-ва',
			QUANTITY_CONTROL_TITLE: 'Возможность указывать количество открываемых "лутбоксов"',
			REPEAT_CAMPAIGN: 'Повтор в компании',
			REPEAT_CAMPAIGN_TITLE: 'Автоповтор боев в кампании',
			DISABLE_DONAT: 'Отключить донат',
			DISABLE_DONAT_TITLE: 'Убирает все предложения доната',
			DAILY_QUESTS: 'Ежедневные квесты',
			DAILY_QUESTS_TITLE: 'Выполнять ежедневные квесты',
			AUTO_QUIZ: 'АвтоВикторина',
			AUTO_QUIZ_TITLE: 'Автоматическое получение правильных ответов на вопросы викторины',
			/* Поля ввода */
			HOW_MUCH_TITANITE: 'Сколько фармим титанита',
			COMBAT_SPEED: 'Множитель ускорения боя',
			NUMBER_OF_TEST: 'Количество тестовых боев',
			NUMBER_OF_AUTO_BATTLE: 'Количество попыток автобоев',
			/* Кнопки */
			RUN_SCRIPT: 'Запустить скрипт',
			TO_DO_EVERYTHING: 'Автосбор',
			TO_DO_EVERYTHING_TITLE: 'Выполнить несколько действий',
			OUTLAND: 'Запределье',
			OUTLAND_TITLE: 'Собрать Запределье',
			TITAN_ARENA: 'Турнир',
			TITAN_ARENA_TITLE: 'Автопрохождение Турнира Стихий',
			DUNGEON: 'Подземелье',
			DUNGEON_TITLE: 'Автопрохождение подземелья',
			TOWER: 'Башня',
			TOWER_TITLE: 'Автопрохождение башни',
			EXPEDITIONS: 'Экспедиции',
			EXPEDITIONS_TITLE: 'Отправка и сбор экспедиций',
			SYNC: 'Обновить',
			SYNC_TITLE: 'Частичная синхронизация данных игры без перезагрузки сатраницы',
			ARCHDEMON: 'Архидемон',
			ARCHDEMON_TITLE: 'Набивает килы и собирает награду',
			ESTER_EGGS: 'Пасхалки',
			ESTER_EGGS_TITLE: 'Собрать все пасхалки или награды',
			REWARDS: 'Награды',
			REWARDS_TITLE: 'Собрать все награды за задания',
			MAIL: 'Почта',
			MAIL_TITLE: 'Собрать всю почту, кроме писем с энергией и зарядами портала',
			MINIONS: 'Прислужники',
			MINIONS_TITLE: 'Атакует прислужников сохраннеными пачками',
			ADVENTURE: 'Приключение',
			ADVENTURE_TITLE: 'Проходит приключение по указанному маршруту',
			STORM: 'Приключение',
			STORM_TITLE: 'Проходит приключение по указанному маршруту',
			SANCTUARY: 'Святилище',
			SANCTUARY_TITLE: 'Быстрый переход к Святилищу',
			GUILD_WAR: 'Война',
			GUILD_WAR_TITLE: 'Быстрый переход к Войне гильдий',
			/* Разное */
			BOTTOM_URLS: '<a href="https://t.me/+q6gAGCRpwyFkNTYy" target="_blank">tg</a> <a href="https://vk.com/invite/YNPxKGX" target="_blank">vk</a>',
			GIFTS_SENT: 'Подарки отправлены!',
			DO_YOU_WANT: "Вы действительно хотите это сделать?",
			BTN_RUN: 'Запускай',
			BTN_CANCEL: 'Отмена',
			BTN_OK: 'Ок',
			MSG_HAVE_BEEN_DEFEATED: 'Вы потерпели поражение!',
			BTN_AUTO: 'Авто',
			MSG_YOU_APPLIED: 'Вы нанесли',
			MSG_DAMAGE: 'урона',
			MSG_CANCEL_AND_STAT: 'Отменить и показать Статистику',
			MSG_REPEAT_MISSION: 'Повторить миссию?',
			BTN_REPEAT: 'Повторить',
			BTN_NO: 'Нет',
			MSG_SPECIFY_QUANT: 'Указать количество:',
			BTN_OPEN: 'Открыть',
			QUESTION_COPY: 'Вопрос скопирован в буфер обмена',
			ANSWER_KNOWN: 'Ответ известен',
			ANSWER_NOT_KNOWN: 'ВНИМАНИЕ ОТВЕТ НЕ ИЗВЕСТЕН',
			BEING_RECALC: 'Идет прерасчет боя',
			THIS_TIME: 'На этот раз',
			VICTORY: 'ПОБЕДА',
			DEFEAT: 'ПОРАЖЕНИЕ',
			CHANCE_TO_WIN: 'Шансы на победу',
			OPEN_DOLLS: 'матрешек рекурсивно',
			SENT_QUESTION: 'Вопрос отправлен',
			SETTINGS: 'Настройки',
			MSG_BAN_ATTENTION: '<p style="color:red;">Использование этой функции может привести к бану.</p> Продолжить?',
			BTN_YES_I_AGREE: 'Да, я беру на себя все риски!',
			BTN_NO_I_AM_AGAINST: 'Нет, я отказываюсь от этого!',
			VALUES: 'Значения',
			EXPEDITIONS_SENT: 'Экспедиции отправлены',
			TITANIT: 'Титанит',
			COMPLETED: 'завершено',
			FLOOR: 'Этаж',
			LEVEL: 'Уровень',
			BATTLES: 'бои',
			EVENT: 'Эвент',
			NOT_AVAILABLE: 'недоступен',
			NO_HEROES: 'Нет героев',
			DAMAGE_AMOUNT: 'Количество урона',
			NOTHING_TO_COLLECT: 'Нечего собирать',
			COLLECTED: 'Собрано',
			REWARD: 'наград',
			REMAINING_ATTEMPTS: 'Осталось попыток',
			BATTLES_CANCELED: 'Битв отменено',
			MINION_RAID: 'Рейд прислужников',
			STOPPED: 'Остановлено',
			REPETITIONS: 'Повторений',
			MISSIONS_PASSED: 'Миссий пройдено',
			STOP: 'остановить',
			TOTAL_OPEN: 'Всего открыто',
			OPEN: 'Открыто',
			ROUND_STAT: 'Статистика урона за',
			BATTLE: 'боев',
			MINIMUM: 'Минимальный',
			MAXIMUM: 'Максимальный',
			AVERAGE: 'Средний',
			NOT_THIS_TIME: 'Не в этот раз',
			RETRY_LIMIT_EXCEEDED: 'Превышен лимит попыток',
			SUCCESS: 'Успех',
			RECEIVED: 'Получено',
			LETTERS: 'писем',
			PORTALS: 'порталов',
			ATTEMPTS: 'попыток',
			QUEST_10001: 'Улучши умения героев 3 раза',
			QUEST_10002: 'Пройди 10 миссий',
			QUEST_10003: 'Пройди 3 героические миссии',
			QUEST_10004: 'Сразись 3 раза на Арене или Гранд Арене',
			QUEST_10006: 'Используй обмен изумрудов 1 раз',
			QUEST_10007: 'Открой 1 сундук',
			QUEST_10016: 'Отправь подарки согильдийцам',
			QUEST_10018: 'Используй зелье опыта',
			QUEST_10019: 'Открой 1 сундук в Башне',
			QUEST_10020: 'Открой 3 сундука в Запределье',
			QUEST_10021: 'Собери 75 Титанита в Подземелье Гильдии',
			QUEST_10021: 'Собери 150 Титанита в Подземелье Гильдии',
			QUEST_10023: 'Прокачай Дар Стихий на 1 уровень',
			QUEST_10024: 'Повысь уровень любого артефакта один раз',
			QUEST_10025: 'Начни 1 Экспедицию',
			QUEST_10026: 'Начни 4 Экспедиции',
			QUEST_10027: 'Победи в 1 бою Турнира Стихий',
			QUEST_10028: 'Повысь уровень любого артефакта титанов',
			QUEST_10029: 'Открой сферу артефактов титанов',
			QUEST_10030: 'Улучши облик любого героя 1 раз',
			QUEST_10031: 'Победи в 6 боях Турнира Стихий',
			QUEST_10043: 'Начни или присоеденись к Приключению',
			QUEST_10044: 'Воспользуйся призывом питомцев 1 раз',
			QUEST_10046: 'Открой 3 сундука в Приключениях',
			QUEST_10047: 'Набери 150 очков активности в Гильдии',
			NOTHING_TO_DO: 'Нечего выполнять',
			YOU_CAN_COMPLETE: 'Можно выполнить квесты',
			BTN_DO_IT: 'Выполняй',
			NOT_QUEST_COMPLETED: 'Ни одного квеста не выполенно',
			COMPLETED_QUESTS: 'Выполенно квестов',
			/* everything button */
			ASSEMBLE_OUTLAND: 'Собрать Запределье',
			PASS_THE_TOWER: 'Пройти башню',
			CHECK_EXPEDITIONS: 'Проверить экспедиции',
			COMPLETE_TOE: 'Пройти Турнир Стихий',
			COMPLETE_DUNGEON: 'Пройти подземелье',
			COLLECT_MAIL: 'Собрать почту',
			COLLECT_MISC: 'Собрать пасхалки, камни облика, ключи и монеты арены',
			COLLECT_QUEST_REWARDS: 'Собрать награды за квесты',
			MAKE_A_SYNC: 'Сделать синхронизацю',

			RUN_FUNCTION: 'Выполнить следующие функции?',
			BTN_GO: 'Погнали!',
			PERFORMED: 'Выполняется',
			DONE: 'Выполено',
			ERRORS_OCCURRES: 'Призошли ошибки при выполнении',
			COPY_ERROR: 'Скопировать в буфер информацию об ошибке',
			BTN_YES: 'Да',
			ALL_TASK_COMPLETED: 'Все задачи выполнены',

			UNKNOWN: 'Неизвестно',
			ENTER_THE_PATH: 'Введите путь приключения через запятые или дефисы',
			START_ADVENTURE: 'Начать приключение по этому пути!',
			BTN_CANCELED: 'Отменено',
			MUST_TWO_POINTS: 'Путь должен состоять минимум из 2х точек',
			MUST_ONLY_NUMBERS: 'Путь должен содержать только цифры и запятые',
			NOT_ON_AN_ADVENTURE: 'Вы не в приключении',
			YOU_IN_NOT_ON_THE_WAY: 'Указанный путь должен включать точку вашего положения',
			ATTEMPTS_NOT_ENOUGH: 'Ваших попыток не достаточно для завершения пути, продолжить?',
			YES_CONTINUE: 'Да, продолжай!',
			NOT_ENOUGH_AP: 'Попыток не достаточно',
			ATTEMPTS_ARE_OVER: 'Попытки закончились',
			MOVES: 'Ходы',
			BUFF_GET_ERROR: 'Ошибка при получении бафа',
			BATTLE_END_ERROR: 'Ошибка завершения боя',
			AUTOBOT: 'АвтоБой',
			FAILED_TO_WIN_AUTO: 'Не удалось победить в автобою',
			ERROR_OF_THE_BATTLE_COPY: 'Призошли ошибка в процессе прохождения боя<br>Скопировать ошибку в буфер обмена?',
			ERROR_DURING_THE_BATTLE: 'Ошибка в процессе прохождения боя',
			NO_CHANCE_WIN: 'Нет шансов победить в этом бою: 0/',
			LOST_HEROES: 'Вы победили, но потеряли одного или несколько героев!',
			VICTORY_IMPOSSIBLE: 'Победа не возможна, бъем на результат?',
			FIND_COEFF: 'Поиск коэффициента больше чем',
			BTN_PASS: 'ПРОПУСК',
			BRAWLS: 'Потасовки',
			BRAWLS_TITLE: 'Включает возможность автопотасовок',
			START_AUTO_BRAWLS: 'Запустить Автопотасовки?',
			LOSSES: 'Поражений',
			WINS: 'Побед',
			FIGHTS: 'Боев',
			STAGE: 'Стадия',
			DONT_HAVE_LIVES: 'У Вас нет жизней',
		}
	}

	let selectLang = 'en';
	function checkLang() {
		const html = document.querySelector('html')
		const isFacebook = location.pathname.includes('facebook');
		const browserLang = (navigator.language || navigator.userLanguage).substr(0, 2);
		if (
			(html && html.lang == 'ru') ||
			(isFacebook && browserLang == 'ru')
		) {
			selectLang = 'ru';
		} else {
			selectLang = 'en';
		}
	}
	checkLang();

	this.I18N = function (constant) {
		if (constant && constant in i18nLangData[selectLang]) {
			return i18nLangData[selectLang][constant];
		}
		return `% ${constant} %`;
	};

	/**
	 * Checkboxes
	 *
	 * Чекбоксы
	 */
	const checkboxes = {
		passBattle: {
			label: I18N('SKIP_FIGHTS'),
			cbox: null,
			title: I18N('SKIP_FIGHTS_TITLE'),
			default: false
		},
		endlessCards: {
			label: I18N('ENDLESS_CARDS'),
			cbox: null,
			title: I18N('ENDLESS_CARDS_TITLE'),
			default: true
		},
		sendExpedition: {
			label: I18N('AUTO_EXPEDITION'),
			cbox: null,
			title: I18N('AUTO_EXPEDITION_TITLE'),
			default: true
		},
		cancelBattleBan: {
			label: I18N('CANCEL_FIGHT'),
			cbox: null,
			title: I18N('CANCEL_FIGHT_TITLE'),
			default: false,
		},
		preCalcBattle: {
			label: I18N('BATTLE_RECALCULATION'),
			cbox: null,
			title: I18N('BATTLE_RECALCULATION_TITLE'),
			default: false
		},
		countControl: {
			label: I18N('QUANTITY_CONTROL'),
			cbox: null,
			title: I18N('QUANTITY_CONTROL_TITLE'),
			default: true
		},
		repeatMission: {
			label: I18N('REPEAT_CAMPAIGN'),
			cbox: null,
			title: I18N('REPEAT_CAMPAIGN_TITLE'),
			default: false
		},
		noOfferDonat: {
			label: I18N('DISABLE_DONAT'),
			cbox: null,
			title: I18N('DISABLE_DONAT_TITLE'),
			/**
			 * A crutch to get the field before getting the character id
			 *
			 * Костыль чтоб получать поле до получения id персонажа
			 */
			default: (() => {
				$result = false;
				try {
					$result = JSON.parse(localStorage[GM_info.script.name + ':noOfferDonat'])
				} catch(e) {
					$result = false;
				}
				return $result || false;
			})(),
		},
		dailyQuests: {
			label: I18N('DAILY_QUESTS'),
			cbox: null,
			title: I18N('DAILY_QUESTS_TITLE'),
			default: false
		},
		/*
		autoBrawls: {
			label: I18N('BRAWLS'),
			cbox: null,
			title: I18N('BRAWLS_TITLE'),
			default: (() => {
				$result = false;
				try {
					$result = JSON.parse(localStorage[GM_info.script.name + ':autoBrawls'])
				} catch (e) {
					$result = false;
				}
				return $result || false;
			})(),
		}
		*/
		/*
		getAnswer: {
			label: I18N('AUTO_QUIZ'),
			cbox: null,
			title: I18N('AUTO_QUIZ_TITLE'),
			default: false
		}
		*/
	};
	/**
	 * Get checkbox state
	 *
	 * Получить состояние чекбокса
	 */
	function isChecked(checkBox) {
		if (!(checkBox in checkboxes)) {
			return false;
		}
		return checkboxes[checkBox].cbox?.checked;
	}
	/**
	 * Input fields
	 *
	 * Поля ввода
	 */
	const inputs = {
		countTitanit: {
			input: null,
			title: I18N('HOW_MUCH_TITANITE'),
			default: 150,
		},
		speedBattle: {
			input: null,
			title: I18N('COMBAT_SPEED'),
			default: 10,
		},
		countTestBattle: {
			input: null,
			title: I18N('NUMBER_OF_TEST'),
			default: 10,
		},
		countAutoBattle: {
			input: null,
			title: I18N('NUMBER_OF_AUTO_BATTLE'),
			default: 10,
		}
	}
	/**
	 * Checks the checkbox
	 *
	 * Поплучить данные поля ввода
	 */
	function getInput(inputName) {
		return inputs[inputName].input.value;
	}
	/**
	 * Button List
	 *
	 * Список кнопочек
	 */
	const buttons = {
        newDay: {
			name: I18N('SYNC'),
			title: I18N('SYNC_TITLE'),
			func: cheats.refreshGame
		},
		questAllFarm: {
			name: I18N('REWARDS'),
			title: I18N('REWARDS_TITLE'),
			func: questAllFarm
		},
		sendExpedition: {
			name: I18N('EXPEDITIONS'),
			title: I18N('EXPEDITIONS_TITLE'),
			func: checkExpedition
		},
		mailGetAll: {
			name: I18N('MAIL'),
			title: I18N('MAIL_TITLE'),
			func: mailGetAll
		},
		/*
		getOutland: {
			name: I18N('OUTLAND'),
			title: I18N('OUTLAND_TITLE'),
			func: function () {
				confShow(`${I18N('RUN_SCRIPT')} ${I18N('OUTLAND')}?`, getOutland);
			},
		},
		*/
		testTitanArena: {
			name: I18N('TITAN_ARENA'),
			title: I18N('TITAN_ARENA_TITLE'),
			func: testTitanArena
		},
		testDungeon: {
			name: I18N('DUNGEON'),
			title: I18N('DUNGEON_TITLE'),
			func: function () {
				confShow(`${I18N('RUN_SCRIPT')} ${I18N('DUNGEON')}?`, testDungeon);
			},
		},
		/*
		testTower: {
			name: I18N('TOWER'),
			title: I18N('TOWER_TITLE'),
			func: function () {
				confShow(`${I18N('RUN_SCRIPT')} ${I18N('TOWER')}?`, testTower);
			},
		},
		*/

		/*
		bossRatingEvent: {
			name: I18N('ARCHDEMON'),
			title: I18N('ARCHDEMON_TITLE'),
			func: function () {
				confShow(`${I18N('RUN_SCRIPT')} ${I18N('ARCHDEMON')}?`, bossRatingEvent);
			},
		},
		*/
		/*
		offerFarmAllReward: {
			name: I18N('ESTER_EGGS'),
			title: I18N('ESTER_EGGS_TITLE'),
			func: function () {
				confShow(`${I18N('RUN_SCRIPT')} ${I18N('ESTER_EGGS')}?`, offerFarmAllReward);
			},
		},
		*/

		testRaidNodes: {
			name: I18N('MINIONS'),
			title: I18N('MINIONS_TITLE'),
			func: function () {
				confShow(`${I18N('RUN_SCRIPT')} ${I18N('MINIONS')}?`, testRaidNodes);
			},
		},
		testAdventure: {
			name: I18N('ADVENTURE'),
			title: I18N('ADVENTURE_TITLE'),
			func: () => {
				testAdventure();
			},
		},
		/*
		testSoloAdventure: {
			name: I18N('STORM'),
			title: I18N('STORM_TITLE'),
			func: () => {
				testAdventure('solo');
			},
		},
		*/
		goToSanctuary: {
			name: I18N('SANCTUARY'),
			title: I18N('SANCTUARY_TITLE'),
			func: cheats.goSanctuary,
		},
		goToClanWar: {
			name: I18N('GUILD_WAR'),
			title: I18N('GUILD_WAR_TITLE'),
			func: cheats.goClanWar,
		},
		getOutland: {
			name: I18N('TO_DO_EVERYTHING'),
			title: I18N('TO_DO_EVERYTHING_TITLE'),
			func: testDoYourBest,
		},
	}
	/**
	 * Display buttons
	 *
	 * Вывести кнопочки
	 */
	function addControlButtons() {
		for (let name in buttons) {
			button = buttons[name];
			button['button'] = scriptMenu.addButton(button.name, button.func, button.title);
		}
	}
	/**
	 * Adds links
	 *
	 * Добавляет ссылки
	 */
	function addBottomUrls() {
		scriptMenu.addHeader(I18N('BOTTOM_URLS'));
	}
	/**
	 * Stop repetition of the mission
	 *
	 * Остановить повтор миссии
	 */
	let isStopSendMission = false;
	/**
	 * There is a repetition of the mission
	 *
	 * Идет повтор миссии
	 */
	let isSendsMission = false;
	/**
	 * Data on the past mission
	 *
	 * Данные о прошедшей мисии
	 */
	let lastMissionStart = {}

	/**
	 * Data on the past attack on the boss
	 *
	 * Данные о прошедшей атаке на босса
	 */
	let lastBossBattle = {}
	/**
	 * Data for calculating the last battle with the boss
	 *
	 * Данные для расчете последнего боя с боссом
	 */
	let lastBossBattleInfo = null;
	/**
	 * Ability to cancel the battle in Asgard
	 *
	 * Возможность отменить бой в Астгарде
	 */
	let isCancalBossBattle = true;
	/**
	 * Information about the last battle
	 *
	 * Данные о прошедшей битве
	 */
	let lastBattleArg = {}
	/**
	 * The name of the function of the beginning of the battle
	 *
	 * Имя функции начала боя
	 */
	let nameFuncStartBattle = '';
	/**
	 * The name of the function of the end of the battle
	 *
	 * Имя функции конца боя
	 */
	let nameFuncEndBattle = '';
	/**
	 * Data for calculating the last battle
	 *
	 * Данные для расчета последнего боя
	 */
	let lastBattleInfo = null;
	/**
	 * The ability to cancel the battle
	 *
	 * Возможность отменить бой
	 */
	let isCancalBattle = true;

	/**
	 * Certificator of the last open nesting doll
	 *
	 * Идетификатор последней открытой матрешки
	 */
	let lastRussianDollId = null;
	/**
	 * Cancel the training guide
	 *
	 * Отменить обучающее руководство
	 */
	this.isCanceledTutorial = false;

	/**
	 * Data from the last question of the quiz
	 *
	 * Данные последнего вопроса викторины
	 */
	let lastQuestion = null;
	/**
	 * Answer to the last question of the quiz
	 *
	 * Ответ на последний вопрос викторины
	 */
	let lastAnswer = null;
	/**
	 * Flag for opening keys or titan artifact spheres
	 *
	 * Флаг открытия ключей или сфер артефактов титанов
	 */
	let artifactChestOpen = false;
	/**
	 * The name of the function to open keys or orbs of titan artifacts
	 *
	 * Имя функции открытия ключей или сфер артефактов титанов
	 */
	let artifactChestOpenCallName = '';

	/**
	 * Brawl pack
	 *
	 * Пачка для потасовок
	 */
	let brawlsPack = null;
	/**
	 * Autobrawl started
	 *
	 * Автопотасовка запущена
	 */
	let isBrawlsAutoStart = false;

	/**
	 * Copies the text to the clipboard
	 *
	 * Копирует тест в буфер обмена
	 * @param {*} text copied text // копируемый текст
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
	/**
	 * Returns the history of requests
	 *
	 * Возвращает историю запросов
	 */
	this.getRequestHistory = function() {
		return requestHistory;
	}
	/**
	 * Generates a random integer from min to max
	 *
	 * Гененирует случайное целое число от min до max
	 */
	const random = function (min, max) {
		return Math.floor(Math.random() * (max - min + 1) + min);
	}
	/**
	 * Clearing the request history
	 *
	 * Очистка истоии запросов
	 */
	setInterval(function () {
		let now = Date.now();
		for (let i in requestHistory) {
			if (now - i > 300000) {
				delete requestHistory[i];
			}
		}
	}, 300000);
	/**
	 * DOM Loading Event page
	 *
	 * Событие загрузки DOM дерева страницы
	 */
	document.addEventListener("DOMContentLoaded", () => {
		/**
		 * Create the script interface
		 *
		 * Создание интерфеса скрипта
		 */
		createInterface();
	});
	/**
	 * Gift codes collecting and sending codes
	 *
	 * Сбор и отправка кодов подарков
	 */
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
	/**
	 * Checking sent codes
	 *
	 * Проверка отправленных кодов
	 */
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
	/**
	 * Sending codes
	 *
	 * Отправка кодов
	 */
	function sendGiftsCodes(codes) {
		fetch('https://zingery.ru/heroes/setGifts.php', {
			method: 'POST',
			body: JSON.stringify(codes)
		}).then(
			response => response.json()
		).then(
			data => {
				if (data.result) {
					console.log(I18N('GIFTS_SENT'));
				}
			}
		)
	}
	/**
	 * Displays the dialog box
	 *
	 * Отображает диалоговое окно
	 */
	function confShow(message, yesCallback, noCallback) {
		let buts = [];
		message = message || I18N('DO_YOU_WANT');
		noCallback = noCallback || (() => {});
		if (yesCallback) {
			buts = [
				{ msg: I18N('BTN_RUN'), result: true},
				{ msg: I18N('BTN_CANCEL'), result: false},
			]
		} else {
			yesCallback = () => {};
			buts = [
				{ msg: I18N('BTN_OK'), result: true},
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
	/**
	 * Overriding/Proxying the Ajax Request Creation Method
	 *
	 * Переопределяем/проксируем метод создания Ajax запроса
	 */
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
	/**
	 * Overriding/Proxying the header setting method for the AJAX request
	 *
	 * Переопределяем/проксируем метод установки заголовков для AJAX запроса
	 */
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
	/**
	 * Overriding/Proxying the AJAX Request Sending Method
	 *
	 * Переопределяем/проксируем метод отправки AJAX запроса
	 */
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
			/**
			 * Game loading event
			 *
			 * Событие загрузки игры
			 */
			if (headers["X-Request-Id"] > 2 && !isLoadGame) {
				isLoadGame = true;
				await openOrMigrateDatabase(userInfo.id);
				addControls();
				addControlButtons();
				addBottomUrls();

				if (isChecked('sendExpedition')) {
					checkExpedition();
				}

				checkSendGifts();
				getAutoGifts();

				cheats.activateHacks();

				justInfo();
				if (isChecked('dailyQuests')) {
					testDailyQuests();
				}
			}
			/**
			 * Outgoing request data processing
			 *
			 * Обработка данных исходящего запроса
			 */
			sourceData = await checkChangeSend.call(this, sourceData, tempData);
			/**
			 * Handling incoming request data
			 *
			 * Обработка данных входящего запроса
			 */
			const oldReady = this.onreadystatechange;
			this.onreadystatechange = function (e) {
				if(this.readyState == 4 && this.status == 200) {
					isTextResponse = this.responseType != "json";
					let response = isTextResponse ? this.responseText : this.response;
					requestHistory[this.uniqid].response = response;
					/**
					 * Replacing incoming request data
					 *
					 * Заменна данных входящего запроса
					 */
					if (isTextResponse) {
						checkChangeResponse.call(this, response);
					}
					/**
					 * A function to run after the request is executed
					 *
					 * Функция запускаемая после выполения запроса
					 */
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
	/**
	 * Processing and substitution of outgoing data
	 *
	 * Обработка и подмена исходящих данных
	 */
	async function checkChangeSend(sourceData, tempData) {
		try {
			/**
			 * A function that replaces battle data with incorrect ones to cancel combatя
			 *
			 * Функция заменяющая данные боя на неверные для отмены боя
			 */
			const fixBattle = function (heroes) {
				for (const ids in heroes) {
					hero = heroes[ids];
					hero.energy = random(1, 999);
					if (hero.hp > 0) {
						hero.hp = random(1, hero.hp);
					}
				}
			}
			/**
			 * Dialog window 2
			 *
			 * Диалоговое окно 2
			 */
			const showMsg = async function (msg, ansF, ansS) {
				if (typeof popup == 'object') {
					return await popup.confirm(msg, [
						{msg: ansF, result: false},
						{msg: ansS, result: true},
					]);
				} else {
					return !confirm(`${msg}\n ${ansF} (${I18N('BTN_OK')})\n ${ansS} (${I18N('BTN_CANCEL')})`);
				}
			}
			/**
			 * Dialog window 3
			 *
			 * Диалоговое окно 3
			 */
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
				if (!artifactChestOpen) {
					requestHistory[this.uniqid].calls[call.name] = call.ident;
				}
				/**
				 * Cancellation of the battle in adventures, on VG and with minions of Asgard
				 * Отмена боя в приключениях, на ВГ и с прислужниками Асгарда
				 */
				if ((call.name == 'adventure_endBattle' ||
					call.name == 'adventureSolo_endBattle' ||
					call.name == 'clanWarEndBattle' && isChecked('cancelBattleBan') ||
					call.name == 'crossClanWar_endBattle' && isChecked('cancelBattleBan') ||
					call.name == 'brawl_endBattle' ||
					call.name == 'towerEndBattle' ||
					call.name == 'clanRaid_endNodeBattle') &&
					isCancalBattle) {
					nameFuncEndBattle = call.name;
					if (!call.args.result.win) {
						let resultPopup = false;
						if (call.name == 'adventure_endBattle' ||
							call.name == 'adventureSolo_endBattle') {
							resultPopup = await showMsgs(I18N('MSG_HAVE_BEEN_DEFEATED'), I18N('BTN_OK'), I18N('BTN_CANCEL'), I18N('BTN_AUTO'));
						} else {
							resultPopup = await showMsg(I18N('MSG_HAVE_BEEN_DEFEATED'), I18N('BTN_OK'), I18N('BTN_CANCEL'));
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
					} else if (call.args.result.stars < 3 && call.name == 'towerEndBattle') {
						resultPopup = await showMsg(I18N('LOST_HEROES'), I18N('BTN_OK'), I18N('BTN_CANCEL'));
						if (resultPopup) {
							fixBattle(call.args.progress[0].attackers.heroes);
							fixBattle(call.args.progress[0].defenders.heroes);
							changeRequest = true;
						}
					}
					/*
					if (isChecked('autoBrawls') && !isBrawlsAutoStart && call.name == 'brawl_endBattle') {
						if (await popup.confirm(I18N('START_AUTO_BRAWLS'), [
							{ msg: I18N('BTN_NO'), result: false },
							{ msg: I18N('BTN_YES'), result: true },
						])) {
							this.onReadySuccess = testBrawls;
							isBrawlsAutoStart = true;
						}
					}
					*/
				}
				/**
				 * Save pack for Brawls
				 *
				 * Сохраняем пачку для потасовок
				 */
				if (call.name == 'brawl_startBattle') {
					console.log(JSON.stringify(call.args));
					brawlsPack = call.args.heroes;
				}
				/**
				 * Canceled fight in Asgard
				 * Отмена боя в Асгарде
				 */
				if (call.name == 'clanRaid_endBossBattle' &&
					isCancalBossBattle &&
					isChecked('cancelBattleBan')) {
					bossDamage = call.args.progress[0].defenders.heroes[1].extra;
					sumDamage = bossDamage.damageTaken + bossDamage.damageTakenNextLevel;
					let resultPopup = await showMsgs(
						`${I18N('MSG_YOU_APPLIED')} ${sumDamage.toLocaleString()} ${I18N('MSG_DAMAGE')}.`,
						I18N('BTN_OK'), I18N('BTN_CANCEL'), I18N('MSG_CANCEL_AND_STAT'))
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
				/**
				 * Save the Asgard Boss Attack Pack
				 * Сохраняем пачку для атаки босса Асгарда
				 */
				if (call.name == 'clanRaid_startBossBattle') {
					lastBossBattle = call.args;
				}
				/**
				 * Saving the request to start the last battle
				 * Сохранение запроса начала последнего боя
				 */
				if (call.name == 'clanWarAttack' ||
					call.name == 'crossClanWar_startBattle' ||
					call.name == 'adventure_turnStartBattle') {
					nameFuncStartBattle = call.name;
					lastBattleArg = call.args;
				}
				/**
				 * Disable spending divination cards
				 * Отключить трату карт предсказаний
				 */
				if (call.name == 'dungeonEndBattle') {
					if (isChecked('endlessCards') && call.args.isRaid) {
						delete call.args.isRaid;
						changeRequest = true;
					}
				}
				/**
				 * Quiz Answer
				 * Ответ на викторину
				 */
				if (call.name == 'quizAnswer') {
					/**
					 * Automatically changes the answer to the correct one if there is one.
					 * Автоматически меняет ответ на правильный если он есть
					 */
					if (lastAnswer && isChecked('getAnswer')) {
						call.args.answerId = lastAnswer;
						lastAnswer = null;
						changeRequest = true;
					}
				}
				/**
				 * Present
				 * Подарки
				 */
				if (call.name == 'freebieCheck') {
					freebieCheckInfo = call;
				}
				/**
				 * Getting mission data for auto-repeat
				 * Получение данных миссии для автоповтора
				 */
				if (isChecked('repeatMission') &&
					call.name == 'missionEnd') {
					let missionInfo = {
						id: call.args.id,
						result: call.args.result,
						heroes: call.args.progress[0].attackers.heroes,
						count: 0,
					}
					setTimeout(async () => {
						if (!isSendsMission && await popup.confirm(I18N('MSG_REPEAT_MISSION'), [
								{ msg: I18N('BTN_REPEAT'), result: true},
								{ msg: I18N('BTN_NO'), result: false},
							])) {
							isStopSendMission = false;
							isSendsMission = true;
							sendsMission(missionInfo);
						}
					}, 0);
				}
				/**
				 * Getting mission data
				 * Получение данных миссии
				 */
				if (call.name == 'missionStart') {
					lastMissionStart = call.args;
				}
				/**
				 * Specify the quantity for Titan Orbs and Pet Eggs
				 * Указать количество для сфер титанов и яиц петов
				 */
				if (isChecked('countControl') &&
					(call.name == 'pet_chestOpen' ||
					call.name == 'titanUseSummonCircle') &&
					call.args.amount > 1) {
					call.args.amount = 1;
					const result = await popup.confirm(I18N('MSG_SPECIFY_QUANT'), [
						{ msg: I18N('BTN_OPEN'), isInput: true, default: call.args.amount},
						]);
					if (result) {
						call.args.amount = result;
						changeRequest = true;
					}
				}
				/**
				 * Specify the amount for keys and spheres of titan artifacts
				 * Указать колличество для ключей и сфер артефактов титанов
				 */
				if (isChecked('countControl') &&
					(call.name == 'artifactChestOpen' ||
					call.name == 'titanArtifactChestOpen') &&
					call.args.amount > 1 &&
					call.args.free &&
					!changeRequest) {
					artifactChestOpenCallName = call.name;
					let result = await popup.confirm(I18N('MSG_SPECIFY_QUANT'), [
						{ msg: I18N('BTN_OPEN'), isInput: true, default: call.args.amount },
					]);
					if (result) {
						let sphere = result < 10 ? 1 : 10;

						call.args.amount = sphere;
						result -= sphere;

						for (let count = result; count > 0; count -= sphere) {
							if (count < 10) sphere = 1;
							const ident = artifactChestOpenCallName + "_" + count;
							testData.calls.push({
								name: artifactChestOpenCallName,
								args: {
									amount: sphere,
									free: true,
								},
								ident: ident
							});
							if (!Array.isArray(requestHistory[this.uniqid].calls[call.name])) {
								requestHistory[this.uniqid].calls[call.name] = [requestHistory[this.uniqid].calls[call.name]];
							}
							requestHistory[this.uniqid].calls[call.name].push(ident);
						}

						artifactChestOpen = true;
						changeRequest = true;
					}
				}
				if (call.name == 'consumableUseLootBox') {
					lastRussianDollId = call.args.libId;
					/**
					 * Specify quantity for gold caskets
					 * Указать количество для золотых шкатулок
					 */
					if (isChecked('countControl') &&
						call.args.libId == 148 &&
						call.args.amount > 1) {
						const result = await popup.confirm(I18N('MSG_SPECIFY_QUANT'), [
							{ msg: I18N('BTN_OPEN'), isInput: true, default: call.args.amount},
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
	/**
	 * Processing and substitution of incoming data
	 *
	 * Обработка и подмена входящих данных
	 */
	async function checkChangeResponse(response) {
		try {
			isChange = false;
			let nowTime = Math.round(Date.now() / 1000);
			callsIdent = requestHistory[this.uniqid].calls;
			respond = JSON.parse(response);
			/**
			 * If the request returned an error removes the error (removes synchronization errors)
			 * Если запрос вернул ошибку удаляет ошибку (убирает ошибки синхронизации)
			 */
			if (respond.error) {
				isChange = true;
				console.error(respond.error);
				delete respond.error;
				respond.results = [];
			}
			let mainReward = null;
			const allReward = {};
			for (const call of respond.results) {
				/**
				 * Getting a user ID
				 * Получение идетификатора пользователя
				 */
				if (call.ident == callsIdent['registration']) {
					userId = call.result.response.userId;
				}
				/**
				 * Endless lives in brawls
				 * Бесконечные жизни в потасовках
				 */
				if (getSaveVal('autoBrawls') && call.ident == callsIdent['brawl_getInfo']) {
					brawl = call.result.response;
					if (brawl) {
						brawl.boughtEndlessLivesToday = 1;
						isChange = true;
					}
				}
				/**
				 * Hiding donation offers
				 * Скрываем предложения доната
				 */
				if (call.ident == callsIdent['billingGetAll'] && getSaveVal('noOfferDonat')) {
					const billings = call.result.response?.billings;
					const bundle = call.result.response?.bundle;
					if (billings && bundle) {
						call.result.response.billings = [];
						call.result.response.bundle = [];
						isChange = true;
					}
				}
				/**
				 * Hiding donation offers
				 * Скрываем предложения доната
				 */
				if (call.ident == callsIdent['offerGetAll'] && getSaveVal('noOfferDonat')) {
					const offers = call.result.response;
					if (offers) {
						call.result.response = offers.filter(e => !['addBilling', 'bundleCarousel'].includes(e.type));
						isChange = true;
					}
				}
				/**
				 * Hiding donation offers
				 * Скрываем предложения доната
				 */
				if (call.ident == callsIdent['specialOffer_getAll'] && getSaveVal('noOfferDonat')) {
					call.result.response = [];
					isChange = true;
				}
				/**
				 * Copies a quiz question to the clipboard
				 * Копирует вопрос викторины в буфер обмена и получает на него ответ если есть
				 */
				if (call.ident == callsIdent['quizGetNewQuestion']) {
					let quest = call.result.response;
					console.log(quest.question);
					copyText(quest.question);
					setProgress(I18N('QUESTION_COPY'), true);
					lastQuestion = quest;
					if (isChecked('getAnswer')) {
						const answer = await getAnswer(lastQuestion);
						if (answer) {
							lastAnswer = answer;
							console.log(answer);
							setProgress(`${I18N('ANSWER_KNOWN')}: ${answer}`, true);
						} else {
							setProgress(I18N('ANSWER_NOT_KNOWN'), true);
						}
					}
				}
				/**
				 * Submits a question with an answer to the database
				 * Отправляет вопрос с ответом в базу данных
				 */
				if (call.ident == callsIdent['quizAnswer']) {
					const answer = call.result.response;
					if (lastQuestion) {
						const answerInfo = {
							answer,
							question: lastQuestion
						}
						lastQuestion = null;
						setTimeout(sendAnswerInfo, 0, answerInfo);
					}
				}
				/**
				 * Get user data
				 * Получить даныне пользователя
				 */
				if (call.ident == callsIdent['userGetInfo']) {
					let user = call.result.response;
					userInfo = Object.assign({}, user);
					delete userInfo.refillable;
					if (!questsInfo['userGetInfo']) {
						questsInfo['userGetInfo'] = user;
					}
				}
				/**
				 * Start of the battle for recalculation
				 * Начало боя для прерасчета
				 */
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
							setProgress(`${I18N('THIS_TIME')} ${(firstBattle ? I18N('VICTORY') : I18N('DEFEAT'))} ${I18N('CHANCE_TO_WIN')}: ${Math.floor(countWin / e.length * 100)}% (${e.length})`, false, hideProgress)
						});
				}
				/**
				 * Start of the Asgard boss fight
				 * Начало боя с боссом Асгарда
				 */
				if (call.ident == callsIdent['clanRaid_startBossBattle']) {
					lastBossBattleInfo = call.result.response.battle;
				}
				/**
				 * Cancel tutorial
				 * Отмена туториала
				 */
				if (isCanceledTutorial && call.ident == callsIdent['tutorialGetInfo']) {
					let chains = call.result.response.chains;
					for (let n in chains) {
						chains[n] = 9999;
					}
					isChange = true;
				}
				/**
				 * Opening keys and spheres of titan artifacts
				 * Открытие ключей и сфер артефактов титанов
				 */
				if (artifactChestOpen &&
					(call.ident == callsIdent[artifactChestOpenCallName] ||
						(callsIdent[artifactChestOpenCallName] && callsIdent[artifactChestOpenCallName].includes(call.ident)))) {
					let reward = call.result.response[artifactChestOpenCallName == 'artifactChestOpen' ? 'chestReward' : 'reward'];

					reward.forEach(e => {
						for (let f in e) {
							if (!allReward[f]) {
								allReward[f] = {};
							}
							for (let o in e[f]) {
								if (!allReward[f][o]) {
									allReward[f][o] = e[f][o];
								} else {
									allReward[f][o] += e[f][o];
								}
							}
						}
					});

					if (!call.ident.includes(artifactChestOpenCallName)) {
						mainReward = call.result.response;
					}
				}
				/**
				 * Auto-repeat opening matryoshkas
				 * АвтоПовтор открытия матрешек
				 */
				if (isChecked('countControl') && call.ident == callsIdent['consumableUseLootBox']) {
					let lootBox = call.result.response;
					let newCount = 0;
					for (let n of lootBox) {
						if (n?.consumable && n.consumable[lastRussianDollId]) {
							newCount += n.consumable[lastRussianDollId]
						}
					}
					if (newCount && await popup.confirm(`${I18N('BTN_OPEN')} ${newCount} ${I18N('OPEN_DOLLS')}?`, [
							{ msg: I18N('BTN_OPEN'), result: true},
							{ msg: I18N('BTN_NO'), result: false},
						])) {
						openRussianDoll(lastRussianDollId, newCount);
					}
				}
				/**
				 * Getting data on quests
				 * Получение данных по квестам
				 */
				if (call.ident == callsIdent['questGetAll']) {
					if (!questsInfo['questGetAll']) {
						questsInfo['questGetAll'] = call.result.response;
					}
				}
				/**
				 * Getting Inventory Data for Quests
				 * Получение данных инвентаря для квестов
				 */
				if (call.ident == callsIdent['inventoryGet']) {
					if (!questsInfo['inventoryGet']) {
						questsInfo['inventoryGet'] = call.result.response;
					}
				}
				/**
				 * Obtaining Hero Data for Quests
				 * Получение данных героев для квестов
				 */
				if (call.ident == callsIdent['heroGetAll']) {
					if (!questsInfo['heroGetAll']) {
						questsInfo['heroGetAll'] = call.result.response;
					}
				}
				/**
				 * Obtaining titan data for quests
				 * Получение данных титанов для квестов
				 */
				if (call.ident == callsIdent['titanGetAll']) {
					if (!questsInfo['titanGetAll']) {
						questsInfo['titanGetAll'] = call.result.response;
					}
				}
			}

			if (mainReward && artifactChestOpen) {
				console.log(allReward);
				mainReward[artifactChestOpenCallName == 'artifactChestOpen' ? 'chestReward' : 'reward'] = [allReward];
				artifactChestOpen = false;
				artifactChestOpenCallName = '';
				isChange = true;
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

	/**
	 * Request an answer to a question
	 *
	 * Запрос ответа на вопрос
	 */
	async function getAnswer(question) {
		return new Promise((resolve, reject) => {
			fetch('https://zingery.ru/heroes/getAnswer.php', {
				method: 'POST',
				body: JSON.stringify(question)
			}).then(
				response => response.json()
			).then(
				data => {
					if (data.result) {
						resolve(data.result);
					} else {
						resolve(false);
					}
				}
			).catch((error) => {
				console.error(error);
				resolve(false);
			});
		})
	}

	/**
	 * Submitting a question and answer to a database
	 *
	 * Отправка вопроса и ответа в базу данных
	 */
	function sendAnswerInfo(answerInfo) {
		fetch('https://zingery.ru/heroes/setAnswer.php', {
			method: 'POST',
			body: JSON.stringify(answerInfo)
		}).then(
			response => response.json()
		).then(
			data => {
				if (data.result) {
					console.log(I18N('SENT_QUESTION'));
				}
			}
		)
	}

	/**
	 * Returns the battle type by preset type
	 *
	 * Возвращает тип боя по типу пресета
	 */
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
			case "brawl_titan":
			case "challenge_titan":
				return "get_titanClanPvp";
			case "clan_raid": // Asgard Boss // Босс асгарда
			case "adventure": // Adventures // Приключения
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
			case "grand":
			case "arena":
			case "pvp":
				return "get_pvp";
			case "core":
				return "get_core";
			default:
				return "get_clanPvp";
		}
	}
	/**
	 * Returns the class name of the passed object
	 *
	 * Возвращает название класса переданного объекта
	 */
	function getClass(obj) {
		return {}.toString.call(obj).slice(8, -1);
	}
	/**
	 * Calculates the request signature
	 *
	 * Расчитывает сигнатуру запроса
	 */
	this.getSignature = function(headers, data) {
		let signatureStr = [headers["X-Request-Id"], headers["X-Auth-Token"], headers["X-Auth-Session-Id"], data, 'LIBRARY-VERSION=1'].join(':');
		return md5(signatureStr);
	}
	/**
	 * Creates an interface
	 *
	 * Создает интерфейс
	 */
	function createInterface() {
		scriptMenu.init({
			showMenu: true
		});
		scriptMenu.addHeader(GM_info.script.name, justInfo);
		scriptMenu.addHeader('v' + GM_info.script.version);
	}

	function addControls() {
		const checkboxDetails = scriptMenu.addDetails(I18N('SETTINGS'));
		for (let name in checkboxes) {
			checkboxes[name].cbox = scriptMenu.addCheckbox(checkboxes[name].label, checkboxes[name].title, checkboxDetails);
			/**
			 * Getting the state of checkboxes from storage
			 * Получаем состояние чекбоксов из storage
			 */
			let val = storage.get(name, null);
			if (val != null) {
				checkboxes[name].cbox.checked = val;
			} else {
				storage.set(name, checkboxes[name].default);
				checkboxes[name].cbox.checked = checkboxes[name].default;
			}
			/**
			 * Tracing the change event of the checkbox for writing to storage
			 * Отсеживание события изменения чекбокса для записи в storage
			 */
			checkboxes[name].cbox.dataset['name'] = name;
			checkboxes[name].cbox.addEventListener('change', async function (event) {
				const nameCheckbox = this.dataset['name'];
				if (this.checked && nameCheckbox == 'cancelBattleBan') {
					this.checked = false;
					if (await popup.confirm(I18N('MSG_BAN_ATTENTION'), [
						{ msg: I18N('BTN_NO_I_AM_AGAINST'), result: true },
						{ msg: I18N('BTN_YES_I_AGREE'), result: false },
					])) {
						return;
					}
					this.checked = true;
				}
				storage.set(nameCheckbox, this.checked);
			})
		}

		const inputDetails = scriptMenu.addDetails(I18N('VALUES'));
		for (let name in inputs) {
			inputs[name].input = scriptMenu.addInputText(inputs[name].title, false, inputDetails);
			/**
			 * Get inputText state from storage
			 * Получаем состояние inputText из storage
			 */
			let val = storage.get(name, null);
			if (val != null) {
				inputs[name].input.value = val;
			} else {
				storage.set(name, inputs[name].default);
				inputs[name].input.value = inputs[name].default;
			}
			/**
			 * Tracing a field change event for a record in storage
			 * Отсеживание события изменения поля для записи в storage
			 */
			inputs[name].input.dataset['name'] = name;
			inputs[name].input.addEventListener('input', function () {
				const inputName = this.dataset['name'];
				let value = +this.value;
				if (!value || Number.isNaN(value)) {
					value = storage.get(inputName, inputs[inputName].default);
					inputs[name].input.value = value;
				}
				storage.set(inputName, value);
			})
		}
	}
	/**
	 * Calculates HASH MD5 from string
	 *
	 * Расчитывает HASH MD5 из строки
	 */
	function md5(r){for(var a=(r,n,t,e,o,u)=>f(c(f(f(n,r),f(e,u)),o),t),n=(r,n,t,e,o,u,f)=>a(n&t|~n&e,r,n,o,u,f),t=(r,n,t,e,o,u,f)=>a(n&e|t&~e,r,n,o,u,f),e=(r,n,t,e,o,u,f)=>a(n^t^e,r,n,o,u,f),o=(r,n,t,e,o,u,f)=>a(t^(n|~e),r,n,o,u,f),f=function(r,n){var t=(65535&r)+(65535&n);return(r>>16)+(n>>16)+(t>>16)<<16|65535&t},c=(r,n)=>r<<n|r>>>32-n,u=Array(r.length>>2),h=0;h<u.length;h++)u[h]=0;for(h=0;h<8*r.length;h+=8)u[h>>5]|=(255&r.charCodeAt(h/8))<<h%32;len=8*r.length,u[len>>5]|=128<<len%32,u[14+(len+64>>>9<<4)]=len;var l=1732584193,i=-271733879,g=-1732584194,v=271733878;for(h=0;h<u.length;h+=16){var A=l,d=i,C=g,m=v;i=o(i=o(i=o(i=o(i=e(i=e(i=e(i=e(i=t(i=t(i=t(i=t(i=n(i=n(i=n(i=n(i,g=n(g,v=n(v,l=n(l,i,g,v,u[h+0],7,-680876936),i,g,u[h+1],12,-389564586),l,i,u[h+2],17,606105819),v,l,u[h+3],22,-1044525330),g=n(g,v=n(v,l=n(l,i,g,v,u[h+4],7,-176418897),i,g,u[h+5],12,1200080426),l,i,u[h+6],17,-1473231341),v,l,u[h+7],22,-45705983),g=n(g,v=n(v,l=n(l,i,g,v,u[h+8],7,1770035416),i,g,u[h+9],12,-1958414417),l,i,u[h+10],17,-42063),v,l,u[h+11],22,-1990404162),g=n(g,v=n(v,l=n(l,i,g,v,u[h+12],7,1804603682),i,g,u[h+13],12,-40341101),l,i,u[h+14],17,-1502002290),v,l,u[h+15],22,1236535329),g=t(g,v=t(v,l=t(l,i,g,v,u[h+1],5,-165796510),i,g,u[h+6],9,-1069501632),l,i,u[h+11],14,643717713),v,l,u[h+0],20,-373897302),g=t(g,v=t(v,l=t(l,i,g,v,u[h+5],5,-701558691),i,g,u[h+10],9,38016083),l,i,u[h+15],14,-660478335),v,l,u[h+4],20,-405537848),g=t(g,v=t(v,l=t(l,i,g,v,u[h+9],5,568446438),i,g,u[h+14],9,-1019803690),l,i,u[h+3],14,-187363961),v,l,u[h+8],20,1163531501),g=t(g,v=t(v,l=t(l,i,g,v,u[h+13],5,-1444681467),i,g,u[h+2],9,-51403784),l,i,u[h+7],14,1735328473),v,l,u[h+12],20,-1926607734),g=e(g,v=e(v,l=e(l,i,g,v,u[h+5],4,-378558),i,g,u[h+8],11,-2022574463),l,i,u[h+11],16,1839030562),v,l,u[h+14],23,-35309556),g=e(g,v=e(v,l=e(l,i,g,v,u[h+1],4,-1530992060),i,g,u[h+4],11,1272893353),l,i,u[h+7],16,-155497632),v,l,u[h+10],23,-1094730640),g=e(g,v=e(v,l=e(l,i,g,v,u[h+13],4,681279174),i,g,u[h+0],11,-358537222),l,i,u[h+3],16,-722521979),v,l,u[h+6],23,76029189),g=e(g,v=e(v,l=e(l,i,g,v,u[h+9],4,-640364487),i,g,u[h+12],11,-421815835),l,i,u[h+15],16,530742520),v,l,u[h+2],23,-995338651),g=o(g,v=o(v,l=o(l,i,g,v,u[h+0],6,-198630844),i,g,u[h+7],10,1126891415),l,i,u[h+14],15,-1416354905),v,l,u[h+5],21,-57434055),g=o(g,v=o(v,l=o(l,i,g,v,u[h+12],6,1700485571),i,g,u[h+3],10,-1894986606),l,i,u[h+10],15,-1051523),v,l,u[h+1],21,-2054922799),g=o(g,v=o(v,l=o(l,i,g,v,u[h+8],6,1873313359),i,g,u[h+15],10,-30611744),l,i,u[h+6],15,-1560198380),v,l,u[h+13],21,1309151649),g=o(g,v=o(v,l=o(l,i,g,v,u[h+4],6,-145523070),i,g,u[h+11],10,-1120210379),l,i,u[h+2],15,718787259),v,l,u[h+9],21,-343485551),l=f(l,A),i=f(i,d),g=f(g,C),v=f(v,m)}var y=Array(l,i,g,v),b="";for(h=0;h<32*y.length;h+=8)b+=String.fromCharCode(y[h>>5]>>>h%32&255);var S="0123456789abcdef",j="";for(h=0;h<b.length;h++)u=b.charCodeAt(h),j+=S.charAt(u>>>4&15)+S.charAt(15&u);return j}
	/**
	 * Script for beautiful dialog boxes
	 *
	 * Скрипт для красивых диалоговых окошек
	 */
	const popup = new (function () {
		this.popUp,
			this.downer,
			this.middle,
			this.msgText,
			this.buttons = [];
		this.checkboxes = [];

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
			flex-wrap: wrap;
			justify-content: center;
		}

		.PopUp_blocks:last-child {
			margin-top: 5px;
		}

		.PopUp_buttons {
			display: flex;
			margin: 10px 10px;
			flex-direction: column;
		}

		.PopUp_button {
			background-color: #52A81C;
			border-radius: 10px;
			box-shadow: inset 0px -4px 10px, inset 0px 3px 2px #99fe20, 0px 0px 4px, 0px -3px 1px #d7b275, 0px 0px 0px 3px #ce9767;
			cursor: pointer;
			padding: 1px 10px 1px;
		}

		.PopUp_input {
			text-align: center;
			font-size: 16px;
			height: 27px;
			border: 1px solid #cf9250;
			border-radius: 9px 9px 0px 0px;
			background: transparent;
			color: #fce1ac;
			padding: 1px 10px;
			box-sizing: border-box;
			box-shadow: 0px 0px 4px, 0px 0px 0px 3px #ce9767;
		}

		.PopUp_checkboxes {
			display: flex;
			flex-direction: column;
			margin: 5px 10px -5px 10px;
			align-items: flex-start;
		}

		.PopUp_ContCheckbox {
			margin: 1px 0px;
		}

		.PopUp_checkbox {
			position: absolute;
			z-index: -1;
			opacity: 0;
		}
		.PopUp_checkbox+label {
			display: inline-flex;
			align-items: center;
			user-select: none;
			font-family: sans-serif;
			font-stretch: condensed;
			letter-spacing: 1px;
			color: #fce1ac;
			text-shadow: 0px 0px 1px;
		}
		.PopUp_checkbox+label::before {
			content: '';
			display: inline-block;
			width: 20px;
			height: 20px;
			border: 1px solid #cf9250;
			border-radius: 7px;
			margin-right: 7px;
		}
		.PopUp_checkbox:checked+label::before {
			background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3e%3cpath fill='%2388cb13' d='M6.564.75l-3.59 3.612-1.538-1.55L0 4.26 2.974 7.25 8 2.193z'/%3e%3c/svg%3e");
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

		.PopUp_hideBlock {
			display: none;
		}
		`;
			document.head.appendChild(style);
		}

		const addBlocks = () => {
			this.back = document.createElement('div');
			this.back.classList.add('PopUp_back');
			this.back.classList.add('PopUp_hideBlock');
			document.body.append(this.back);

			this.popUp = document.createElement('div');
			this.popUp.classList.add('PopUp_');
			this.back.append(this.popUp);

			let upper = document.createElement('div')
			upper.classList.add('PopUp_blocks');
			this.popUp.append(upper);

			this.middle = document.createElement('div')
			this.middle.classList.add('PopUp_blocks');
			this.middle.classList.add('PopUp_checkboxes');
			this.popUp.append(this.middle);

			this.downer = document.createElement('div')
			this.downer.classList.add('PopUp_blocks');
			this.popUp.append(this.downer);

			this.msgText = document.createElement('div');
			this.msgText.classList.add('PopUp_text', 'PopUp_msgText');
			upper.append(this.msgText);
		}

		this.showBack = function () {
			this.back.classList.remove('PopUp_hideBlock');
		}

		this.hideBack = function () {
			this.back.classList.add('PopUp_hideBlock');
		}

		this.show = function () {
			if (this.checkboxes.length) {
				this.middle.classList.remove('PopUp_hideBlock');
			}
			this.showBack();
			this.popUp.classList.remove('PopUp_hideBlock');
			this.popUp.style.left = (window.innerWidth - this.popUp.offsetWidth) / 2 + 'px';
			this.popUp.style.top = (window.innerHeight - this.popUp.offsetHeight) / 3 + 'px';
		}

		this.hide = function () {
			this.hideBack();
			this.popUp.classList.add('PopUp_hideBlock');
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

		this.addCheckBox = (checkBox) => {
			const contCheckbox = document.createElement('div');
			contCheckbox.classList.add('PopUp_ContCheckbox');
			this.middle.append(contCheckbox);

			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.id = 'PopUpCheckbox' + this.checkboxes.length;
			checkbox.dataset.name = checkBox.name;
			checkbox.checked = checkBox.checked;
			checkbox.label = checkBox.label;
			checkbox.classList.add('PopUp_checkbox');
			contCheckbox.appendChild(checkbox)

			const checkboxLabel = document.createElement('label');
			checkboxLabel.innerText = checkBox.label;
			checkboxLabel.setAttribute('for', checkbox.id);
			contCheckbox.appendChild(checkboxLabel);

			this.checkboxes.push(checkbox);
		}

		this.clearCheckBox = () => {
			this.middle.classList.add('PopUp_hideBlock');
			while (this.checkboxes.length) {
				this.checkboxes.pop().parentNode.remove();
			}
		}

		this.setMsgText = (text) => {
			this.msgText.innerHTML = text;
		}

		this.getCheckBoxes = () => {
			const checkBoxes = [];

			for (const checkBox of this.checkboxes) {
				checkBoxes.push({
					name: checkBox.dataset.name,
					label: checkBox.label,
					checked: checkBox.checked
				});
			}

			return checkBoxes;
		}

		this.confirm = async (msg, buttOpt, checkBoxes = []) => {
			this.clearButtons();
			this.clearCheckBox();
			return new Promise((complete, failed) => {
				this.setMsgText(msg);
				if (!buttOpt) {
					buttOpt = [{ msg: 'Ok', result: true, isInput: false }];
				}
				for (const checkBox of checkBoxes) {
					this.addCheckBox(checkBox);
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
	/**
	 * Script control panel
	 *
	 * Панель управления скриптом
	 */
	const scriptMenu = new (function () {

		this.mainMenu,
			this.buttons = [],
			this.checkboxes = [];
		this.option = {
			showMenu: false,
			showDetails: {}
		};

		this.init = function (option = {}) {
			this.option = Object.assign(this.option, option);
			this.option.showDetails = this.loadShowDetails();
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
			top: 48%;
			left: -4px;
			z-index: 9999;
			cursor: pointer;
			width: 25px;
			height: 25px;
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
			padding: 5px 5px 5px 5px;
			box-sizing: border-box;
			font-family: sans-serif;
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
			margin: 1px;
		}
		.scriptMenu_divInputText {
			margin: 2px;
			align-self: center;
			display: flex;
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
			width: 25px;
			height: 25px;
			position: absolute;
			right: -11px;
			top: -11px;
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
			padding: 1px 10px 5px;
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
			margin: 0px 15px;
		}
		.scriptMenu_header a {
			color: #fce5b7;
			text-decoration: none;
		}
		.scriptMenu_InputText {
			text-align: center;
			width: 120px;
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
		.scriptMenu_Details {
			align-self: left;
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
		 * Adding a text element
		 *
		 * Добавление текстового элемента
		 * @param {String} text text // текст
		 * @param {Function} func Click function // функция по клику
		 * @param {HTMLDivElement} main parent // родитель
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
		 * Adding a button
		 *
		 * Добавление кнопки
		 * @param {String} text
		 * @param {Function} func
		 * @param {String} title
		 * @param {HTMLDivElement} main parent // родитель
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

			return button;
		}

		/**
		 * Adding checkbox
		 *
		 * Добавление чекбокса
		 * @param {String} label
		 * @param {String} title
		 * @param {HTMLDivElement} main parent // родитель
		 * @returns
		 */
		this.addCheckbox = (label, title, main) => {
			main = main || this.mainMenu;
			const divCheckbox = document.createElement('div');
			divCheckbox.classList.add('scriptMenu_divInput');
			divCheckbox.title = title;
			main.appendChild(divCheckbox);

			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.id = 'scriptMenuCheckbox' + this.checkboxes.length;
			checkbox.classList.add('scriptMenu_checkbox');
			divCheckbox.appendChild(checkbox)

			const checkboxLabel = document.createElement('label');
			checkboxLabel.innerText = label;
			checkboxLabel.setAttribute('for', checkbox.id);
			divCheckbox.appendChild(checkboxLabel);

			this.checkboxes.push(checkbox);
			return checkbox;
		}

		/**
		 * Adding input field
		 *
		 * Добавление поля ввода
		 * @param {String} title
		 * @param {String} placeholder
		 * @param {HTMLDivElement} main parent // родитель
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
		 * Adds a dropdown block
		 *
		 * Добавляет раскрывающийся блок
		 * @param {String} summary
		 * @param {String} name
		 * @returns
		 */
		this.addDetails = (summaryText, name = null) => {
			const details = document.createElement('details');
			details.classList.add('scriptMenu_Details');
			this.mainMenu.appendChild(details);

			const summary = document.createElement('summary');
			summary.classList.add('scriptMenu_Summary');
			summary.innerText = summaryText;
			if (name) {
				const self = this;
				details.open = this.option.showDetails[name];
				details.dataset.name = name;
				summary.addEventListener('click', () => {
					self.option.showDetails[details.dataset.name] = !details.open;
					self.saveShowDetails(self.option.showDetails);
				});
			}
			details.appendChild(summary);

			return details;
		}

		/**
		 * Saving the expanded state of the details blocks
		 *
		 * Сохранение состояния развенутости блоков details
		 * @param {*} value
		 */
		this.saveShowDetails = (value) => {
			localStorage.setItem('scriptMenu_showDetails', JSON.stringify(value));
		}

		/**
		 * Loading the state of expanded blocks details
		 *
		 * Загрузка состояния развенутости блоков details
		 * @returns
		 */
		this.loadShowDetails = () => {
			let showDetails = localStorage.getItem('scriptMenu_showDetails');

			if (!showDetails) {
				return {};
			}

			try {
				showDetails = JSON.parse(showDetails);
			} catch (e) {
				return {};
			}

			return showDetails;
		}
	});
	/**
	 * Database
	 *
	 * База данных
	 */
	class Database {
		constructor(dbName, storeName) {
			this.dbName = dbName;
			this.storeName = storeName;
			this.db = null;
		}

		async open() {
			return new Promise((resolve, reject) => {
				const request = indexedDB.open(this.dbName);

				request.onerror = () => {
					reject(new Error(`Failed to open database ${this.dbName}`));
				};

				request.onsuccess = () => {
					this.db = request.result;
					resolve();
				};

				request.onupgradeneeded = (event) => {
					const db = event.target.result;
					if (!db.objectStoreNames.contains(this.storeName)) {
						db.createObjectStore(this.storeName);
					}
				};
			});
		}

		async set(key, value) {
			return new Promise((resolve, reject) => {
				const transaction = this.db.transaction([this.storeName], 'readwrite');
				const store = transaction.objectStore(this.storeName);
				const request = store.put(value, key);

				request.onerror = () => {
					reject(new Error(`Failed to save value with key ${key}`));
				};

				request.onsuccess = () => {
					resolve();
				};
			});
		}

		async get(key, def) {
			return new Promise((resolve, reject) => {
				const transaction = this.db.transaction([this.storeName], 'readonly');
				const store = transaction.objectStore(this.storeName);
				const request = store.get(key);

				request.onerror = () => {
					resolve(def);
				};

				request.onsuccess = () => {
					resolve(request.result);
				};
			});
		}

		async delete(key) {
			return new Promise((resolve, reject) => {
				const transaction = this.db.transaction([this.storeName], 'readwrite');
				const store = transaction.objectStore(this.storeName);
				const request = store.delete(key);

				request.onerror = () => {
					reject(new Error(`Failed to delete value with key ${key}`));
				};

				request.onsuccess = () => {
					resolve();
				};
			});
		}
	}
	/**
	 * Returns the stored value
	 *
	 * Возвращает сохраненное значение
	 */
	function getSaveVal(saveName, def) {
		const result = storage.get(saveName, def);
		return result;
	}
	/**
	 * Stores value
	 *
	 * Сохраняет значение
	 */
	function setSaveVal(saveName, value) {
		storage.set(saveName, value);
	}
	/**
	 * Database initialization
	 *
	 * Инициализация базы данных
	 */
	const db = new Database(GM_info.script.name, 'settings');
	/**
	 * Data store
	 *
	 * Хранилище данных
	 */
	const storage = {
		userId: 0,
		/**
		 * Default values
		 *
		 * Значения по умолчанию
		 */
		values: [
			...Object.entries(checkboxes).map(e => ({ [e[0]]: e[1].default })),
			...Object.entries(inputs).map(e => ({ [e[0]]: e[1].default })),
		].reduce((acc, obj) => ({ ...acc, ...obj }), {}),
		name: GM_info.script.name,
		get: function (key, def) {
			if (key in this.values) {
				return this.values[key];
			}
			return def;
		},
		set: function (key, value) {
			this.values[key] = value;
			db.set(this.userId, this.values).catch(
				e => null
			);
			localStorage[this.name + ':' + key] = value;
		},
		delete: function (key) {
			delete this.values[key];
			db.set(this.userId, this.values);
			delete localStorage[this.name + ':' + key];
		}
	}
	/**
	 * Returns all keys from localStorage that start with prefix (for migration)
	 *
	 * Возвращает все ключи из localStorage которые начинаются с prefix (для миграции)
	 */
	function getAllValuesStartingWith(prefix) {
		const values = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key.startsWith(prefix)) {
				const val = localStorage.getItem(key);
				const keyValue = key.split(':')[1];
				values.push({ key: keyValue, val });
			}
		}
		return values;
	}
	/**
	 * Opens or migrates to a database
	 *
	 * Открывает или мигрирует в базу данных
	 */
	async function openOrMigrateDatabase(userId) {
		storage.userId = userId;
		try {
			await db.open();
		} catch(e) {
			return;
		}
		let settings = await db.get(userId, false);

		if (settings) {
			storage.values = settings;
			return;
		}

		const values = getAllValuesStartingWith(GM_info.script.name);
		for (const value of values) {
			let val = null;
			try {
				val = JSON.parse(value.val);
			} catch {
				break;
			}
			storage.values[value.key] = val;
		}
		await db.set(userId, storage.values);
	}
	/**
	 * Sending expeditions
	 *
	 * Отправка экспедиций
	 */
	function checkExpedition() {
		return new Promise((resolve, reject) => {
			const expedition = new Expedition(resolve, reject);
			expedition.start();
		});
	}

	class Expedition {
		checkExpedInfo = {
			calls: [{
				name: "expeditionGet",
				args: {},
				ident: "expeditionGet"
			}, {
				name: "heroGetAll",
				args: {},
				ident: "heroGetAll"
			}]
		}

		constructor(resolve, reject) {
			this.resolve = resolve;
			this.reject = reject;
		}

		async start() {
			const data = await Send(JSON.stringify(this.checkExpedInfo));

			const expedInfo = data.results[0].result.response;
			const dataHeroes = data.results[1].result.response;
			const dataExped = { useHeroes: [], exped: [] };
			const calls = [];

			/**
			 * Adding expeditions to collect
			 * Добавляем экспедиции для сбора
			 */
			for (var n in expedInfo) {
				const exped = expedInfo[n];
				const dateNow = (Date.now() / 1000);
				if (exped.status == 2 && exped.endTime != 0 && dateNow > exped.endTime) {
					calls.push({
						name: "expeditionFarm",
						args: { expeditionId: exped.id },
						ident: "expeditionFarm_" + exped.id
					});
				} else {
					dataExped.useHeroes = dataExped.useHeroes.concat(exped.heroes);
				}
				if (exped.status == 1) {
					dataExped.exped.push({ id: exped.id, power: exped.power });
				}
			}
			dataExped.exped = dataExped.exped.sort((a, b) => (b.power - a.power));

			/**
			 * Putting together a list of heroes
			 * Собираем список героев
			 */
			const heroesArr = [];
			for (let n in dataHeroes) {
				const hero = dataHeroes[n];
				if (hero.xp > 0 && !dataExped.useHeroes.includes(hero.id)) {
					heroesArr.push({ id: hero.id, power: hero.power })
				}
			}

			/**
			 * Adding expeditions to send
			 * Добавляем экспедиции для отправки
			 */
			heroesArr.sort((a, b) => (a.power - b.power));
			for (const exped of dataExped.exped) {
				let heroesIds = this.selectionHeroes(heroesArr, exped.power);
				if (heroesIds && heroesIds.length > 4) {
					for (let q in heroesArr) {
						if (heroesIds.includes(heroesArr[q].id)) {
							delete heroesArr[q];
						}
					}
					calls.push({
						name: "expeditionSendHeroes",
						args: {
							expeditionId: exped.id,
							heroes: heroesIds
						},
						ident: "expeditionSendHeroes_" + exped.id
					});
				}
			}

			await Send(JSON.stringify({ calls }));
			this.end();
		}

		/**
		 * Selection of heroes for expeditions
		 *
		 * Подбор героев для экспедиций
		 */
		selectionHeroes(heroes, power) {
			const resultHeroers = [];
			const heroesIds = [];
			for (let q = 0; q < 5; q++) {
				for (let i in heroes) {
					let hero = heroes[i];
					if (heroesIds.includes(hero.id)) {
						continue;
					}

					const summ = resultHeroers.reduce((acc, hero) => acc + hero.power, 0);
					const need = Math.round((power - summ) / (5 - resultHeroers.length));
					if (hero.power > need) {
						resultHeroers.push(hero);
						heroesIds.push(hero.id);
						break;
					}
				}
			}

			const summ = resultHeroers.reduce((acc, hero) => acc + hero.power, 0);
			if (summ < power) {
				return false;
			}
			return heroesIds;
		}

		/**
		 * Ends expedition script
		 *
		 * Завершает скрипт экспедиции
		 */
		end() {
			setProgress(I18N('EXPEDITIONS_SENT'), true);
			this.resolve()
		}
	}
	/**
	 * Sending a request
	 *
	 * Отправка запроса
	 */
	function send(json, callback, pr) {
		/**
		 * We get the headlines of the previous intercepted request
		 * Получаем заголовки предыдущего перехваченого запроса
		 */
		let headers = lastHeaders;
		/**
		 * We increase the header of the query Certifier by 1
		 * Увеличиваем заголовок идетификатора запроса на 1
		 */
		headers["X-Request-Id"]++;
		/**
		 * We calculate the title with the signature
		 * Расчитываем заголовок с сигнатурой
		 */
		headers["X-Auth-Signature"] = getSignature(headers, json);
		/**
		 * Create a new ajax request
		 * Создаем новый AJAX запрос
		 */
		let xhr = new XMLHttpRequest;
		/**
		 * Indicate the previously saved URL for API queries
		 * Указываем ранее сохраненный URL для API запросов
		 */
		xhr.open('POST', apiUrl, true);
		/**
		 * Add the function to the event change event
		 * Добавляем функцию к событию смены статуса запроса
		 */
		xhr.onreadystatechange = function() {
			/**
			 * If the result of the request is obtained, we call the flask function
			 * Если результат запроса получен вызываем колбек функцию
			 */
			if(xhr.readyState == 4) {
				let randTimeout = Math.random() * 200 + 200;
				setTimeout(callback, randTimeout, xhr.response, pr);
			}
		};
		/**
		 * Indicate the type of request
		 * Указываем тип запроса
		 */
		xhr.responseType = 'json';
		/**
		 * We set the request headers
		 * Задаем заголовки запроса
		 */
		for(let nameHeader in headers) {
			let head = headers[nameHeader];
			xhr.setRequestHeader(nameHeader, head);
		}
		/**
		 * Sending a request
		 * Отправляем запрос
		 */
		xhr.send(json);
	}

	/**
	 * Walkthrough of the dungeon
	 *
	 * Прохождение подземелья
	 */
	function testDungeon() {
		return new Promise((resolve, reject) => {
			const dung = new executeDungeon(resolve, reject);
			const titanit = getInput('countTitanit');
			dung.start(titanit);
		});
	}

	/**
	 * Walkthrough of the dungeon
	 *
	 * Прохождение подземелья
	 */
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
			maxDungeonActivity = titanit || getInput('countTitanit');
			send(JSON.stringify(callsExecuteDungeon), startDungeon);
		}

		/**
		 * Getting data on the dungeon
		 *
		 * Получаем данные по подземелью
		 */
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

		/**
		 * Checking the floor
		 *
		 * Проверяем этаж
		 */
		function checkFloor(dungeonInfo) {
			if (!('floor' in dungeonInfo) || dungeonInfo.floor?.state == 2) {
				saveProgress();
				return;
			}
			// console.log(dungeonInfo, dungeonActivity);
			setProgress(`${I18N('DUNGEON')}: ${I18N('TITANIT')} ` + dungeonActivity + '/' + maxDungeonActivity);
			if (dungeonActivity >= maxDungeonActivity) {
				endDungeon('endDungeon');
				return;
			}
			titansStates = dungeonInfo.states.titans;
			titanStats = titanObjToArray(titansStates);
			floorChoices = dungeonInfo.floor.userData;
			floorType = dungeonInfo.floorType;
			primeElement = dungeonInfo.elements.prime;
			if (floorType == "battle") {
				promises = [];
				for (let teamNum in floorChoices) {
					attackerType = floorChoices[teamNum].attackerType;
					promises.push(startBattle(teamNum, attackerType));
				}
				Promise.all(promises)
					.then(processingPromises);
			}
		}

		function processingPromises(results) {
			let selectBattle = results[0];
			if (results.length < 2) {
				// console.log(selectBattle);
				if (!selectBattle.result.win) {
					endDungeon('dungeonEndBattle\n', selectBattle);
					return;
				}
				endBattle(selectBattle);
				return;
			}

			selectBattle = false;
			let bestState = -1000;
			for (const result of results) {
				const recovery = getState(result);
				if (recovery > bestState) {
					bestState = recovery;
					selectBattle = result
				}
			}
			// console.log(selectBattle.teamNum, results);
			if (!selectBattle || bestState <= -1000) {
				endDungeon('dungeonEndBattle\n', results);
				return;
			}

			startBattle(selectBattle.teamNum, selectBattle.attackerType)
				.then(endBattle);
		}

		/**
		 * Let's start the fight
		 *
		 * Начинаем бой
		 */
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
		/**
		 * Returns the result of the battle in a promise
		 *
		 * Возращает резульат боя в промис
		 */
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
		/**
		 * Finishing the fight
		 *
		 * Заканчиваем бой
		 */
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

		/**
		 * Getting and processing battle results
		 *
		 * Получаем и обрабатываем результаты боя
		 */
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

		/**
		 * Returns the coefficient of condition of the
		 * difference in titanium before and after the battle
		 *
		 * Возвращает коэффициент состояния титанов после боя
		 */
		function getState(result) {
			if (!result.result.win) {
				return -1000;
			}

			let beforeSumFactor = 0;
			const beforeTitans = result.battleData.attackers;
			for (let titanId in beforeTitans) {
				const titan = beforeTitans[titanId];
				const state = titan.state;
				let factor = 1;
				if (state) {
					const hp = state.hp / titan.hp;
					const energy = state.energy / 1e3;
					factor = hp + energy / 20
				}
				beforeSumFactor += factor;
			}

			let afterSumFactor = 0;
			const afterTitans = result.progress[0].attackers.heroes;
			for (let titanId in afterTitans) {
				const titan = afterTitans[titanId];
				const hp = titan.hp / beforeTitans[titanId].hp;
				const energy = titan.energy / 1e3;
				const factor = hp + energy / 20;
				afterSumFactor += factor;
			}
			return afterSumFactor - beforeSumFactor;
		}

		/**
		 * Converts an object with IDs to an array with IDs
		 *
		 * Преобразует объект с идетификаторами в массив с идетификаторами
		 */
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
			setProgress(`${I18N('DUNGEON')} ${I18N('COMPLETED')}`, true);
			resolve();
		}
	}

	/**
	 * Passing the tower
	 *
	 * Прохождение башни
	 */
	function testTower() {
		return new Promise((resolve, reject) => {
			tower = new executeTower(resolve, reject);
			tower.start();
		});
	}

	/**
	 * Passing the tower
	 *
	 * Прохождение башни
	 */
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
			{id: 0, cost: 0, isBuy: false},   // plug // заглушка
			{id: 1, cost: 1, isBuy: true},    // 3% attack // 3% атака
			{id: 2, cost: 6, isBuy: true},    // 2% attack // 2% атака
			{id: 3, cost: 16, isBuy: true},   // 4% attack // 4% атака
			{id: 4, cost: 40, isBuy: true},   // 8% attack // 8% атака
			{id: 5, cost: 1, isBuy: true},    // 10% armor // 10% броня
			{id: 6, cost: 6, isBuy: true},    // 5% armor // 5% броня
			{id: 7, cost: 16, isBuy: true},   // 10% armor // 10% броня
			{id: 8, cost: 40, isBuy: true},   // 20% armor // 20% броня
			{ id: 9, cost: 1, isBuy: true },    // 10% protection from magic // 10% защита от магии
			{ id: 10, cost: 6, isBuy: true },   // 5% protection from magic // 5% защита от магии
			{ id: 11, cost: 16, isBuy: true },  // 10% protection from magic // 10% защита от магии
			{ id: 12, cost: 40, isBuy: true },  // 20% protection from magic // 20% защита от магии
			{ id: 13, cost: 1, isBuy: false },  // 40% health hero // 40% здоровья герою
			{ id: 14, cost: 6, isBuy: false },  // 40% health hero // 40% здоровья герою
			{ id: 15, cost: 16, isBuy: false }, // 80% health hero // 80% здоровья герою
			{ id: 16, cost: 40, isBuy: false }, // 40% health to all heroes // 40% здоровья всем героям
			{ id: 17, cost: 1, isBuy: false },  // 40% energy to the hero // 40% энергии герою
			{ id: 18, cost: 3, isBuy: false },  // 40% energy to the hero // 40% энергии герою
			{ id: 19, cost: 8, isBuy: false },  // 80% energy to the hero // 80% энергии герою
			{ id: 20, cost: 20, isBuy: false }, // 40% energy to all heroes // 40% энергии всем героям
			{ id: 21, cost: 40, isBuy: false }, // Hero Resurrection // Воскрешение героя
		]

		this.start = function () {
			send(JSON.stringify(callsExecuteTower), startTower);
		}

		/**
		 * Getting data on the Tower
		 *
		 * Получаем данные по башне
		 */
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
			argsBattle.heroes = heroGetAll.sort((a, b) => b.power - a.power).slice(0, 5).map(e => e.id);
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
				fixHeroes = heroGetAll.sort((a, b) => b.power - a.power).slice(0, 5).map(e => e.id);
				Object.keys(argsBattle.favor).forEach(e => {
					if (!fixHeroes.includes(+e)) {
						delete argsBattle.favor[e];
					}
				})
			}
			argsBattle.heroes = fixHeroes;
			return argsBattle;
		}

		/**
		 * Check the floor
		 *
		 * Проверяем этаж
		 */
		function checkFloor(towerInfo) {
			lastTowerInfo = towerInfo;
			maySkipFloor = +towerInfo.maySkipFloor;
			floorNumber = +towerInfo.floorNumber;
			heroesStates = towerInfo.states.heroes;
			floorInfo = towerInfo.floor;

			/**
			 * Is there at least one chest open on the floor
			 * Открыт ли на этаже хоть один сундук
			 */
			isOpenChest = false;
			if (towerInfo.floorType == "chest") {
				isOpenChest = towerInfo.floor.chests.reduce((n, e) => n + e.opened, 0);
			}

			setProgress(`${I18N('TOWER')}: ${I18N('FLOOR')} ${floorNumber}`);
			if (floorNumber > 49) {
				if (isOpenChest) {
					endTower('alreadyOpenChest 50 floor', floorNumber);
					return;
				}
			}
			/**
			 * If the chest is open and you can skip floors, then move on
			 * Если сундук открыт и можно скипать этажи, то переходим дальше
			 */
			if (towerInfo.mayFullSkip && +towerInfo.teamLevel == 130) {
				if (isOpenChest) {
					nextOpenChest(floorNumber);
				} else {
					nextChestOpen(floorNumber);
				}
				return;
			}

			// console.log(towerInfo, scullCoin);
			switch (towerInfo.floorType) {
				case "battle":
					if (floorNumber <= maySkipFloor) {
						skipFloor();
						return;
					}
					if (floorInfo.state == 2) {
						nextFloor();
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

		/**
		 * Let's start the fight
		 *
		 * Начинаем бой
		 */
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
		/**
		 * Returns the result of the battle in a promise
		 *
		 * Возращает резульат боя в промис
		 */
		function resultBattle(resultBattles, resolve) {
			battleData = resultBattles.results[0].result.response;
			battleType = "get_tower";
			BattleCalc(battleData, battleType, function (result) {
				resolve(result);
			});
		}
		/**
		 * Finishing the fight
		 *
		 * Заканчиваем бой
		 */
		function endBattle(battleInfo) {
			if (battleInfo.result.stars >= 3) {
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

		/**
		 * Getting and processing battle results
		 *
		 * Получаем и обрабатываем результаты боя
		 */
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
			return new Promise(function (resolve, reject) {
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
		/**
		 * Getting tower rewards
		 *
		 * Получаем награды башни
		 */
		function farmTowerRewards(reason) {
			let { pointRewards, points } = lastTowerInfo;
			let pointsAll = Object.getOwnPropertyNames(pointRewards);
			let farmPoints = pointsAll.filter(e => +e <= +points && !pointRewards[e]);
			if (!farmPoints.length) {
				return;
			}
			let farmTowerRewardsCall = {
				calls: [{
					name: "tower_farmPointRewards",
					args: {
						points: farmPoints
					},
					ident: "tower_farmPointRewards"
				}]
			}

			if (scullCoin > 0 && reason == 'openChest 50 floor') {
				farmTowerRewardsCall.calls.push({
					name: "tower_farmSkullReward",
					args: {},
					ident: "tower_farmSkullReward"
				});
			}

			send(JSON.stringify(farmTowerRewardsCall), () => { });
		}

		function fullSkipTower() {
			/**
			 * Next chest
			 *
			 * Следующий сундук
			 */
			function nextChest(n) {
				return {
					name: "towerNextChest",
					args: {},
					ident: "group_" + n + "_body"
				}
			}
			/**
			 * Open chest
			 *
			 * Открыть сундук
			 */
			function openChest(n) {
				return {
					name: "towerOpenChest",
					args: {
						"num": 2
					},
					ident: "group_" + n + "_body"
				}
			}

			const fullSkipTowerCall = {
				calls: []
			}

			let n = 0;
			for (let i = 0; i < 15; i++) {
				fullSkipTowerCall.calls.push(nextChest(++n));
				fullSkipTowerCall.calls.push(openChest(++n));
			}

			send(JSON.stringify(fullSkipTowerCall), data => {
				data.results[0] = data.results[28];
				checkDataFloor(data);
			});
		}

		function nextChestOpen(floorNumber) {
			const calls = [{
				name: "towerOpenChest",
				args: {
					num: 2
				},
				ident: "towerOpenChest"
			}];

			Send(JSON.stringify({ calls })).then(e => {
				nextOpenChest(floorNumber);
			});
		}

		function nextOpenChest(floorNumber) {
			if (floorNumber > 49) {
				endTower('openChest 50 floor', floorNumber);
				return;
			}
			if (floorNumber == 1) {
				fullSkipTower();
				return;
			}

			let nextOpenChestCall = {
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
				farmTowerRewards(reason);
			}
			setProgress(`${I18N('TOWER')} ${I18N('COMPLETED')}!`, true);
			resolve();
		}
	}

	/**
	 * Passage of the arena of the titans
	 *
	 * Прохождение арены титанов
	 */
	function testTitanArena() {
		return new Promise((resolve, reject) => {
			titAren = new executeTitanArena(resolve, reject);
			titAren.start();
		});
	}

	/**
	 * Passage of the arena of the titans
	 *
	 * Прохождение арены титанов
	 */
	function executeTitanArena(resolve, reject) {
		let titan_arena = [];
		let finishListBattle = [];
		/**
		 * ID of the current batch
		 *
		 * Идетификатор текущей пачки
		 */
		let currentRival = 0;
		/**
		 * Number of attempts to finish off the pack
		 *
		 * Количество попыток добития пачки
		 */
		let attempts = 0;
		/**
		 * Was there an attempt to finish off the current shooting range
		 *
		 * Была ли попытка добития текущего тира
		 */
		let isCheckCurrentTier = false;
		/**
		 * Current shooting range
		 *
		 * Текущий тир
		 */
		let currTier = 0;
		/**
		 * Number of battles on the current dash
		 *
		 * Количество битв на текущем тире
		 */
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
				setProgress(`${I18N('TITAN_ARENA')}: ${I18N('LEVEL')} ${currTier}`);
			}

			if (titanArena.status == "completed_tier") {
				titanArenaCompleteTier();
				return;
			}
			/**
			 * Checking for the possibility of a raid
			 * Проверка на возможность рейда
			 */
			if (titanArena.canRaid) {
				titanArenaStartRaid();
				return;
			}
			/**
			 * Check was an attempt to achieve the current shooting range
			 * Проверка была ли попытка добития текущего тира
			 */
			if (!isCheckCurrentTier) {
				checkRivals(titanArena.rivals);
				return;
			}

			endTitanArena('Done or not canRaid', titanArena);
		}
		/**
		 * Submit dash information for verification
		 *
		 * Отправка информации о тире на проверку
		 */
		function checkResultInfo(data) {
			let titanArena = data.results[0].result.response;
			checkTier(titanArena);
		}
		/**
		 * Finish the current tier
		 *
		 * Завершить текущий тир
		 */
		function titanArenaCompleteTier() {
			isCheckCurrentTier = false;
			let calls = [{
				name: "titanArenaCompleteTier",
				args: {},
				ident: "body"
			}];
			send(JSON.stringify({calls}), checkResultInfo);
		}
		/**
		 * Gathering points to be completed
		 *
		 * Собираем точки которые нужно добить
		 */
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
		/**
		 * Selecting the next point to finish off
		 *
		 * Выбор следующей точки для добития
		 */
		function roundRivals() {
			let countRivals = finishListBattle.length;
			if (!countRivals) {
				/**
				 * Whole range checked
				 *
				 * Весь тир проверен
				 */
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
		/**
		 * The start of a solo battle
		 *
		 * Начало одиночной битвы
		 */
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
		/**
		 * Calculation of the results of the battle
		 *
		 * Расчет результатов боя
		 */
		function calcResult(data) {
			let battlesInfo = data.results[0].result.response.battle;
			/**
			 * If attempts are equal to the current battle number we make
			 * Если попытки равны номеру текущего боя делаем прерасчет
			 */
			if (attempts == currentRival) {
				preCalcBattle(battlesInfo);
				return;
			}
			/**
			 * If there are still attempts, we calculate a new battle
			 * Если попытки еще есть делаем расчет нового боя
			 */
			if (attempts > 0) {
				attempts--;
				calcBattleResult(battlesInfo)
					.then(resultCalcBattle);
				return;
			}
			/**
			 * Otherwise, go to the next opponent
			 * Иначе переходим к следующему сопернику
			 */
			roundRivals();
		}
		/**
		 * Processing the results of the battle calculation
		 *
		 * Обработка результатов расчета битвы
		 */
		function resultCalcBattle(resultBattle) {
			// console.log('resultCalcBattle', currentRival, attempts, resultBattle.result.win);
			/**
			 * If the current calculation of victory is not a chance or the attempt ended with the finish the battle
			 * Если текущий расчет победа или шансов нет или попытки кончились завершаем бой
			 */
			if (resultBattle.result.win || !attempts) {
				titanArenaEndBattle({
					progress: resultBattle.progress,
					result: resultBattle.result,
					rivalId: resultBattle.battleData.typeId
				});
				return;
			}
			/**
			 * If not victory and there are attempts we start a new battle
			 * Если не победа и есть попытки начинаем новый бой
			 */
			titanArenaStartBattle(resultBattle.battleData.typeId);
		}
		/**
		 * Returns the promise of calculating the results of the battle
		 *
		 * Возращает промис расчета результатов битвы
		 */
		function getBattleInfo(battle, isRandSeed) {
			return new Promise(function (resolve) {
				if (isRandSeed) {
					battle.seed = Math.floor(Date.now() / 1000) + random(0, 1e3);
				}
				// console.log(battle.seed);
				BattleCalc(battle, "get_titanClanPvp", e => resolve(e));
			});
		}
		/**
		 * Recalculate battles
		 *
		 * Прерасчтет битвы
		 */
		function preCalcBattle(battle) {
			let actions = [getBattleInfo(battle, false)];
			const countTestBattle = getInput('countTestBattle');
			for (let i = 0; i < countTestBattle; i++) {
				actions.push(getBattleInfo(battle, true));
			}
			Promise.all(actions)
				.then(resultPreCalcBattle);
		}
		/**
		 * Processing the results of the battle recalculation
		 *
		 * Обработка результатов прерасчета битвы
		 */
		function resultPreCalcBattle(e) {
			let wins = e.map(n => n.result.win);
			let firstBattle = e.shift();
			let countWin = wins.reduce((w, s) => w + s);
			let numReval = countRivalsTier - finishListBattle.length;
			// setProgress('TitanArena: Уровень ' + currTier + ' Бои: ' + numReval + '/' + countRivalsTier + ' - ' + countWin + '/11');
			console.log('resultPreCalcBattle', countWin + '/11' )
			if (countWin > 0) {
				attempts = getInput('countAutoBattle');
			} else {
				attempts = 0;
			}
			resultCalcBattle(firstBattle);
		}

		/**
		 * Complete an arena battle
		 *
		 * Завершить битву на арене
		 */
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
			setProgress(`${I18N('TITAN_ARENA')}: ${I18N('LEVEL')} ${currTier} </br>${I18N('BATTLES')}: ${numReval}/${countRivalsTier} - ${attackScore}`);
			/**
			 * TODO: Might need to improve the results.
			 * TODO: Возможно стоит сделать улучшение результатов
			 */
			// console.log('resultTitanArenaEndBattle', e)
			console.log('resultTitanArenaEndBattle', numReval + '/' + countRivalsTier, attempts)
			roundRivals();
		}
		/**
		 * Arena State
		 *
		 * Состояние арены
		 */
		function titanArenaGetStatus() {
			let calls = [{
				name: "titanArenaGetStatus",
				args: {},
				ident: "body"
			}];
			send(JSON.stringify({calls}), checkResultInfo);
		}
		/**
		 * Arena Raid Request
		 *
		 * Запрос рейда арены
		 */
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

		/**
		 * Sending Raid Results
		 *
		 * Отправка результатов рейда
		 */
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
			setProgress(`${I18N('TITAN_ARENA')} ${I18N('COMPLETED')}!`, true);
			resolve();
		}
	}
	let hideTimeoutProgress = 0;
	/**
	 * Hide progress
	 *
	 * Скрыть прогресс
	 */
	function hideProgress(timeout) {
		timeout = timeout || 0;
		clearTimeout(hideTimeoutProgress);
		hideTimeoutProgress = setTimeout(function () {
			scriptMenu.setStatus('');
		}, timeout);
	}
	/**
	 * Progress display
	 *
	 * Отображение прогресса
	 */
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
		/**
		 * List of correspondence of used classes to their names
		 *
		 * Список соответствия используемых классов их названиям
		 */
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
			{name:"ClipLabelBase", prop:"game.view.gui.components.ClipLabelBase"},
			{name:"Translate", prop:"com.progrestar.common.lang.Translate"},
			{name:"ClipButtonLabeledCentered", prop:"game.view.gui.components.ClipButtonLabeledCentered"},
			{name:"BattlePausePopupMediator", prop:"game.mediator.gui.popup.battle.BattlePausePopupMediator"},
			{name:"SettingToggleButton", prop:"game.mechanics.settings.popup.view.SettingToggleButton"},
			{name:"PlayerDungeonData", prop:"game.mechanics.dungeon.model.PlayerDungeonData"},
			{name:"NextDayUpdatedManager", prop:"game.model.user.NextDayUpdatedManager"},
			{name:"BattleController", prop:"game.battle.controller.BattleController"},
			{name:"BattleSettingsModel", prop:"game.battle.controller.BattleSettingsModel"},
			{name:"BooleanProperty", prop:"engine.core.utils.property.BooleanProperty"},
			{name:"RuleStorage", prop:"game.data.storage.rule.RuleStorage"},
			{name:"BattleConfig", prop:"battle.BattleConfig"},
			{name:"SpecialShopModel", prop:"game.model.user.shop.SpecialShopModel"},
			{name:"BattleGuiMediator", prop:"game.battle.gui.BattleGuiMediator"},
			{name:"BooleanPropertyWriteable", prop:"engine.core.utils.property.BooleanPropertyWriteable"},
		];
		/**
		 * Contains the game classes needed to write and override game methods
		 *
		 * Содержит классы игры необходимые для написания и подмены методов игры
		 */
		Game = {
			/**
			 * Function 'e'
			 * Функция 'e'
			 */
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
		/**
		 * Connects to game objects via the object creation event
		 *
		 * Подключается к объектам игры через событие создания объекта
		 */
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
		 * Returns the results of the battle to the callback function
		 * Возвращает в функцию callback результаты боя
		 * @param {*} battleData battle data данные боя
		 * @param {*} battleConfig combat configuration type options:
		 *
		 * тип конфигурации боя варианты:
		 *
		 * "get_invasion", "get_titanPvpManual", "get_titanPvp",
		 * "get_titanClanPvp","get_clanPvp","get_titan","get_boss",
		 * "get_tower","get_pve","get_pvpManual","get_pvp","get_core"
		 *
		 * You can specify the xYc function in the game.assets.storage.BattleAssetStorage class
		 *
		 * Можно уточнить в классе game.assets.storage.BattleAssetStorage функция xYc
		 * @param {*} callback функция в которую вернуться результаты боя
		 */
		this.BattleCalc = function (battleData, battleConfig, callback) {
			// battleConfig = battleConfig || getBattleType(battleData.type)
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
		 * Returns a function with the specified name from the class
		 *
		 * Возвращает из класса функцию с указанным именем
		 * @param {Object} classF Class // класс
		 * @param {String} nameF function name // имя функции
		 * @param {String} pos name and alias order // порядок имени и псевдонима
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
		 * Returns a function with the specified name from the class
		 *
		 * Возвращает из класса функцию с указанным именем
		 * @param {Object} classF Class // класс
		 * @param {String} nameF function name // имя функции
		 * @returns
		 */
		function getFnP(classF, nameF) {
			let prop = Object.entries(classF.__properties__)
			return prop.filter((e) => e[1] == nameF).pop()[0];
		}

		/**
		 * Returns the function name with the specified ordinal from the class
		 *
		 * Возвращает имя функции с указаным порядковым номером из класса
		 * @param {Object} classF Class // класс
		 * @param {Number} nF Order number of function // порядковый номер функции
		 * @returns
		 */
		function getFn(classF, nF) {
			let prop = Object.keys(classF);
			return prop[nF];
		}

		/**
		 * Returns the name of the function with the specified serial number from the prototype of the class
		 *
		 * Возвращает имя функции с указаным порядковым номером из прототипа класса
		 * @param {Object} classF Class // класс
		 * @param {Number} nF Order number of function // порядковый номер функции
		 * @returns
		 */
		function getProtoFn(classF, nF) {
			let prop = Object.keys(classF.prototype);
			return prop[nF];
		}
		/**
		 * Description of replaced functions
		 *
		 * Описание подменяемых функций
		 */
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
						this[getProtoFn(Game.DisplayObjectContainer, 3)](this.clip[getProtoFn(Game.GuiClipContainer, 2)]());
						this.clip[getProtoFn(Game.BattlePausePopupClip, 1)][getProtoFn(Game.ClipLabelBase, 9)](Game.Translate.translate("UI_POPUP_BATTLE_PAUSE"));

						this.clip[getProtoFn(Game.BattlePausePopupClip, 2)][getProtoFn(Game.ClipButtonLabeledCentered, 2)](Game.Translate.translate("UI_POPUP_BATTLE_RETREAT"), (q = this[getProtoFn(Game.BattlePausePopup, 1)], Game.bindFunc(q, q[getProtoFn(Game.BattlePausePopupMediator, 17)])));
						this.clip[getProtoFn(Game.BattlePausePopupClip, 5)][getProtoFn(Game.ClipButtonLabeledCentered, 2)](
							this[getProtoFn(Game.BattlePausePopup, 1)][getProtoFn(Game.BattlePausePopupMediator, 14)](),
							this[getProtoFn(Game.BattlePausePopup, 1)][getProtoFn(Game.BattlePausePopupMediator, 13)]() ?
							(q = this[getProtoFn(Game.BattlePausePopup, 1)], Game.bindFunc(q, q[getProtoFn(Game.BattlePausePopupMediator, 18)])) :
							(q = this[getProtoFn(Game.BattlePausePopup, 1)], Game.bindFunc(q, q[getProtoFn(Game.BattlePausePopupMediator, 18)]))
						);

						this.clip[getProtoFn(Game.BattlePausePopupClip, 5)][getProtoFn(Game.ClipButtonLabeledCentered, 0)][getProtoFn(Game.ClipLabelBase, 24)]();
						this.clip[getProtoFn(Game.BattlePausePopupClip, 3)][getProtoFn(Game.SettingToggleButton, 3)](this[getProtoFn(Game.BattlePausePopup, 1)][getProtoFn(Game.BattlePausePopupMediator, 9)]());
						this.clip[getProtoFn(Game.BattlePausePopupClip, 4)][getProtoFn(Game.SettingToggleButton, 3)](this[getProtoFn(Game.BattlePausePopup, 1)][getProtoFn(Game.BattlePausePopupMediator, 10)]());
						this.clip[getProtoFn(Game.BattlePausePopupClip, 6)][getProtoFn(Game.SettingToggleButton, 3)](this[getProtoFn(Game.BattlePausePopup, 1)][getProtoFn(Game.BattlePausePopupMediator, 11)]());
						/*
						Какая-то ненужная фигня
						if (!HC.lSb()) {
							this.clip.r6b.g().B(!1);
							a = this.clip.r6b.g().X() + 7;
							var b = this.clip.ba.g();
							b.$(b.X() - a);
							b = this.clip.IS.g();
							b.sa(b.Fa() - a)
						}
						*/
					} else {
						oldPassBattle.call(this, a);
					}
				}

				let retreatButtonLabel = getF(Game.BattlePausePopupMediator, "get_retreatButtonLabel");
				let oldFunc = Game.BattlePausePopupMediator.prototype[retreatButtonLabel];
				Game.BattlePausePopupMediator.prototype[retreatButtonLabel] = function () {
					if (isChecked('passBattle')) {
						return I18N('BTN_PASS');
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
							//const multiple = a == 1 ? speedBattle : this[BC_13][a];
							a = this[BC_13][a] * Game.BattleController[BC_3][BP_get_value]() * this[BC_44]();
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
			},
			/**
			 * Remove the rare shop
			 *
			 * Удаление торговца редкими товарами
			 */
			removeWelcomeShop: function () {
				let SSM_3 = getProtoFn(Game.SpecialShopModel, 3);
				const oldWelcomeShop = Game.SpecialShopModel.prototype[SSM_3];
				Game.SpecialShopModel.prototype[SSM_3] = function () {
					if (isChecked('noOfferDonat')) {
						return null;
					} else {
						return oldWelcomeShop.call(this);
					}
				}
			},
			/**
			 * Acceleration button without Valkyries favor
			 *
			 * Кнопка ускорения без Покровительства Валькирий
			 */
			battleFastKey: function () {
				const BGM_39 = getProtoFn(Game.BattleGuiMediator, 39);
				const oldBattleFastKey = Game.BattleGuiMediator.prototype[BGM_39];
				Game.BattleGuiMediator.prototype[BGM_39] = function () {
					if (true) {
						const BGM_8 = getProtoFn(Game.BattleGuiMediator, 8);
						const BGM_9 = getProtoFn(Game.BattleGuiMediator, 9);
						const BPW_0 = getProtoFn(Game.BooleanPropertyWriteable, 0);
						this[BGM_8][BPW_0](true);
						this[BGM_9][BPW_0](true);
					} else {
						return oldBattleFastKey.call(this);
					}
				}
			}
		}
		/**
		 * Starts replacing recorded functions
		 *
		 * Запускает замену записанных функций
		 */
		this.activateHacks = function () {
			if (!selfGame) throw Error('Use connectGame');
			for (let func in replaceFunction) {
				replaceFunction[func]();
			}
		}
		/**
		 * Returns the game object
		 *
		 * Возвращает объект игры
		 */
		this.getSelfGame = function () {
			return selfGame;
		}
		/**
		 * Updates game data
		 *
		 * Обновляет данные игры
		 */
		this.refreshGame = function () {
			(new Game.NextDayUpdatedManager)[getProtoFn(Game.NextDayUpdatedManager, 5)]();
		}

		/**
		 * Change the play screen on windowName
		 *
		 * Сменить экран игры на windowName
		 *
		 * Possible options:
		 *
		 * Возможные варианты:
		 *
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
		/**
		 * Move to the sanctuary cheats.goSanctuary()
		 *
		 * Переместиться в святилище cheats.goSanctuary()
		 */
		this.goSanctuary = () => {
			this.goNavigtor("SANCTUARY");
		}
		/**
		 * Go to Guild War
		 *
		 * Перейти к Войне Гильдий
		 */
		this.goClanWar = function() {
			let instance = getFnP(selfGame["game.model.GameModel"], 'get_instance')
			let player = selfGame["game.model.GameModel"][instance]().A;
			let clanWarSelect = selfGame["game.mechanics.cross_clan_war.popup.selectMode.CrossClanWarSelectModeMediator"];
			new clanWarSelect(player).open();
		}

		connectGame();
	}
	/**
	 * Auto collection of gifts
	 *
	 * Автосбор подарков
	 */
	function getAutoGifts() {
		let valName = 'giftSendIds_' + userInfo.id;

		if (!localStorage['clearGift' + userInfo.id]) {
			localStorage[valName] = '';
			localStorage['clearGift' + userInfo.id] = '+';
		}

		if (!localStorage[valName]) {
			localStorage[valName] = '';
		}

		/**
		 * Submit a request to receive gift codes
		 *
		 * Отправка запроса для получения кодов подарков
		 */
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
					console.log(`${I18N('GIFTS')}: ${countGetGifts}`);
				});
			}
		)
	}
	/**
	 * To fill the kills in the Forge of Souls
	 *
	 * Набить килов в горниле душ
	 */
	async function bossRatingEvent() {
		const topGet = await Send(JSON.stringify({ calls: [{ name: "topGet", args: { type: "bossRatingTop", extraId: 0 }, ident: "body" }] }));
		if (!topGet) {
			setProgress(`${I18N('EVENT')} ${I18N('NOT_AVAILABLE')}`, true);
			return;
		}
		const replayId = topGet.results[0].result.response[0].userData.replayId;
		const result = await Send(JSON.stringify({
			calls: [
				{ name: "battleGetReplay", args: { id: replayId }, ident: "battleGetReplay" },
				{ name: "heroGetAll", args: {}, ident: "heroGetAll" },
				{ name: "pet_getAll", args: {}, ident: "pet_getAll" },
				{ name: "offerGetAll", args: {}, ident: "offerGetAll" }
			]
		}));
		const bossEventInfo = result.results[3].result.response.find(e => e.offerType == "bossEvent");
		if (!bossEventInfo) {
			setProgress(`${I18N('EVENT')} ${I18N('NOT_AVAILABLE')}`, true);
			return;
		}
		const usedHeroes = bossEventInfo.progress.usedHeroes;
		const party = Object.values(result.results[0].result.response.replay.attackers);
		const availableHeroes = Object.values(result.results[1].result.response).map(e => e.id);
		const availablePets = Object.values(result.results[2].result.response).map(e => e.id);
		const calls = [];
		/**
		 * First pack
		 *
		 * Первая пачка
		 */
		const args = {
			heroes: [],
			favor: {}
		}
		for (let hero of party) {
			if (hero.id >= 6000 && availablePets.includes(hero.id)) {
				args.pet = hero.id;
				continue;
			}
			if (!availableHeroes.includes(hero.id) || usedHeroes.includes(hero.id)) {
				continue;
			}
			args.heroes.push(hero.id);
			if (hero.favorPetId) {
				args.favor[hero.id] = hero.favorPetId;
			}
		}
		if (args.heroes.length) {
			calls.push({
				name: "bossRatingEvent_startBattle",
				args,
				ident: "body_0"
			});
		}
		/**
		 * Other packs
		 *
		 * Другие пачки
		 */
		let heroes = [];
		let count = 1;
		while (heroId = availableHeroes.pop()) {
			if (args.heroes.includes(heroId) || usedHeroes.includes(heroId)) {
				continue;
			}
			heroes.push(heroId);
			if (heroes.length == 5) {
				calls.push({
					name: "bossRatingEvent_startBattle",
					args: {
						heroes: [...heroes],
						pet: availablePets[Math.floor(Math.random() * availablePets.length)]
					},
					ident: "body_" + count
				});
				heroes = [];
				count++;
			}
		}

		if (!calls.length) {
			setProgress(`${I18N('NO_HEROES')}`, true);
			return;
		}

		const resultBattles = await Send(JSON.stringify({ calls }));
		console.log(resultBattles);
		rewardBossRatingEvent();
	}
	/**
	 * Collecting Rewards from the Forge of Souls
	 *
	 * Сбор награды из Горнила Душ
	 */
	function rewardBossRatingEvent() {
		let rewardBossRatingCall = '{"calls":[{"name":"offerGetAll","args":{},"ident":"offerGetAll"}]}';
		send(rewardBossRatingCall, function (data) {
			let bossEventInfo = data.results[0].result.response.find(e => e.offerType == "bossEvent");
			if (!bossEventInfo) {
				setProgress(`${I18N('EVENT')} ${I18N('NOT_AVAILABLE')}`, true);
				return;
			}

			let farmedChests = bossEventInfo.progress.farmedChests;
			let score = bossEventInfo.progress.score;
			setProgress(`${I18N('DAMAGE_AMOUNT')}: ${score}`);
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
				setProgress(`${I18N('NOTHING_TO_COLLECT')}`, true);
				return;
			}

			send(JSON.stringify(getRewardCall), e => {
				console.log(e);
				setProgress(`${I18N('COLLECTED')} ${e?.results?.length} ${I18N('REWARD')}`, true);
			});
		});
	}
	/**
	 * Collect Easter eggs and event rewards
	 *
	 * Собрать пасхалки и награды событий
	 */
	function offerFarmAllReward() {
		const offerGetAllCall = '{"calls":[{"name":"offerGetAll","args":{},"ident":"offerGetAll"}]}';
		return Send(offerGetAllCall).then((data) => {
			const offerGetAll = data.results[0].result.response.filter(e => e.type == "reward" && !e?.freeRewardObtained && e.reward);
			if (!offerGetAll.length) {
				setProgress(`${I18N('NOTHING_TO_COLLECT')}`, true);
				return;
			}

			const calls = [];
			for (let reward of offerGetAll) {
				calls.push({
					name: "offerFarmReward",
					args: {
						offerId: reward.id
					},
					ident: "offerFarmReward_" + reward.id
				});
			}

			return Send(JSON.stringify({ calls })).then(e => {
				console.log(e);
				setProgress(`${I18N('COLLECTED')} ${e?.results?.length} ${I18N('REWARD')}`, true);
			});
		});
	}
	/**
	 * Assemble Outland
	 *
	 * Собрать запределье
	 */
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
					setProgress(`${I18N('OUTLAND')} ${I18N('NOTHING_TO_COLLECT')}`, true);
					resolve();
					return;
				}

				send(JSON.stringify(bossRaidOpenChestCall), e => {
					setProgress(`${I18N('OUTLAND')} ${I18N('COLLECTED')}`, true);
					resolve();
				});
			});
		});
	}
	/**
	 * Collect all rewards
	 *
	 * Собрать все награды
	 */
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
					setProgress(`${I18N('COLLECTED')} ${number} ${I18N('REWARD')}`, true);
					resolve();
					return;
				}

				send(JSON.stringify(questAllFarmCall), function (res) {
					console.log(res);
					setProgress(`${I18N('COLLECTED')} ${number} ${I18N('REWARD')}`, true);
					resolve();
				});
			});
		})
	}

	/**
	 * Attack of the minions of Asgard
	 *
	 * Атака прислужников Асгарда
	 */
	function testRaidNodes() {
		return new Promise((resolve, reject) => {
			const tower = new executeRaidNodes(resolve, reject);
			tower.start();
		});
	}

	/**
	 * Attack of the minions of Asgard
	 *
	 * Атака прислужников Асгарда
	 */
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
			setProgress(`${I18N('REMAINING_ATTEMPTS')}: ${raidData.attempts}`);
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
		/**
		 * Returns the battle calculation promise
		 *
		 * Возвращает промис расчета боя
		 */
		function calcBattleResult(battleData) {
			return new Promise(function (resolve, reject) {
				BattleCalc(battleData, "get_clanPvp", resolve);
			});
		}
		/**
		 * Cancels the fight
		 *
		 * Отменяет бой
		 */
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
		/**
		 * Ends the fight
		 *
		 * Завершает бой
		 */
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
		/**
		 * Processing the results of the battle
		 *
		 * Обработка результатов боя
		 */
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
		/**
		 * Completing a task
		 *
		 * Завершение задачи
		 */
		function endRaidNodes(reason, info) {
			isCancalBattle = true;
			let textCancel = raidData.cancelBattle ? ` ${I18N('BATTLES_CANCELED')}: ${raidData.cancelBattle}` : '';
			setProgress(`${I18N('MINION_RAID')} ${I18N('COMPLETED')}! ${textCancel}`, true);
			console.log(reason, info);
			resolve();
		}
	}
	/**
	 * Mission auto repeat
	 *
	 * Автоповтор миссии
	 * isStopSendMission = false;
	 * isSendsMission = true;
	 **/
	this.sendsMission = async function (param) {
		if (isStopSendMission) {
			isSendsMission = false;
			console.log(I18N('STOPPED'));
			setProgress('');
			await popup.confirm(`${I18N('STOPPED')}<br>${I18N('REPETITIONS')}: ${param.count}`, [{
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
		/**
		 * Mission Request
		 *
		 * Запрос на выполнение мисии
		 */
		SendRequest(JSON.stringify(missionStartCall), async e => {
			if (e['error']) {
				isSendsMission = false;
				console.log(e['error']);
				setProgress('');
				let msg = e['error'].name + ' ' + e['error'].description + `<br>${I18N('REPETITIONS')}: ${param.count}`;
				await popup.confirm(msg, [
					{msg: 'Ok', result: true},
				])
				return;
			}
			/**
			 * Mission data calculation
			 *
			 * Расчет данных мисии
			 */
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
				/**
				 * Mission Completion Request
				 *
				 * Запрос на завершение миссии
				 */
				SendRequest(JSON.stringify(missionEndCall), async (e) => {
					if (e['error']) {
						isSendsMission = false;
						console.log(e['error']);
						setProgress('');
						let msg = e['error'].name + ' ' + e['error'].description + `<br>${I18N('REPETITIONS')}: ${param.count}`;
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
						await popup.confirm(`<br>${I18N('REPETITIONS')}: ${param.count}` + ' 3 ' + r['error'], [
							{msg: 'Ok', result: true},
						])
						return;
					}

					param.count++;
					setProgress(`${I18N('MISSIONS_PASSED')}: ${param.count} (${I18N('STOP')})`, false, () => {
						isStopSendMission = true;
					});
					setTimeout(sendsMission, 1, param);
				});
			})
		});
	}
	/**
	 * Recursive opening of matryoshka dolls
	 *
	 * Рекурсивное открытие матрешек
	 */
	function openRussianDoll(id, count, sum) {
		sum = sum || 0;
		sum += count;
		send('{"calls":[{"name":"consumableUseLootBox","args":{"libId":'+id+',"amount":'+count+'},"ident":"body"}]}', e => {
			setProgress(`${I18N('OPEN')} ${count}`, true);
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
				popup.confirm(`${I18N('TOTAL_OPEN')} ${sum}`);
			}
		})
	}

	/**
	 * Asgard Boss Attack Replay
	 *
	 * Повтор атаки босса Асгарда
	 */
	function testBossBattle() {
		return new Promise((resolve, reject) => {
			const bossBattle = new executeBossBattle(resolve, reject);
			bossBattle.start(lastBossBattle, lastBossBattleInfo);
		});
	}

	/**
	 * Asgard Boss Attack Replay
	 *
	 * Повтор атаки босса Асгарда
	 */
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
				`${I18N('ROUND_STAT')} ${damages.length} ${I18N('BATTLE')}:` +
				`<br>${I18N('MINIMUM')}: ` + minDamage.toLocaleString() +
				`<br>${I18N('MAXIMUM')}: ` + maxDamage.toLocaleString() +
				`<br>${I18N('AVERAGE')}: ` + avgDamage.toLocaleString()
				/*+ '<br>Поиск урона больше чем ' + reachDamage.toLocaleString()*/
				, [
					{ msg: I18N('BTN_OK'), result: 0},
				/* {msg: 'Погнали', isInput: true, default: reachDamage}, */
			])
			if (result) {
				reachDamage = result;
				isCancalBossBattle = false;
				startBossBattle();
				return;
			}
			endBossBattle(I18N('BTN_CANCEL'));
		}

		function startBossBattle() {
			countBattle++;
			countMaxBattle = getInput('countAutoBattle');
			if (countBattle > countMaxBattle) {
				setProgress('Превышен лимит попыток: ' + countMaxBattle, true);
				endBossBattle('Превышен лимит попыток: ' + countMaxBattle);
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

		/**
		 * Completing a task
		 *
		 * Завершение задачи
		 */
		function endBossBattle(reason, info) {
			isCancalBossBattle = true;
			console.log(reason, info);
			resolve();
		}
	}

	/**
	 * Auto-repeat attack
	 *
	 * Автоповтор атаки
	 */
	function testAutoBattle() {
		return new Promise((resolve, reject) => {
			const bossBattle = new executeAutoBattle(resolve, reject);
			bossBattle.start(lastBattleArg, lastBattleInfo);
		});
	}

	/**
	 * Auto-repeat attack
	 *
	 * Автоповтор атаки
	 */
	function executeAutoBattle(resolve, reject) {
		let battleArg = {};
		let countBattle = 0;
		let findCoeff = 0;

		this.start = function (battleArgs, battleInfo) {
			battleArg = battleArgs;
			preCalcBattle(battleInfo);
		}
		/**
		 * Returns a promise for combat recalculation
		 *
		 * Возвращает промис для прерасчета боя
		 */
		function getBattleInfo(battle) {
			return new Promise(function (resolve) {
				battle.seed = Math.floor(Date.now() / 1000) + random(0, 1e3);
				Calc(battle).then(e => {
					e.coeff = calcCoeff(e, 'defenders');
					resolve(e);
				});
			});
		}
		/**
		 * Battle recalculation
		 *
		 * Прерасчет боя
		 */
		function preCalcBattle(battle) {
			let actions = [];
			const countTestBattle = getInput('countTestBattle');
			for (let i = 0; i < countTestBattle; i++) {
				actions.push(getBattleInfo(battle));
			}
			Promise.all(actions)
				.then(resultPreCalcBattle);
		}
		/**
		 * Processing the results of the battle recalculation
		 *
		 * Обработка результатов прерасчета боя
		 */
		async function resultPreCalcBattle(results) {
			let countWin = results.reduce((s, w) => w.result.win + s, 0);
			setProgress(`${I18N('CHANCE_TO_WIN')} ${Math.floor(countWin / results.length * 100)}% (${results.length})`, true);
			if (countWin > 0) {
				isCancalBattle = false;
				startBattle();
				return;
			}

			let minCoeff = 100;
			let maxCoeff = -100;
			let avgCoeff = 0;
			results.forEach(e => {
				if (e.coeff < minCoeff) minCoeff = e.coeff;
				if (e.coeff > maxCoeff) maxCoeff = e.coeff;
				avgCoeff += e.coeff;
			});
			avgCoeff /= results.length;

			const result = await popup.confirm(
				I18N('VICTORY_IMPOSSIBLE') +
				`<br>${I18N('ROUND_STAT')} ${results.length} ${I18N('BATTLE')}:` +
				`<br>${I18N('MINIMUM')}: ` + minCoeff.toLocaleString() +
				`<br>${I18N('MAXIMUM')}: ` + maxCoeff.toLocaleString() +
				`<br>${I18N('AVERAGE')}: ` + avgCoeff.toLocaleString() +
				`<br>${I18N('FIND_COEFF')} ` + avgCoeff.toLocaleString(), [
				{ msg: I18N('BTN_CANCEL'), result: 0 },
				{ msg: I18N('BTN_GO'), isInput: true, default: Math.round(avgCoeff * 1000) / 1000 },
			])
			if (result) {
				findCoeff = result;
				isCancalBattle = false;
				startBattle();
				return;
			}
			setProgress(I18N('NOT_THIS_TIME'), true);
			endAutoBattle(I18N('NOT_THIS_TIME'));
		}

		/**
		 * Calculation of the combat result coefficient
		 *
		 * Расчет коэфициента результата боя
		 */
		function calcCoeff(result, packType) {
			let beforeSumFactor = 0;
			const beforePack = result.battleData[packType][0];
			for (let heroId in beforePack) {
				const hero = beforePack[heroId];
				const state = hero.state;
				let factor = 1;
				if (state) {
					const hp = state.hp / state.maxHp;
					const energy = state.energy / 1e3;
					factor = hp + energy / 20;
				}
				beforeSumFactor += factor;
			}

			let afterSumFactor = 0;
			const afterPack = result.progress[0][packType].heroes;
			for (let heroId in afterPack) {
				const hero = afterPack[heroId];
				const hp = hero.hp / beforePack[heroId].state.hp;
				const energy = hero.energy / 1e3;
				const factor = hp + energy / 20;
				afterSumFactor += factor;
			}
			const resultCoeff = -(afterSumFactor - beforeSumFactor);
			return Math.round(resultCoeff * 1000) / 1000;
		}
		/**
		 * Start battle
		 *
		 * Начало боя
		 */
		function startBattle() {
			countBattle++;
			const countMaxBattle = getInput('countAutoBattle');
			setProgress(countBattle + '/' + countMaxBattle);
			if (countBattle > countMaxBattle) {
				setProgress(`${I18N('RETRY_LIMIT_EXCEEDED')}: ${countMaxBattle}`, true);
				endAutoBattle(`${I18N('RETRY_LIMIT_EXCEEDED')}: ${countMaxBattle}`)
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
		/**
		 * Battle calculation
		 *
		 * Расчет боя
		 */
		function calcResultBattle(e) {
			let battle = e.results[0].result.response.battle
			BattleCalc(battle, getBattleType(battle.type), resultBattle);
		}
		/**
		 * Processing the results of the battle
		 *
		 * Обработка результатов боя
		 */
		function resultBattle(e) {
			const isWin = e.result.win;
			console.log(isWin);
			if (isWin) {
				endBattle(e, false);
				return;
			}
			if (findCoeff) {
				const coeff = calcCoeff(e, 'defenders');
				console.log(coeff);
				setProgress(coeff, true);
				if (coeff > findCoeff) {
					endBattle(e, false);
					return;
				}
			}
			cancelEndBattle(e);
		}
		/**
		 * Cancel fight
		 *
		 * Отмена боя
		 */
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
		/**
		 * End of the fight
		 *
		 * Завершение боя */
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
				scriptMenu.setStatus(`${I18N('SUCCESS')}!`);
				setTimeout(() => {
					scriptMenu.setStatus('');
				}, 5000)
				endAutoBattle(`${I18N('SUCCESS')}!`)
			});
		}
		/**
		 * Completing a task
		 *
		 * Завершение задачи
		 */
		function endAutoBattle(reason, info) {
			isCancalBattle = true;
			console.log(reason, info);
			resolve();
		}
	}
	/**
	 * Collect all mail, except letters with energy and charges of the portal
	 *
	 * Собрать всю почту, кроме писем с энергией и зарядами портала
	 */
	function mailGetAll() {
		const getMailInfo = '{"calls":[{"name":"mailGetAll","args":{},"ident":"body"}]}';

		return Send(getMailInfo).then(dataMail => {
			const letters = dataMail.results[0].result.response.letters;
			const letterIds = lettersFilter(letters);
			if (!letterIds.length) {
				setProgress(I18N('NOTHING_TO_COLLECT'), true);
				return;
			}

			const calls = [
				{ name: "mailFarm", args: { letterIds }, ident: "body" }
			];

			return Send(JSON.stringify({ calls })).then(res => {
				const lettersIds = res.results[0].result.response;
				if (lettersIds) {
					const countLetters = Object.keys(lettersIds).length;
					setProgress(`${I18N('RECEIVED')} ${countLetters} ${I18N('LETTERS')}`, true);
				}
			});
		});
	}
	/**
	 * Filters received emails
	 *
	 * Фильтрует получаемые письма
	 */
	function lettersFilter(letters) {
		const lettersIds = [];
		for (let l in letters) {
			letter = letters[l];
			const reward = letter.reward;
			/**
			 * Mail Collection Exceptions
			 *
			 * Исключения на сбор писем
			 */
			const isFarmLetter = !(
				/** Portals // сферы портала */
				(reward?.refillable ? reward.refillable[45] : false) ||
				/** Energy // энергия */
				(reward?.stamina ? reward.stamina : false) ||
				/** accelerating energy gain // ускорение набора энергии */
				(reward?.buff ? true : false) ||
				/** VIP Points // вип очки */
				(reward?.vipPoints ? reward.vipPoints : false) ||
				/** souls of heroes // душы героев */
				(reward?.fragmentHero ? true : false) ||
				/** heroes // герои */
				(reward?.bundleHeroReward ? true : false)
			);
			if (isFarmLetter) {
				lettersIds.push(~~letter.id);
			}
		}
		return lettersIds;
	}
	/**
	 * Displaying information about the areas of the portal and attempts on the VG
	 *
	 * Отображение информации о сферах портала и попытках на ВГ
	 */
	async function justInfo() {
		return new Promise(async (resolve, reject) => {
			const calls = [{
				name: "userGetInfo",
				args: {},
				ident: "userGetInfo"
			},
			{
				name: "clanWarGetInfo",
				args: {},
				ident: "clanWarGetInfo"
			}];
			const result = await Send(JSON.stringify({ calls }));
			const infos = result.results;
			const portalSphere = infos[0].result.response.refillable.find(n => n.id == 45);
			const clanWarMyTries = infos[1].result.response?.myTries ?? 0;
			const sanctuaryButton = buttons['goToSanctuary'].button;
			const clanWarButton = buttons['goToClanWar'].button;
			if (portalSphere.amount) {
				sanctuaryButton.style.color = portalSphere.amount >= 3 ? 'red' : 'brown';
				sanctuaryButton.title = `${I18N('SANCTUARY_TITLE')}\n${portalSphere.amount} ${I18N('PORTALS')}`;
			} else {
				sanctuaryButton.style.color = '';
				sanctuaryButton.title = I18N('SANCTUARY_TITLE');
			}
			if (clanWarMyTries) {
				clanWarButton.style.color = 'red';
				clanWarButton.title = `${I18N('GUILD_WAR_TITLE')}\n${clanWarMyTries}${I18N('ATTEMPTS')}`;
			} else {
				clanWarButton.style.color = '';
				clanWarButton.title = I18N('GUILD_WAR_TITLE');
			}
			setProgress('<img src="https://zingery.ru/heroes/portal.png" style="height: 25px;position: relative;top: 5px;"> ' + `${portalSphere.amount} </br> ${I18N('GUILD_WAR')}: ${clanWarMyTries}`, true);
			resolve();
		});
	}

	function testDailyQuests() {
		return new Promise((resolve, reject) => {
			const bossBattle = new dailyQuests(resolve, reject, questsInfo);
			bossBattle.start();
		});
	}
	/**
	 * Automatic completion of daily quests
	 *
	 * Автоматическое выполнение ежедневных квестов
	 */
	class dailyQuests {
		/**
		 * Send(' {"calls":[{"name":"heroGetAll","args":{},"ident":"body"}]}').then(e => console.log(e))
		 * Send(' {"calls":[{"name":"titanGetAll","args":{},"ident":"body"}]}').then(e => console.log(e))
		 * Send(' {"calls":[{"name":"inventoryGet","args":{},"ident":"body"}]}').then(e => console.log(e))
		 * Send(' {"calls":[{"name":"questGetAll","args":{},"ident":"body"}]}').then(e => console.log(e))
		 */
		dataQuests = {
			10001: {
				/**
				 * TODO: Watch heroes and money
				 * TODO: Смотреть героев и деньги
				 */
				description: 'Улучши умения героев 3 раза', //
				isWeCanDo: () => false,
			},
			10002: {
				description: 'Пройди 10 миссий', // --------------
				isWeCanDo: () => false,
			},
			10003: {
				description: 'Пройди 3 героические миссии', // --------------
				isWeCanDo: () => false,
			},
			10004: {
				description: 'Сразись 3 раза на Арене или Гранд Арене', // --------------
				isWeCanDo: () => false,
			},
			10006: {
				description: 'Используй обмен изумрудов 1 раз',
				doItCall: [{ name: "refillableAlchemyUse", args: { multi: false }, ident: "refillableAlchemyUse" }],
				isWeCanDo: () => false,
			},
			10007: {
				description: 'Открой 1 сундук', // ++++++++++++++++
				doItCall: [{ name: "chestBuy", args: { chest: "town", free: true, pack: false }, ident: "chestBuy" }],
				isWeCanDo: (info) => {
					const chestInfo = info['userGetInfo'].refillable.find(e => e.id == 37);
					return chestInfo.amount > 0;
				},
			},
			10016: {
				description: 'Отправь подарки согильдийцам', // ++++++++++++++++
				doItCall: [{ name: "clanSendDailyGifts", args: {}, ident: "clanSendDailyGifts" }],
				isWeCanDo: () => true,
			},
			10018: {
				/**
				 * TODO: Watch heroes, watch potions (consumable 9, 10, 11, 12)
				 * TODO: Смотреть героев, смотреть зелья (consumable 9, 10, 11, 12)
				 */
				description: 'Используй зелье опыта',
				/**
				 * Spends a bank of experience on Galahard
				 * Тратит банку опыта на Галахарда
				 */
				doItCall: [{ name: "consumableUseHeroXp", args: { heroId: 2, libId: 10, amount: 1 }, ident: "consumableUseHeroXp" }],
				isWeCanDo: () => false,
			},
			10019: {
				description: 'Открой 1 сундук в Башне',
				doItFunc: testTower,
				isWeCanDo: () => false,
			},
			10020: {
				description: 'Открой 3 сундука в Запределье',
				isWeCanDo: () => false,
			},
			10021: {
				description: 'Собери 75 Титанита в Подземелье Гильдии',
				isWeCanDo: () => false,
			},
			10022: {
				description: 'Собери 150 Титанита в Подземелье Гильдии',
				doItFunc: testDungeon,
				isWeCanDo: () => false,
			},
			10023: {
				/**
				 * TODO: Watch heroes, watch sparks (24 consumable, 250 at level 0 and 7000 gold)
				 * TODO: Смотреть героев, смотреть искры (consumable 24, 250 на 0 уровне и золото 7000)
				 */
				description: 'Прокачай Дар Стихий на 1 уровень',
				/**
				 * Upgrade and Reset Gift of the Elements to Galahard
				 * Улучшение и сброс дара стихий Галахарду
				*/
				doItCall: [
					{ name: "heroTitanGiftLevelUp", args: { heroId: 2 }, ident: "heroTitanGiftLevelUp" },
					{ name: "heroTitanGiftDrop", args: { heroId: 2 }, ident: "heroTitanGiftDrop" }
				],
				isWeCanDo: () => false,
			},
			10024: {
				/**
				 * TODO: Watch Heroes
				 * TODO: Смотреть героев
				 */
				description: 'Повысь уровень любого артефакта один раз',
				isWeCanDo: () => false,
			},
			10025: {
				description: 'Начни 1 Экспедицию',
				doItFunc: checkExpedition,
				isWeCanDo: () => false,
			},
			10026: {
				description: 'Начни 4 Экспедиции', // --------------
				doItFunc: checkExpedition,
				isWeCanDo: () => false,
			},
			10027: {
				description: 'Победи в 1 бою Турнира Стихий',
				doItFunc: testTitanArena,
				isWeCanDo: () => false,
			},
			10028: {
				/**
				 * TODO: Смотреть титанов, можно качать арты за золото если золота больше 5 лямов
				 * TODO: Watch titans, you can download arts for gold if there is more than 5kk gold
				 */
				description: 'Повысь уровень любого артефакта титанов',
				isWeCanDo: () => false,
			},
			10029: {
				description: 'Открой сферу артефактов титанов', // ++++++++++++++++
				doItCall: [{ name: "titanArtifactChestOpen", args: { amount: 1, free: true }, ident: "titanArtifactChestOpen" }],
				isWeCanDo: (info) => {
					return info['inventoryGet']?.consumable[55] > 0
				},
			},
			10030: {
				/**
				 * TODO: Watch Heroes
				 * TODO: Смотреть героев
				 */
				description: 'Улучши облик любого героя 1 раз',
				isWeCanDo: () => false,
			},
			10031: {
				description: 'Победи в 6 боях Турнира Стихий', // --------------
				doItFunc: testTitanArena,
				isWeCanDo: () => false,
			},
			10043: {
				description: 'Начни или присоеденись к Приключению', // --------------
				isWeCanDo: () => false,
			},
			10044: {
				description: 'Воспользуйся призывом питомцев 1 раз', // ++++++++++++++++
				doItCall: [{ name: "pet_chestOpen", args: { amount: 1, paid: false }, ident: "pet_chestOpen" }],
				isWeCanDo: (info) => {
					return info['inventoryGet']?.consumable[90] > 0
				},
			},
			10046: {
				/**
				 * TODO: Watch Adventure
				 * TODO: Смотреть приключение
				 */
				description: 'Открой 3 сундука в Приключениях',
				isWeCanDo: () => false,
			},
			10047: {
				/**
				 * TODO: Watch heroes and runes consumable 1, 2, 3, 4
				 * TODO: Смотреть героев и руны consumable 1, 2, 3, 4
				 */
				description: 'Набери 150 очков активности в Гильдии',
				/**
				 * Upgrade the rune Galahard
				 * Прокачать руну Галахарду
				 */
				doItCall: [{ name: "heroEnchantRune", args: { heroId: 2, tier: 0, items: { consumable: { '1': 1 } } }, ident: "heroEnchantRune" }],
				isWeCanDo: () => false,
			},
		};

		constructor(resolve, reject, questInfo) {
			this.resolve = resolve;
			this.reject = reject;
			this.questInfo = questInfo
		}

		async start() {
			/**
			 * TODO may not be needed
			 *
			 * TODO возожно не нужна
			 */
			let countQuest = 0;
			const weCanDo = [];
			const selectedActions = getSaveVal('selectedActions', {});
			for (let quest of this.questInfo['questGetAll']) {
				if (quest.id in this.dataQuests && quest.state == 1) {
					if (!selectedActions[quest.id]) {
						selectedActions[quest.id] = {
							checked: false
						}
					}
					if (!this.dataQuests[quest.id].isWeCanDo(this.questInfo)) {
						continue;
					}

					weCanDo.push({
						name: quest.id,
						label: I18N(`QUEST_${quest.id}`),
						checked: selectedActions[quest.id].checked
					});
					countQuest++;
				}
			}

			if (!weCanDo.length) {
				this.end(I18N('NOTHING_TO_DO'));
				return;
			}

			console.log(weCanDo);
			const answer = await popup.confirm(`${I18N('YOU_CAN_COMPLETE') }:`, [
				{ msg: I18N('BTN_DO_IT'), result: true },
				{ msg: I18N('BTN_CANCEL'), result: false },
			], weCanDo);
			if (!answer) {
				this.end('');
				return;
			}
			const taskList = popup.getCheckBoxes();
			taskList.forEach(e => {
				selectedActions[e.name].checked = e.checked;
			});
			setSaveVal('selectedActions', selectedActions);
			const calls = [];
			let countChecked = 0;
			for (const task of taskList) {
				if (task.checked) {
					countChecked++;
					const quest = this.dataQuests[task.name]
					console.log(quest.description);

					if (quest.doItCall) {
						calls.push(...quest.doItCall);
					}
				}
			}

			if (!countChecked) {
				this.end(I18N('NOT_QUEST_COMPLETED'));
				return;
			}

			await Send(JSON.stringify({ calls }));
			this.end(`${I18N('COMPLETED_QUESTS')}: ${countChecked}`);
		}

		errorHandling(error) {
			//console.error(error);
			let errorInfo = error.toString() + '\n';
			try {
				const errorStack = error.stack.split('\n');
				const endStack = errorStack.map(e => e.split('@')[0]).indexOf("testDoYourBest");
				errorInfo += errorStack.slice(0, endStack).join('\n');
			} catch (e) {
				errorInfo += error.stack;
			}
			copyText(errorInfo);
		}

		end(status) {
			setProgress(status, true);
			this.resolve();
		}
	}

	function testDoYourBest() {
		return new Promise((resolve, reject) => {
			const doIt = new doYourBest(resolve, reject);
			doIt.start();
		});
	}
	/**
	 * Do everything button
	 *
	 * Кнопка сделать все
	 */
	class doYourBest {

		funcList = [
			{
				name: 'getOutland',
				label: I18N('ASSEMBLE_OUTLAND'),
				checked: false
			},
			{
				name: 'testTower',
				label: I18N('PASS_THE_TOWER'),
				checked: false
			},
			{
				name: 'checkExpedition',
				label: I18N('CHECK_EXPEDITIONS'),
				checked: false
			},
			{
				name: 'testTitanArena',
				label: I18N('COMPLETE_TOE'),
				checked: false
			},
			{
				name: 'testDungeon',
				label: I18N('COMPLETE_DUNGEON'),
				checked: false
			},
			{
				name: 'mailGetAll',
				label: I18N('COLLECT_MAIL'),
				checked: false
			},
			{
				name: 'collectAllStuff',
				label: I18N('COLLECT_MISC'),
				checked: false
			},
			{
				name: 'questAllFarm',
				label: I18N('COLLECT_QUEST_REWARDS'),
				checked: false
			},
			{
				name: 'synchronization',
				label: I18N('MAKE_A_SYNC'),
				checked: false
			},
		];

		functions = {
			getOutland,
			testTower,
			checkExpedition,
			testTitanArena,
			testDungeon,
			mailGetAll,
			collectAllStuff: async () => {
				await offerFarmAllReward();
				await Send('{"calls":[{"name":"subscriptionFarm","args":{},"ident":"body"},{"name":"zeppelinGiftFarm","args":{},"ident":"zeppelinGiftFarm"},{"name":"grandFarmCoins","args":{},"ident":"grandFarmCoins"}]}');
			},
			questAllFarm,
			synchronization: async () => {
				cheats.refreshGame();
			}
		}

		constructor(resolve, reject, questInfo) {
			this.resolve = resolve;
			this.reject = reject;
			this.questInfo = questInfo
		}

		async start() {
			const selectedDoIt = getSaveVal('selectedDoIt', {});

			this.funcList.forEach(task => {
				if (!selectedDoIt[task.name]) {
					selectedDoIt[task.name] = {
						checked: task.checked
					}
				} else {
					task.checked = selectedDoIt[task.name].checked
				}
			});

			const answer = await popup.confirm(I18N('RUN_FUNCTION'), [
				{ msg: I18N('BTN_CANCEL'), result: false },
				{ msg: I18N('BTN_GO'), result: true },
			], this.funcList);

			if (!answer) {
				this.end('');
				return;
			}

			const taskList = popup.getCheckBoxes();
			taskList.forEach(task => {
				selectedDoIt[task.name].checked = task.checked;
			});
			setSaveVal('selectedDoIt', selectedDoIt);
			for (const task of popup.getCheckBoxes()) {
				if (task.checked) {
					try {
						setProgress(`${task.label} <br>${I18N('PERFORMED')}!`);
						await this.functions[task.name]();
						setProgress(`${task.label} <br>${I18N('DONE')}!`);
					} catch (error) {
						if (await popup.confirm(`${I18N('ERRORS_OCCURRES')}:<br> ${task.label} <br>${I18N('COPY_ERROR')}?`, [
							{ msg: I18N('BTN_NO'), result: false },
							{ msg: I18N('BTN_YES'), result: true },
						])) {
							this.errorHandling(error);
						}
					}
				}
			}
			setTimeout((msg) => {
				this.end(msg);
			}, 2000, I18N('ALL_TASK_COMPLETED'));
			return;
		}

		errorHandling(error) {
			//console.error(error);
			let errorInfo = error.toString() + '\n';
			try {
				const errorStack = error.stack.split('\n');
				const endStack = errorStack.map(e => e.split('@')[0]).indexOf("testDoYourBest");
				errorInfo += errorStack.slice(0, endStack).join('\n');
			} catch (e) {
				errorInfo += error.stack;
			}
			copyText(errorInfo);
		}

		end(status) {
			setProgress(status, true);
			this.resolve();
		}
	}
	/**
	 * Passing the adventure along the specified route
	 *
	 * Прохождение приключения по указанному маршруту
	 */
	function testAdventure(type) {
		return new Promise((resolve, reject) => {
			const bossBattle = new executeAdventure(resolve, reject);
			bossBattle.start(type);
		});
	}
	/**
	 * Passing the adventure along the specified route
	 *
	 * Прохождение приключения по указанному маршруту
	 */
	class executeAdventure {

		type = 'default';

		actions = {
			default: {
				getInfo: "adventure_getInfo",
				startBattle: 'adventure_turnStartBattle',
				endBattle: 'adventure_endBattle',
				collectBuff: 'adventure_turnCollectBuff'
			},
			solo: {
				getInfo: "adventureSolo_getInfo",
				startBattle: 'adventureSolo_turnStartBattle',
				endBattle: 'adventureSolo_endBattle',
				collectBuff: 'adventureSolo_turnCollectBuff'
			}
		}

		terminatеReason = I18N('UNKNOWN');
		callAdventureInfo = {
			name: "adventure_getInfo",
			args: {},
			ident: "adventure_getInfo"
		}
		callTeamGetAll = {
			name: "teamGetAll",
			args: {},
			ident: "teamGetAll"
		}
		callTeamGetFavor = {
			name: "teamGetFavor",
			args: {},
			ident: "teamGetFavor"
		}
		callStartBattle = {
			name: "adventure_turnStartBattle",
			args: {},
			ident: "body"
		}
		callEndBattle = {
			name: "adventure_endBattle",
			args: {
				result: {},
				progress: {},
			},
			ident: "body"
		}
		callCollectBuff = {
			name: "adventure_turnCollectBuff",
			args: {},
			ident: "body"
		}

		constructor(resolve, reject) {
			this.resolve = resolve;
			this.reject = reject;
		}

		async start(type) {
			this.type = type || this.type;
			this.path = await this.getPath();
			if (!this.path) {
				this.end();
				return;
			}
			this.callAdventureInfo.name = this.actions[this.type].getInfo;
			const data = await Send(JSON.stringify({
				calls: [
					this.callAdventureInfo,
					this.callTeamGetAll,
					this.callTeamGetFavor
				]
			}));
			return this.checkAdventureInfo(data.results);
		}

		async getPath() {
			const answer = await popup.confirm(I18N('ENTER_THE_PATH'), [
				{
					msg: I18N('START_ADVENTURE'),
					placeholder: '1,2,3,4,5,6',
					isInput: true,
					default: getSaveVal('adventurePath', '')
				},
				{
					msg: I18N('BTN_CANCEL'),
					result: false
				},
			]);
			if (!answer) {
				this.terminatеReason = I18N('BTN_CANCELED');
				return false;
			}

			let path = answer.split(',');
			if (path.length < 2) {
				path = answer.split('-');
			}
			if (path.length < 2) {
				this.terminatеReason = I18N('MUST_TWO_POINTS');
				return false;
			}

			for (let p in path) {
				path[p] = +path[p].trim()
				if (Number.isNaN(path[p])) {
					this.terminatеReason = I18N('MUST_ONLY_NUMBERS');
					return false;
				}
			}
			setSaveVal('adventurePath', answer);
			return path;
		}

		checkAdventureInfo(data) {
			this.advInfo = data[0].result.response;
			if (!this.advInfo) {
				this.terminatеReason = I18N('NOT_ON_AN_ADVENTURE') ;
				return this.end();
			}
			const heroesTeam = data[1].result.response.adventure_hero;
			const favor = data[2]?.result.response.adventure_hero;
			const heroes = heroesTeam.slice(0, 5);
			const pet = heroesTeam[5];
			this.args = {
				pet,
				heroes,
				favor,
				path: [],
				broadcast: false
			}
			const advUserInfo = this.advInfo.users[userInfo.id];
			this.turnsLeft = advUserInfo.turnsLeft;
			this.currentNode = advUserInfo.currentNode;
			this.nodes = this.advInfo.nodes;

			if (this.currentNode == 1 && this.path[0] != 1) {
				this.path.unshift(1);
			}

			return this.loop();
		}

		async loop() {
			const position = this.path.indexOf(+this.currentNode);
			if (!(~position)) {
				this.terminatеReason = I18N('YOU_IN_NOT_ON_THE_WAY');
				return this.end();
			}
			this.path = this.path.slice(position);
			if ((this.path.length - 1) > this.turnsLeft &&
				await popup.confirm(I18N('ATTEMPTS_NOT_ENOUGH'), [
					{ msg: I18N('YES_CONTINUE'), result: false },
					{ msg: I18N('BTN_NO'), result: true },
				])) {
				this.terminatеReason = I18N('NOT_ENOUGH_AP');
				return this.end();
			}
			const toPath = [];
			for (const nodeId of this.path) {
				if (!this.turnsLeft) {
					this.terminatеReason = I18N('ATTEMPTS_ARE_OVER');
					return this.end();
				}
				toPath.push(nodeId);
				console.log(toPath);
				if (toPath.length > 1) {
					setProgress(toPath.join(' > ') + ` ${I18N('MOVES')}: ` + this.turnsLeft);
				}
				if (nodeId == this.currentNode) {
					continue;
				}

				const nodeInfo = this.getNodeInfo(nodeId);
				if (nodeInfo.type == 'TYPE_COMBAT') {
					if (nodeInfo.state == 'empty') {
						this.turnsLeft--;
						continue;
					}

					/**
					 * Disable regular battle cancellation
					 *
					 * Отключаем штатную отменую боя
					 */
					isCancalBattle = false;
					if (await this.battle(toPath)) {
						this.turnsLeft--;
						toPath.splice(0, toPath.indexOf(nodeId));
						nodeInfo.state = 'empty';
						isCancalBattle = true;
						continue;
					}
					isCancalBattle = true;
					return this.end()
				}

				if (nodeInfo.type == 'TYPE_PLAYERBUFF') {
					const buff = this.checkBuff(nodeInfo);
					if (buff == null) {
						continue;
					}

					if (await this.collectBuff(buff, toPath)) {
						this.turnsLeft--;
						toPath.splice(0, toPath.indexOf(nodeId));
						continue;
					}
					this.terminatеReason = I18N('BUFF_GET_ERROR');
					return this.end();
				}
			}
			this.terminatеReason = I18N('SUCCESS');
			return this.end();
		}

		/**
		 * Carrying out a fight
		 *
		 * Проведение боя
		 */
		async battle(path, preCalc = true) {
			const data = await this.startBattle(path);
			try {
				const battle = data.results[0].result.response.battle;
				const result = await Calc(battle);
				if (result.result.win) {
					const info = await this.endBattle(result);
					if (info.results[0].result.response?.error) {
						this.terminatеReason = I18N('BATTLE_END_ERROR');
						return false;
					}
				} else {
					await this.cancelBattle(result);

					if (preCalc && await this.preCalcBattle(battle)) {
						path = path.slice(-2);
						for (let i = 1; i <= getInput('countAutoBattle'); i++) {
							setProgress(`${I18N('AUTOBOT')}: ${i}/${getInput('countAutoBattle')}`);
							const result = await this.battle(path, false);
							if (result) {
								setProgress(I18N('VICTORY'));
								return true;
							}
						}
						this.terminatеReason = I18N('FAILED_TO_WIN_AUTO');
						return false;
					}
					return false;
				}
			} catch (error) {
				console.error(error);
				if (await popup.confirm(I18N('ERROR_OF_THE_BATTLE_COPY'), [
					{ msg: I18N('BTN_NO'), result: false },
					{ msg: I18N('BTN_YES'), result: true },
				])) {
					this.errorHandling(error, data);
				}
				this.terminatеReason = I18N('ERROR_DURING_THE_BATTLE');
				return false;
			}
			return true;
		}

		/**
		 * Recalculate battles
		 *
		 * Прерасчтет битвы
		 */
		async preCalcBattle(battle) {
			const countTestBattle = getInput('countTestBattle');
			for (let i = 0; i < countTestBattle; i++) {
				battle.seed = Math.floor(Date.now() / 1000) + random(0, 1e3);
				const result = await Calc(battle);
				if (result.result.win) {
					console.log(i, countTestBattle);
					return true;
				}
			}
			this.terminatеReason = I18N('NO_CHANCE_WIN') + countTestBattle;
			return false;
		}

		/**
		 * Starts a fight
		 *
		 * Начинает бой
		 */
		startBattle(path) {
			this.args.path = path;
			this.callStartBattle.name = this.actions[this.type].startBattle;
			this.callStartBattle.args = this.args
			const calls = [this.callStartBattle];
			return Send(JSON.stringify({ calls }));
		}

		cancelBattle(battle) {
			const fixBattle = function (heroes) {
				for (const ids in heroes) {
					const hero = heroes[ids];
					hero.energy = random(1, 999);
					if (hero.hp > 0) {
						hero.hp = random(1, hero.hp);
					}
				}
			}
			fixBattle(battle.progress[0].attackers.heroes);
			fixBattle(battle.progress[0].defenders.heroes);
			return this.endBattle(battle);
		}

		/**
		 * Ends the fight
		 *
		 * Заканчивает бой
		 */
		endBattle(battle) {
			this.callEndBattle.name = this.actions[this.type].endBattle;
			this.callEndBattle.args.result = battle.result
			this.callEndBattle.args.progress = battle.progress
			const calls = [this.callEndBattle];
			return Send(JSON.stringify({ calls }));
		}

		/**
		 * Checks if you can get a buff
		 *
		 * Проверяет можно ли получить баф
		 */
		checkBuff(nodeInfo) {
			let id = null;
			let value = 0;
			for (const buffId in nodeInfo.buffs) {
				const buff = nodeInfo.buffs[buffId];
				if (buff.owner == null && buff.value > value) {
					id = buffId;
					value = buff.value;
				}
			}
			nodeInfo.buffs[id].owner = 'Я';
			return id;
		}

		/**
		 * Collects a buff
		 *
		 * Собирает баф
		 */
		async collectBuff(buff, path) {
			this.callCollectBuff.name = this.actions[this.type].collectBuff;
			this.callCollectBuff.args = { buff, path };
			const calls = [this.callCollectBuff];
			return Send(JSON.stringify({ calls }));
		}

		getNodeInfo(nodeId) {
			return this.nodes.find(node => node.id == nodeId);
		}

		errorHandling(error, data) {
			//console.error(error);
			let errorInfo = error.toString() + '\n';
			try {
				const errorStack = error.stack.split('\n');
				const endStack = errorStack.map(e => e.split('@')[0]).indexOf("testAdventure");
				errorInfo += errorStack.slice(0, endStack).join('\n');
			} catch (e) {
				errorInfo += error.stack;
			}
			if (data) {
				errorInfo += '\nData: ' + JSON.stringify(data);
			}
			copyText(errorInfo);
		}

		end() {
			isCancalBattle = true;
			setProgress(this.terminatеReason, true);
			console.log(this.terminatеReason);
			this.resolve();
		}
	}
	/**
	 * Passage of brawls
	 *
	 * Прохождение потасовок
	 */
	function testBrawls() {
		return new Promise((resolve, reject) => {
			const brawls = new executeBrawls(resolve, reject);
			brawls.start(brawlsPack);
		});
	}
	/**
	 * Passage of brawls
	 *
	 * Прохождение потасовок
	 */
	class executeBrawls {
		callBrawlQuestGetInfo = {
			name: "brawl_questGetInfo",
			args: {},
			ident: "brawl_questGetInfo"
		}
		callBrawlFindEnemies = {
			name: "brawl_findEnemies",
			args: {},
			ident: "brawl_findEnemies"
		}
		callBrawlQuestFarm = {
			name: "brawl_questFarm",
			args: {},
			ident: "brawl_questFarm"
		}
		callUserGetInfo = {
			name: "userGetInfo",
			args: {},
			ident: "userGetInfo"
		}

		stats = {
			win: 0,
			loss: 0,
			count: 0,
		}

		stage = {
			'3': 1,
			'7': 2,
			'12': 3,
		}

		constructor(resolve, reject) {
			this.resolve = resolve;
			this.reject = reject;
		}

		async start(heroes) {
			this.heroes = heroes;
			isCancalBattle = false;
			this.brawlInfo = await this.getBrawlInfo();

			if (!this.brawlInfo.attempts) {
				this.end(I18N('DONT_HAVE_LIVES'))
				return;
			}

			while (1) {
				if (!isBrawlsAutoStart) {
					this.end(I18N('BTN_CANCELED'))
					return;
				}

				const maxStage = this.brawlInfo.questInfo.stage;
				const stage = this.stage[maxStage];
				const progress = this.brawlInfo.questInfo.progress;

				setProgress(`${I18N('STAGE')} ${stage}: ${progress}/${maxStage}<br>${I18N('FIGHTS')}: ${this.stats.count}<br>${I18N('WINS')}: ${this.stats.win}<br>${I18N('LOSSES')}: ${this.stats.loss}<br>${I18N('STOP')}`, false, function () {
					isBrawlsAutoStart = false;
				});

				if (this.brawlInfo.questInfo.canFarm) {
					const result = await this.questFarm();
					console.log(result);
				}

				if (this.brawlInfo.questInfo.stage == 12 && this.brawlInfo.questInfo.progress == 12) {
					this.end(I18N('SUCCESS'))
					return;
				}

				const enemie = Object.values(this.brawlInfo.findEnemies).shift();

				const result = await this.battle(enemie.userId);
				this.brawlInfo = {
					questInfo: result[1].result.response,
					findEnemies: result[2].result.response,
				}
			}
		}

		async questFarm() {
			const calls = [this.callBrawlQuestFarm];
			const result = await Send(JSON.stringify({ calls }));
			return result.results[0].result.response;
		}

		async getBrawlInfo() {
			const data = await Send(JSON.stringify({
				calls: [
					this.callUserGetInfo,
					this.callBrawlQuestGetInfo,
					this.callBrawlFindEnemies,
				]
			}));

			let attempts = data.results[0].result.response.refillable.find(n => n.id == 48);
			return {
				attempts: attempts.amount,
				questInfo: data.results[1].result.response,
				findEnemies: data.results[2].result.response,
			}
		}

		/**
		 * Carrying out a fight
		 *
		 * Проведение боя
		 */
		async battle(userId) {
			this.stats.count++;
			const battle = await this.startBattle(userId, this.heroes);
			const result = await Calc(battle);
			console.log(result.result);
			if (result.result.win) {
				this.stats.win++;
				return await this.endBattle(result);
			}
			this.stats.loss++;
			return await this.cancelBattle(result);
		}

		/**
		 * Starts a fight
		 *
		 * Начинает бой
		 */
		async startBattle(userId, heroes) {
			const calls = [{
				name: "brawl_startBattle",
				args: {
					userId,
					heroes,
					favor: {},
				},
				ident: "brawl_startBattle"
			}];
			const result = await Send(JSON.stringify({ calls }));
			return result.results[0].result.response;
		}

		cancelBattle(battle) {
			const fixBattle = function (heroes) {
				for (const ids in heroes) {
					const hero = heroes[ids];
					hero.energy = random(1, 999);
					if (hero.hp > 0) {
						hero.hp = random(1, hero.hp);
					}
				}
			}
			fixBattle(battle.progress[0].attackers.heroes);
			fixBattle(battle.progress[0].defenders.heroes);
			return this.endBattle(battle);
		}

		/**
		 * Ends the fight
		 *
		 * Заканчивает бой
		 */
		async endBattle(battle) {
			battle.progress[0].attackers.input = ['auto', 0, 0, 'auto', 0, 0];
			const calls = [{
				name: "brawl_endBattle",
				args: {
					result: battle.result,
					progress: battle.progress
				},
				ident: "brawl_endBattle"
			},
			this.callBrawlQuestGetInfo,
			this.callBrawlFindEnemies,
			];
			const result = await Send(JSON.stringify({ calls }));
			return result.results;
		}

		end(endReason) {
			isCancalBattle = true;
			isBrawlsAutoStart = false;
			setProgress(endReason, true);
			console.log(endReason);
			this.resolve();
		}
	}
})();

/**
 * TODO:
 * Получение всех уровней при сборе всех наград (квест на титанит и на энку)
 * Добавить проверку правильности пути для приключения
 * Добивание на арене титанов
 * Сбор ежедневных календарных наград
 * Добавить в подземку проверку варианта когда одна пачка из 2х мертва
 */
