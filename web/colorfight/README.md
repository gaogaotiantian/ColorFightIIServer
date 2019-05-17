# ColorfightII Rules

## Overview

ColorfightII is a round based game where players try to expand their territory and collect resources to win the game. 

There are two kinds of resources:

* Energy
* Gold

Each player starts with an initial amount of energy and a home cell. 
Each cell controlled by the player during a round will provide gold and energy. 

Players can use energy to attack and occupy other cells to expand their territory 
and gain more gold and energy per turn. 

Players can use gold to build different buildings on their own cells to enhance their effects.

At the end of the game, the player with the most gold wins.

## Game Flow

### Preparation

In the beginning of each game, a 30x30 map will be generated. 

### Register

At the beginning of the game players can register to join the game. 
Each player that regisers will be assigned a ```Home``` cell and start with 1000 ```energy```.

### Cells

Each cell of the map will have: 

* ```natural_energy``` Base energy generated per turn.
* ```natural_gold``` Base gold generated per turn.
* ```natural_cost``` Base energy cost to capture.

### Commands

During each round a player can give a list of commands. 
The possible commands are:

* attack
* build
* upgrade

#### Attack

Players can attack cells adjacent to any of their owned cells in the four cardinal directions (up, down, left, right) by using energy. 

Each cell has a ```natural_cost``` and a ```force_field```. 

To capture a cell, at least ```attack_cost``` energy must be spent. 

* ```attack_cost == natural_cost + force_field```

Any energy used in an attack will be consumed even if the attack fails to capture the cell. 

If multiple players attack a cell in the same round, only the player who spends the most energy may capture the cell. 
However, in order for the attack to succeed, the player who spends the most energy must spend more than all other attackers combined and still have enough left over to actually capture the cell. 

In mathematical terms, the ```net_attack``` is calculated as: 

* ```net_attack == max_energy * 2 - total_energy```

Or equivalently as:

* ```net_attack == max_energy - all_other_attackers``` 

Where ```max_energy``` is the highest energy a player spends on the cell.

You can think of this as the highest energy spent on the cell is neutralized by other energy spent, before it's used to attack the cell.

```net_attack``` must be greater than ```attack_cost``` to capture the cell. 

Note that players can attack their own cells as a strategy to protect them. 

> For example, assume the ```attack_cost``` of a cell is ```100``` and Player A owns it. 
> If player B uses 100 energy to attack the cell and player A uses 1 energy to attack the cell on the same round, then ```net_attack``` is only 99 and player B will fail to capture the cell. 

When a cell is captured, a ```force_field``` will be generated to make it harder for other players to attack. 
As stated previously, ```force_field``` is added to the ```natural_cost``` to calculate the ```attack_cost```. 

The more excess energy the player uses to attack a cell, the more ```force_field``` will be generated if the cell is captured. 
On capture, the cell will gain ```force_field``` equal to twice the excess attack strength up to a maximum of ```1000```. In mathematical terms this is:

* ```min(1000, 2 * (net_attack - attack_cost))```

> Case 1, if player A spends 50 energy to attack it, the attack will fail and player A will lose 50 energy(which is not a wise move). 
>
> Case 2, if player A spends 150 energy to attack it, the attack will succeed and player A will occupy the cell and lose 150 energy. 
> The cell will have 100 ```force_field``` because 50 more energy than was needed to capture the cell was spent, so the ```attack_cost``` will be 200. 
>
> Case 3, if player A spends 150 energy and player B spends 150 energy. 
> The attack will fail because ```net_attack == 150 - 150 == 0```. 
> Both A and B lose 150 energy (bad for them, but not a stupid since they can not predict what the other players might do).
>
> Case 4, if the player A spends 350 energy and player B spends 150 energy. 
> Player A will capture the cell because ```net_attack == 350 - 150 == 200``` and lose 350 energy. 
> Player B will lose 150 energy. 
> The cell will be owned by A and have ```force_field == min(1000, 2 * (200 - 100)) == 200```

#### Build

Players can enhance cells they own by building on them. 

Each building has a gold ```cost``` to build it. 

The buildings will take effect the round they are built. 

There are four types of buildings:

