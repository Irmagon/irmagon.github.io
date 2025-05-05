// ==UserScript==
// @name			HWHBestDungeonExt
// @name:en			HWHBestDungeonExt
// @name:ru			HWHBestDungeonExt
// @namespace		HWHBestDungeonExt
// @version			0.0.12
// @description		Extension for HeroWarsHelper script
// @description:en	Extension for HeroWarsHelper script
// @description:ru	Расширение для скрипта HeroWarsHelper
// @author			ZingerY
// @license 		Copyright ZingerY
// @homepage		https://zingery.ru/scripts/HWHBestDungeonExt.user.js
// @downloadURL		https://irmagon.github.io/HWHExtension.user.js
// @updateURL		https://irmagon.github.io/HWHExtension.user.js
// @icon			https://zingery.ru/scripts/VaultBoyIco16.ico
// @icon64			https://zingery.ru/scripts/VaultBoyIco64.png
// @match			https://www.hero-wars.com/*
// @match			https://apps-1701433570146040.apps.fbsbx.com/*
// @run-at			document-start
// ==/UserScript==

(function () {
	if (!this.HWHClasses) {
		console.log('%cObject for extension not found', 'color: red');
		return;
	}

	console.log('%cStart Extension ' + GM_info.script.name + ', v' + GM_info.script.version + ' by ' + GM_info.script.author, 'color: red');
	const { addExtentionName } = HWHFuncs;
	addExtentionName(GM_info.script.name, GM_info.script.version, GM_info.script.author);

	const {
		getInput,
		setProgress,
		hideProgress,
		I18N,
		send,
		getTimer,
		countdownTimer,
		getUserInfo,
		getSaveVal,
		setSaveVal,
		popup,
		setIsCancalBattle,
		random,
		EventEmitterMixin,
	} = HWHFuncs;

	const { DungeonFixBattle } = HWHClasses;

	class UpdateDungeonFixBattle extends DungeonFixBattle {
		updateProgressTimer(index = 0) {
			if (this.count === 1) {
				this.battleLogTimers = [...new Set(this.lastResult.battleLogs[0].map((e) => e.time))];
				this.maxCount = this.battleLogTimers.length;
			}
			if (this.battleLogTimers) {
				this.lastTimer = this.battleLogTimers[this.count];
				if (!this.lastTimer) {
					this.count = this.maxCount;
				}
			} else {
				this.lastTimer = this.randTimer();
			}
			this.battle.progress = [{ attackers: { input: ['auto', 0, 0, 'auto', index, this.lastTimer] } }];
		}
	}

	HWHClasses.DungeonFixBattle = UpdateDungeonFixBattle;

	class Stat {
		constructor(obj) {
			for (const key in obj) {
				if (obj.hasOwnProperty(key)) {
					this[key] = obj[key];
				}
			}
		}

		// Умножает все значения на указанное число
		multiply(multiplier) {
			for (const key in this) {
				if (this.hasOwnProperty(key)) {
					this[key] *= multiplier;
				}
			}
		}

		// Суммирует значения одинаковых ключей и добавляет новые ключи
		add(obj) {
			for (const key in obj) {
				if (obj.hasOwnProperty(key)) {
					if (this.hasOwnProperty(key)) {
						this[key] += obj[key];
					} else {
						this[key] = obj[key];
					}
				}
			}
		}

		// Округляет все значения до второго знака после запятой
		round() {
			for (const key in this) {
				if (this.hasOwnProperty(key)) {
					this[key] = Math.round(this[key] * 100) / 100;
				}
			}
		}
	}

	class TitanStats {
		constructor(titans, spirits, states) {
			this.titans = titans;
			this.spirits = spirits;
			this.states = states;
			this.heroLib = lib.data.hero;
			this.titanLib = lib.data.titan;
			this.artsLib = lib.data.titanArtifact;
			this.skinsLib = lib.data.skin;
			this.ruleLib = lib.data.rule;
			this.baseStats = new Stat({});
		}

		// Расчет базовых статов
		calculateBaseStats() {
			const titan = this.titans[this.titanId];
			const heroLib = this.heroLib[this.titanId];
			const titanLib = this.titanLib[this.titanId];
			this.baseStats = new Stat(heroLib.baseStats);
			const addStat = new Stat(titanLib.stars[titan.star].battleStatData);
			const coef = Math.pow(titan.level, this.ruleLib.titanLevelPowerCoefficient);
			addStat.multiply(coef);
			this.baseStats.add(addStat);
			this.baseStats.round();
		}

		// Добавление статов скинов
		addSkinStats() {
			const titan = this.titans[this.titanId];
			const skins = Object.entries(titan.skins);
			for (const [id, lvl] of skins) {
				const bonus = this.skinsLib[id].statData.levels[lvl].statBonus;
				this.baseStats.add(bonus);
			}
		}

		// Добавление статов артефактов
		addArtifactStats() {
			const titan = this.titans[this.titanId];
			const titanLibArt = this.titanLib[this.titanId].artifacts;
			for (const index in titanLibArt) {
				const artId = titanLibArt[index];
				const { level, star } = titan.artifacts[index];
				if (!star) {
					continue;
				}
				const libArt = this.artsLib.id[artId];
				const battleEffects = libArt.battleEffect;
				const artStat = new Stat({});
				for (const effectId of battleEffects) {
					const effect = this.artsLib.battleEffect[effectId];
					const stat = effect.effect;
					artStat.add({
						[stat]: effect.levels[level],
					});
				}
				const multiplier = this.artsLib.type[libArt.type].evolution[star].battleEffectMultiplier;
				artStat.multiply(multiplier);
				artStat.round();
				this.baseStats.add(artStat);
			}
		}

		// Добавление статов тотема
		addTotemStats() {
			const titanLib = this.titanLib[this.titanId];
			const element = titanLib.element;
			const spirit = this.spirits[element];
			const spiritStat = new Stat({});
			if (spirit.star) {
				const battleEffects = this.artsLib.id[spirit.id].battleEffect;
				for (const effectId of battleEffects) {
					const effect = this.artsLib.battleEffect[effectId];
					const stat = effect.effect;
					spiritStat.add({
						[stat]: effect.levels[spirit.level],
					});
				}

				const spiritMultiplier = this.artsLib.type['spirit'].evolution[spirit.star].battleEffectMultiplier;
				spiritStat.multiply(spiritMultiplier);
			}
			const addSpirit = {
				element,
				elementSpiritLevel: spirit.level,
				elementSpiritStar: spirit.star,
			};
			spiritStat.add(addSpirit);
			this.baseStats.add(spiritStat);
		}

		// Получение статов титана по его ID
		getTitanStats(titanId) {
			this.titanId = titanId;
			this.calculateBaseStats();
			this.addSkinStats();
			this.addArtifactStats();
			this.addTotemStats();
			const state = this.states[titanId] ?? {
				hp: Math.floor(this.baseStats.hp),
				energy: 0,
				isDead: false,
			};
			return Object.assign(this.titans[this.titanId], this.baseStats, { state });
		}

		getAllowTitanIds() {
			return Object.values(this.titans)
				.map((e) => e.id)
				.filter((id) => !this.states[id]?.isDead);
		}
	}

	class GeneticAlgorithm {
		constructor({ values, combinationSize, populationSize, generations, mutationRate, eliteCount }) {
			this.values = values;
			this.combinationSize = combinationSize;
			this.populationSize = populationSize;
			this.generations = generations;
			this.mutationRate = mutationRate;
			this.eliteCount = eliteCount;
			this.evaluationCache = new Map();
			this.evaluationCalls = 0;
			this.bestScores = [];
		}

		/**
		 * Генерация исходной популяции комбинаций
		 * @returns {*[]}
		 */
		generateInitialPopulation() {
			const population = [];
			for (let i = 0; i < this.populationSize; i++) {
				const shuffledValues = [...this.values];
				for (let j = shuffledValues.length - 1; j > 0; j--) {
					const randomIndex = Math.floor(Math.random() * (j + 1));
					[shuffledValues[j], shuffledValues[randomIndex]] = [shuffledValues[randomIndex], shuffledValues[j]];
				}
				const combination = shuffledValues.slice(0, this.combinationSize).sort();
				population.push(combination);
			}
			return population;
		}

		/**
		 * Функция скрещивания комбинаций
		 * @param parent1
		 * @param parent2
		 * @returns {*[][]}
		 */
		crossover(parent1, parent2) {
			const crossoverPoint = Math.floor(Math.random() * parent1.length);
			const child1 = [...new Set([...parent1.slice(0, crossoverPoint), ...parent2])].slice(0, this.combinationSize);
			const child2 = [...new Set([...parent2.slice(0, crossoverPoint), ...parent1])].slice(0, this.combinationSize);
			return [child1.sort(), child2.sort()];
		}

		/**
		 * Функция мутации комбинации
		 * @param combination
		 * @returns {*}
		 */
		mutate(combination) {
			const dynamicRate = this.mutationRate * (1 - this.evaluationCalls / 300);
			const availableValues = this.values.filter((value) => !combination.includes(value));
			for (let i = 0; i < combination.length; i++) {
				if (Math.random() < dynamicRate && availableValues.length > 0) {
					const randomIndex = Math.floor(Math.random() * availableValues.length);
					combination[i] = availableValues[randomIndex];
					availableValues.splice(randomIndex, 1);
				}
			}
			return combination.sort();
		}

		/**
		 * Функция проверки качества комбинации
		 * @param combination
		 * @returns {any}
		 */
		async evaluateCombination(combination) {
			const key = combination.join(',');
			if (!this.evaluationCache.has(key)) {
				const value = await this.getEvaluate(combination);
				this.evaluationCache.set(key, value);
				this.evaluationCalls++;
			}
			return this.evaluationCache.get(key);
		}

		async getEvaluate(combination) {
			return combination.reduce((sum, value) => sum + value, 0);
		}

		customSort(a, b) {
			return b.v - a.v;
		}

		compareScore(bestScore, targetScore) {
			return bestScore >= targetScore;
		}

		setEvaluate(evaFunction) {
			this.getEvaluate = evaFunction;
		}

		setCustomSort(customSort) {
			this.customSort = customSort;
		}

		setCompereScore(compareScore) {
			this.compareScore = compareScore;
		}

		async sortPopulation(population) {
			const evaluatedValues = await Promise.all(
				population.map(async (item) => ({
					item,
					v: await this.evaluateCombination(item),
				}))
			);

			evaluatedValues.sort(this.customSort);

			return evaluatedValues.map(({ item }) => item);
		}

		async selectParent(population, tournamentSize = 3) {
			let best = population[Math.floor(Math.random() * population.length)];
			for (let i = 1; i < tournamentSize; i++) {
				const candidate = population[Math.floor(Math.random() * population.length)];
				if ((await this.evaluateCombination(candidate)) > (await this.evaluateCombination(best))) {
					best = candidate;
				}
			}
			return best;
		}

		/**
		 * Запуск генетического алгоритма
		 * @returns {*}
		 */
		async run() {
			let population = this.generateInitialPopulation();
			this.bestScores = [];

			for (let generation = 0; generation < this.generations; generation++) {
				population = await this.sortPopulation(population);

				const bestScore = await this.evaluateCombination(population[0]);
				this.bestScores.push(bestScore);

				const nextPopulation = population.slice(0, this.eliteCount);

				while (nextPopulation.length < this.populationSize) {
					const parent1 = await this.selectParent(population);
					const parent2 = await this.selectParent(population);

					const [child1, child2] = this.crossover(parent1, parent2);
					nextPopulation.push(this.mutate(child1));
					if (nextPopulation.length < this.populationSize) {
						nextPopulation.push(this.mutate(child2));
					}
				}

				population = nextPopulation;
			}

			population = await this.sortPopulation(population);
			return population[0];
		}

		/**
		 * Генератор параметров
		 * @returns {*[]}
		 */
		static generateParamSets(conf) {
			const paramSets = [];
			for (let populationSize = conf.populationSize.min; populationSize <= conf.populationSize.max; populationSize += conf.populationSize.step
			) {
				for (let generations = conf.generations.min; generations <= conf.generations.max; generations += conf.generations.step) {
					for (let mutationRate = conf.mutationRate.min; mutationRate <= conf.mutationRate.max; mutationRate += conf.mutationRate.step) {
						for (let eliteCount = conf.eliteCount.min; eliteCount <= conf.eliteCount.max; eliteCount += conf.eliteCount.step) {
							paramSets.push({ populationSize, generations, mutationRate, eliteCount });
						}
					}
				}
			}
			return paramSets;
		}

		static async testParams(values, combinationSize, params, countTest = 250) {
			const evaluationCalls = [];
			const scores = [];

			for (let i = 0; i < countTest; i++) {
				const ga = new GeneticAlgorithm({ values, combinationSize, ...params });
				const bestCombination = await ga.run();
				evaluationCalls.push(ga.evaluationCalls);
				const score = ((await ga.evaluateCombination(bestCombination)) - 20016) / 183;
				scores.push(score);
			}

			const avgScore = scores.reduce((a, b) => a + b) / scores.length;
			const avgEvaluationCalls = evaluationCalls.reduce((a, b) => a + b) / evaluationCalls.length;
			return {
				avgScore,
				avgEvaluationCalls,
			};
		}

		/**
		 * Поиск лучших параметров для генетического алгоритма
		 * @param values
		 * @param combinationSize
		 * @param targetScore
		 * @param optimizeConfig
		 * @returns {{generations: number, eliteCount: number, mutationRate: number, populationSize: number}}
		 */
		static async optimizeParameters(values, combinationSize, targetScore, optimizeConfig) {
			const paramSets = this.generateParamSets(optimizeConfig);
			let bestParams = { populationSize: 0, generations: 0, mutationRate: 0, eliteCount: 0 };
			let bestEfficiency = -Infinity;
			const bestData = {
				avgScore: 0,
				avgEvaluationCalls: 0,
			};
			let checkCount = 0;

			for (const params of paramSets) {
				const { avgScore, avgEvaluationCalls } = await this.testParams(values, combinationSize, params);
				const efficiency = (avgScore * avgScore) / avgEvaluationCalls;
				if (efficiency > bestEfficiency && avgScore >= targetScore) {
					bestEfficiency = efficiency;
					bestData.avgEvaluationCalls = avgEvaluationCalls;
					bestData.avgScore = avgScore;
					bestParams = params;
				}

				checkCount++;
				if (!(checkCount % 10)) {
					console.log(`${checkCount}/${paramSets.length}`, bestParams, bestData, process.uptime());
				}
			}
			console.log('Optimal Parameters:', checkCount, bestParams, bestData, process.uptime());
			return bestParams;
		}
	}

	class BestDungeon {
		constructor(resolve, reject) {
			this.resolve = resolve;
			this.reject = reject;
			this.isFixedBattle = true;
			this.dungeonActivity = 0;
			this.maxDungeonActivity = 150;
			this.primeElement = '';
			this.countCard = 0;
			this.titanGetAll = {};
			this.teams = { earth: [], fire: [], neutral: [], water: [], hero: {} };
			this.titansStates = {};
			this.talentMsg = '';
			this.talentMsgReward = '';
			this.evaluatePack = false;
			this.isShowFixLog = false;
			this.timeoutFix = 15e3;
			this.countFix = 30;
			this.isStop = false;
			this.colors = {
				water: 'color: #3498db;',
				fire: 'color: #e74c3c;',
				earth: 'color: #2ecc71;',
				light: 'color: #f1c40f;',
				dark: 'color: #9b59b6;',
				neutral: 'color: yellow;',
				green: 'color: #0b0;',
				none: 'color: none;',
				red: 'color: #d00;',
			};
		}

		async start(titanit) {
			this.maxDungeonActivity = titanit || +getInput('countTitanit');
			const result = await Caller.send([
				'dungeonGetInfo',
				'teamGetAll',
				'teamGetFavor',
				'clanGetInfo',
				'titanGetAll',
				'inventoryGet',
				'titanSpiritGetAll',
			]);
			this.startDungeon(result);
		}

		stop() {
			this.isStop = true;
		}

		getStatMessage() {
			return `Dungeon: Титанит ${this.dungeonActivity}/${this.maxDungeonActivity}${this.talentMsg}`;
		}

		startDungeon(data) {
			const [dungeonGetInfo, teamGetAll, teamGetFavor, clanGetInfo, titanGetAll, inventoryGet, titanSpirits] = data;

			if (!dungeonGetInfo) {
				this.endDungeon('noDungeon');
				return;
			}

			this.dungeonGetInfo = dungeonGetInfo;
			this.teamGetAll = teamGetAll;
			this.teamGetFavor = teamGetFavor;
			this.dungeonActivity = clanGetInfo.stat.todayDungeonActivity;
			this.titanGetAll = titanGetAll;
			this.titans = Object.values(titanGetAll);
			this.countCard = inventoryGet.consumable[81] || 0;
			this.titanSpirits = titanSpirits;

			this.teams.hero = {
				favor: teamGetFavor.dungeon_hero,
				heroes: teamGetAll.dungeon_hero.filter((id) => id < 6000),
				teamNum: 0,
			};

			const heroPet = teamGetAll.dungeon_hero.find((id) => id >= 6000);
			if (heroPet) this.teams.hero.pet = heroPet;

			['neutral', 'water', 'fire', 'earth'].forEach((type) => {
				this.teams[type] = {
					favor: {},
					heroes: DungeonUtils.getTitanTeam(this.titans, type),
					teamNum: 0,
				};
			});

			this.checkFloor(dungeonGetInfo);
		}

		showTitanStates() {
			const titanGetAll = this.titanGetAll;
			const titans = this.titansStates;
			const colWhidth = 17;

			const columns = [
				{ element: 'water', color: '#3498db', icon: '🌊' },
				{ element: 'fire', color: '#e74c3c', icon: '🔥' },
				{ element: 'earth', color: '#2ecc71', icon: '🌍' },
				{ element: 'light', color: '#f1c40f', icon: '☀️' },
				{ element: 'dark', color: '#9b59b6', icon: '🌑' },
			];

			const titansData = columns.reduce(
				(acc, col) => ({
					...acc,
					[col.element]: Object.keys(titanGetAll)
						.filter((id) => lib.data.titan[id].element === col.element)
						.map((id) => {
							const HP = titans[id]?.hp ? Math.floor((titans[id]?.hp / titans[id]?.maxHp) * 100) : 100;
							return {
								name: cheats.translate(`LIB_HERO_NAME_${id}`),
								status: titans[id]?.isDead ? '💀' : `❤️${HP}⚡${titans[id]?.energy || 0}`,
							};
						}),
				}),
				{}
			);

			const maxRows = Math.max(...columns.map((col) => titansData[col.element].length));
			const emptyCell = ''.padEnd(colWhidth);

			const buildLine = (items) => items.map((content) => `%c${content}\t`).join('');

			const header = buildLine(columns.map((col) => `${col.icon} ${col.element.toUpperCase()}`.padEnd(colWhidth)));

			const rows = Array.from({ length: maxRows }, (_, i) =>
				buildLine(
					columns.map((col) => {
						const titan = titansData[col.element][i];
						return titan ? `${titan.name}${titan.status}`.padEnd(colWhidth) : emptyCell;
					})
				)
			);

			console.log(
				[header, ...rows].join('\n'),
				...columns.map((col) => `font-weight: bold; color: ${col.color}`),
				...rows.flatMap(() => columns.map((col) => `color: ${col.color}`))
			);
		}

		async checkFloor(dungeonInfo) {
			if (this.isStop) {
				this.endDungeon('endDungeon', 'Остановлено');
				return;
			}
			if (!dungeonInfo.floor || dungeonInfo.floor.state === 2) {
				await this.saveProgress();
				return;
			}

			await this.checkTalent(dungeonInfo);
			const message = this.getStatMessage();
			setProgress(message, this.stop.bind(this));

			if (this.dungeonActivity >= this.maxDungeonActivity) {
				this.endDungeon('endDungeon', `maxActive ${this.dungeonActivity}/${this.maxDungeonActivity}`);
				return;
			}

			this.titansStates = dungeonInfo.states.titans;
			this.showTitanStates();
			const floorChoices = dungeonInfo.floor.userData;
			const floorType = dungeonInfo.floorType;
			this.primeElement = dungeonInfo.elements.prime;

			if (floorType === 'battle') {
				const battles = await this.prepareBattles(floorChoices);
				if (battles.length === 0) {
					this.endDungeon('endDungeon', 'All Dead');
					return;
				}
				this.testProcessingPromises(battles);
			}
		}

		async prepareBattles(floorChoices) {
			const { fixTitanTeam, getNeutralTeam } = DungeonUtils;
			const battles = [];
			for (const [teamNum, choice] of Object.entries(floorChoices)) {
				const { attackerType } = choice;
				let team = {
					favor: {},
					teamNum,
					heroes: [],
				};
				if (attackerType === 'hero') {
					team = this.teams[attackerType];
				} else {
					team.heroes = fixTitanTeam(this.teams[attackerType].heroes, this.titansStates);
				}

				if (attackerType === 'neutral') {
					team.heroes = getNeutralTeam(this.titans, this.titansStates);
				}
				if (team.heroes.length === 0) {
					continue;
				}

				const battleData = await Caller.send({ name: 'dungeonStartBattle', args: { ...team, teamNum } });
				battles.push({
					...battleData,
					progress: [{ attackers: { input: ['auto', 0, 0, 'auto', 0, 0] } }],
					teamNum,
					attackerType,
				});
			}
			return battles;
		}

		async checkTalent(dungeonInfo) {
			const { talent } = dungeonInfo;
			if (!talent) return;

			const dungeonFloor = +dungeonInfo.floorNumber;
			const talentFloor = +talent.floorRandValue;
			let doorsAmount = 3 - talent.conditions.doorsAmount;

			if (dungeonFloor === talentFloor && (!doorsAmount || !talent.conditions?.farmedDoors[dungeonFloor])) {
				const [reward] = await Caller.send([
					{ name: 'heroTalent_getReward', args: { talentType: 'tmntDungeonTalent', reroll: false } },
					{ name: 'heroTalent_farmReward', args: { talentType: 'tmntDungeonTalent' } },
				]);

				const type = Object.keys(reward).pop();
				const itemId = Object.keys(reward[type]).pop();
				const count = reward[type][itemId];
				const itemName = cheats.translate(`LIB_${type.toUpperCase()}_NAME_${itemId}`);
				this.talentMsgReward += `<br> ${count} ${itemName}`;
				doorsAmount++;
			}

			this.talentMsg = `<br>TMNT Talent: ${doorsAmount}/3 ${this.talentMsgReward}<br>`;
		}

		async testProcessingPromises(battles) {
			let selectBattle = null;
			let bestRec = {
				hp: -Infinity,
				energy: -Infinity,
			};
			this.evaluatePack = false;

			for (const battle of battles) {
				if (battle.attackerType === 'hero') {
					this.logBattleStats(battle.attackerType);
					const resultHeroBattle = await Calc(battle);
					await this.endBattle(resultHeroBattle);
					return;
				}

				let maxRec = {};
				if (battle.attackerType === 'neutral') {
					const titanStats = new TitanStats(this.titanGetAll, this.titanSpirits, this.titansStates);
					const evalute = new EvaluateAttackPack(titanStats, battle);
					const attackers = await evalute.getAttackers();
					battle.attackers = attackers;
					this.evaluatePack = attackers;
					maxRec = evalute.getStatBestPack();
				} else {
					maxRec = await this.calculateBattleStats(battle);
				}

				if (DungeonUtils.compareScore(maxRec, bestRec)) {
					bestRec.hp = maxRec.hp;
					bestRec.energy = maxRec.energy;
					selectBattle = battle;
				}

				this.logBattleStats(battle.attackerType, maxRec);
			}

			if (!selectBattle || bestRec.hp <= -Infinity) {
				this.endDungeon('Не найден победный бой\n', battles);
				return;
			}

			await this.processSelectedBattle(selectBattle, bestRec);
		}

		async calculateBattleStats(battle) {
			const { getState, compareScore, isRandomBattle, genBattleSeed } = DungeonUtils;
			let countTestBattle = +getInput('countTestBattle');
			const bestRec = {
				hp: -Infinity,
				energy: -Infinity,
			};

			if (!isRandomBattle(battle)) {
				countTestBattle = 1;
			}

			for (let i = 0; i < countTestBattle; i++) {
				const rec = await Calc({ ...battle, seed: genBattleSeed() }).then(getState);
				if (compareScore(rec, bestRec)) {
					bestRec.hp = rec.hp;
					bestRec.energy = rec.energy;
				}
			}

			return bestRec;
		}

		logBattleStats(attackerType, bestRec = null) {
			let colors = [];
			let text = '';
			if (bestRec) {
				colors = [this.colors.green, this.colors.none];
				text = ' %cbestStat: %c' + JSON.stringify(bestRec);
			}
			console.log(`%c${attackerType}` + text, this.colors[attackerType], ...colors);
		}

		logSelectPack(battle, recSelectBattle) {
			const attackerType = battle.attackerType;
			const pack = Object.values(battle.attackers).map((e) => e.id);

			const list = pack.reduce(
				(a, e) => {
					a.names.push('%c' + cheats.translate('LIB_HERO_NAME_' + e));
					a.styles.push(this.colors[lib.data.titan[e].element]);
					return a;
				},
				{ names: [], styles: [] }
			);

			console.log('Select: %c' + attackerType, this.colors[attackerType]);
			console.log('%cbattleStat: %c' + JSON.stringify(recSelectBattle), this.colors.green, this.colors.none);
			console.log('%cPack: ' + list.names.join(' '), this.colors[attackerType], ...list.styles);
		}

		async processSelectedBattle(selectBattle, bestRec) {
			const { getState, compareScore } = DungeonUtils;
			const resultSelectBattle = await this.resultBattle(selectBattle);
			const recSelectBattle = getState(resultSelectBattle);

			this.logSelectPack(selectBattle, recSelectBattle);
			if (compareScore(recSelectBattle, bestRec)) {
				bestRec = recSelectBattle;
			}

			if (compareScore(recSelectBattle, bestRec) && !this.evaluatePack && selectBattle.teamNum === '1') {
				await this.endBattle(resultSelectBattle);
			} else {
				await this.retryBattle(selectBattle, bestRec, recSelectBattle);
			}
		}

		async retryBattle(selectBattle, bestRec, recSelectBattle) {
			const { getState, compareScore } = DungeonUtils;
			const countAutoBattle = +getInput('countAutoBattle');
			for (let i = 0; i < countAutoBattle; i++) {
				const result = await this.startBattle(selectBattle.teamNum, selectBattle.attackerType);
				const rec = getState(result);
				console.log('%cCurrent battle ' + (i + 1) + ' attempts%c ' + JSON.stringify(rec), this.colors.green, this.colors.none);
				if (compareScore(rec, bestRec)) {
					console.log('%cBest fight found in ' + (i + 1) + ' attempts', this.colors.green);
					if (compareScore(rec, recSelectBattle)) {
						console.log('%cFinal result: ' + JSON.stringify(rec), this.colors.red);
					}
					await this.endBattle(result);
					return;
				} else {
					bestRec.hp -= Math.abs(bestRec.hp / countAutoBattle);
				}
			}

			console.log('Best fight not found');
			const result = await this.startBattle(selectBattle.teamNum, selectBattle.attackerType);
			await this.endBattle(result);
		}

		async startBattle(teamNum, attackerType) {
			const { fixTitanTeam, getNeutralTeam } = DungeonUtils;
			const team = {
				favor: {},
				teamNum,
				heroes: fixTitanTeam(this.teams[attackerType].heroes, this.titansStates),
			};
			if (attackerType === 'neutral') {
				if (this.evaluatePack) {
					team.heroes = Object.values(this.evaluatePack).map((e) => e.id);
				} else {
					team.heroes = getNeutralTeam(this.titans, this.titansStates);
				}
			}

			const battleData = await Caller.send({ name: 'dungeonStartBattle', args: { ...team, teamNum } });
			return this.resultBattle(battleData, { teamNum, attackerType });
		}

		async resultBattle(battleData, args = {}) {
			if (this.isFixedBattle) {
				const dfb = new UpdateDungeonFixBattle(battleData);
				dfb.isShowResult = this.isShowFixLog;
				const fixData = await dfb.start(Date.now() + this.timeoutFix, this.countFix);
				battleData.progress = [{ attackers: { input: ['auto', 0, 0, 'auto', 0, fixData.timer] } }];
			}
			const result = await Calc(battleData);
			return { ...result, ...args };
		}

		async endBattle(battleInfo) {
			// Проверка на ничью
			const isAllDead = Object.values(battleInfo.progress[0].attackers.heroes).every((item) => item.isDead);
			if (!battleInfo.result.win && isAllDead) {
				this.endDungeon('dungeonEndBattle win: false\n', battleInfo);
				return;
			}

			const args = { result: battleInfo.result, progress: battleInfo.progress };
			console.log('countCard', this.countCard);
			if (this.countCard) {
				args.isRaid = true;
				this.countCard--;
			} else {
				const message = this.getStatMessage();
				const timerFinished = await countdownTimer(battleInfo.battleTimer, message, this.stop.bind(this));
				console.log('timerFinished', timerFinished);
				if (!timerFinished) {
					this.endDungeon('endDungeon', 'Остановлено');
					return;
				}
			}

			const resultEnd = await Caller.send({ name: 'dungeonEndBattle', args });
			this.resultEndBattle(resultEnd);
		}

		resultEndBattle(battleResult) {
			if (battleResult.error) {
				this.endDungeon('Error', battleResult.error);
			}
			const dungeonGetInfo = battleResult.dungeon ?? battleResult;
			if (dungeonGetInfo.reward) {
				this.dungeonGetInfo = dungeonGetInfo;
			} else {
				// В случае ничьи обновляем только статы
				this.dungeonGetInfo.states = dungeonGetInfo.states;
			}
			this.dungeonActivity += battleResult.reward?.dungeonActivity ?? 0;
			this.checkFloor(this.dungeonGetInfo);
		}

		titanObjToArray(obj) {
			return Object.entries(obj).map(([id, data]) => ({ id, ...data }));
		}

		async saveProgress() {
			const result = await Caller.send('dungeonSaveProgress');
			this.resultEndBattle(result);
		}

		endDungeon(reason, info) {
			console.warn(reason, info);
			setProgress('Dungeon completed!', true);
			this.resolve();
		}
	}

	this.HWHClasses.executeDungeon = BestDungeon;

	class EvaluateAttackPack {
		constructor(heroStats, battle) {
			this.heroStats = heroStats;
			this.battle = structuredClone(battle);

			this.bestParams = {
				populationSize: 14,
				generations: 100,
				mutationRate: 0.04,
				eliteCount: 3,
			};
		}

		async getAttackers() {
			const values = this.heroStats.getAllowTitanIds();
			const ga = new GeneticAlgorithm({
				values,
				combinationSize: 5,
				...this.bestParams,
			});
			ga.setEvaluate(this.evaluatePack.bind(this));
			ga.setCustomSort(this.sortByHpAndEnergy);
			ga.setCompereScore(DungeonUtils.compareScore);

			const bestCombination = await ga.run();
			this.statBestCombination = await ga.evaluateCombination(bestCombination);
			console.log(
				'Лучшее сочетание:',
				bestCombination,
				bestCombination.map((e) => cheats.translate('LIB_HERO_NAME_' + e)),
				this.statBestCombination,
				ga.evaluationCalls
			);

			const attackers = Object.fromEntries(bestCombination.map((id) => [id, this.heroStats.getTitanStats(id)]));

			return attackers;
		}

		getStatBestPack() {
			return this.statBestCombination;
		}

		sortByHpAndEnergy(a, b) {
			if (a.v.hp !== b.v.hp) {
				return b.v.hp - a.v.hp;
			}
			return b.v.energy - a.v.energy;
		}

		getBattleWithPack(pack) {
			const cloneBattle = structuredClone(this.battle);
			cloneBattle.attackers = Object.fromEntries(pack.map((id) => [id, this.heroStats.getTitanStats(id)]));
			return cloneBattle;
		}

		async evaluatePack(pack) {
			const cloneBattle = this.getBattleWithPack(pack);
			const { isRandomBattle, genBattleSeed, getState, compareScore } = DungeonUtils;

			const maxResult = {
				hp: -Infinity,
				energy: -Infinity,
				seed: null,
			};
			const countTestBattle = isRandomBattle(cloneBattle) ? 10 : 1;
			for (let i = 0; i < countTestBattle; i++) {
				const seed = genBattleSeed();
				cloneBattle.seed = seed;
				const result = await Calc(cloneBattle).then(getState);
				//await new Promise((resolve) => requestAnimationFrame(resolve));
				if (compareScore(result, maxResult)) {
					maxResult.hp = result.hp;
					maxResult.energy = result.energy;
					maxResult.seed = seed;
				}
			}

			//console.log(maxResult, pack);
			return maxResult;
		}
	}

	class DungeonUtils {
		static getState(result) {
			let initialHP = 0;
			let initialEnergy = 0;
			const beforeTitans = result.battleData.attackers;
			for (let titanId in beforeTitans) {
				const titan = beforeTitans[titanId];
				const state = titan.state;
				if (state) {
					initialHP += state.hp / titan.hp;
					initialEnergy += state.energy / 1e3;
				}
			}

			let afterHP = 0;
			let afterEnergy = 0;
			const afterTitans = result.progress[0].attackers.heroes;
			for (let titanId in afterTitans) {
				const titan = afterTitans[titanId];
				afterHP += titan.hp / beforeTitans[titanId].hp;
				afterEnergy += titan.energy / 1e3;
			}

			return {
				hp: afterHP - initialHP,
				energy: afterEnergy - initialEnergy,
			};
		}
		static isRandomPack(pack) {
			const ids = Object.values(pack).map((e) => +e.id);
			return ids.includes(4023) || ids.includes(4021);
		}

		static isRandomBattle(battle) {
			return DungeonUtils.isRandomPack(battle.attackers) || DungeonUtils.isRandomPack(battle.defenders[0]);
		}

		static compareScore(lastScore, newScore) {
			return lastScore.hp >= newScore.hp || (lastScore.hp === newScore.hp && lastScore.energy > newScore.energy);
		}

		static titanObjToArray(obj) {
			return Object.entries(obj).map(([id, data]) => ({ id, ...data }));
		}

		static getTitanTeam(titans, type) {
			if (type === 'neutral') {
				return DungeonUtils.getNeutralTeam(titans);
			}

			const indexMap = { water: '0', fire: '1', earth: '2' };
			const index = indexMap[type];
			return titans.filter((e) => e.id.toString().slice(2, 3) === index).map((e) => e.id);
		}

		static getNeutralTeam(titans, states = {}) {
			return DungeonUtils.fixTitanTeam(titans, states)
				.sort((a, b) => b.power - a.power)
				.slice(0, 5)
				.map((e) => e.id);
		}

		static fixTitanTeam(titans, states = {}) {
			return titans.filter((titan) => {
				const id = titan.id ?? titan;
				return !states[id]?.isDead;
			});
		}

		static genBattleSeed() {
			return Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1e6);
		}
	}

	/**
	 * Script control panel
	 *
	 * Панель управления скриптом
	 *
	 * Дизайн и стили кнопок
	 * Anton Nazarov
	 * https://t.me/antiokh
	 */
	class NewScriptMenu extends EventEmitterMixin() {
		constructor() {
			if (NewScriptMenu.instance) {
				return NewScriptMenu.instance;
			}
			super();
			this.mainMenu = null;
			this.buttons = [];
			this.checkboxes = [];
			this.option = {
				showMenu: true,
				showDetails: {},
			};
			NewScriptMenu.instance = this;
			return this;
		}

		static getInst() {
			if (!NewScriptMenu.instance) {
				new NewScriptMenu();
			}
			return NewScriptMenu.instance;
		}

		init(option = {}) {
			this.emit('beforeInit', option);
			this.option = Object.assign(this.option, option);
			const saveOption = this.loadSaveOption();
			this.option = Object.assign(this.option, saveOption);
			this.addStyle();
			this.addBlocks();
			this.emit('afterInit', option);
		}

		addStyle() {
			const style = document.createElement('style');
			style.innerText = `
			.scriptMenu_status {
				position: absolute;
				z-index: 10001;
				top: -1px;
				left: 30%;
				cursor: pointer;
				border-radius: 0px 0px 10px 10px;
				background: #190e08e6;
				border: 1px #ce9767 solid;
				font-size: 18px;
				font-family: sans-serif;
				font-weight: 600;
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
				transform: translateY(-40%);
				background: #190e08e6;
				border: 1px #ce9767 solid;
				border-radius: 0px 10px 10px 0px;
				border-left: none;
				box-sizing: border-box;
				font-size: 15px;
				font-family: sans-serif;
				font-weight: 600;
				color: #fce1ac;
				text-shadow: 0px 0px 1px;
				transition: 1s;
			}
			.scriptMenu_conteiner {
				max-height: 80vh;
				overflow: scroll;
				scrollbar-width: none; /* Для Firefox */
				-ms-overflow-style: none; /* Для Internet Explorer и Edge */
				display: flex;
				flex-direction: column;
				flex-wrap: nowrap;
				padding: 5px 10px 5px 5px;
			}
			.scriptMenu_conteiner::-webkit-scrollbar {
				display: none; /* Для Chrome, Safari и Opera */
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
				cursor: pointer;
				padding: 5px 14px 8px;
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
				margin: 0px 15px;
			}
			.scriptMenu_header a {
				color: #fce5b7;
				text-decoration: none;
			}
			.scriptMenu_InputText {
				text-align: center;
				width: 130px;
				height: 24px;
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
				align-self: center;
			}
			.scriptMenu_buttonGroup {
				display: flex;
				justify-content: center;
				user-select: none;
				cursor: pointer;
				padding: 0;
				margin: 3px 0;
			}
			.scriptMenu_buttonGroup .scriptMenu_button {
				width: 100%;
				padding: 5px 8px 8px;
			}
			.scriptMenu_mainButton {
				border-radius: 5px;
				margin: 3px 0;
			}
			.scriptMenu_beigeButton {
				border: 1px solid #442901;
				background: radial-gradient(circle, rgba(165,120,56,1) 80%, rgba(0,0,0,1) 110%);
				box-shadow: inset 0px 2px 4px #e9b282, inset 0px -4px 6px #442901, inset 0px 1px 6px #442901, inset 0px 0px 6px, 0px 0px 2px black, 0px 0px 0px 1px #ce9767;
			}
			.scriptMenu_beigeButton:active {
				box-shadow: inset 0px 4px 6px #442901, inset 0px 4px 6px #442901, inset 0px 0px 6px, 0px 0px 4px, 0px 0px 0px 1px #ce9767;
			}
			.scriptMenu_greenButton {
				border: 1px solid #1a2f04;
				background: radial-gradient(circle, #47a41b 0%, #1a2f04 150%);
				box-shadow: inset 0px 2px 4px #83ce26, inset 0px -4px 6px #1a2f04, 0px 0px 2px black, 0px 0px 0px 1px #ce9767;
			}
			.scriptMenu_greenButton:active {
				box-shadow: inset 0px 4px 6px #1a2f04, inset 0px 4px 6px #1a2f04, inset 0px 0px 6px, 0px 0px 4px, 0px 0px 0px 1px #ce9767;
			}
			.scriptMenu_redButton {
				border: 1px solid #440101;
				background: radial-gradient(circle, rgb(198, 34, 34) 80%, rgb(0, 0, 0) 110%);
				box-shadow: inset 0px 2px 4px #e98282, inset 0px -4px 6px #440101, inset 0px 1px 6px #440101, inset 0px 0px 6px, 0px 0px 2px black, 0px 0px 0px 1px #ce9767;
			}
			.scriptMenu_redButton:active {
				box-shadow: inset 0px 4px 6px #440101, inset 0px 4px 6px #440101, inset 0px 0px 6px, 0px 0px 4px, 0px 0px 0px 1px #ce9767;
			}
			.scriptMenu_attention {
				position: relative;
			}
			.scriptMenu_attention .scriptMenu_dot {
				display: flex;
				justify-content: center;
				align-items: center;
			}

			.scriptMenu_dot {
				position: absolute;
				top: -7px;
				right: -7px;
				width: 20px;
				height: 20px;
				border-radius: 50%;
				border: 1px solid #c18550;
				background: radial-gradient(circle, #f000 25%, black 100%);
				box-shadow: 0px 0px 2px black;
				background-position: 0px -1px;
				font-size: 10px;
				text-align: center;
				color: white;
				text-shadow: 1px 1px 1px black;
				box-sizing: border-box;
				display: none;
			}

			/* Общие стили */
	.scriptMenu_btnSocket {
	position: relative;
	display: inline-flex;
	padding: 4px 4px 4px 3px;
	align-items: flex-start;
	border-radius: 9px;
	background: #a37738;
	box-shadow: 0px -1px 1px 0px #7d5b3a inset, 0px 1px 1px 0px #e1a960 inset,
	-1px 0px 1px 0px #311d13 inset;
	}

	.scriptMenu_btnGap {
	position: relative;
	display: flex;
	padding: 0px 2px 4px 3px;
	flex-direction: column;
	align-items: flex-start;
	gap: 2px;
	border-radius: 5px;
	cursor: pointer;
	flex: auto;
	}

	.scriptMenu_btnSocket a {
	position: relative;
	flex: auto;
	text-decoration: none !important;
	}

	.scriptMenu_btnPlate {
	display: flex;
	height: 13px;
	padding: 12px 10px;
	justify-content: center;
	align-items: center;
	gap: 10px;
	border-radius: 4px;
	filter: blur(0.2px);
	transition: all 0.1s ease;
	text-shadow: 0px 1px 0px rgba(0, 0, 0, 0.92);
	font-family: Arial;
	font-size: 14px;
	font-style: normal;
	font-weight: 700;
	line-height: normal;
	box-sizing: content-box;
	}

	.scriptMenu_btnGap:active {
	padding: 1px 2px 3px 3px;
	}

	.scriptMenu_btnGap.left {
	padding-right: 1px;
	}
	.scriptMenu_btnGap.center {
	padding-right: 1px;
	padding-left: 1px;
	}
	.scriptMenu_btnGap.right {
	padding-left: 1px;
	}

	/* Brown */
	.scriptMenu_btnGap.brown {
	background: #301a02;
	box-shadow: 0px 0px 2px 0px #231301, 0px -1px 2px 0px #231301,
	0px 1px 1px 0px #371e03;
	}

	.scriptMenu_btnPlate.brown {
	color: hsla(40, 92%, 85%, 1);
	background: hsla(35, 49%, 44%, 1);
	box-shadow: 0px 10px 12px 0px rgba(229, 184, 116, 0.2) inset,
	0px 2px 1px 0px #e4b773 inset, -8px 3px 15px 0px #4e2f01 inset,
	8px -7px 15px 0px rgba(78, 47, 1, 0.7) inset, 0px 0px 2px 0px #644113,
	0px -3px 8px 0px #422501 inset;
	}

	.scriptMenu_btnPlate.brown:hover {
	color: hsla(40, 96%, 96%, 1);
	background: hsla(35, 49%, 55%, 1);
	}

	.scriptMenu_btnGap.brown:active {
	background: #301a02;
	box-shadow: 0px 0px 2px 0px #231301, 0px -1px 2px 0px #231301,
	0px 1px 1px 0px #371e03;
	}

	.scriptMenu_btnPlate.brown:active {
	color: hsla(40, 47%, 71%, 1);
	background: #815e2c;
	}

	/* Green */
	.scriptMenu_btnGap.green {
	background: #192901;
	box-shadow: 0px 0px 2px 0px #231301, 0px -1px 2px 0px #231301,
	0px 1px 1px 0px #371e03;
	}

	.scriptMenu_btnPlate.green {
	color: hsla(69, 100%, 70%, 1);
	border-radius: 4px;
	background: #4ec71a;
	box-shadow: 0px 10px 12px 0px rgba(212, 229, 116, 0.2) inset,
	0px 2px 1px 0px #95e473 inset, -8px 3px 15px 0px #184e01 inset,
	8px -7px 15px 0px rgba(24, 78, 1, 0.7) inset, 0px 0px 2px 0px #2b6413,
	0px -3px 8px 0px #154201 inset;
	}

	.scriptMenu_btnPlate.green:hover {
	color: hsla(40, 96%, 96%, 1);
	background: hsla(102, 70%, 55%, 1);
	}

	.scriptMenu_btnGap.green:active {
	background: #192901;
	box-shadow: 0px 0px 2px 0px #231301, 0px -1px 2px 0px #231301,
	0px 1px 1px 0px #371e03;
	}

	.scriptMenu_btnPlate.green:active {
	color: hsla(80, 47%, 71%, 1);
	background: #46812c;
	}

	/* Blue */
	.scriptMenu_btnGap.blue {
	background: #032037;
	box-shadow: 0px 0px 2px 0px #231301, 0px -1px 2px 0px #231301,
	0px 1px 1px 0px #371e03;
	}

	.scriptMenu_btnPlate.blue {
	color: hsla(177, 79%, 91%, 1);
	background: hsla(207, 73%, 54%, 1);
	box-shadow: 0px 10px 12px 0px rgba(116, 178, 229, 0.2) inset,
	0px 2px 1px 0px #73b1e4 inset, -8px 3px 15px 0px rgba(1, 43, 78, 0.7) inset,
	8px -7px 15px 0px rgba(1, 43, 78, 0.7) inset,
	0px 0px 2px 0px rgba(19, 64, 100, 0.3),
	0px -3px 8px 0px rgba(1, 37, 66, 0.3) inset;
	}

	.scriptMenu_btnPlate.blue:hover {
	color: hsla(207, 96%, 96%, 1);
	background: hsla(207, 100%, 62%, 1);
	}

	.scriptMenu_btnGap.blue:active {
	background: #032037;
	box-shadow: 0px 0px 2px 0px #231301, 0px -1px 2px 0px #231301,
	0px 1px 1px 0px #371e03;
	}

	.scriptMenu_btnPlate.blue:active {
	color: hsla(207, 47%, 71%, 1);
	background: #2c5b81;
	}

	.scriptMenu_miniSocket {
	position: absolute;
	right: -5px;
	top: -5px;
	pointer-events: none !important;
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 2px;
	flex-direction: column;
	border-radius: 50%;
	background: #a37738;
	box-shadow: 0px -0.4px 0.4px 0px #7d5b3a inset,
	0px 0.4px 0.4px 0px #e1a960 inset, -0.4px 0px 0.4px 0px #311d13 inset;
	z-index: 50;
	}

	.scriptMenu_miniGap {
	display: flex;
	justify-content: center;
	align-items: center;
	border-radius: 50%;
	background: #371e03;
	box-shadow: 0px 0px 1px 0px #231301, 0px -1px 0.851px 0px #231301,
	0px 1px 1px 0px #371e03;
	width: 100%;
	height: 100%;
	}

	.scriptMenu_indicator {
	display: flex;
	justify-content: center;
	align-items: center;
	aspect-ratio: 1;
	width: 100%;
	max-width: 40px;
	padding: 2px 6px;
	border-radius: 50%;
	background: #ff2020;
	box-shadow: 2px 4px 5px 0px rgba(229, 116, 116, 0.2) inset,
	0px 2px 4px 0px rgba(255, 255, 255, 0.3) inset,
	-3px 1px 6px 0px #4e0101 inset, 3px -2px 6px 0px #4e0101 inset,
	0px 0px 1px 0px #641313, 0px -1px 3px 0px #420101 inset;
	color: #fbeeda;
	text-shadow: 0px 0px 5px rgba(0, 0, 0, 0.9), 0px 1px 0px rgba(0, 0, 0, 0.92);
	font-family: Arial, sans-serif;
	font-size: 12px;
	font-weight: 700;
	line-height: normal;
	}

	.scriptMenu_btnSocket {
	display: flex;
	padding: 4px 4px 4px 3px;
	flex-direction: column;
	align-items: flex-start;
	}

	.scriptMenu_btnSocket .scriptMenu_btnRow {
	display: flex;
	justify-content: space-between;
	align-items: center;
	align-self: stretch;
	width: 100%;
	}

	.scriptMenu_btnSocket .scriptMenu_btnGap .scriptMenu_btnPlate {
	display: flex;
	justify-content: center;
	align-items: center;
	align-self: stretch;
	flex: auto;
	}
		`;
			document.head.appendChild(style);
		}

		addBlocks() {
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
			checkbox.addEventListener('change', () => {
				this.option.showMenu = checkbox.checked;
				this.saveSaveOption();
			});
			main.appendChild(checkbox);

			const mainMenu = document.createElement('div');
			mainMenu.classList.add('scriptMenu_main');
			main.appendChild(mainMenu);

			this.mainMenu = document.createElement('div');
			this.mainMenu.classList.add('scriptMenu_conteiner');
			mainMenu.appendChild(this.mainMenu);

			const closeButton = document.createElement('label');
			closeButton.classList.add('scriptMenu_close');
			closeButton.setAttribute('for', 'checkbox_showMenu');
			this.mainMenu.appendChild(closeButton);

			const crossClose = document.createElement('div');
			crossClose.classList.add('scriptMenu_crossClose');
			closeButton.appendChild(crossClose);
		}

		getButtonColor(color) {
			const buttonColors = {
				green: 'green',
				red: 'blue',
				beige: 'brown',
				blue: 'blue',
			};
			return buttonColors[color] || buttonColors['beige'];
		}

		setStatus(text, onclick) {
			if (this._currentStatusClickHandler) {
				this.status.removeEventListener('click', this._currentStatusClickHandler);
				this._currentStatusClickHandler = null;
			}

			if (!text) {
				this.status.classList.add('scriptMenu_statusHide');
				this.status.innerHTML = '';
			} else {
				this.status.classList.remove('scriptMenu_statusHide');
				this.status.innerHTML = text;
			}

			if (typeof onclick === 'function') {
				this.status.addEventListener('click', onclick, { once: true });
				this._currentStatusClickHandler = onclick;
			}
		}

		addStatus(text) {
			if (!this.status.innerHTML) {
				this.status.classList.remove('scriptMenu_statusHide');
			}
			this.status.innerHTML += text;
		}

		addHeader(text, onClick, main = this.mainMenu) {
			this.emit('beforeAddHeader', text, onClick, main);
			if (this.btnSocket) {
				this.btnSocket = null;
			}
			const header = document.createElement('div');
			header.classList.add('scriptMenu_header');
			header.innerHTML = text;
			if (typeof onClick === 'function') {
				header.addEventListener('click', onClick);
			}
			main.appendChild(header);
			this.emit('afterAddHeader', text, onClick, main);
			return header;
		}

		addBtnSocket(back) {
			this.btnSocket = document.createElement('div');
			this.btnSocket.classList.add('scriptMenu_btnSocket');
			(back ?? this.mainMenu).appendChild(this.btnSocket);
			return this.btnSocket;
		}

		addButton(btn, main = this.btnSocket) {
			this.emit('beforeAddButton', btn, main);
			//debugger;
			let back = null;
			if (!this.btnSocket) {
				back = main;
				main = this.addBtnSocket(back);
				this.btnSocket = main;
			}
			let isOneButton = false;

			if (!main.classList.contains('scriptMenu_btnRow')) {
				main = document.createElement('div');
				main.classList.add('scriptMenu_btnRow');
				isOneButton = true;
			}

			const { name, onClick, title, color, dot, classes = [], isCombine } = btn;
			const button = document.createElement('div');
			button.classList.add('scriptMenu_btnGap', this.getButtonColor(color), ...classes);
			button.title = title;
			button.addEventListener('click', onClick);
			main.appendChild(button);

			const buttonText = document.createElement('div');
			buttonText.classList.add('scriptMenu_btnPlate', this.getButtonColor(color));
			buttonText.innerText = name;
			button.appendChild(buttonText);

			if (dot) {
				this.addIndicator(button, dot);
			}

			if (isOneButton) {
				this.btnSocket.appendChild(main);
				//this.btnSocket.appendChild(main);
			}

			this.buttons.push(button);

			this.emit('afterAddButton', button, btn);
			return button;
		}

		addCombinedButton(buttonList, main = this.btnSocket) {
			this.emit('beforeAddCombinedButton', buttonList, main);
			let back = null;
			if (!this.btnSocket) {
				back = main;
				main = this.addBtnSocket(back);
				this.btnSocket = main;
			}
			const buttonGroup = document.createElement('div');
			buttonGroup.classList.add('scriptMenu_btnRow');
			let count = 0;

			for (const btn of buttonList) {
				btn.isCombine = true;
				btn.classes ??= [];
				if (count === 0) {
					btn.classes.push('left');
				} else if (count === buttonList.length - 1) {
					btn.classes.push('right');
				} else {
					btn.classes.push('center');
				}
				this.addButton(btn, buttonGroup);
				count++;
			}

			this.addIndicator(buttonGroup);

			this.btnSocket.appendChild(buttonGroup);
			this.emit('afterAddCombinedButton', buttonGroup, buttonList);
			return buttonGroup;
		}

		addIndicator(btnSocket, title) {
			const dotAtention = document.createElement('div');
			dotAtention.classList.add('scriptMenu_dot');
			dotAtention.title = title;
			btnSocket.appendChild(dotAtention);
			/*
		const miniSocket = document.createElement('div');
		miniSocket.classList.add('scriptMenu_miniSocket');

		const miniGap = document.createElement('div');
		miniGap.classList.add('scriptMenu_miniGap');
		miniSocket.appendChild(miniGap);

		const indicator = document.createElement('div');
		indicator.classList.add('scriptMenu_indicator', 'scriptMenu_dot');
		indicator.title = title;
		indicator.innerHTML = '22';
		miniGap.appendChild(indicator);

		btnSocket.appendChild(miniSocket);
		*/
		}

		addCheckbox(label, title, main = this.mainMenu) {
			this.emit('beforeAddCheckbox', label, title, main);
			if (this.btnSocket) {
				this.btnSocket = null;
			}
			const divCheckbox = document.createElement('div');
			divCheckbox.classList.add('scriptMenu_divInput');
			divCheckbox.title = title;
			main.appendChild(divCheckbox);

			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.id = 'scriptMenuCheckbox' + this.checkboxes.length;
			checkbox.classList.add('scriptMenu_checkbox');
			divCheckbox.appendChild(checkbox);

			const checkboxLabel = document.createElement('label');
			checkboxLabel.innerText = label;
			checkboxLabel.setAttribute('for', checkbox.id);
			divCheckbox.appendChild(checkboxLabel);

			this.checkboxes.push(checkbox);
			this.emit('afterAddCheckbox', label, title, main);
			return checkbox;
		}

		addInputText(title, placeholder, main = this.mainMenu) {
			this.emit('beforeAddCheckbox', title, placeholder, main);
			if (this.btnSocket) {
				this.btnSocket = null;
			}
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
			divInputText.appendChild(newInputText);
			this.emit('afterAddCheckbox', title, placeholder, main);
			return newInputText;
		}

		addDetails(summaryText, name = null) {
			this.emit('beforeAddDetails', summaryText, name);
			if (this.btnSocket) {
				this.btnSocket = null;
			}
			const details = document.createElement('details');
			details.classList.add('scriptMenu_Details');
			this.mainMenu.appendChild(details);

			const summary = document.createElement('summary');
			summary.classList.add('scriptMenu_Summary');
			summary.innerText = summaryText;
			if (name) {
				details.open = this.option.showDetails[name] ?? false;
				details.dataset.name = name;
				details.addEventListener('toggle', () => {
					this.option.showDetails[details.dataset.name] = details.open;
					this.saveSaveOption();
				});
			}

			details.appendChild(summary);
			this.emit('afterAddDetails', summaryText, name);
			return details;
		}

		saveSaveOption() {
			try {
				localStorage.setItem('scriptMenu_saveOption', JSON.stringify(this.option));
			} catch (e) {
				console.log('¯\\_(ツ)_/¯');
			}
		}

		loadSaveOption() {
			let saveOption = null;
			try {
				saveOption = localStorage.getItem('scriptMenu_saveOption');
			} catch (e) {
				console.log('¯\\_(ツ)_/¯');
			}

			if (!saveOption) {
				return {};
			}

			try {
				saveOption = JSON.parse(saveOption);
			} catch (e) {
				return {};
			}

			return saveOption;
		}
	}

	this.HWHClasses.ScriptMenu = NewScriptMenu;
})();
