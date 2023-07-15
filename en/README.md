## What it is...  
This script is a fork of the original [HeroWarsHelper](https://greasyfork.org/ru/scripts/450693-herowarshelper) by Natasha **ZingerY**.  
What's changed: names and order of items in the script menu, disabled unnecessary annoying requests to start most actions, improved interface style in the direction of compactness...

## Install scripts  
First, put the script manager [TamperMonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) in the browser.  
Then put the main script into it - [HeroWarsHelper](https://irmagon.github.io/HeroWarsHelper.user.js).  

## Checkboxes  
**Skip battle** - when enabled, allows you to fight on automatic when you press the retreat button in the Outlands and in the arena of titans. In Tower and Company, it immediately shows the result of the battle after it starts without loading and displaying the battle.  
**Endless cards** - infinite prediction cards, if you don't have prediction cards or they have run out, you need to reload the game after turning it on  
**Auto Expeditions** - automatically collects and sends expeditions when you enter the game  
**Cancel battle** - when enabled, there is an option to cancel combat on VG, SM and in Asgard.  
*At the moment there are daily limits on cancelations set in the game. VG and SM can be canceled **2 times**, and Asgard **4 times** per day, exceeding these limits will lead to a **ban mode for 7 days**.
Also the instant notification system will send a message to all guild members about the start and defeat in case of canceling the battle, all those who were on the VG screen can incorrectly display attempts up to negative values*  
**Battle recalculation** - when enabled at the start of a battle in Adventure, Guild Wars and Clash of Worlds, performs a preliminary calculation of battle results and displays it on the top dropdown panel. 11 fights are calculated, the first with the current random its result will be displayed as "Victory" or "Defeat". This means that if you skip the fight at the very beginning or press F5, you will get this result. Another 10 fights are calculated with random random and will display the result in the form of two numbers, for example 4/10 means that out of 10 fights 4 wins and 6 losses.  
This function allows you to calculate the chances of winning and understand whether you are so unlucky or you just have no chance to win in this fight.  
And also if the script predicted Defeat, and you managed to win by hand, then you're very good!!!!  
**Quantity control** - allows you to specify quantities for titan spheres, pet eggs, titan artifact spheres, artifact chests and gold boxes. Ability to open nesting dolls recursively.  
**Repeat mission** - allows you to automatically repeat a mission in company until you run out of energy or the feature is disabled  
**Disable donation** - removes all annoying offers to throw money into the game (to pay for raisins or Valkyrie you need to disable).  
**Daily quests** - when you start the game, a window appears in which you can select quests for automatic execution.  

## Input Fields
**1. Titanite** - The input field allows you to specify how much titanite you should try to collect  
**2. Combat speed multiplier** - Allows you to change the speed of battle in accelerated mode, if you specify values from 0 to 1, you can slow down the battle  
**3. Number of test fights** - allows you to specify the number of fights to be conducted during the preliminary calculation of fights, too large a number can significantly increase the calculation time  
**4. Number of autobattle attempts** - allows you to specify the number of autobattle attempts in adventures, missions, TCs and GW/CWs  
*ATTENTION: Do not slow down the battle too long and do not specify a very large number of test fights, as the battle may end automatically by timeout.*  

## Buttons  
**Sync** - execute the new day game function that updates the game client data when a new day arrives. Allows you to synchronize the game client after executing the Dungeon and Tower scripts.  
**Rewards** - collects rewards for all completed quests except seasonal quests, this includes global, weekly, daily quests and special events.  
**ToE** - goes through titan arena on automatic, beats the point to victory if there is a chance of winning, otherwise leaves the results of the first fight.  
**Dungeon** - goes through the dungeon until the amount of titanite specified in the input field or predicts defeat in the battle.  
**Expeditions** - performs automatic collection and sending of expeditions manually without reloading the game.  
**Mail** - collects all mail except energy, portal charges, heroes, hero souls, energy boost and vip points.  
**Minions** - automatically attacks available minions in Asgard in case of defeat cancels the fight.  
**Adventure** - a window appears in which you can enter a path of points on which the script will automatically pass. The point on which the hero is located must also be specified.  
**Autocollection** - a window appears in which you can specify several different actions that can be performed in the script, the actions will be automatically executed one by one.  

It is not recommended to click on the buttons if some previous action has not completed, there is a stopper, but you may succeed ))))  
Buttons Tournament, Dungeon lead to rasynchronous client and server, it means that to display the received progress in the game you need to reload the game or use the **Sync** button for partial synchronization.  

In case of defeat in battle is available **Auto** function, which automatically cancels the battle and starts it again until victory or to the specified results.

News about official updates to the original script are published here:  
Tg: https://t.me/+q6gAGCRpwyFkNTYy  
Vk: https://vk.com/invite/YNPxKGX  