* ```Home``` The home base of the player.
* ```Well``` Upgrades energy generation.
* ```Mine``` Upgrades gold generations.
* ```Fort``` Generates force field.

#### Upgrade

A player can upgrade their buildings to improve their effects. 

All buildings, including ```Home```, start at level 1 when built. 
After each upgrade the level will increase by 1. 
Buildings other than ```Home``` can only be upgraded until they reach the current upgrade level of ```Home```. 
In order to upgrade them further, ```Home``` must be upgraded. 

Note that a player can build and upgrade a cell in the same round since the build command is handled first. 

### Update

#### Order

1. All commands will be parsed.
    1. All build commands will be applied.
    2. All upgrade commands will be applied.
    3. Build and upgrade resources will be consumed.

2. Update cells
    1. All attack commands will be parsed.
    2. Effects of attack commands will be applied per cell. Calculate new owners and buildings.
    3. ```Gold``` and ```Energy``` income for each player will be updated.
    4. ```tech_level``` for each player will be updated.
    5. ```force_field``` for each cell will be updated.

3. Update players
    1. ```Gold``` and ```Energy``` will be updated.
    2. Players without any cells will be marked as dead.

## Game Feature

### MapCell

A ```MapCell``` represents a cell that a user can occupy. 

```MapCell``` can produce energy and gold for each round. 
It has three natural attributes:

* ```natural_energy``` (1 - 10)
* ```natural_gold``` (1 - 10)
* ```natural_cost``` (1 - 300)

The natural attributes of a cell will not change during the game. 
However, the actual energy and gold it produced by the cell and the actual cost to capture it may change due to other aspects. 

The actual resource generating attributes are:

* ```energy``` The actual energy generated per round. 
* ```gold``` The actual gold generated per round.

### GameMap

```GameMap``` consists of ```GAME_WIDTH * GAME_HEIGHT``` ```MapCell```s.

At the beginning of the game, the game will generate a ```GameMap``` and blur
it so the ```natural_cost``` will be smooth.

```natural_cost``` is weakly correlated with the ```natural_energy``` and  ```natural_gold``` of the ```MapCell```. 

#### Buildings

Players can build buildings on a ```MapCell``` they own at the cost of some resources. 
Only one building can be built per ```MapCell```.

Players can upgrade their buildings to enhance their effects at the cost of some resources. 
Every building has a current upgrade ```level```.
When a building is built, the ```level``` starts at ```1```.
When a player upgrades a building, the upgrade ```level``` increases by one and the effect of the building is enhanced. 

Each player has a ```tech_level``` which is the level of their ```Home``` if they have one, otherwise it is 0. 
Buildings other than the ```Home``` can only be upgraded until they reach the player's current ```tech_level```. 
In order to upgrade further, the player must upgrade the ```level``` of their ```Home``` to increase their ```tech_level```.

When another player captures a cell, the building on it is destroyed. 

In the event that a player loses his/her ```Home``` all of his/her buildings will be destroyed. 

If any building except for ```Home``` gets destroyed, half of the gold spent on the building will be returned to the player.

##### Home

Each player may only have one ```Home``` at a time. 

Each player starts with a ```Home``` on their starting cell. 

```Home``` provides 10 ```gold``` and 10 ```energy``` per ```level```.

* ```energy == 10 * level```
* ```gold == 10 * level```

```Home``` has an ```attack_cost``` based on the current ```level``` and the energy the owner has. 

* ```attack_cost == level * (1000 + force_field + user.energy)```

Build and upgrade cost: 

* ```(energy, gold)```
* ```cost == (0, 1000)```
* ```upgrade_cost == [2: (1000, 1000), 3: (2000, 2000)]```

When a player loses their ```Home```, ```1/3``` of their total ```gold``` will be lost and given to the player who captured their ```Home```.
In addition, their ```tech_level``` will be reduced to ```0``` and all of their buildings will be destroyed. 

* Destroy Effect: ```1/3``` of ```gold``` will be stolen by the attacker. All buildings will be destroyed. 

##### Energy Well

```EnergyWell``` enhances the energy production of a cell. 
It increases the production by the ```natural_energy``` per ```level```.

* ```energy == natural_energy * (1 + level)```

Build and upgrade cost:

* ```(energy, gold)```
* ```cost == (0, 200)```
* ```upgrade_cost == [2: (0, 400), 3: (0, 600)]```

Capturing a cell with an ```EnergyWell``` gives free ```force_field```

* ```Destroy Effect: Add (1: 100, 2: 300, 3: 600) force_field```
* ```Destroy Effect: (1: 100, 2: 300, 3: 600) gold will be returned```

##### Gold Mine

```GoldMine``` enhances the gold production of a cell. 
It increases the production by the ```natural_gold``` per ```level```.

* ```gold == natural_gold * (1 + level)```

Build and upgrade cost:

* ```(energy, gold)```
* ```cost == (0, 200)```
* ```upgrade_cost == [2: (0, 400), 3: (0, 600)]```

Capturing a cell with an ```GoldMine``` gives free ```gold```

* ```Destroy Effect: Add (1: 100, 2: 300, 3: 600) gold```
* ```Destroy Effect: (1: 100, 2: 300, 3: 600) gold will be returned```

##### Fortress

```Fortress``` enhances the defensive and offensive properties of a cell. 
It increases the ```attack_cost``` of a cell, generates ```force_field``` for the cell and its allied neighbors, and decreases ```force_field``` of enemy neighbors. 

* ```attack_cost``` = ```(natural_cost + force_field) * (1 + level)```
* ```self_forcefield_incr == 4 * level```
* ```ally_forcefield_incr == 2 + 2 * level```
* ```enemy_forcefield_decr == 6 + 10 * level```

Build and upgrade cost:

* ```(energy, gold)```
* ```cost == (0, 200)```
* ```upgrade_cost == [2: (0, 400), 3: (0, 600)]```
* ```Destroy Effect: (1: 100, 2: 300, 3: 600) gold will be returned```

#### Force Field

Each ```MapCell``` has a ```force_field```. 
The value of the ```force_field``` increases the ```attack_cost``` of the ```MapCell```. 
Unowned cells start with ```force_field == 0```. 

When capturing a cell, energy beyond what is necessary to capture the cell increases the ```force_field```. 
The ```force_field``` gained is twice the excess energy:

* ```force_field == min(1000, 2 * (net_attack - attack_cost))```

In addition, when capturing a cell with an ```EnergyWell```, the cell will gain ```force_field``` based on the level of the ```EnergyWell```. 

* ```force_field += (1: 50, 2: 150, 3: 350)```

After each round, the ```force_field``` will be updated based on its building and the adjacent cells. 
```fort_level == 0``` if the adjacent cell we are considering has no ```fortress```. 

* Cell has a fortress, increase by ```5 * fort_level```
* Each adjacent ally, increase by ```2 + fort_level```
* Each adjacent enemy, decrease by ```6 + 10 * fort_level```

> For example. Player A owns cell (2, 2) and currently the cell has 100 
  ```force_field```. Player A owns (2, 1) and (1, 2), too. (2, 3) is empty and
  Player B owns (3, 2). Therefore the cell (2, 2) has 2 self cells and 1 emeny
  cell around, so for each round, the ```force_field``` will reduce 6 - 2 * 2
  = 2.

> ```Fortress``` will affect the change of ```force_field```. If Player A owns
  cell (2, 2) and has a level 1 ```Fortress``` on it. Player A owns (2, 1) with
  a level 2 ```Fortress``` and (1, 2) with nothing. Player B owns (2, 3) with
  a level 1 ```Fortress``` and (3, 2) with nothing. The cell (2, 2) will have 
  a ```force_field``` change for ```4 + 6 + 2 - 16 - 6``` = ```-10```

#### Attack Cost

The ```attack_cost``` of a cell depends on its ```natural_cost```, ```force_field```, and the level of any `fortress` built on it. 
Assuming a cell with no ```fortress``` has a ```fort_level == 0```, ```attack_cost``` is:

* ```attack_cost == (natural_cost + force_field) * (1 + fort_level)```

### User

Players can join a game that is open to new players by supplying a ```username``` and a ```password```. 
While the game is going, anybody who supplies the ```username``` and ```password``` of a current player will be treated as that player. 
This is only intended to make conflicts unlikely. It is not intended as a security feature. 

Player registration only lasts until the end of the game. 
Each player must re-register with any new game that is started. 

Each unique player must have a unique ```username```. 
If two players attempt to register with the same ```username``` then only one will succeed. 

#### Tech Level

```tech_level``` is the level of the player's ```Home``` building. 
All other buildings can only be upgraded until they reach the player's ```tech_level```. 
In order to upgrade buildings further, a player must first increase their ```tech_level``` by leveling up their ```Home```. 

#### Tax Amount

Players are taxed ```energy``` and ```gold``` every turn based on the number of cells and resource buildings (```EnergyWell``` and ```GoldMine```) they own. 
There are actually two taxes, one based on cell count ```cell_tax_amount``` and one based on building count ```building_tax_amount```. 

Both taxes use the same progressive ```marginal_tax_rate``` system with the same tax brackets. 
This is similar to the US tax system. 
For those unfamiliar with how this works, each extra unit has a cost, the cost increases the more units owned, and the increased costs are not retroactive. 
Moving up to the next tax bracket only affects new units. 
The old units are taxed at their previous rate. 

number  | tax rate                | total tax
----    | ----                    | ---
0-75    | no tax                  | 0
76-150  | 1 per cell/building     | 1*(num - 75) 
151-225 | 2 per cell/building     | 75 + 2*(num - 150)
226-300 | 3 per cell/building     | 225 + 3*(num - 225)
...     | ...
826-900 | 11 per cell/building    | 4125 + 11*(num - 825)

> For example. A player has 337 cells on which 102 ```gold_mines```, 73 
  ```energy_wells``` and 99 ```fortress``` are built. First we need to calculate
  the tax generated by number of cells. The tax for cells would 
  be ```0 + 75*1 + 75*2 + 75*3 + 37*4 = 598```. Then we know the number of resource 
  buildings is 102 + 73 = 175, so the tax generated by buildings would be
  ```0 + 75*1 + 25*2 = 125``` The total tax would be ```598 + 125 = 723```

> As a result, 723 gold and 723 energy will be reduced from the player each
  round.

## Communication

### Message from a client

The only API for an action is through ```parse_action(uid, msg)```

```msg``` should be a string representing a json object. 

* register: ```{'action':'register', 'username': username, 'password':password}```
* command: ```{'action':'command', 'cmd_list':cmd_list}```
    * ```cmd_list``` should be a list of command strings

#### Command Format

* attack: ```"a <x> <y> <energy>"```. ex ```"a 2 3 100"```
* build: ```"b <x> <y> <building>"``` ex ```"b 3 5 g"```

### Message to a client

The only API to get information from the game is ```get_game_info()```.

```get_game_info()``` will return a dictionary. The web server is responsible 
to convert it to string.

#### Format of game info

```
{
    "turn": <int, current turn>,
    "info": {
        "max_turn": <int, max turn number the game will last>,
        "width": <int, width of the game map>,
        "height": <int, height of the game map>
    },
    "error": {
        uid: [
            <str, error_message>
        ]
    },
    "game_map": {
        [
            [
                {
                    "position": [<int, x>, <int, y>],
                    "building":  {
                        "name": <str, building name>,
                        "level": <int, level of the building>
                    },
                    "attack_cost": <int, cost to attack the cell>,
                    "owner": <int, uid>,
                    "gold": <int, gold the cell generates a round>,
                    "energy": <int, energy the cell generates a round>,
                    "natural_gold": <int, natural_gold of the cell>,
                    "natural_energy": <int, natural_energy of the cell>,
                    "natural_cost": <int, natural_cost of the cell>,
                    "force_field": <int, force_field of the cell>
                }
                ...
            ]
            ...
        ]
    },
    "users": {
        uid: {
            "uid": <int, user id>,
            "username": <str, username>,
            "energy": <int, current energy the user has>,
            "gold": <int, current gold the user has>,
            "dead": <bool, if the user is dead>,
            "tech_level": <int, technology level or the maximum home level>
            "energy_source": <int, how much energy the user will gain each round>,
            "gold_source": <int, how much gold the user will gain each round>,
            "cells": [
                [<int, x>, <int, y>], ...            
            ]
        }
    }
}
```
